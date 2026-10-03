"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  Printer,
  Share2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Wrench,
  Loader2,
  ArrowRight,
  Eye,
  Settings2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  useInvoice,
  useUpdateDraftInvoice,
  useIssueInvoice,
  useCancelInvoice,
  useDeleteDraftInvoice,
  type InvoiceLine,
  type InvoiceLineInput,
} from "@/features/invoices/api";
import { useCurrentShopDetails } from "@/features/billing/api";
import { InvoicePreview } from "@/features/invoices/components/InvoicePreview";
import { InvoiceLineSheet } from "@/features/invoices/components/InvoiceLineSheet";
import { IssueInvoiceDialog } from "@/features/invoices/components/IssueInvoiceDialog";
import { CancelInvoiceDialog } from "@/features/invoices/components/CancelInvoiceDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPaise } from "@/lib/format/money";
import { isValidGstin } from "@/lib/validation/gstin";
import { GST_STATES } from "@/lib/constants/gst-states";
import { usePermission } from "@/lib/auth/store";

function InvoiceDetailContent() {
  const t = useTranslations("invoices");
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("id");

  const { data: invoice, isLoading, isError, refetch } = useInvoice(invoiceId);
  const { data: currentShop } = useCurrentShopDetails();

  // Permissions
  const canCreateDraft = usePermission("invoices.create_draft");
  const canIssue = usePermission("invoices.issue");
  const canCancel = usePermission("invoices.cancel");

  // Mutations
  const updateDraftMutation = useUpdateDraftInvoice(invoiceId || "");
  const issueMutation = useIssueInvoice(invoiceId || "");
  const cancelMutation = useCancelInvoice(invoiceId || "");
  const deleteDraftMutation = useDeleteDraftInvoice();

  // Mode & Tabs for Draft
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Draft editable fields
  const [customerGstin, setCustomerGstin] = useState("");
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Line editing sheet state
  const [isLineSheetOpen, setIsLineSheetOpen] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editingLineItem, setEditingLineItem] = useState<InvoiceLineInput | null>(null);

  // Dialogs
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [creditNoteCreatedId, setCreditNoteCreatedId] = useState<string | null>(null);

  // Populate draft fields when invoice data loads
  useEffect(() => {
    if (invoice && invoice.status === "draft") {
      setCustomerGstin(invoice.customer_gstin || "");
      setPlaceOfSupply(invoice.place_of_supply_state || "");
      setNotes(invoice.notes || "");
      setTerms(invoice.terms || "");
    }
  }, [invoice]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex-1 p-8 text-center max-w-md mx-auto space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-neutral-900">{t("notFoundTitle")}</h2>
        <p className="text-xs text-neutral-500">{t("notFoundDesc")}</p>
        <Button
          variant="outline"
          onClick={() => router.push("/invoices/")}
          className="rounded-xl text-xs mt-2"
        >
          {t("backToInvoices")}
        </Button>
      </div>
    );
  }

  const isDraft = invoice.status === "draft";
  const isIssued = invoice.status === "issued";
  const isCancelled = invoice.status === "cancelled";
  const isGstEnabled = currentShop?.gst_enabled ?? Boolean(invoice.customer_gstin || invoice.kind === "tax_invoice");

  // Handle live GSTIN change with state code auto-detection
  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase();
    setCustomerGstin(upper);

    if (!upper) {
      setGstinError(null);
      return;
    }

    if (upper.length === 15) {
      if (isValidGstin(upper)) {
        setGstinError(null);
        const stateCode = upper.slice(0, 2);
        setPlaceOfSupply(stateCode);
      } else {
        setGstinError(t("validation.invalidGstin"));
      }
    } else {
      setGstinError(null);
    }
  };

  // Convert current lines to inputs
  const currentLineInputs: InvoiceLineInput[] = (invoice.lines || []).map((l) => ({
    description: l.description,
    hsn_sac: l.hsn_sac,
    quantity: l.quantity,
    unit_price_paise: l.unit_price_paise,
    discount_paise: l.discount_paise,
    tax_inclusive: l.tax_inclusive,
    tax_rate_bp: l.tax_rate_bp,
  }));

  // Save draft header updates
  const handleSaveDraftMeta = async () => {
    if (gstinError) {
      toast.error(t("validation.fixGstinError"));
      return;
    }
    try {
      await updateDraftMutation.mutateAsync({
        customer_gstin: customerGstin.trim(),
        place_of_supply_state: placeOfSupply.trim(),
        notes: notes.trim(),
        terms: terms.trim(),
      });
      toast.success(t("draftUpdatedToast"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("updateFailed");
      toast.error(msg);
    }
  };

  // Open line editor for adding
  const handleAddLine = () => {
    setEditingLineIndex(null);
    setEditingLineItem(null);
    setIsLineSheetOpen(true);
  };

  // Open line editor for updating
  const handleEditLine = (index: number) => {
    const item = currentLineInputs[index];
    setEditingLineIndex(index);
    setEditingLineItem(item);
    setIsLineSheetOpen(true);
  };

  // Save line (add or update)
  const handleSaveLine = async (lineData: InvoiceLineInput) => {
    const newLines = [...currentLineInputs];
    if (editingLineIndex !== null) {
      newLines[editingLineIndex] = lineData;
    } else {
      newLines.push(lineData);
    }

    try {
      await updateDraftMutation.mutateAsync({
        customer_gstin: customerGstin.trim(),
        place_of_supply_state: placeOfSupply.trim(),
        notes: notes.trim(),
        terms: terms.trim(),
        lines: newLines,
      });
      setIsLineSheetOpen(false);
      toast.success(t("linesUpdatedToast"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("lineSaveFailed");
      toast.error(msg);
    }
  };

  // Delete a line
  const handleDeleteLine = async (index: number) => {
    if (!window.confirm(t("deleteLineConfirm"))) return;
    const newLines = currentLineInputs.filter((_, idx) => idx !== index);
    if (newLines.length === 0) {
      toast.error(t("cannotDeleteLastLine"));
      return;
    }

    try {
      await updateDraftMutation.mutateAsync({
        customer_gstin: customerGstin.trim(),
        place_of_supply_state: placeOfSupply.trim(),
        notes: notes.trim(),
        terms: terms.trim(),
        lines: newLines,
      });
      toast.success(t("lineDeletedToast"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("lineDeleteFailed");
      toast.error(msg);
    }
  };

  // Issue Draft
  const handleIssueConfirm = async () => {
    try {
      await issueMutation.mutateAsync();
      toast.success(t("invoiceIssuedToast"));
      setActiveTab("preview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("issueFailed");
      toast.error(msg);
      throw err;
    }
  };

  // Cancel Issued Invoice
  const handleCancelConfirm = async (reason: string) => {
    try {
      const res = await cancelMutation.mutateAsync({ reason });
      toast.success(t("invoiceCancelledToast"));
      if (res.credit_note?.id) {
        setCreditNoteCreatedId(res.credit_note.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("cancelFailed");
      toast.error(msg);
      throw err;
    }
  };

  // Delete Draft Invoice
  const handleDeleteDraft = async () => {
    if (!window.confirm(t("deleteDraftConfirm"))) return;
    try {
      await deleteDraftMutation.mutateAsync(invoice.id);
      toast.success(t("draftDeletedToast"));
      if (invoice.job_id) {
        router.push(`/jobs/detail/?id=${invoice.job_id}`);
      } else {
        router.push("/invoices/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("draftDeleteFailed");
      toast.error(msg);
    }
  };

  return (
    <div className="flex-1 px-4 py-4 space-y-4 max-w-2xl mx-auto pb-28">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (invoice.job_id) {
              router.push(`/jobs/detail/?id=${invoice.job_id}`);
            } else {
              router.push("/invoices/");
            }
          }}
          className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{invoice.job_id ? t("backToJob") : t("backToInvoices")}</span>
        </button>

        {invoice.job_id && (
          <Link
            href={`/jobs/detail/?id=${invoice.job_id}`}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-xl hover:bg-neutral-200 transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-neutral-500" />
            <span>{t("viewJob")}</span>
          </Link>
        )}
      </div>

      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t("invoiceCancelledBanner")}</span>
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-300">
            <span className="font-semibold">{t("cancelReasonLabel")}:</span>{" "}
            {invoice.cancel_reason || t("noReasonSpecified")}
          </p>
          {(creditNoteCreatedId || invoice.original_invoice_id) && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const targetId = creditNoteCreatedId || invoice.original_invoice_id;
                  router.push(`/invoices/detail/?id=${targetId}`);
                }}
                className="text-xs font-bold h-8 rounded-xl border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50"
              >
                {creditNoteCreatedId ? t("viewCreditNote") : t("viewOriginalInvoice")}
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Mode Switcher for Drafts (Edit vs Preview) */}
      {isDraft && (
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "edit"
                ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{t("editDraftTab")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "preview"
                ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t("previewTab")}</span>
          </button>
        </div>
      )}

      {/* Draft Edit Tab */}
      {isDraft && activeTab === "edit" ? (
        <div className="space-y-4">
          {/* Header & Meta Edit Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {t("invoiceDetails")}
                </h3>
                <p className="text-xs text-neutral-500">{t("invoiceDetailsSubtitle")}</p>
              </div>
              <Badge variant="outline" className="text-xs text-amber-600 bg-amber-50 border-amber-200">
                {t("statuses.draft")}
              </Badge>
            </div>

            {/* Customer GSTIN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cust-gstin" className="text-xs font-semibold">
                  {t("customerGstin")}
                </Label>
                <span className="text-[11px] text-neutral-400">{t("optional")}</span>
              </div>
              <Input
                id="cust-gstin"
                value={customerGstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                placeholder="27AAPFU0939F1ZV"
                maxLength={15}
                className={`rounded-xl h-11 uppercase font-mono text-xs ${
                  gstinError ? "border-rose-400 focus-visible:ring-rose-400" : ""
                }`}
              />
              {gstinError ? (
                <p className="text-[11px] font-semibold text-rose-600">{gstinError}</p>
              ) : (
                customerGstin.length === 15 && (
                  <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("validGstin")}
                  </p>
                )
              )}
            </div>

            {/* Place of Supply */}
            <div className="space-y-1.5">
              <Label htmlFor="pos-select" className="text-xs font-semibold">
                {t("placeOfSupply")}
              </Label>
              <select
                id="pos-select"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-background text-xs font-medium focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">{t("selectPlaceOfSupply")}</option>
                {GST_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-notes" className="text-xs font-semibold">
                  {t("notes")}
                </Label>
                <Textarea
                  id="inv-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notesPlaceholder")}
                  className="rounded-xl min-h-[75px] text-xs resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv-terms" className="text-xs font-semibold">
                  {t("terms")}
                </Label>
                <Textarea
                  id="inv-terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder={t("termsPlaceholder")}
                  className="rounded-xl min-h-[75px] text-xs resize-none"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updateDraftMutation.isPending}
              onClick={handleSaveDraftMeta}
              className="text-xs font-semibold rounded-xl"
            >
              {updateDraftMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : null}
              {t("saveHeaderBtn")}
            </Button>
          </div>

          {/* Line Items Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {t("lineItemsTitle")}
                </h3>
                <p className="text-xs text-neutral-500">{t("lineItemsSubtitle")}</p>
              </div>

              <Button
                size="sm"
                onClick={handleAddLine}
                className="h-9 rounded-xl gap-1 font-semibold text-xs bg-neutral-900 text-white hover:bg-neutral-800"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addLine")}
              </Button>
            </div>

            {/* Lines List */}
            <div className="space-y-2">
              {invoice.lines.map((line, idx) => (
                <div
                  key={line.id || idx}
                  className="p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {line.description}
                      </span>
                      {line.hsn_sac && (
                        <span className="text-[10px] font-mono text-neutral-400">
                          [{line.hsn_sac}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-neutral-500 text-[11px] mt-0.5">
                      <span>{line.quantity} × {formatPaise(line.unit_price_paise)}</span>
                      {line.discount_paise > 0 && (
                        <span className="text-rose-500">
                          -{formatPaise(line.discount_paise)}
                        </span>
                      )}
                      {line.tax_rate_bp > 0 && (
                        <span>+{line.tax_rate_bp / 100}% GST</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {formatPaise(line.line_total_paise)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditLine(idx)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
                      title={t("editLineTitle")}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLine(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title={t("deleteLine")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Financial Totals Summary */}
            <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50 space-y-1.5 text-xs pt-3">
              <div className="flex justify-between text-neutral-500">
                <span>{t("taxableAmount")}:</span>
                <span className="font-semibold text-neutral-800 tabular-nums">
                  {formatPaise(invoice.taxable_paise)}
                </span>
              </div>
              {invoice.cgst_paise > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>CGST:</span>
                  <span className="font-semibold text-neutral-800 tabular-nums">
                    {formatPaise(invoice.cgst_paise)}
                  </span>
                </div>
              )}
              {invoice.sgst_paise > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>SGST:</span>
                  <span className="font-semibold text-neutral-800 tabular-nums">
                    {formatPaise(invoice.sgst_paise)}
                  </span>
                </div>
              )}
              {invoice.igst_paise > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>IGST:</span>
                  <span className="font-semibold text-neutral-800 tabular-nums">
                    {formatPaise(invoice.igst_paise)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-neutral-900 dark:text-neutral-100 pt-1.5 border-t border-neutral-200 dark:border-neutral-700">
                <span>{t("grandTotal")}:</span>
                <span className="tabular-nums">{formatPaise(invoice.total_paise)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview View (for Draft Preview or Issued / Cancelled) */
        <InvoicePreview
          invoice={invoice}
          shopName={currentShop?.name}
          shopPhone={currentShop?.phone}
        />
      )}

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-neutral-200/90 dark:border-border p-3 flex items-center justify-between gap-2 max-w-2xl mx-auto">
        {isDraft ? (
          <>
            {canCreateDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteDraft}
                disabled={deleteDraftMutation.isPending}
                className="rounded-xl h-11 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>{t("deleteDraftBtn")}</span>
              </Button>
            )}

            {canIssue && (
              <Button
                type="button"
                onClick={() => setIsIssueDialogOpen(true)}
                disabled={issueMutation.isPending || (invoice.lines || []).length === 0}
                className="flex-1 rounded-xl h-11 font-bold text-xs bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                <span>{t("issueInvoiceBtn")}</span>
              </Button>
            )}
          </>
        ) : isIssued ? (
          <>
            {canCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelDialogOpen(true)}
                disabled={cancelMutation.isPending}
                className="rounded-xl h-11 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                <span>{t("cancelWithCreditNoteBtn")}</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="flex-1 rounded-xl h-11 text-xs font-semibold border-neutral-300"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>{t("printBtn")}</span>
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="flex-1 rounded-xl h-11 text-xs font-semibold border-neutral-300"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            <span>{t("printBtn")}</span>
          </Button>
        )}
      </div>

      {/* Sheets & Dialogs */}
      <InvoiceLineSheet
        open={isLineSheetOpen}
        onOpenChange={setIsLineSheetOpen}
        itemToEdit={editingLineItem}
        isGstEnabled={isGstEnabled}
        onSave={handleSaveLine}
        isSaving={updateDraftMutation.isPending}
      />

      <IssueInvoiceDialog
        open={isIssueDialogOpen}
        onOpenChange={setIsIssueDialogOpen}
        onConfirm={handleIssueConfirm}
        isIssuing={issueMutation.isPending}
      />

      <CancelInvoiceDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        invoiceNumber={invoice.number_display || "Invoice"}
        onConfirm={handleCancelConfirm}
        isCancelling={cancelMutation.isPending}
      />
    </div>
  );
}

export default function InvoiceDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <InvoiceDetailContent />
    </React.Suspense>
  );
}
