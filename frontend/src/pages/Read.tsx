import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, Chapter } from "@/api/client";
import { useReaderStore } from "@/stores/readerStore";
import ReaderSettings from "@/components/reader/ReaderSettings";

interface LoadedChapter {
  title: string;
  content: string;
  idx: number;
}

export default function Read() {
  const [params, setParams] = useSearchParams();
  const chapterUrl = params.get("url") || "";
  const sourceUrl = params.get("source_url") || "";
  const title = params.get("title") || "";
  const bookUrl = params.get("book_url") || "";
  const startIdx = parseInt(params.get("idx") || "0");
  const navigate = useNavigate();

  const { settings } = useReaderStore();
  const [showToolbar, setShowToolbar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentViewIdx, setCurrentViewIdx] = useState(startIdx);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Load chapter list
  useEffect(() => {
    if (!bookUrl || !sourceUrl) return;
    api.getChapters(bookUrl, sourceUrl).then(setChapters).catch(() => {});
  }, [bookUrl, sourceUrl]);

  // Load initial chapter
  useEffect(() => {
    if (!chapterUrl || !sourceUrl) return;
    setLoading(true);
    setLoadedChapters([]);
    api.getChapterContent(chapterUrl, sourceUrl).then((res) => {
      setLoadedChapters([{ title, content: res.content, idx: startIdx }]);
      setCurrentViewIdx(startIdx);
      setLoading(false);
      window.scrollTo(0, 0);
    });
  }, [chapterUrl, sourceUrl, title, startIdx]);

  // Auto-load next chapter on scroll to bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          loadNextChapter();
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  });

  // Track which chapter is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-chapter-idx"));
            if (!isNaN(idx) && idx !== currentViewIdx) {
              setCurrentViewIdx(idx);
            }
          }
        }
      },
      { threshold: 0.3 }
    );
    chapterRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

  // Auto-save reading progress when chapter changes
  useEffect(() => {
    if (!bookUrl || !sourceUrl || chapters.length === 0) return;
    const ch = chapters.find((c) => c.idx === currentViewIdx);
    if (!ch) return;
    api.saveProgress({
      book_url: bookUrl,
      source_url: sourceUrl,
      book_name: title,
      chapter_idx: currentViewIdx,
      chapter_title: ch.title,
      chapter_url: ch.url,
    }).catch(() => {});
  }, [currentViewIdx, bookUrl, sourceUrl, chapters, title]);

  const loadNextChapter = useCallback(() => {
    if (loading || loadedChapters.length === 0 || chapters.length === 0) return;
    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const nextChapter = chapters.find((ch) => ch.idx === lastLoaded.idx + 1);
    if (!nextChapter || !nextChapter.url) return;

    setLoading(true);
    api.getChapterContent(nextChapter.url, sourceUrl).then((res) => {
      setLoadedChapters((prev) => [
        ...prev,
        { title: nextChapter.title, content: res.content, idx: nextChapter.idx },
      ]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [loading, loadedChapters, chapters, sourceUrl]);

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
    const prev = chapters.find((ch) => ch.idx === currentViewIdx - 1);
    if (prev) goToChapter(prev);
  };

  const hasPrev = chapters.some((ch) => ch.idx === currentViewIdx - 1);
  const lastIdx = loadedChapters.length > 0 ? loadedChapters[loadedChapters.length - 1].idx : startIdx;
  const hasNext = chapters.some((ch) => ch.idx === lastIdx + 1);

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
          <span className="text-sm truncate flex-1">
            {chapters.find((ch) => ch.idx === currentViewIdx)?.title || title}
          </span>
          <button onClick={() => setShowSettings(true)} className="text-sm ml-2">
            设置
          </button>
        </div>
      )}

      {/* Content - continuous scroll */}
      <div
        className={`max-w-reader mx-auto pt-6 pb-24 ${paddingMap[settings.padding]}`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        {loadedChapters.map((ch) => (
          <section
            key={ch.idx}
            ref={(el) => { if (el) chapterRefs.current.set(ch.idx, el); }}
            data-chapter-idx={ch.idx}
            className="mb-8"
          >
            <h2 className="text-center font-bold mb-6 text-lg opacity-80 border-b border-gray-200 dark:border-gray-700 pb-4">
              {ch.title}
            </h2>
            <div className="whitespace-pre-wrap leading-relaxed">{ch.content}</div>
          </section>
        ))}

        {/* Loading indicator */}
        {loading && (
          <p className="text-center text-gray-400 py-6">加载中...</p>
        )}

        {/* Sentinel for auto-load */}
        {hasNext && !loading && (
          <div ref={sentinelRef} className="h-20" />
        )}

        {/* End marker */}
        {!hasNext && loadedChapters.length > 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">— 已是最新章节 —</p>
        )}
      </div>

      {/* Bottom nav */}
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
          onClick={loadNextChapter}
          disabled={!hasNext || loading}
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
                    ch.idx === currentViewIdx
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
