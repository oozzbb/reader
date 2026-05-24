import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useBookStore } from "@/stores/bookStore";

export default function Search() {
  const [params] = useSearchParams();
  const keyword = params.get("keyword") || "";
  const { searchResults, loading, error, search } = useBookStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (keyword) {
      search(keyword);
    }
  }, [keyword, search]);

  const handleBookClick = (bookUrl: string, sourceUrl: string) => {
    navigate(
      `/book?book_url=${encodeURIComponent(bookUrl)}&source_url=${encodeURIComponent(sourceUrl)}`
    );
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        搜索: {keyword}
        {loading && <span className="ml-2 text-sm text-gray-500">加载中...</span>}
      </h2>

      {error && (
        <div className="text-red-500 text-sm mb-4">{error}</div>
      )}

      <div className="grid gap-3">
        {searchResults.map((item, i) => (
          <div
            key={`${item.book_url}-${i}`}
            onClick={() => handleBookClick(item.book_url, item.source_url)}
            className="flex gap-3 p-3 rounded-lg bg-surface dark:bg-surface-dark border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary transition-colors"
          >
            {item.cover_url && (
              <img
                src={item.cover_url}
                alt={item.name}
                className="w-12 h-16 object-cover rounded flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{item.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {item.author}
                {item.source_name && (
                  <span className="ml-2 text-gray-400">· {item.source_name}</span>
                )}
              </p>
              {item.intro && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {item.intro}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!loading && searchResults.length === 0 && keyword && (
        <p className="text-center text-gray-500 mt-8">未找到结果</p>
      )}
    </div>
  );
}
