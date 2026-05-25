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
    navigate(
      `/read?url=${encodeURIComponent(chapter.url)}&source_url=${encodeURIComponent(sourceUrl)}&title=${encodeURIComponent(chapter.title)}&idx=${chapter.idx}&book_url=${encodeURIComponent(bookUrl)}&book_name=${encodeURIComponent(info?.name || "")}`
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

  if (loading) return <div className="pt-12 text-center text-[13px] text-[#c7c7cc]">加载中</div>;

  return (
    <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-10">
      {/* Left: Book info */}
      {info && (
        <div className="mb-8 md:mb-0 md:sticky md:top-24 md:self-start">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[#86868b] mb-4 hover:text-[#1d1d1f] transition-colors">
            ← 返回
          </button>
          <h1 className="text-[20px] font-bold text-[#1d1d1f] leading-tight">
            {info.name}
          </h1>
          {info.author && (
            <p className="text-[14px] text-[#86868b] mt-1.5">{info.author}</p>
          )}
          {info.intro && (
            <p className="text-[13px] text-[#86868b] mt-4 leading-[1.7] line-clamp-4 md:line-clamp-none">
              {info.intro}
            </p>
          )}
          <div className="flex items-center gap-4 mt-5">
            <button
              onClick={handleAddToShelf}
              disabled={added}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.96] ${
                added
                  ? "bg-[#34c759]/10 text-[#34c759]"
                  : "bg-[#c45d35] text-white hover:bg-[#b05230]"
              }`}
            >
              {added ? "已加入" : "加入书架"}
            </button>
            <span className="text-[12px] text-[#c7c7cc]">{chapters.length} 章</span>
          </div>
        </div>
      )}

      {/* Right: Chapter list */}
      <section>
        <h2 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider mb-3 md:mt-0 mt-2">
          目录
        </h2>
        <div className="md:max-h-[70vh] md:overflow-y-auto md:pr-2">
          {chapters.map((ch) => (
            <button
              key={ch.idx}
              onClick={() => handleChapterClick(ch)}
              className="w-full text-left py-[10px] border-b border-black/[0.04] last:border-0 text-[14px] text-[#1d1d1f] truncate active:bg-black/[0.02] hover:text-[#c45d35] transition-colors"
            >
              {ch.title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
