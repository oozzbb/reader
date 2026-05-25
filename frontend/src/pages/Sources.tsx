import { useEffect, useState, useRef } from "react";
import { api, SourceItem } from "@/api/client";

export default function Sources() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSources(); }, []);

  const loadSources = async () => {
    setLoading(true);
    try { setSources(await api.getSources()); } finally { setLoading(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setMessage("");
    try {
      const json = JSON.parse(await file.text());
      const res = await api.importSources(Array.isArray(json) ? json : [json]);
      setMessage(`导入 ${res.count} 个书源`); await loadSources();
    } catch (err) { setMessage(`失败: ${err}`); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setImporting(true); setMessage("");
    try {
      const res = await api.importSourcesFromUrl(urlInput.trim());
      setMessage(`导入 ${res.count} 个书源`); setUrlInput(""); await loadSources();
    } catch (err) { setMessage(`失败: ${err}`); }
    finally { setImporting(false); }
  };

  const handleImportYckceo = async () => {
    setImporting(true); setMessage("");
    try {
      const res = await fetch("/api/sources/import-yckceo?count=10", { method: "POST" });
      const data = await res.json();
      if (res.ok) { setMessage(`导入 ${data.count} 个书源`); await loadSources(); }
      else { setMessage(`失败: ${data.detail}`); }
    } catch (err) { setMessage(`失败: ${err}`); }
    finally { setImporting(false); }
  };

  const handleToggle = async (url: string) => {
    await api.toggleSource(url); await loadSources();
  };

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wider mb-4">
        书源管理
      </h1>

      {/* URL input */}
      <form onSubmit={handleImportUrl} className="mb-3">
        <div className="flex items-center h-[38px] px-3 rounded-lg bg-black/[0.04] focus-within:bg-black/[0.06] transition-colors">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="书源 JSON 地址"
            className="flex-1 bg-transparent text-[14px] text-[#1d1d1f] placeholder:text-[#86868b]/70 outline-none"
            disabled={importing}
          />
          {urlInput.trim() && (
            <button type="submit" disabled={importing} className="text-[12px] font-semibold text-[#c45d35] ml-2">
              导入
            </button>
          )}
        </div>
      </form>

      {/* Quick actions */}
      <div className="flex items-center gap-4 mb-5">
        <button onClick={handleImportYckceo} disabled={importing} className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] active:text-[#c45d35] disabled:opacity-40 transition-colors">
          从源仓库导入
        </button>
        <label className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] cursor-pointer transition-colors">
          上传文件
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
        </label>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-4 py-2.5 px-3.5 rounded-lg bg-[#c45d35]/[0.05] text-[13px] text-[#c45d35]">
          {message}
        </div>
      )}

      {/* Source list */}
      {loading ? null : sources.length === 0 ? (
        <p className="text-[13px] text-[#c7c7cc] text-center pt-8">暂无书源</p>
      ) : (
        <div>
          <p className="text-[12px] text-[#c7c7cc] mb-2">{sources.length} 个书源</p>
          {sources.map((s) => (
            <div key={s.book_source_url} className="flex items-center py-[10px] border-b border-black/[0.04] last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[#1d1d1f] truncate">{s.book_source_name}</p>
                <p className="text-[11px] text-[#c7c7cc] truncate mt-0.5">{s.book_source_group || "未分组"}</p>
              </div>
              <button
                onClick={() => handleToggle(s.book_source_url)}
                className={`w-9 h-[22px] rounded-full relative transition-colors duration-200 ${
                  s.enabled ? "bg-[#34c759]" : "bg-black/[0.08]"
                }`}
              >
                <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  s.enabled ? "left-[18px]" : "left-[2px]"
                }`} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
