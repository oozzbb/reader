import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { get as idbGet } from "idb-keyval";

interface BookItem {
  id: number;
  name: string;
  author: string;
  book_url: string;
  source_url: string;
  total_chapters: number;
}

export default function Shelf() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadedSet, setDownloadedSet] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/books").then((r) => r.json()).then(setBooks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!books.length) return;
    const checkDownloads = async () => {
      const downloaded = new Set<string>();
      for (const book of books) {
        const meta = await idbGet(`dl:${book.book_url}`).catch(() => null);
        if (meta && typeof meta === "object" && (meta as { status: string }).status === "done") {
          downloaded.add(book.book_url);
        }
      }
      setDownloadedSet(downloaded);
    };
    checkDownloads();
  }, [books]);

  const handleClick = async (book: BookItem) => {
    try {
      const progress = await api.getProgress(book.book_url);
      if (progress && progress.chapter_url) {
        navigate(
          `/read?url=${encodeURIComponent(progress.chapter_url)}&source_url=${encodeURIComponent(progress.source_url)}&title=${encodeURIComponent(progress.chapter_title)}&idx=${progress.chapter_idx}&book_url=${encodeURIComponent(book.book_url)}&book_name=${encodeURIComponent(book.name)}&scroll=${progress.scroll_percent || 0}`
        );
        return;
      }
    } catch {}
    navigate(`/book?book_url=${encodeURIComponent(book.book_url)}&source_url=${encodeURIComponent(book.source_url)}`);
  };

  if (loading) return null;

  if (books.length === 0) {
    return (
      <div className="pt-20 text-center">
        <p className="text-[15px] text-[#86868b]">书架为空</p>
        <p className="text-[12px] text-[#c7c7cc] mt-1.5">从排行榜或搜索结果中添加</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider mb-4">
        书架
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-3">
        {books.map((book) => (
          <button
            key={book.id}
            onClick={() => handleClick(book)}
            className="w-full text-left p-3.5 md:rounded-xl md:bg-white md:shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-b border-black/[0.04] md:border-0 active:scale-[0.98] transition-transform duration-150"
          >
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-medium text-[#1d1d1f] truncate flex-1">{book.name}</p>
              {downloadedSet.has(book.book_url) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#34c759]/10 text-[#34c759] font-medium flex-shrink-0">
                  离线
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#86868b] mt-1">
              {book.author ? `${book.author} · ` : ""}{book.total_chapters} 章
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
