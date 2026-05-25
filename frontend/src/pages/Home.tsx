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
  const navigate = useNavigate();

  useEffect(() => {
    api.getProgressList().then(setProgress).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/explore/ranking?category=${activeCategory}`)
      .then((r) => r.json())
      .then(setRanking)
      .catch(() => setRanking([]));
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
    <div className="space-y-12">
      {/* Search */}
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索书名或作者"
          className="w-full py-3 bg-transparent border-b border-ink-faint/50 text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-ink-light text-base font-serif transition-colors"
        />
      </form>

      {/* Continue reading */}
      {progress.length > 0 && (
        <section>
          <h2 className="text-xs tracking-widest uppercase text-ink-muted mb-4">
            继续阅读
          </h2>
          <div className="space-y-0 divide-y divide-ink-faint/20">
            {progress.slice(0, 3).map((item) => (
              <button
                key={item.book_url}
                onClick={() => handleContinue(item)}
                className="w-full text-left py-4 group"
              >
                <p className="text-base text-ink group-hover:text-accent transition-colors">
                  {item.book_name}
                </p>
                <p className="text-sm text-ink-muted mt-1">
                  {item.chapter_title}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Discover - Category tabs */}
      <section>
        <h2 className="text-xs tracking-widest uppercase text-ink-muted mb-5">
          发现
        </h2>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto scrollbar-none mb-6 -mx-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-2 text-sm whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? "tab-active font-medium"
                  : "tab-inactive hover:text-ink-light"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Book list */}
        <div className="space-y-0">
          {ranking.length > 0 ? (
            ranking.map((item, i) => (
              <button
                key={item.book_url}
                onClick={() => handleRankClick(item)}
                className="w-full text-left flex items-baseline py-3 border-b border-ink-faint/15 last:border-0 group"
              >
                <span className={`w-5 text-sm tabular-nums flex-shrink-0 ${
                  i < 3 ? "text-ink font-medium" : "text-ink-faint"
                }`}>
                  {i + 1}
                </span>
                <span className="text-[15px] text-ink ml-3 group-hover:text-accent transition-colors truncate">
                  {item.name}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-ink-muted py-4">加载中...</p>
          )}
        </div>
      </section>
    </div>
  );
}
