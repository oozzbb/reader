import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useBookStore } from "@/stores/bookStore";

export default function Search() {
  const [params] = useSearchParams();
  const keyword = params.get("keyword") || "";
  const { searchResults, loading, search } = useBookStore();
  const navigate = useNavigate();

  useEffect(() => { if (keyword) search(keyword); }, [keyword, search]);

  const handleBookClick = (bookUrl: string, sourceUrl: string) => {
    navigate(`/book?book_url=${encodeURIComponent(bookUrl)}&source_url=${encodeURIComponent(sourceUrl)}`);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[17px] font-bold text-[#1d1d1f]">{keyword}</h1>
        <p className="text-[12px] text-[#86868b] mt-1">
          {loading ? `搜索中 · ${searchResults.length} 条` : `${searchResults.length} 个结果`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
        {searchResults.map((item, i) => (
          <button
            key={`${item.book_url}-${i}`}
            onClick={() => handleBookClick(item.book_url, item.source_url)}
            className="w-full text-left py-3 border-b border-black/[0.04] active:bg-black/[0.02] transition-colors"
          >
            <p className="text-[14px] text-[#1d1d1f] truncate">{item.name}</p>
            <p className="text-[12px] text-[#86868b] mt-0.5 truncate">
              {item.author}
              {item.source_name && <span className="text-[#c7c7cc]"> · {item.source_name}</span>}
            </p>
          </button>
        ))}
      </div>

      {!loading && searchResults.length === 0 && keyword && (
        <p className="text-[13px] text-[#c7c7cc] text-center pt-16">未找到相关书籍</p>
      )}
    </div>
  );
}
