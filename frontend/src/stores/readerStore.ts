import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  theme: "light" | "dark" | "sepia";
  padding: "sm" | "md" | "lg";
}

interface ReaderState {
  content: string;
  chapterTitle: string;
  chapterIdx: number;
  loading: boolean;
  settings: ReaderSettings;
  setContent: (content: string, title: string, idx: number) => void;
  setLoading: (loading: boolean) => void;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      content: "",
      chapterTitle: "",
      chapterIdx: 0,
      loading: false,
      settings: {
        fontSize: 18,
        lineHeight: 1.8,
        theme: "light",
        padding: "md",
      },

      setContent: (content, title, idx) =>
        set({ content, chapterTitle: title, chapterIdx: idx, loading: false }),

      setLoading: (loading) => set({ loading }),

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
    }),
    { name: "reader-settings" }
  )
);
