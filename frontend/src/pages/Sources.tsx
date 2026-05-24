import { useEffect, useState, useRef } from "react";
import { api, SourceItem } from "@/api/client";

export default function Sources() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
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
      setMessage(`成功导入 ${res.count} 个书源`);
      await loadSources();
    } catch (err) {
      setMessage(`导入失败: ${err}`);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleToggle = async (url: string) => {
    await api.toggleSource(url);
    await loadSources();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">书源管理</h2>
        <label className="px-3 py-1.5 bg-primary text-white text-sm rounded cursor-pointer hover:bg-blue-700 transition-colors">
          {importing ? "导入中..." : "导入书源"}
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

      {message && (
        <div className="text-sm mb-3 p-2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">加载中...</p>
      ) : sources.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          暂无书源，请导入 Legado 格式的 JSON 文件
        </p>
      ) : (
        <div className="grid gap-2">
          {sources.map((s) => (
            <div
              key={s.book_source_url}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {s.book_source_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {s.book_source_group || "无分组"} · {s.book_source_url}
                </p>
              </div>
              <button
                onClick={() => handleToggle(s.book_source_url)}
                className={`ml-3 px-2 py-0.5 text-xs rounded ${
                  s.enabled
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {s.enabled ? "启用" : "禁用"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
