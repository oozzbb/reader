import { useState, useRef, useCallback, useEffect } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { api, Chapter } from "@/api/client";
import { saveChapterList } from "@/utils/chapterCache";

export interface DownloadState {
  status: "idle" | "downloading" | "done" | "error";
  total: number;
  downloaded: number;
  failed: number;
}

interface DownloadMeta {
  status: "done" | "partial";
  total: number;
  downloaded: number;
}

export function useDownload(bookUrl: string, sourceUrl: string) {
  const [state, setState] = useState<DownloadState>({
    status: "idle",
    total: 0,
    downloaded: 0,
    failed: 0,
  });
  const [isDownloaded, setIsDownloaded] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!bookUrl) return;
    idbGet(`dl:${bookUrl}`).then((meta: DownloadMeta | undefined) => {
      if (meta && meta.status === "done") {
        setIsDownloaded(true);
        setState({ status: "done", total: meta.total, downloaded: meta.downloaded, failed: 0 });
      }
    }).catch(() => {});
  }, [bookUrl]);

  const start = useCallback(async () => {
    cancelRef.current = false;
    setState({ status: "downloading", total: 0, downloaded: 0, failed: 0 });

    let chapters: Chapter[];
    try {
      chapters = await api.getChapters(bookUrl, sourceUrl);
    } catch {
      setState((s) => ({ ...s, status: "error" }));
      return;
    }

    if (!chapters.length) {
      setState((s) => ({ ...s, status: "error" }));
      return;
    }

    const total = chapters.length;
    setState((s) => ({ ...s, total }));
    saveChapterList(bookUrl, sourceUrl, chapters).catch(() => {});

    let downloaded = 0;
    let failed = 0;
    const concurrency = 3;
    let idx = 0;

    const fetchOne = async (): Promise<void> => {
      while (idx < total) {
        if (cancelRef.current) return;

        const i = idx++;
        const ch = chapters[i];
        if (!ch.url) { failed++; continue; }

        const cacheKey = `ch:${ch.url}`;
        const cached = await idbGet(cacheKey).catch(() => null);
        if (cached) {
          downloaded++;
          setState((s) => ({ ...s, downloaded }));
          continue;
        }

        let success = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await api.getChapterContent(ch.url, sourceUrl);
            const content = res.type === "novel" ? res.content : JSON.stringify(res.images);
            await idbSet(cacheKey, content);
            success = true;
            break;
          } catch {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }

        if (success) {
          downloaded++;
        } else {
          failed++;
        }
        setState((s) => ({ ...s, downloaded, failed }));
      }
    };

    const workers = Array.from({ length: concurrency }, () => fetchOne());
    await Promise.all(workers);

    if (cancelRef.current) {
      setState((s) => ({ ...s, status: "idle" }));
      return;
    }

    const meta: DownloadMeta = { status: "done", total, downloaded };
    await idbSet(`dl:${bookUrl}`, meta).catch(() => {});
    setIsDownloaded(true);
    setState({ status: "done", total, downloaded, failed });
  }, [bookUrl, sourceUrl]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const exportTxt = useCallback(async (bookName: string, chapters: Chapter[]) => {
    const parts: string[] = [];
    for (const ch of chapters.sort((a, b) => a.idx - b.idx)) {
      const content = await idbGet(`ch:${ch.url}`).catch(() => null);
      if (content && typeof content === "string") {
        parts.push(`${ch.title}\n\n${content}\n\n`);
      }
    }

    const blob = new Blob([parts.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bookName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { state, start, cancel, exportTxt, isDownloaded };
}
