import { create } from "zustand";

export interface ServerWakeState {
  waking: boolean;
  setWaking: (waking: boolean) => void;
}

export const useServerWakeStore = create<ServerWakeState>((set) => ({
  waking: false,
  setWaking: (waking: boolean) => set({ waking }),
}));
