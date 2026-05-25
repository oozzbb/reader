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
    fetch("/api/books").then((r) => r.json()).then(setBooks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleClick = (book: BookItem) => {
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
            <p className="text-[15px] font-medium text-[#1d1d1f] truncate">{book.name}</p>
            <p className="text-[12px] text-[#86868b] mt-1">
              {book.author ? `${book.author} · ` : ""}{book.total_chapters} 章
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
