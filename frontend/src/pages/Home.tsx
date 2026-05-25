import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, ProgressItem } from "@/api/client";

interface RankItem {
  name: string;
  book_url: string;
  source_url: string;
}

const CATEGORIES = [
  { key: "xuanhuan", label: "玄幻" },
  { key: "dushi", label: "都市" },
  { key: "xianxia", label: "仙侠" },
  { key: "yanqing", label: "言情" },
  { key: "kehuan", label: "科幻" },
  { key: "lishi", label: "历史" },
  { key: "wuxia", label: "武侠" },
];

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("xuanhuan");
  const [rankLoading, setRankLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getProgressList().then(setProgress).catch(() => {});
  }, []);

  useEffect(() => {
    setRankLoading(true);
    fetch(`/api/explore/ranking?category=${activeCategory}`)
      .then((r) => r.json())
      .then((data) => { setRanking(data); setRankLoading(false); })
      .catch(() => { setRanking([]); setRankLoading(false); });
  }, [activeCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`);
    }
  };

  const handleContinue = (item: ProgressItem) => {
    navigate(
      `/read?url=${encodeURIComponent(item.chapter_url)}&source_url=${encodeURIComponent(item.source_url)}&title=${encodeURIComponent(item.chapter_title)}&idx=${item.chapter_idx}&book_url=${encodeURIComponent(item.book_url)}&book_name=${encodeURIComponent(item.book_name)}`
    );
  };

  const handleRankClick = (item: RankItem) => {
    navigate(
      `/book?book_url=${encodeURIComponent(item.book_url)}&source_url=${encodeURIComponent(item.source_url)}`
    );
  };

  return (
    <div className="space-y-7">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center h-10 px-3.5 rounded-lg bg-black/[0.04]">
          <svg className="w-4 h-4 text-[#86868b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.8 5.8a7.5 7.5 0 0010 10z" />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索书名或作者"
            className="flex-1 ml-2.5 bg-transparent text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none"
          />
        </div>
      </form>

      {/* Continue reading */}
      {progress.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider mb-3">
            继续阅读
          </h2>
          <div className="space-y-2.5">
            {progress.slice(0, 3).map((item) => (
              <button
                key={item.book_url}
                onClick={() => handleContinue(item)}
                className="w-full text-left p-3.5 rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-[#1d1d1f] truncate leading-snug">
                      {item.book_name}
                    </p>
                    <p className="text-[13px] text-[#86868b] mt-1 truncate">
                      {item.chapter_title}
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-1 h-8 rounded-full bg-[#c45d35]/20 relative overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-[#c45d35] rounded-full"
                      style={{ height: `${Math.min(90, (item.chapter_idx + 1) * 5)}%` }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Discover */}
      <section>
        <h2 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider mb-3">
          发现
        </h2>

        {/* Category tabs */}
        <div className="flex gap-0 overflow-x-auto scrollbar-none -mx-1 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`relative px-3 py-1.5 text-[13px] font-medium whitespace-nowrap rounded-full transition-all ${
                activeCategory === cat.key
                  ? "text-[#1d1d1f] bg-black/[0.06]"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Ranking list */}
        <div className={`transition-opacity duration-200 ${rankLoading ? "opacity-40" : "opacity-100"}`}>
          {ranking.length > 0 ? (
            <div className="space-y-0">
              {ranking.map((item, i) => (
                <button
                  key={item.book_url}
                  onClick={() => handleRankClick(item)}
                  className="w-full flex items-center py-3 border-b border-black/[0.04] last:border-0 active:bg-black/[0.02] transition-colors text-left"
                >
                  <span className={`w-6 text-[13px] tabular-nums font-semibold flex-shrink-0 ${
                    i < 3 ? "text-[#c45d35]" : "text-[#c7c7cc]"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-[14px] text-[#1d1d1f] truncate">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[13px] text-[#86868b]">
              {rankLoading ? "" : "暂无数据"}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
