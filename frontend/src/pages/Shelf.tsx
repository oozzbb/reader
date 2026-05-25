import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface BookItem {
  id: number;
  name: string;
  author: string;
  cover_url: string;
  book_url: string;
  source_url: string;
  total_chapters: number;
  updated_at: string;
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
    return <p className="text-center py-8 text-gray-500">加载中...</p>;
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">书架空空</p>
        <p className="text-sm">搜索书籍后点击"加入书架"</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">书架</h2>
      <div className="grid gap-3">
        {books.map((book) => (
          <div
            key={book.id}
            onClick={() => handleClick(book)}
            className="flex gap-3 p-3 rounded-lg bg-surface dark:bg-surface-dark border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary transition-colors"
          >
            {book.cover_url && (
              <img
                src={book.cover_url}
                alt={book.name}
                className="w-12 h-16 object-cover rounded flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{book.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
              <p className="text-xs text-gray-400 mt-1">{book.total_chapters} 章</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
