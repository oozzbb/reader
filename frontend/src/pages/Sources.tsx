import { useEffect, useState, useRef } from "react";
import { api, SourceItem } from "@/api/client";

export default function Sources() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const list = await api.getSources();
      setSources(list);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const arr = Array.isArray(json) ? json : [json];
      const res = await api.importSources(arr);
      setMessage(`已导入 ${res.count} 个书源`);
      await loadSources();
    } catch (err) {
      setMessage(`导入失败: ${err}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setImporting(true);
    setMessage("");
    try {
      const res = await api.importSourcesFromUrl(urlInput.trim());
      setMessage(`已导入 ${res.count} 个书源`);
      setUrlInput("");
      await loadSources();
    } catch (err) {
      setMessage(`导入失败: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImportYckceo = async () => {
    setImporting(true);
    setMessage("");
    try {
      const res = await fetch("/api/sources/import-yckceo?count=10", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage(`从源仓库导入 ${data.count} 个书源`);
        await loadSources();
      } else {
        setMessage(`失败: ${data.detail}`);
      }
    } catch (err) {
      setMessage(`失败: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const handleToggle = async (url: string) => {
    await api.toggleSource(url);
    await loadSources();
  };

  return (
    <div>
      <h2 className="text-xs tracking-widest uppercase text-ink-muted mb-6">
        书源管理
      </h2>

      {/* Import actions */}
      <div className="space-y-3 mb-6">
        <form onSubmit={handleImportUrl}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="输入书源 JSON 地址"
            className="w-full py-2.5 bg-transparent border-b border-ink-faint/50 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-ink-light transition-colors"
            disabled={importing}
          />
        </form>

        <div className="flex gap-3 text-xs">
          <button
            onClick={handleImportYckceo}
            disabled={importing}
            className="text-ink-muted hover:text-accent transition-colors disabled:opacity-40"
          >
            {importing ? "导入中..." : "从源仓库导入"}
          </button>
          <span className="text-ink-faint">|</span>
          <label className="text-ink-muted hover:text-accent transition-colors cursor-pointer">
            上传 JSON 文件
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {/* Message */}
      {message && (
        <p className="text-xs text-accent mb-4 py-2 border-l-2 border-accent pl-3">
          {message}
        </p>
      )}

      {/* Source list */}
      {loading ? (
        <p className="text-sm text-ink-muted">...</p>
      ) : sources.length === 0 ? (
        <p className="text-sm text-ink-muted pt-4">暂无书源</p>
      ) : (
        <div className="divide-y divide-ink-faint/20">
          {sources.map((s) => (
            <div
              key={s.book_source_url}
              className="flex items-center justify-between py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{s.book_source_name}</p>
                <p className="text-xs text-ink-muted truncate mt-0.5">
                  {s.book_source_group || "未分组"}
                </p>
              </div>
              <button
                onClick={() => handleToggle(s.book_source_url)}
                className={`ml-4 text-xs transition-colors ${
                  s.enabled ? "text-ink-light" : "text-ink-faint"
                }`}
              >
                {s.enabled ? "已启用" : "已禁用"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
