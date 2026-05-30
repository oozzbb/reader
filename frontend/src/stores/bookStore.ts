import { create } from "zustand";
import { SearchResult, Chapter } from "@/api/client";
import { api } from "@/api/client";

function resultKey(item: SearchResult): string {
  return `${item.name}|${item.author}|${item.source_url}|${item.book_url}`.toLowerCase();
}

function mergeStableResults(current: SearchResult[], incoming: SearchResult[]): SearchResult[] {
  const seen = new Set(current.map(resultKey));
  const merged = [...current];
  for (const item of incoming) {
    const key = resultKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

interface BookState {
  searchResults: SearchResult[];
  searchKeyword: string;
  chapters: Chapter[];
  loading: boolean;
  error: string;
  search: (keyword: string) => Promise<void>;
  loadChapters: (bookUrl: string, sourceUrl: string) => Promise<void>;
}

export const useBookStore = create<BookState>((set, get) => ({
  searchResults: [],
  searchKeyword: "",
  chapters: [],
  loading: false,
  error: "",

  search: async (keyword: string) => {
    const current = get();
    if (current.searchKeyword === keyword && (current.loading || current.searchResults.length > 0)) {
      return;
    }

    set({ searchResults: [], searchKeyword: keyword, loading: true, error: "" });

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
            set((state) => ({
              searchResults: state.searchKeyword === keyword
                ? mergeStableResults(state.searchResults, batch)
                : state.searchResults,
            }));
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      if (get().searchKeyword === keyword) {
        set({ error: String(e) });
      }
    } finally {
      if (get().searchKeyword === keyword) {
        set({ loading: false });
      }
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
