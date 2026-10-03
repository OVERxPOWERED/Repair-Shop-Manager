"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Camera,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { takePhoto } from "@/native/camera";
import { compressImage } from "@/lib/images/compress";

export interface JobPhotoItem {
  id: string;
  url: string;
  kind: "before" | "after" | "damage" | "other" | string;
  caption?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  taken_by_name?: string | null;
  created_at?: string;
}

interface PhotoStripProps {
  photos: JobPhotoItem[];
  canEdit?: boolean;
  maxPhotos?: number;
  onAddPhoto?: (blob: Blob, kind: string, caption?: string) => Promise<void>;
  onDeletePhoto?: (photoId: string) => Promise<void>;
  className?: string;
}

export function PhotoStrip({
  photos,
  canEdit = true,
  maxPhotos = 20,
  onAddPhoto,
  onDeletePhoto,
  className = "",
}: PhotoStripProps) {
  const t = useTranslations("jobs.photos");

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Photo dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<string>("before");
  const [caption, setCaption] = useState("");

  // Delete confirmation dialog state
  const [photoToDelete, setPhotoToDelete] = useState<JobPhotoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const limitReached = photos.length >= maxPhotos;

  const handleCaptureClick = async () => {
    if (limitReached) {
      toast.error(t("limitReached"));
      return;
    }

    try {
      setIsCapturing(true);
      const rawBlob = await takePhoto();
      const compressed = await compressImage(rawBlob, 1600, 0.75);

      const previewUrl = URL.createObjectURL(compressed);
      setPendingBlob(compressed);
      setPendingPreviewUrl(previewUrl);
      setSelectedKind("before");
      setCaption("");
      setAddDialogOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("cancelled") && !msg.toLowerCase().includes("canceled")) {
        toast.error(msg || "Failed to capture photo");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingBlob || !onAddPhoto) return;
    try {
      setIsSubmitting(true);
      await onAddPhoto(pendingBlob, selectedKind, caption.trim());
      toast.success(t("addPhoto"));
      closeAddDialog();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAddDialog = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingBlob(null);
    setPendingPreviewUrl(null);
    setAddDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!photoToDelete || !onDeletePhoto) return;
    try {
      setIsDeleting(true);
      await onDeletePhoto(photoToDelete.id);
      toast.success(t("deleteConfirm"));
      setPhotoToDelete(null);
      if (viewerIndex !== null) {
        setViewerIndex(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete photo";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const activePhoto = viewerIndex !== null && photos[viewerIndex] ? photos[viewerIndex] : null;

  const handlePrev = () => {
    if (viewerIndex !== null && viewerIndex > 0) {
      setViewerIndex(viewerIndex - 1);
    }
  };

  const handleNext = () => {
    if (viewerIndex !== null && viewerIndex < photos.length - 1) {
      setViewerIndex(viewerIndex + 1);
    }
  };

  const getKindBadgeVariant = (kind: string) => {
    switch (kind) {
      case "damage":
        return "destructive";
      case "after":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case "before":
        return t("kinds.before");
      case "after":
        return t("kinds.after");
      case "damage":
        return t("kinds.damage");
      default:
        return t("kinds.other");
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
          <span className="text-xs text-muted-foreground font-mono">
            ({photos.length}/{maxPhotos})
          </span>
        </div>

        {canEdit && onAddPhoto && !limitReached && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCaptureClick}
            disabled={isCapturing}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            {isCapturing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>{t("addPhoto")}</span>
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed border-border/80 bg-muted/20 text-center">
          <Camera className="h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-xs font-medium text-foreground">{t("noPhotos")}</p>
          <p className="text-xs text-muted-foreground max-w-xs mt-0.5">{t("noPhotosDesc")}</p>
          {canEdit && onAddPhoto && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCaptureClick}
              disabled={isCapturing}
              className="mt-3 h-8 text-xs font-medium"
            >
              {isCapturing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {t("takePhoto")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted/40 cursor-pointer shadow-sm hover:border-primary/60 transition-colors"
              onClick={() => setViewerIndex(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || photo.kind}
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                loading="lazy"
              />

              <div className="absolute top-1 left-1 pointer-events-none">
                <Badge
                  variant={getKindBadgeVariant(photo.kind)}
                  className="px-1.5 py-0 text-[10px] leading-tight font-medium shadow-sm backdrop-blur-sm"
                >
                  {getKindLabel(photo.kind)}
                </Badge>
              </div>

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <span className="p-1 rounded-full bg-white/20 text-white hover:bg-white/40 transition">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
                {canEdit && onDeletePhoto && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotoToDelete(photo);
                    }}
                    className="p-1 rounded-full bg-red-600/80 text-white hover:bg-red-600 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {canEdit && onAddPhoto && !limitReached && (
            <button
              type="button"
              onClick={handleCaptureClick}
              disabled={isCapturing}
              className="shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/70 flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors bg-muted/10"
            >
              {isCapturing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-5 w-5 mb-1" />
                  <span className="text-[11px] font-medium">{t("addPhoto")}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Add Photo Details Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addPhoto")}</DialogTitle>
          </DialogHeader>

          {pendingPreviewUrl && (
            <div className="space-y-4 py-2">
              <div className="w-full h-48 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingPreviewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="photo-kind">{t("kindLabel")}</Label>
                <Select value={selectedKind} onValueChange={setSelectedKind}>
                  <SelectTrigger id="photo-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">{t("kinds.before")}</SelectItem>
                    <SelectItem value="damage">{t("kinds.damage")}</SelectItem>
                    <SelectItem value="after">{t("kinds.after")}</SelectItem>
                    <SelectItem value="other">{t("kinds.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="photo-caption">{t("captionLabel")}</Label>
                <Input
                  id="photo-caption"
                  placeholder={t("captionPlaceholder")}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={255}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeAddDialog}
              disabled={isSubmitting}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? t("uploading") : t("addPhoto")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(photoToDelete)} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t("deleteConfirm")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("deletePrompt")}</p>
          <DialogFooter className="gap-2 sm:gap-0 mt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhotoToDelete(null)}
              disabled={isDeleting}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("deleteBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Screen Viewer Dialog */}
      <Dialog open={viewerIndex !== null} onOpenChange={(open) => !open && setViewerIndex(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background">
          {activePhoto && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="relative flex-1 min-h-[300px] bg-black flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePhoto.url}
                  alt={activePhoto.caption || activePhoto.kind}
                  className="max-h-[65vh] w-auto max-w-full object-contain"
                />

                {viewerIndex !== null && viewerIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition"
                    aria-label={t("prev")}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}

                {viewerIndex !== null && viewerIndex < photos.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition"
                    aria-label={t("next")}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}
              </div>

              <div className="p-4 border-t border-border flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getKindBadgeVariant(activePhoto.kind)}>
                      {getKindLabel(activePhoto.kind)}
                    </Badge>
                    {activePhoto.taken_by_name && (
                      <span className="text-xs text-muted-foreground">
                        by {activePhoto.taken_by_name}
                      </span>
                    )}
                  </div>
                  {activePhoto.caption && (
                    <p className="text-sm font-medium text-foreground">{activePhoto.caption}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && onDeletePhoto && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPhotoToDelete(activePhoto)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t("deleteBtn")}</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setViewerIndex(null)}
                    className="h-8 text-xs"
                  >
                    {t("close")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
