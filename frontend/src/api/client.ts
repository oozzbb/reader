const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export interface SearchResult {
  name: string;
  author: string;
  cover_url: string;
  intro: string;
  book_url: string;
  source_url: string;
  source_name: string;
  last_chapter: string;
  kind: string;
}

export interface BookInfo {
  name: string;
  author: string;
  cover_url: string;
  intro: string;
  book_url: string;
  source_url: string;
}

export interface Chapter {
  title: string;
  url: string;
  idx: number;
}

export interface SourceItem {
  book_source_url: string;
  book_source_name: string;
  book_source_group: string;
  book_source_type: number;
  enabled: boolean;
}

export const api = {
  search: (keyword: string) =>
    request<SearchResult[]>(`/search?keyword=${encodeURIComponent(keyword)}`),

  getBookInfo: (bookUrl: string, sourceUrl: string) =>
    request<BookInfo>(
      `/content/book-info?book_url=${encodeURIComponent(bookUrl)}&source_url=${encodeURIComponent(sourceUrl)}`
    ),

  getChapters: (bookUrl: string, sourceUrl: string) =>
    request<Chapter[]>(
      `/content/chapters?book_url=${encodeURIComponent(bookUrl)}&source_url=${encodeURIComponent(sourceUrl)}`
    ),

  getChapterContent: (url: string, sourceUrl: string) =>
    request<{ content: string }>(
      `/content/chapter?url=${encodeURIComponent(url)}&source_url=${encodeURIComponent(sourceUrl)}`
    ),

  getSources: () => request<SourceItem[]>("/sources"),

  importSources: (sources: unknown[]) =>
    request<{ count: number }>("/sources/import", {
      method: "POST",
      body: JSON.stringify(sources),
    }),

  importSourcesFromUrl: (url: string) =>
    request<{ count: number }>("/sources/import-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  toggleSource: (url: string) =>
    request<{ enabled: boolean }>(`/sources/${encodeURIComponent(url)}/toggle`, {
      method: "PUT",
    }),

  deleteSource: (url: string) =>
    request<void>(`/sources/${encodeURIComponent(url)}`, {
      method: "DELETE",
    }),

  saveProgress: (data: {
    book_url: string;
    source_url: string;
    book_name: string;
    chapter_idx: number;
    chapter_title: string;
    chapter_url: string;
    scroll_percent: number;
  }) =>
    request<void>("/progress", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProgressList: () => request<ProgressItem[]>("/progress"),

  getProgress: (bookUrl: string) =>
    request<ProgressItem | null>(`/progress/${encodeURIComponent(bookUrl)}`),
};

export interface ProgressItem {
  book_url: string;
  source_url: string;
  book_name: string;
  chapter_idx: number;
  chapter_title: string;
  chapter_url: string;
  scroll_percent: number;
  updated_at: string;
}
