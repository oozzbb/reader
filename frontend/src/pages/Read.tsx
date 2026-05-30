import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, Chapter, ChapterContent } from "@/api/client";
import { useReaderStore } from "@/stores/readerStore";
import ReaderSettings from "@/components/reader/ReaderSettings";
import MangaScroll from "@/components/reader/MangaScroll";
import MangaPage from "@/components/reader/MangaPage";
import { get as idbGet, set as idbSet } from "idb-keyval";

interface LoadedChapter {
  title: string;
  content: string;
  idx: number;
}

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function isPlaceholderChapter(title: string) {
  return /^chapter\s*\d+$/i.test(title.trim());
}

function shouldResolveChapterUrl(chapterUrl: string, bookUrl: string, title: string) {
  if (!chapterUrl) return false;
  return normalizeUrl(chapterUrl) === normalizeUrl(bookUrl) || isPlaceholderChapter(title);
}

export default function Read() {
  const [params, setParams] = useSearchParams();
  const chapterUrl = params.get("url") || "";
  const sourceUrl = params.get("source_url") || "";
  const title = params.get("title") || "";
  const bookUrl = params.get("book_url") || "";
  const bookName = params.get("book_name") || "";
  const startIdx = parseInt(params.get("idx") || "0");
  const savedScrollPercent = parseFloat(params.get("scroll") || "0");
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
  const tocRef = useRef<HTMLDivElement>(null);
  const [mangaImages, setMangaImages] = useState<string[]>([]);
  const [contentType, setContentType] = useState<"novel" | "manga">("novel");
  const [mangaMode, setMangaMode] = useState<"scroll" | "page">("scroll");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load chapter list
  useEffect(() => {
    if (!bookUrl || !sourceUrl) return;
    api.getChapters(bookUrl, sourceUrl).then(setChapters).catch(() => {});
  }, [bookUrl, sourceUrl]);

  // Repair stale read URLs saved before TOC obfuscation fallbacks existed.
  useEffect(() => {
    if (!bookUrl || !sourceUrl || chapters.length === 0) return;
    if (!shouldResolveChapterUrl(chapterUrl, bookUrl, title)) return;

    const resolved = chapters.find((ch) => ch.idx === startIdx) || chapters[0];
    if (!resolved || resolved.url === chapterUrl && resolved.title === title) return;

    const nextParams: Record<string, string> = {
      url: resolved.url,
      source_url: sourceUrl,
      title: resolved.title,
      idx: String(resolved.idx),
      book_url: bookUrl,
      book_name: bookName,
    };
    if (params.get("scroll")) nextParams.scroll = params.get("scroll") || "";
    setParams(nextParams, { replace: true });
  }, [bookUrl, sourceUrl, chapters, chapterUrl, title, startIdx, bookName, params, setParams]);

  // Load initial chapter with IndexedDB cache
  useEffect(() => {
    if (!chapterUrl || !sourceUrl) return;
    if (bookUrl && shouldResolveChapterUrl(chapterUrl, bookUrl, title) && chapters.length === 0) return;

    setLoading(true);
    setLoadedChapters([]);

    const cacheKey = `ch:${chapterUrl}`;

    const restoreScroll = () => {
      if (savedScrollPercent > 0) {
        requestAnimationFrame(() => {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, maxScroll * savedScrollPercent);
        });
      } else {
        window.scrollTo(0, 0);
      }
    };

    const handleResponse = (res: ChapterContent) => {
      if (res.type === "manga") {
        setContentType("manga");
        setMangaImages(res.images);
        setLoading(false);
      } else {
        setContentType("novel");
        setMangaImages([]);
        setLoadedChapters([{ title, content: res.content, idx: startIdx }]);
        setCurrentViewIdx(startIdx);
        setLoading(false);
        setTimeout(restoreScroll, 100);
        idbSet(cacheKey, res.content).catch(() => {});
        prefetchChapters(startIdx);
      }
    };

    idbGet(cacheKey).then((cached: string | undefined) => {
      if (cached) {
        setContentType("novel");
        setLoadedChapters([{ title, content: cached, idx: startIdx }]);
        setCurrentViewIdx(startIdx);
        setLoading(false);
        setTimeout(restoreScroll, 100);
      }
      api.getChapterContent(chapterUrl, sourceUrl).then((res) => {
        handleResponse(res);
      }).catch(() => { if (!cached) setLoading(false); });
    }).catch(() => {
      api.getChapterContent(chapterUrl, sourceUrl).then(handleResponse).catch(() => setLoading(false));
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

  // Track which chapter is in view — rootMargin targets screen center
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-chapter-idx"));
            if (!isNaN(idx)) {
              setCurrentViewIdx(idx);
            }
          }
        }
      },
      { threshold: 0, rootMargin: "-20% 0px -70% 0px" }
    );
    chapterRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

  // Auto-save progress with scroll position (debounced 2s on scroll, immediate on chapter change)
  const scrollSaveRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!bookUrl || !sourceUrl || chapters.length === 0) return;

    const saveNow = () => {
      const ch = chapters.find((c) => c.idx === currentViewIdx);
      if (!ch) return;
      const scrollPercent = document.documentElement.scrollHeight > window.innerHeight
        ? window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)
        : 0;
      api.saveProgress({
        book_url: bookUrl,
        source_url: sourceUrl,
        book_name: bookName || title,
        chapter_idx: currentViewIdx,
        chapter_title: ch.title,
        chapter_url: ch.url,
        scroll_percent: Math.round(scrollPercent * 1000) / 1000,
      }).catch(() => {});
    };

    // Save on chapter change (debounced)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveNow, 1500);

    // Save on scroll stop
    const handleScroll = () => {
      if (scrollSaveRef.current) clearTimeout(scrollSaveRef.current);
      scrollSaveRef.current = setTimeout(saveNow, 2000);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (scrollSaveRef.current) clearTimeout(scrollSaveRef.current);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [currentViewIdx, bookUrl, sourceUrl, chapters, bookName, title]);

  // Prefetch next 3 chapters in background
  const prefetchChapters = useCallback((fromIdx: number) => {
    if (chapters.length === 0) return;
    const prefetchCount = 3;
    (async () => {
      for (let i = 1; i <= prefetchCount; i++) {
        const ch = chapters.find((c) => c.idx === fromIdx + i);
        if (!ch?.url) continue;
        const key = `ch:${ch.url}`;
        const cached = await idbGet(key).catch(() => null);
        if (cached) continue;
        try {
          const res = await api.getChapterContent(ch.url, sourceUrl);
          if (res.type === "novel") await idbSet(key, res.content);
        } catch { break; }
      }
    })();
  }, [chapters, sourceUrl]);

  const loadNextChapter = useCallback(() => {
    if (loading || loadedChapters.length === 0 || chapters.length === 0) return;
    const lastLoaded = loadedChapters[loadedChapters.length - 1];
    const nextChapter = chapters.find((ch) => ch.idx === lastLoaded.idx + 1);
    if (!nextChapter || !nextChapter.url) return;

    setLoading(true);
    const cacheKey = `ch:${nextChapter.url}`;

    idbGet(cacheKey).then((cached: string | undefined) => {
      if (cached) {
        setLoadedChapters((prev) => [
          ...prev,
          { title: nextChapter.title, content: cached, idx: nextChapter.idx },
        ]);
        setLoading(false);
      }
      api.getChapterContent(nextChapter.url, sourceUrl).then((res) => {
        if (res.type === "novel") {
          if (!cached) {
            setLoadedChapters((prev) => [
              ...prev,
              { title: nextChapter.title, content: res.content, idx: nextChapter.idx },
            ]);
          }
          setLoading(false);
          idbSet(cacheKey, res.content).catch(() => {});
          prefetchChapters(nextChapter.idx);
        } else {
          setLoading(false);
        }
      }).catch(() => { if (!cached) setLoading(false); });
    }).catch(() => {
      api.getChapterContent(nextChapter.url, sourceUrl).then((res) => {
        if (res.type === "novel") {
          setLoadedChapters((prev) => [
            ...prev,
            { title: nextChapter.title, content: res.content, idx: nextChapter.idx },
          ]);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    });
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
      book_name: bookName,
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

  // Scroll TOC to current chapter
  useEffect(() => {
    if (showToc && tocRef.current) {
      requestAnimationFrame(() => {
        const active = tocRef.current?.querySelector("[data-active='true']");
        if (active) active.scrollIntoView({ block: "center", behavior: "instant" });
      });
    }
  }, [showToc]);

  const themeStyles = {
    light: "bg-white text-[#1d1d1f]",
    dark: "bg-[#1c1c1e] text-[#e5e5e7]",
    sepia: "bg-[#f8f3eb] text-[#3d3425]",
  };

  const bottomBarTheme = {
    light: "bg-white/95 border-black/[0.06] text-[#1d1d1f]",
    dark: "bg-[#1c1c1e]/95 border-white/[0.08] text-[#e5e5e7]",
    sepia: "bg-[#f8f3eb]/95 border-[#3d3425]/10 text-[#3d3425]",
  };

  const paddingMap = { sm: "px-4", md: "px-6", lg: "px-10" };

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
          <button onClick={() => navigate(-1)} className="text-[13px] mr-4">
            ← 返回
          </button>
          <button onClick={() => navigate("/")} className="text-[13px] mr-4">
            首页
          </button>
          <span className="text-[13px] truncate flex-1">
            {chapters.find((ch) => ch.idx === currentViewIdx)?.title || title}
          </span>
          {contentType === "manga" && (
            <button
              onClick={() => setMangaMode((m) => m === "scroll" ? "page" : "scroll")}
              className="text-[13px] ml-2"
            >
              {mangaMode === "scroll" ? "页模式" : "条模式"}
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="text-[13px] ml-2">
            设置
          </button>
        </div>
      )}

      {/* Content */}
      {contentType === "manga" ? (
        <div className="pb-16">
          {mangaMode === "scroll" ? (
            <MangaScroll images={mangaImages} sourceUrl={sourceUrl} />
          ) : (
            <MangaPage images={mangaImages} sourceUrl={sourceUrl} />
          )}
        </div>
      ) : (
        <div
          className={`max-w-reader mx-auto pt-6 pb-24 ${paddingMap[settings.padding]}`}
          style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}
        >
          {loadedChapters.map((ch) => (
            <section
              key={ch.idx}
              ref={(el) => { if (el) chapterRefs.current.set(ch.idx, el); }}
              data-chapter-idx={ch.idx}
              className="mb-10"
            >
              <h2 className="text-center font-medium mb-8 text-[13px] opacity-40 tracking-wide">
                {ch.title}
              </h2>
              <div className="whitespace-pre-wrap leading-[1.9]">{ch.content}</div>
            </section>
          ))}

          {loading && (
            <p className="text-center opacity-40 py-6 text-[13px]">加载中...</p>
          )}

          {hasNext && !loading && (
            <div ref={sentinelRef} className="h-20" />
          )}

          {!hasNext && loadedChapters.length > 0 && (
            <p className="text-center opacity-30 py-6 text-[13px]">— 已是最新章节 —</p>
          )}
        </div>
      )}

      {/* Bottom nav */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 flex items-center justify-between px-6 py-3 backdrop-blur-sm border-t ${bottomBarTheme[settings.theme]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={goPrev}
          disabled={!hasPrev}
          className="text-[13px] px-3 py-2 rounded-lg disabled:opacity-20 active:bg-black/[0.05]"
        >
          上一章
        </button>
        <button
          onClick={() => { setShowToc(true); setShowToolbar(false); }}
          className="text-[13px] px-3 py-2 rounded-lg active:bg-black/[0.05]"
        >
          目录 ({chapters.length})
        </button>
        <button
          onClick={() => {
            const next = chapters.find((ch) => ch.idx === currentViewIdx + 1);
            if (next) goToChapter(next);
          }}
          disabled={!chapters.some((ch) => ch.idx === currentViewIdx + 1)}
          className="text-[13px] px-3 py-2 rounded-lg disabled:opacity-20 active:bg-black/[0.05]"
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
            ref={tocRef}
            className="w-72 max-w-[80vw] h-full bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 px-5 py-4 border-b border-black/[0.06] bg-white z-10">
              <h3 className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                目录 · {chapters.length} 章
              </h3>
            </div>
            <div className="py-1">
              {chapters.map((ch) => (
                <button
                  key={ch.idx}
                  data-active={ch.idx === currentViewIdx ? "true" : undefined}
                  onClick={() => goToChapter(ch)}
                  className={`block w-full text-left px-5 py-2.5 text-[13px] truncate transition-colors ${
                    ch.idx === currentViewIdx
                      ? "text-[#c45d35] font-medium bg-[#c45d35]/[0.04]"
                      : "text-[#1d1d1f] hover:bg-black/[0.03]"
                  }`}
                >
                  {ch.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black/30" />
        </div>
      )}

      {showSettings && <ReaderSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
