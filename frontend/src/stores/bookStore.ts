import { create } from "zustand";
import { SearchResult, Chapter } from "@/api/client";
import { api } from "@/api/client";

interface BookState {
  searchResults: SearchResult[];
  chapters: Chapter[];
  loading: boolean;
  error: string;
  search: (keyword: string) => Promise<void>;
  loadChapters: (bookUrl: string, sourceUrl: string) => Promise<void>;
}

export const useBookStore = create<BookState>((set, get) => ({
  searchResults: [],
  chapters: [],
  loading: false,
  error: "",

  search: async (keyword: string) => {
    set({ searchResults: [], loading: true, error: "" });

    try {
      const response = await fetch(
        `/api/search?keyword=${encodeURIComponent(keyword)}`
      );
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;

          try {
            const batch: SearchResult[] = JSON.parse(payload);
            set({ searchResults: [...get().searchResults, ...batch] });
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loading: false });
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
