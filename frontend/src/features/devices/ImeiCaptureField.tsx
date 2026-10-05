import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Barcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { isNative } from "@/native/platform";
import { scanBarcode } from "@/native/barcode";
import { takePhoto } from "@/native/camera";
import { recognizeText } from "@/native/ocr";
import { extractImeiCandidates, ImeiCandidate } from "@/lib/validation/imei-extract";
import { isValidIMEI, formatIMEI } from "@/lib/validation/imei";
import { useImeiLookup } from "./api";

export interface ImeiCaptureFieldProps {
  label?: string;
  value: string;
  onChange: (value: string, capturedVia: "manual" | "barcode" | "ocr", luhnValid?: boolean) => void;
  capturedVia?: "manual" | "barcode" | "ocr";
  confirmInvalid?: boolean;
  onConfirmInvalidChange?: (confirmInvalid: boolean) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export function ImeiCaptureField({
  label,
  value,
  onChange,
  capturedVia = "manual",
  confirmInvalid = false,
  onConfirmInvalidChange,
  placeholder,
  error,
  disabled = false,
  className = "",
  id = "imei-input",
  enterKeyHint,
  onKeyDown,
}: ImeiCaptureFieldProps) {
  const t = useTranslations("devices");
  const tCommon = useTranslations("common");

  const [mounted, setMounted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  // Candidate confirmation state
  const [candidates, setCandidates] = useState<ImeiCandidate[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [confirmSource, setConfirmSource] = useState<"barcode" | "ocr">("barcode");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cleanDigits = value.replace(/\D/g, "");
  const is15Digits = cleanDigits.length === 15;
  const isLuhnValid = is15Digits ? isValidIMEI(cleanDigits) : null;

  // Duplicate lookup
  const { data: lookupData, isLoading: isLookingUp } = useImeiLookup(
    is15Digits ? cleanDigits : null
  );

  const duplicateMatches = lookupData?.matches ?? [];

  // Handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").slice(0, 15);
    const valid = digits.length === 15 ? isValidIMEI(digits) : undefined;
    onChange(digits, "manual", valid);
  };

  const handleScanBarcode = async () => {
    try {
      setIsScanning(true);
      const text = await scanBarcode();
      if (!text) return; // User cancelled

      const found = extractImeiCandidates(text);
      if (found.length === 0) {
        toast.error(t("imeiCapture.noCandidatesFound"));
        return;
      }

      setCandidates(found);
      setSelectedCandidateIndex(0);
      setConfirmSource("barcode");
      setConfirmDialogOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCapturePhoto = async () => {
    try {
      setIsCapturingPhoto(true);
      const photoBlob = await takePhoto();
      const text = await recognizeText(photoBlob);
      const found = extractImeiCandidates(text);

      if (found.length === 0) {
        toast.error(t("imeiCapture.noCandidatesFound"));
        return;
      }

      setCandidates(found);
      setSelectedCandidateIndex(0);
      setConfirmSource("ocr");
      setConfirmDialogOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("cancel")) {
        toast.error(msg);
      }
    } finally {
      setIsCapturingPhoto(false);
    }
  };

  const handleConfirmCandidate = () => {
    const chosen = candidates[selectedCandidateIndex];
    if (!chosen) return;
    onChange(chosen.value, confirmSource, chosen.luhnValid);
    setConfirmDialogOpen(false);
    toast.success(
      confirmSource === "barcode"
        ? t("imeiCapture.sourceBarcode")
        : t("imeiCapture.sourceOcr")
    );
  };

  const showNativeActions = mounted && isNative();

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with Label and Source Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {label && (
            <label
              htmlFor={id}
              className="text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              {label}
            </label>
          )}

          {/* Source badge */}
          {value.length > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-medium capitalize"
            >
              {capturedVia === "barcode"
                ? t("imeiCapture.sourceBarcode")
                : capturedVia === "ocr"
                ? t("imeiCapture.sourceOcr")
                : t("imeiCapture.sourceManual")}
            </Badge>
          )}
        </div>

        {cleanDigits.length > 0 && (
          <span className="text-[11px] font-mono text-neutral-400">
            {cleanDigits.length}/15 digits
          </span>
        )}
      </div>

      {/* Input Row with Scan / Photo Buttons */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            maxLength={18}
            placeholder={placeholder || t("imeiPlaceholder")}
            value={cleanDigits}
            onChange={handleTextChange}
            disabled={disabled}
            enterKeyHint={enterKeyHint}
            onKeyDown={onKeyDown}
            className={`h-11 text-sm font-mono tracking-wider rounded-xl pr-9 ${
              isLuhnValid === false && !confirmInvalid
                ? "border-amber-500"
                : isLuhnValid === true
                ? "border-emerald-500"
                : ""
            }`}
          />
          <div className="absolute right-3 top-3.5 pointer-events-none">
            {isLookingUp ? (
              <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
            ) : isLuhnValid === true ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : isLuhnValid === false ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : null}
          </div>
        </div>

        {/* Native Scan & Photo Buttons */}
        {showNativeActions && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isScanning || isCapturingPhoto}
              onClick={handleScanBarcode}
              className="h-11 px-3 rounded-xl border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 text-xs font-semibold"
              title={t("imeiCapture.scanBtn")}
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              ) : (
                <Barcode className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              )}
              <span className="hidden sm:inline">{t("imeiCapture.scanBtn")}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isScanning || isCapturingPhoto}
              onClick={handleCapturePhoto}
              className="h-11 px-3 rounded-xl border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 text-xs font-semibold"
              title={t("imeiCapture.photoBtn")}
            >
              {isCapturingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              ) : (
                <Camera className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
              )}
              <span className="hidden sm:inline">{t("imeiCapture.photoBtn")}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Duplicate Warning */}
      {duplicateMatches.length > 0 && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-50 dark:bg-sky-950/30 p-2.5 text-xs text-sky-900 dark:text-sky-200 space-y-1">
          {duplicateMatches.map((m, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {m.last_job_no
                  ? t("imeiCapture.duplicateWarning", {
                      customer: m.customer_name,
                      jobNo: m.last_job_no,
                    })
                  : t("imeiCapture.duplicateWarningNoJob", {
                      customer: m.customer_name,
                    })}
              </span>
              {m.last_job_id && (
                <Link
                  href={`/jobs/detail/?id=${m.last_job_id}`}
                  className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                >
                  <span>#{m.last_job_no}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invalid Luhn Warning & Confirm Checkbox */}
      {isLuhnValid === false && onConfirmInvalidChange && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>{t("invalidLuhnWarning")}</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox
              id={`${id}-confirm-invalid`}
              checked={confirmInvalid}
              onCheckedChange={(checked) => onConfirmInvalidChange(Boolean(checked))}
            />
            <label
              htmlFor={`${id}-confirm-invalid`}
              className="text-xs cursor-pointer select-none font-medium leading-tight"
            >
              {t("confirmSaveInvalidImei")}
            </label>
          </div>
        </div>
      )}

      {/* Field Error */}
      {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}

      {/* Confirmation Dialog for Candidates (AGENTS.md: never auto-save OCR/scanned output) */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold">
              {t("imeiCapture.confirmCandidateTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {t("imeiCapture.confirmCandidateDesc")}
            </DialogDescription>
          </DialogHeader>

          {/* Candidates list */}
          <div className="space-y-2 py-3 max-h-60 overflow-y-auto">
            {candidates.map((cand, idx) => {
              const isSelected = selectedCandidateIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedCandidateIndex(idx)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-1 ring-sky-500"
                      : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold tracking-wider text-neutral-900 dark:text-neutral-100">
                      {formatIMEI(cand.value)}
                    </span>
                    {cand.luhnValid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Luhn OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Check digit fail
                      </span>
                    )}
                  </div>

                  {cand.convertedFromImeisv && (
                    <Badge variant="outline" className="w-fit text-[10px] text-sky-600 border-sky-300">
                      {t("imeiCapture.convertedImeisvBadge")}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl h-11"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              className="rounded-xl h-11 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold"
              onClick={handleConfirmCandidate}
            >
              {t("imeiCapture.useThis")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
