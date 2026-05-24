import { create } from "zustand";
import { api, SearchResult, Chapter } from "@/api/client";

interface BookState {
  searchResults: SearchResult[];
  chapters: Chapter[];
  loading: boolean;
  error: string;
  search: (keyword: string) => Promise<void>;
  loadChapters: (bookUrl: string, sourceUrl: string) => Promise<void>;
}

export const useBookStore = create<BookState>((set) => ({
  searchResults: [],
  chapters: [],
  loading: false,
  error: "",

  search: async (keyword: string) => {
    set({ loading: true, error: "" });
    try {
      const results = await api.search(keyword);
      set({ searchResults: results, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loadChapters: async (bookUrl: string, sourceUrl: string) => {
    set({ loading: true, error: "" });
    try {
      const chapters = await api.getChapters(bookUrl, sourceUrl);
      set({ chapters, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
