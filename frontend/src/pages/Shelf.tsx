import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then(setBooks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (book: BookItem) => {
    navigate(
      `/book?book_url=${encodeURIComponent(book.book_url)}&source_url=${encodeURIComponent(book.source_url)}`
    );
  };

  if (loading) return null;

  if (books.length === 0) {
    return (
      <div className="pt-20 text-center">
        <p className="text-[15px] text-[#86868b]">书架为空</p>
        <p className="text-[13px] text-[#c7c7cc] mt-1.5">搜索或从排行榜添加书籍</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider mb-4">
        书架
      </h1>
      <div className="space-y-0">
        {books.map((book) => (
          <button
            key={book.id}
            onClick={() => handleClick(book)}
            className="w-full flex items-center justify-between py-3.5 border-b border-black/[0.04] last:border-0 text-left active:bg-black/[0.02] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-[#1d1d1f] truncate">{book.name}</p>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                {book.author ? `${book.author} · ` : ""}{book.total_chapters} 章
              </p>
            </div>
            <svg className="w-4 h-4 text-[#c7c7cc] flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
