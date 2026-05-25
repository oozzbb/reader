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
  const [added, setAdded] = useState(false);

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
    const bookName = info?.name || "";
    navigate(
      `/read?url=${encodeURIComponent(chapter.url)}&source_url=${encodeURIComponent(sourceUrl)}&title=${encodeURIComponent(chapter.title)}&idx=${chapter.idx}&book_url=${encodeURIComponent(bookUrl)}&book_name=${encodeURIComponent(bookName)}`
    );
  };

  const handleAddToShelf = () => {
    fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: info?.name || "",
        author: info?.author || "",
        cover_url: info?.cover_url || "",
        intro: info?.intro || "",
        book_url: bookUrl,
        source_url: sourceUrl,
        total_chapters: chapters.length,
      }),
    }).then(() => setAdded(true));
  };

  if (loading) return null;

  return (
    <div>
      {/* Header */}
      {info && (
        <header className="mb-8">
          <h1 className="text-[20px] font-semibold text-[#1d1d1f] leading-tight">
            {info.name}
          </h1>
          {info.author && (
            <p className="text-[14px] text-[#86868b] mt-1.5">{info.author}</p>
          )}
          {info.intro && (
            <p className="text-[13px] text-[#86868b] mt-3 leading-relaxed line-clamp-3">
              {info.intro}
            </p>
          )}
          <button
            onClick={handleAddToShelf}
            disabled={added}
            className={`mt-4 text-[13px] font-medium transition-colors ${
              added ? "text-[#34c759]" : "text-[#c45d35] active:text-[#a04a2a]"
            }`}
          >
            {added ? "已加入书架" : "加入书架"}
          </button>
        </header>
      )}

      {/* Chapters */}
      <section>
        <h2 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider mb-3">
          目录 · {chapters.length} 章
        </h2>
        <div className="space-y-0">
          {chapters.map((ch) => (
            <button
              key={ch.idx}
              onClick={() => handleChapterClick(ch)}
              className="w-full text-left py-2.5 border-b border-black/[0.04] last:border-0 text-[14px] text-[#1d1d1f] truncate active:bg-black/[0.02] transition-colors"
            >
              {ch.title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
