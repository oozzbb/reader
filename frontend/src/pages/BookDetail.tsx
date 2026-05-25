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
    }).then(() => setMessage("已加入书架"));
  };

  const [message, setMessage] = useState("");

  if (loading) {
    return <p className="text-sm text-ink-muted">...</p>;
  }

  return (
    <div>
      {/* Book info */}
      {info && (
        <header className="mb-10">
          <h1 className="text-xl font-semibold text-ink leading-tight">
            {info.name}
          </h1>
          <p className="text-sm text-ink-muted mt-2">{info.author}</p>
          {info.intro && (
            <p className="text-sm text-ink-light mt-4 leading-relaxed line-clamp-3">
              {info.intro}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleAddToShelf}
              className="text-xs text-accent hover:underline transition-colors"
            >
              加入书架
            </button>
            {message && <span className="text-xs text-ink-muted">{message}</span>}
          </div>
        </header>
      )}

      {/* Chapter list */}
      <section>
        <h2 className="text-xs tracking-widest uppercase text-ink-muted mb-4">
          目录 · {chapters.length} 章
        </h2>
        <div className="divide-y divide-ink-faint/15">
          {chapters.map((ch) => (
            <button
              key={ch.idx}
              onClick={() => handleChapterClick(ch)}
              className="w-full text-left py-3 text-sm text-ink hover:text-accent transition-colors truncate"
            >
              {ch.title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
