import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, BookInfo, Chapter } from "@/api/client";

export default function BookDetail() {
  const [params] = useSearchParams();
  const bookUrl = params.get("book_url") || "";
  const sourceUrl = params.get("source_url") || "";
  const navigate = useNavigate();

  const [info, setInfo] = useState<BookInfo | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookUrl || !sourceUrl) return;

    setLoading(true);
    Promise.all([
      api.getBookInfo(bookUrl, sourceUrl).catch(() => null),
      api.getChapters(bookUrl, sourceUrl).catch(() => []),
    ]).then(([bookInfo, chapterList]) => {
      setInfo(bookInfo);
      setChapters(chapterList);
      setLoading(false);
    });
  }, [bookUrl, sourceUrl]);

  const handleChapterClick = (chapter: Chapter) => {
    navigate(
      `/read?url=${encodeURIComponent(chapter.url)}&source_url=${encodeURIComponent(sourceUrl)}&title=${encodeURIComponent(chapter.title)}&idx=${chapter.idx}&book_url=${encodeURIComponent(bookUrl)}`
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>;
  }

  return (
    <div>
      {/* Book info header */}
      {info && (
        <div className="flex gap-4 mb-6">
          {info.cover_url && (
            <img
              src={info.cover_url}
              alt={info.name}
              className="w-20 h-28 object-cover rounded-lg flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{info.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{info.author}</p>
            {info.intro && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-3">
                {info.intro}
              </p>
            )}
            <button
              onClick={() => {
                api.importSources([]).catch(() => {}); // no-op, just using existing pattern
                fetch("/api/books", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: info.name,
                    author: info.author,
                    cover_url: info.cover_url,
                    intro: info.intro,
                    book_url: bookUrl,
                    source_url: sourceUrl,
                    total_chapters: chapters.length,
                  }),
                }).then(() => alert("已加入书架"));
              }}
              className="mt-2 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-blue-700 transition-colors"
            >
              加入书架
            </button>
          </div>
        </div>
      )}

      {/* Chapter list */}
      <h2 className="text-base font-semibold mb-3 border-b pb-2 border-gray-200 dark:border-gray-700">
        目录 ({chapters.length} 章)
      </h2>
      <div className="grid gap-1">
        {chapters.map((ch) => (
          <button
            key={ch.idx}
            onClick={() => handleChapterClick(ch)}
            className="text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors truncate"
          >
            {ch.title}
          </button>
        ))}
      </div>
    </div>
  );
}
