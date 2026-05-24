import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, Chapter } from "@/api/client";
import { useReaderStore } from "@/stores/readerStore";
import ReaderSettings from "@/components/reader/ReaderSettings";

export default function Read() {
  const [params, setParams] = useSearchParams();
  const chapterUrl = params.get("url") || "";
  const sourceUrl = params.get("source_url") || "";
  const title = params.get("title") || "";
  const bookUrl = params.get("book_url") || "";
  const currentIdx = parseInt(params.get("idx") || "0");
  const navigate = useNavigate();

  const { content, settings, setContent, setLoading } = useReaderStore();
  const [showToolbar, setShowToolbar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    if (!chapterUrl || !sourceUrl) return;
    setLoading(true);
    api.getChapterContent(chapterUrl, sourceUrl).then((res) => {
      setContent(res.content, title, currentIdx);
      window.scrollTo(0, 0);
    });
  }, [chapterUrl, sourceUrl, title, currentIdx, setContent, setLoading]);

  useEffect(() => {
    if (!bookUrl || !sourceUrl) return;
    api.getChapters(bookUrl, sourceUrl).then(setChapters).catch(() => {});
  }, [bookUrl, sourceUrl]);

  const toggleToolbar = useCallback(() => {
    if (showToc || showSettings) {
      setShowToc(false);
      setShowSettings(false);
      return;
    }
    setShowToolbar((v) => !v);
  }, [showToc, showSettings]);

  const goToChapter = (chapter: Chapter) => {
    setParams({
      url: chapter.url,
      source_url: sourceUrl,
      title: chapter.title,
      idx: String(chapter.idx),
      book_url: bookUrl,
    });
    setShowToc(false);
    setShowToolbar(false);
  };

  const goPrev = () => {
    const prev = chapters.find((ch) => ch.idx === currentIdx - 1);
    if (prev) goToChapter(prev);
  };

  const goNext = () => {
    const next = chapters.find((ch) => ch.idx === currentIdx + 1);
    if (next) goToChapter(next);
  };

  const hasPrev = chapters.some((ch) => ch.idx === currentIdx - 1);
  const hasNext = chapters.some((ch) => ch.idx === currentIdx + 1);

  const themeStyles = {
    light: "bg-white text-gray-900",
    dark: "bg-gray-900 text-gray-100",
    sepia: "bg-[#f4ecd8] text-[#5b4636]",
  };

  const paddingMap = { sm: "px-3", md: "px-5", lg: "px-8" };

  return (
    <div
      className={`min-h-screen ${themeStyles[settings.theme]}`}
      onClick={toggleToolbar}
    >
      {/* Top toolbar */}
      {showToolbar && (
        <div
          className="fixed top-0 inset-x-0 z-50 flex items-center px-4 py-3 bg-black/80 text-white backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => navigate(-1)} className="text-sm mr-4">
            ← 返回
          </button>
          <span className="text-sm truncate flex-1">{title}</span>
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm ml-2"
          >
            设置
          </button>
        </div>
      )}

      {/* Content */}
      <article
        className={`max-w-reader mx-auto py-16 pb-24 ${paddingMap[settings.padding]}`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        <h2 className="text-center font-bold mb-6 text-lg">{title}</h2>
        {content ? (
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        ) : (
          <p className="text-center text-gray-400">加载中...</p>
        )}
      </article>

      {/* Bottom nav - always visible */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 text-white backdrop-blur-sm border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={goPrev}
          disabled={!hasPrev}
          className="text-sm px-3 py-1.5 rounded disabled:opacity-30"
        >
          上一章
        </button>
        <button
          onClick={() => { setShowToc(true); setShowToolbar(false); }}
          className="text-sm px-3 py-1.5 rounded"
        >
          目录 ({chapters.length})
        </button>
        <button
          onClick={goNext}
          disabled={!hasNext}
          className="text-sm px-3 py-1.5 rounded disabled:opacity-30"
        >
          下一章
        </button>
      </div>

      {/* TOC drawer */}
      {showToc && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setShowToc(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-white dark:bg-gray-900 shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                目录 ({chapters.length} 章)
              </h3>
            </div>
            <div className="py-1">
              {chapters.map((ch) => (
                <button
                  key={ch.idx}
                  onClick={() => goToChapter(ch)}
                  className={`block w-full text-left px-4 py-2 text-sm truncate transition-colors ${
                    ch.idx === currentIdx
                      ? "bg-blue-50 dark:bg-blue-900/30 text-primary font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black/50" />
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <ReaderSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
