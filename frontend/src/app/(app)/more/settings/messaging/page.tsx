"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Edit3,
  ShieldCheck,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePermission } from "@/lib/auth/store";
import { ApiError } from "@/lib/api/client";
import {
  useShopSettings,
  useUpdateShopSettings,
  useMessageTemplates,
  useUpdateMessageTemplate,
  type MessageTemplate,
} from "@/features/settings/api";

const SMS_EVENT_DEFINITIONS = [
  {
    key: "job_created",
    label: "Job Created / Intake",
    desc: "SMS customer right after job sheet registration with job number",
  },
  {
    key: "status_update",
    label: "Status Changed",
    desc: "SMS customer whenever technician updates diagnosis or progress",
  },
  {
    key: "estimate_ready",
    label: "Estimate Ready",
    desc: "SMS customer when repair quotation requires customer approval",
  },
  {
    key: "ready_for_pickup",
    label: "Repair Completed / Ready",
    desc: "SMS customer that device is tested and ready to pick up",
  },
  {
    key: "delivered",
    label: "Device Delivered",
    desc: "Thank-you SMS sent upon delivery with warranty info",
  },
  {
    key: "invoice_issued",
    label: "Invoice Generated",
    desc: "SMS bill link and summary amount upon invoice issue",
  },
  {
    key: "payment_received",
    label: "Payment Receipt",
    desc: "SMS customer receipt acknowledging cash or UPI payment",
  },
];

const TEMPLATE_VARIABLES = [
  { token: "{customer_name}", label: "Customer Name", sample: "Rahul Sharma" },
  { token: "{shop_name}", label: "Shop Name", sample: "Star Mobile" },
  { token: "{job_no}", label: "Job Number", sample: "1042" },
  { token: "{device_name}", label: "Device", sample: "iPhone 13" },
  { token: "{status}", label: "Status", sample: "Ready for Pickup" },
  { token: "{estimate_amount}", label: "Estimate ₹", sample: "₹1,800" },
  { token: "{balance_amount}", label: "Due ₹", sample: "₹500" },
  { token: "{tracking_url}", label: "Tracking Link", sample: "https://fixpro.in/track/abc" },
];

export default function MessagingSettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const canEdit = usePermission("shop.settings");

  const { data: shop, isLoading: shopLoading, error: shopError, refetch: refetchShop } = useShopSettings();
  const updateShopMutation = useUpdateShopSettings();

  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useMessageTemplates();
  const updateTemplateMutation = useUpdateMessageTemplate();

  const [activeTab, setActiveTab] = useState<"whatsapp" | "sms">("whatsapp");
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateBody, setTemplateBody] = useState("");
  const [templateActive, setTemplateActive] = useState(true);

  // Auto SMS event toggles
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [conflictError, setConflictError] = useState(false);

  useEffect(() => {
    if (shop) {
      setSelectedEvents(shop.auto_sms_events || []);
      setConflictError(false);
    }
  }, [shop]);

  const toggleEvent = async (eventKey: string) => {
    if (!shop || !canEdit) return;
    const next = selectedEvents.includes(eventKey)
      ? selectedEvents.filter((k) => k !== eventKey)
      : [...selectedEvents, eventKey];

    setSelectedEvents(next);

    try {
      await updateShopMutation.mutateAsync({
        data: { auto_sms_events: next },
        version: shop.version,
      });
      toast.success("SMS notification triggers updated.");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(true);
        toast.error("Settings modified by another user. Please reload.");
      } else {
        toast.error("Failed to update SMS triggers.");
      }
      setSelectedEvents(shop.auto_sms_events || []);
    }
  };

  const openTemplateEdit = (tmpl: MessageTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateBody(tmpl.body);
    setTemplateActive(tmpl.is_active);
  };

  const insertVariable = (token: string) => {
    setTemplateBody((prev) => prev + " " + token);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !templateBody.trim()) return;

    try {
      await updateTemplateMutation.mutateAsync({
        id: editingTemplate.id,
        data: {
          body: templateBody.trim(),
          is_active: templateActive,
        },
      });
      toast.success("WhatsApp template updated successfully!");
      setEditingTemplate(null);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to save template.";
      toast.error(msg);
    }
  };

  const previewBody = (raw: string) => {
    let text = raw;
    for (const v of TEMPLATE_VARIABLES) {
      text = text.replaceAll(v.token, v.sample);
    }
    return text;
  };

  const filteredTemplates = templates.filter((t) => t.channel === activeTab);

  if (shopLoading || templatesLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-neutral-900">Messaging & Templates</h1>
              <p className="text-xs text-neutral-500">Automated SMS alerts and WhatsApp copy</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {/* Permission Notice */}
        {!canEdit && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>You do not have permission to modify messaging templates.</span>
          </div>
        )}

        {/* Conflict Error */}
        {conflictError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Another user updated settings. Reload required.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchShop()}
              className="shrink-0 rounded-xl bg-white border-rose-300 text-rose-700"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Reload
            </Button>
          </div>
        )}

        {/* 1. Automated SMS Triggers */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold text-neutral-900">Automatic SMS Alerts</h2>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold text-neutral-500">
              {selectedEvents.length} Active
            </Badge>
          </div>

          <p className="text-xs text-neutral-500">
            FixPro automatically dispatches verified SMS updates to customer mobile numbers when these events occur:
          </p>

          <div className="divide-y divide-neutral-100">
            {SMS_EVENT_DEFINITIONS.map((ev) => {
              const isChecked = selectedEvents.includes(ev.key);
              return (
                <div key={ev.key} className="flex items-center justify-between py-3">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-xs font-semibold text-neutral-800">{ev.label}</Label>
                    <p className="text-[11px] text-neutral-400">{ev.desc}</p>
                  </div>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={() => toggleEvent(ev.key)}
                    disabled={!canEdit || updateShopMutation.isPending}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Message Templates (WhatsApp & SMS) */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold text-neutral-900">Customer Message Templates</h2>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="flex rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("whatsapp")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === "whatsapp"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sms")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === "sms"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              SMS (TRAI DLT)
            </button>
          </div>

          {activeTab === "sms" && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <span className="font-semibold">TRAI DLT Compliance:</span> SMS templates are pre-approved by telecom operators. Content and variables cannot be modified directly.
              </div>
            </div>
          )}

          {activeTab === "whatsapp" && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                Customize WhatsApp share templates for your shop. Click on variables to insert dynamic customer details.
              </div>
            </div>
          )}

          {/* Templates list */}
          <div className="space-y-3 pt-1">
            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-4">No templates found for this channel.</p>
            ) : (
              filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="rounded-xl border border-neutral-200 p-4 space-y-2 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 capitalize">
                        {tmpl.key.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {tmpl.locale}
                      </Badge>
                      {tmpl.shop && (
                        <Badge className="text-[10px] bg-neutral-900 text-white">Custom</Badge>
                      )}
                    </div>
                    {activeTab === "whatsapp" && canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTemplateEdit(tmpl)}
                        className="h-7 text-xs rounded-lg font-semibold text-neutral-600 hover:text-neutral-900"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 font-mono bg-neutral-50 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed">
                    {tmpl.body}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Edit WhatsApp Template Dialog */}
      <Dialog open={Boolean(editingTemplate)} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <form onSubmit={handleSaveTemplate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold capitalize">
                Edit WhatsApp Template: {editingTemplate?.key.replace(/_/g, " ")}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Click chips below to insert customer and job variables.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Variable chips */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Available Variables</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable(v.token)}
                      className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-mono transition-colors"
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Body Textarea */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Template Text</Label>
                <Textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={4}
                  className="rounded-xl text-xs font-mono leading-relaxed"
                />
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Preview with Sample Data</Label>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">
                  {previewBody(templateBody)}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs font-semibold text-neutral-700">Template Active</Label>
                <Switch checked={templateActive} onCheckedChange={setTemplateActive} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTemplate(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateTemplateMutation.isPending}
                className="rounded-xl bg-neutral-900 text-white"
              >
                {updateTemplateMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
