import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, ProgressItem } from "@/api/client";

interface RankItem {
  name: string;
  book_url: string;
  source_url: string;
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getProgressList().then(setProgress).catch(() => {});
    fetch("/api/explore/ranking")
      .then((r) => r.json())
      .then(setRanking)
      .catch(() => {});
  }, []);

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
    <div className="flex flex-col items-center pt-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        Reader
      </h1>
      <form onSubmit={handleSearch} className="w-full max-w-md mb-6">
        <div className="relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索书名或作者..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
        </div>
      </form>

      <div className="w-full max-w-md space-y-6">
        {/* Continue reading */}
        {progress.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              继续阅读
            </h2>
            <div className="grid gap-2">
              {progress.slice(0, 5).map((item) => (
                <button
                  key={item.book_url}
                  onClick={() => handleContinue(item)}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-left hover:border-primary transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.book_name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.chapter_title}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    第{item.chapter_idx + 1}章
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ranking */}
        {ranking.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              热门排行
            </h2>
            <div className="grid gap-1">
              {ranking.map((item, i) => (
                <button
                  key={item.book_url}
                  onClick={() => handleRankClick(item)}
                  className="flex items-center p-2.5 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className={`w-6 text-center text-sm font-bold flex-shrink-0 ${
                    i < 3 ? "text-primary" : "text-gray-400"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-sm ml-2 truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
