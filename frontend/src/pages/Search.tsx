import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useBookStore } from "@/stores/bookStore";

export default function Search() {
  const [params] = useSearchParams();
  const keyword = params.get("keyword") || "";
  const { searchResults, loading, search } = useBookStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (keyword) search(keyword);
  }, [keyword, search]);

  const handleBookClick = (bookUrl: string, sourceUrl: string) => {
    navigate(
      `/book?book_url=${encodeURIComponent(bookUrl)}&source_url=${encodeURIComponent(sourceUrl)}`
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-base text-ink">{keyword}</h2>
        <p className="text-xs text-ink-muted mt-1">
          {loading ? `搜索中 (${searchResults.length})` : `${searchResults.length} 个结果`}
        </p>
      </div>

      <div className="divide-y divide-ink-faint/20">
        {searchResults.map((item, i) => (
          <button
            key={`${item.book_url}-${i}`}
            onClick={() => handleBookClick(item.book_url, item.source_url)}
            className="w-full text-left py-4 group"
          >
            <p className="text-[15px] text-ink group-hover:text-accent transition-colors">
              {item.name}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {item.author}
              {item.source_name && (
                <span className="ml-2 text-ink-faint">· {item.source_name}</span>
              )}
            </p>
          </button>
        ))}
      </div>

      {!loading && searchResults.length === 0 && keyword && (
        <p className="text-sm text-ink-muted pt-8 text-center">未找到相关书籍</p>
      )}
    </div>
  );
}
