import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useReaderStore } from "@/stores/readerStore";
import ReaderSettings from "@/components/reader/ReaderSettings";

export default function Read() {
  const [params] = useSearchParams();
  const chapterUrl = params.get("url") || "";
  const sourceUrl = params.get("source_url") || "";
  const title = params.get("title") || "";
  const navigate = useNavigate();

  const { content, settings, setContent, setLoading } = useReaderStore();
  const [showToolbar, setShowToolbar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!chapterUrl || !sourceUrl) return;
    setLoading(true);
    api.getChapterContent(chapterUrl, sourceUrl).then((res) => {
      setContent(res.content, title, parseInt(params.get("idx") || "0"));
    });
  }, [chapterUrl, sourceUrl, title, params, setContent, setLoading]);

  const toggleToolbar = useCallback(() => {
    setShowToolbar((v) => !v);
    if (showSettings) setShowSettings(false);
  }, [showSettings]);

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
          className="fixed top-0 inset-x-0 z-50 flex items-center px-4 py-3 bg-black/80 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => navigate(-1)}
            className="text-sm mr-4"
          >
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
        className={`max-w-reader mx-auto py-12 ${paddingMap[settings.padding]}`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
        onClick={(e) => e.stopPropagation()}
        onClickCapture={toggleToolbar}
      >
        <h2 className="text-center font-bold mb-6 text-lg">{title}</h2>
        {content ? (
          <div className="whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        ) : (
          <p className="text-center text-gray-400">加载中...</p>
        )}
      </article>

      {/* Settings panel */}
      {showSettings && (
        <ReaderSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
