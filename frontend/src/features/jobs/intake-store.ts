import { create } from "zustand";
import { persist } from "zustand/middleware";
import { newIdempotencyKey } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

export type IntakePhoto = {
  localId: string;
  blob?: Blob;
  previewUrl?: string;
  kind: "before" | "after" | "damage" | "other";
  caption?: string;
};

export type IntakeDraft = {
  idempotencyKey: string;
  step: number; // 0..7
  customer: {
    id?: string;
    name: string;
    phone: string;
  };
  device: {
    id?: string;
    category: string;
    brandId?: string;
    brandText?: string;
    model: string;
    color: string;
    identifiers: {
      type: "imei1" | "imei2" | "serial";
      value: string;
      capturedVia?: "manual" | "barcode" | "ocr";
      confirmInvalid?: boolean;
    }[];
  };
  conditionTags: string[];
  deviceCondition: string;
  photos: IntakePhoto[];
  accessories: string[];
  faultDescription: string;
  lockType: "none" | "pin" | "pattern" | "password";
  lockValue: string;
  internalNote: string;
  estimatePaise: number;
  expectedDate: string | null;
  advancePaise: number;
  advanceMode: "cash" | "upi" | "card" | "bank";
  advanceReference?: string;
  assignedToId: string | null;
  priority: "low" | "normal" | "urgent";
};

export function createEmptyDraft(): IntakeDraft {
  return {
    idempotencyKey: newIdempotencyKey(),
    step: 0,
    customer: { name: "", phone: "" },
    device: {
      category: "mobile",
      model: "",
      color: "",
      identifiers: [],
    },
    conditionTags: [],
    deviceCondition: "",
    photos: [],
    accessories: [],
    faultDescription: "",
    lockType: "none",
    lockValue: "",
    internalNote: "",
    estimatePaise: 0,
    expectedDate: null,
    advancePaise: 0,
    advanceMode: "cash",
    advanceReference: "",
    assignedToId: null,
    priority: "normal",
  };
}

export type IntakeStoreState = {
  draft: IntakeDraft;
  isDraftRestored: boolean;
  setStep: (step: number) => void;
  updateDraft: (patch: Partial<IntakeDraft>) => void;
  updateCustomer: (customer: Partial<IntakeDraft["customer"]>) => void;
  updateDevice: (device: Partial<IntakeDraft["device"]>) => void;
  addPhoto: (photo: IntakePhoto) => void;
  removePhoto: (localId: string) => void;
  clearDraft: () => void;
  dismissRestoredBanner: () => void;
};

export const useIntakeStore = create<IntakeStoreState>()(
  persist(
    (set) => ({
      draft: createEmptyDraft(),
      isDraftRestored: false,

      setStep: (step) =>
        set((state) => ({
          draft: { ...state.draft, step: Math.max(0, Math.min(7, step)) },
        })),

      updateDraft: (patch) =>
        set((state) => ({
          draft: { ...state.draft, ...patch },
        })),

      updateCustomer: (customer) =>
        set((state) => ({
          draft: {
            ...state.draft,
            customer: { ...state.draft.customer, ...customer },
          },
        })),

      updateDevice: (device) =>
        set((state) => ({
          draft: {
            ...state.draft,
            device: { ...state.draft.device, ...device },
          },
        })),

      addPhoto: (photo) =>
        set((state) => {
          if (state.draft.photos.length >= 20) return state;
          return {
            draft: {
              ...state.draft,
              photos: [...state.draft.photos, photo],
            },
          };
        }),

      removePhoto: (localId) =>
        set((state) => ({
          draft: {
            ...state.draft,
            photos: state.draft.photos.filter((p) => p.localId !== localId),
          },
        })),

      clearDraft: () =>
        set({
          draft: createEmptyDraft(),
          isDraftRestored: false,
        }),

      dismissRestoredBanner: () =>
        set({
          isDraftRestored: false,
        }),
    }),
    {
      name: "fixpro.intakeDraft",
      partialize: (state) => {
        // Exclude lockValue (never store plaintext secrets in localStorage)
        // Exclude photo blob (Blobs cannot be serialized to JSON)
        const { lockValue: _, ...safeDraft } = state.draft;
        const safePhotos = safeDraft.photos.map(({ blob: _b, ...photo }) => photo);
        return {
          draft: {
            ...safeDraft,
            lockValue: "",
            photos: safePhotos,
          },
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const d = state.draft;
          const hasContent = Boolean(
            d.customer?.name ||
              d.customer?.phone ||
              d.device?.model ||
              d.faultDescription ||
              d.conditionTags?.length ||
              d.accessories?.length ||
              d.step > 0
          );
          if (hasContent) {
            state.isDraftRestored = true;
          }
        }
      },
    }
  )
);
