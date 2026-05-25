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

  if (loading) {
    return <p className="text-sm text-ink-muted">...</p>;
  }

  if (books.length === 0) {
    return (
      <div className="pt-12 text-center">
        <p className="text-ink-muted text-sm">书架尚空</p>
        <p className="text-ink-faint text-xs mt-2">搜索后可将书籍加入书架</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xs tracking-widest uppercase text-ink-muted mb-6">
        书架
      </h2>
      <div className="divide-y divide-ink-faint/20">
        {books.map((book) => (
          <button
            key={book.id}
            onClick={() => handleClick(book)}
            className="w-full text-left py-4 group"
          >
            <p className="text-base text-ink group-hover:text-accent transition-colors">
              {book.name}
            </p>
            <p className="text-sm text-ink-muted mt-1">
              {book.author && <span>{book.author} · </span>}
              {book.total_chapters} 章
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
