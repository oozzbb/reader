import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useBookStore } from "@/stores/bookStore";

export default function Search() {
  const [params] = useSearchParams();
  const keyword = params.get("keyword") || "";
  const { searchResults, searchKeyword, loading, search } = useBookStore();
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState("");
  const [showOther, setShowOther] = useState(false);

  useEffect(() => { if (keyword) search(keyword); }, [keyword, search]);

  const sources = useMemo(() => {
    const s = new Set(searchResults.map((r) => r.source_name).filter(Boolean));
    return Array.from(s).sort();
  }, [searchResults]);

  const { matched, other } = useMemo(() => {
    const kw = (searchKeyword || keyword).toLowerCase();
    let filtered = searchResults;
    if (sourceFilter) {
      filtered = filtered.filter((r) => r.source_name === sourceFilter);
    }
    const matched = filtered.filter(
      (r) => r.name.toLowerCase().includes(kw) || r.author.toLowerCase().includes(kw)
    );
    const other = filtered.filter(
      (r) => !r.name.toLowerCase().includes(kw) && !r.author.toLowerCase().includes(kw)
    );
    return { matched, other };
  }, [searchResults, sourceFilter, searchKeyword, keyword]);

  const handleBookClick = (bookUrl: string, sourceUrl: string) => {
    navigate(`/book?book_url=${encodeURIComponent(bookUrl)}&source_url=${encodeURIComponent(sourceUrl)}`);
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[17px] font-bold text-[#1d1d1f]">{keyword}</h1>
        <p className="text-[12px] text-[#86868b] mt-1">
          {loading ? `搜索中 · ${searchResults.length} 条` : `${matched.length} 个结果${other.length ? ` · ${other.length} 个其他` : ""}`}
        </p>
      </div>

      {/* Filter bar */}
      {sources.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-4 -mx-1 pb-1">
          <button
            onClick={() => setSourceFilter("")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full whitespace-nowrap transition-all ${
              !sourceFilter ? "bg-[#1d1d1f] text-white" : "bg-black/[0.04] text-[#86868b]"
            }`}
          >
            全部
          </button>
          {sources.map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s === sourceFilter ? "" : s)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full whitespace-nowrap transition-all ${
                sourceFilter === s ? "bg-[#1d1d1f] text-white" : "bg-black/[0.04] text-[#86868b]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Matched results */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
        {matched.map((item, i) => (
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

      {/* Other results (collapsed) */}
      {other.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowOther(!showOther)}
            className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
          >
            {showOther ? "收起" : "展开"} 其他结果 ({other.length})
          </button>
          {showOther && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 md:gap-x-6 opacity-60">
              {other.map((item, i) => (
                <button
                  key={`other-${item.book_url}-${i}`}
                  onClick={() => handleBookClick(item.book_url, item.source_url)}
                  className="w-full text-left py-2.5 border-b border-black/[0.04] active:bg-black/[0.02] transition-colors"
                >
                  <p className="text-[13px] text-[#1d1d1f] truncate">{item.name}</p>
                  <p className="text-[11px] text-[#c7c7cc] mt-0.5 truncate">
                    {item.author} · {item.source_name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && matched.length === 0 && other.length === 0 && keyword && (
        <p className="text-[13px] text-[#c7c7cc] text-center pt-16">未找到相关书籍</p>
      )}
    </div>
  );
}
