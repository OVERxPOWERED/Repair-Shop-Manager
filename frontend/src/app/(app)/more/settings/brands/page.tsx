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
  Tag,
  Check,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/lib/auth/store";
import { ApiError } from "@/lib/api/client";
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  type ShopBrand,
} from "@/features/settings/api";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "mobile", label: "Mobile" },
  { value: "laptop", label: "Laptop" },
  { value: "tablet", label: "Tablet" },
  { value: "watch", label: "Watch" },
  { value: "television", label: "Television" },
  { value: "appliance", label: "Appliance" },
  { value: "other", label: "Other" },
];

export default function BrandsSettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const canEdit = usePermission("shop.settings");

  const [activeCategory, setActiveCategory] = useState("all");
  const { data: brands = [], isLoading, error, refetch } = useBrands(
    activeCategory === "all" ? undefined : activeCategory
  );

  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<ShopBrand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<ShopBrand | null>(null);

  const [formCategory, setFormCategory] = useState("mobile");
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);

  const openAddDialog = () => {
    setFormCategory(activeCategory === "all" ? "mobile" : activeCategory);
    setFormName("");
    setFormActive(true);
    setFormSortOrder(brands.length * 10);
    setAddDialogOpen(true);
  };

  const openEditDialog = (b: ShopBrand) => {
    setEditingBrand(b);
    setFormCategory(b.device_category);
    setFormName(b.name);
    setFormActive(b.is_active);
    setFormSortOrder(b.sort_order);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Brand name is required.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        device_category: formCategory,
        name: formName.trim(),
        is_active: formActive,
        sort_order: formSortOrder,
      });
      toast.success("Brand added successfully!");
      setAddDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to add brand.";
      toast.error(msg);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand || !formName.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: editingBrand.id,
        data: {
          device_category: formCategory,
          name: formName.trim(),
          is_active: formActive,
          sort_order: formSortOrder,
        },
      });
      toast.success("Brand updated successfully!");
      setEditingBrand(null);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to update brand.";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deletingBrand) return;
    try {
      await deleteMutation.mutateAsync(deletingBrand.id);
      toast.success("Brand deleted successfully.");
      setDeletingBrand(null);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to delete brand.";
      toast.error(msg);
    }
  };

  const sortedBrands = [...brands].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

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
              <h1 className="text-base font-bold text-neutral-900">Brand Catalog</h1>
              <p className="text-xs text-neutral-500">Device manufacturers and brands</p>
            </div>
          </div>
          {canEdit && (
            <Button
              onClick={openAddDialog}
              size="sm"
              className="rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Brand
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Permission Notice */}
        {!canEdit && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>You do not have permission to modify brand catalog.</span>
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Brand List */}
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-7 h-7 text-neutral-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-neutral-200 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">Failed to load brands</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : sortedBrands.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 space-y-3">
            <Tag className="w-10 h-10 text-neutral-300 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">No brands found</p>
            <p className="text-xs text-neutral-500">
              {activeCategory === "all"
                ? "Add brands to help technicians quickly select device models."
                : `No brands defined for category "${activeCategory}".`}
            </p>
            {canEdit && (
              <Button size="sm" onClick={openAddDialog} className="rounded-xl mt-2">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add First Brand
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm divide-y divide-neutral-100 overflow-hidden">
            {sortedBrands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between p-3.5 hover:bg-neutral-50 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900">{brand.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold uppercase ${
                        brand.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {brand.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-400 capitalize">
                    {brand.device_category} • Sort: {brand.sort_order}
                  </p>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900"
                      onClick={() => openEditDialog(brand)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => setDeletingBrand(brand)}
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

      {/* Add Brand Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add Device Brand</DialogTitle>
              <DialogDescription className="text-xs">
                Enter manufacturer name and select device category.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Device Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Brand Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Apple, Samsung, Xiaomi"
                  className="h-11 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs font-semibold text-neutral-700">Active</Label>
                <Switch checked={formActive} onCheckedChange={setFormActive} />
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
                {createMutation.isPending ? "Adding..." : "Add Brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Brand Dialog */}
      <Dialog open={Boolean(editingBrand)} onOpenChange={(open) => !open && setEditingBrand(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Edit Brand</DialogTitle>
              <DialogDescription className="text-xs">
                Update brand details or change category.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Device Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-700">Brand Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label className="text-xs font-semibold text-neutral-700">Active</Label>
                <Switch checked={formActive} onCheckedChange={setFormActive} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingBrand(null)}
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

      {/* Delete Brand Dialog */}
      <Dialog open={Boolean(deletingBrand)} onOpenChange={(open) => !open && setDeletingBrand(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">Delete Brand</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove &quot;{deletingBrand?.name}&quot;? Existing devices using this brand will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingBrand(null)}
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
              {deleteMutation.isPending ? "Deleting..." : "Delete Brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
