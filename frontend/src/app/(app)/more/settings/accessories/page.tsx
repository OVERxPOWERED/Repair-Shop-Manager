"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  PackageCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  useAccessories,
  useCreateAccessory,
  useUpdateAccessory,
  useDeleteAccessory,
  type AccessoryOption,
} from "@/features/settings/api";

export default function AccessoriesSettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const canEdit = usePermission("shop.settings");

  const { data: accessories = [], isLoading, error, refetch } = useAccessories();
  const createMutation = useCreateAccessory();
  const updateMutation = useUpdateAccessory();
  const deleteMutation = useDeleteAccessory();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<AccessoryOption | null>(null);
  const [deletingAccessory, setDeletingAccessory] = useState<AccessoryOption | null>(null);

  const [formName, setFormName] = useState("");
  const [formDefault, setFormDefault] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState(0);

  const openAddDialog = () => {
    setFormName("");
    setFormDefault(false);
    setFormSortOrder(accessories.length * 10);
    setAddDialogOpen(true);
  };

  const openEditDialog = (item: AccessoryOption) => {
    setEditingAccessory(item);
    setFormName(item.name);
    setFormDefault(item.is_default);
    setFormSortOrder(item.sort_order);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Accessory name is required.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: formName.trim(),
        is_default: formDefault,
        sort_order: formSortOrder,
      });
      toast.success("Accessory added successfully!");
      setAddDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to add accessory.";
      toast.error(msg);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccessory || !formName.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: editingAccessory.id,
        data: {
          name: formName.trim(),
          is_default: formDefault,
          sort_order: formSortOrder,
        },
      });
      toast.success("Accessory updated successfully!");
      setEditingAccessory(null);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to update accessory.";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccessory) return;
    try {
      await deleteMutation.mutateAsync(deletingAccessory.id);
      toast.success("Accessory removed.");
      setDeletingAccessory(null);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete accessory.";
      toast.error(msg);
    }
  };

  const sortedAccessories = [...accessories].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  );

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
              <h1 className="text-base font-bold text-neutral-900">Accessories Checklist</h1>
              <p className="text-xs text-neutral-500">Items received with customer devices</p>
            </div>
          </div>
          {canEdit && (
            <Button
              onClick={openAddDialog}
              size="sm"
              className="rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Item
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Permission Notice */}
        {!canEdit && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>You do not have permission to modify accessory options.</span>
          </div>
        )}

        {/* Accessory list */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-7 h-7 text-neutral-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-neutral-200 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">Failed to load accessories</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : sortedAccessories.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 space-y-3">
            <PackageCheck className="w-10 h-10 text-neutral-300 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">No accessory items defined</p>
            <p className="text-xs text-neutral-500">
              Add accessories like SIM Card, Charger, Back Cover, Memory Card to checklist upon intake.
            </p>
            {canEdit && (
              <Button size="sm" onClick={openAddDialog} className="rounded-xl mt-2">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add First Item
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm divide-y divide-neutral-100 overflow-hidden">
            {sortedAccessories.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 hover:bg-neutral-50 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900">{item.name}</span>
                    {item.is_default && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1"
                      >
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">Sort Order: {item.sort_order}</p>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => setDeletingAccessory(item)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Accessory Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add Accessory Item</DialogTitle>
              <DialogDescription className="text-xs">
                Checklist items when receiving customer devices.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Item Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. SIM Card, Charger, Back Cover"
                  className="h-11 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-neutral-700">Pre-select by Default</Label>
                  <p className="text-[11px] text-neutral-400">Automatically checked on intake</p>
                </div>
                <Switch checked={formDefault} onCheckedChange={setFormDefault} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-neutral-900 text-white"
              >
                {createMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Accessory Dialog */}
      <Dialog
        open={Boolean(editingAccessory)}
        onOpenChange={(open) => !open && setEditingAccessory(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Edit Accessory</DialogTitle>
              <DialogDescription className="text-xs">
                Update accessory name or default selection.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Item Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-neutral-700">Pre-select by Default</Label>
                  <p className="text-[11px] text-neutral-400">Automatically checked on intake</p>
                </div>
                <Switch checked={formDefault} onCheckedChange={setFormDefault} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingAccessory(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-neutral-900 text-white"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Accessory Dialog */}
      <Dialog
        open={Boolean(deletingAccessory)}
        onOpenChange={(open) => !open && setDeletingAccessory(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">Delete Accessory</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove &quot;{deletingAccessory?.name}&quot; from intake options? Existing jobs will retain their history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingAccessory(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
