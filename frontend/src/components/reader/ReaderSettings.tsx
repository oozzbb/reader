import { useReaderStore } from "@/stores/readerStore";

interface Props {
  onClose: () => void;
}

export default function ReaderSettings({ onClose }: Props) {
  const { settings, updateSettings } = useReaderStore();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-xl p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-4">阅读设置</h3>

        {/* Font size */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">字号</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 2) })}
              className="w-8 h-8 rounded border text-sm"
            >
              A-
            </button>
            <span className="text-sm w-8 text-center">{settings.fontSize}</span>
            <button
              onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 2) })}
              className="w-8 h-8 rounded border text-sm"
            >
              A+
            </button>
          </div>
        </div>

        {/* Line height */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">行距</span>
          <div className="flex gap-2">
            {[1.5, 1.8, 2.0, 2.5].map((lh) => (
              <button
                key={lh}
                onClick={() => updateSettings({ lineHeight: lh })}
                className={`px-2 py-1 text-xs rounded border ${
                  settings.lineHeight === lh
                    ? "border-primary text-primary"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {lh}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">主题</span>
          <div className="flex gap-2">
            <button
              onClick={() => updateSettings({ theme: "light" })}
              className={`w-8 h-8 rounded-full border-2 bg-white ${
                settings.theme === "light" ? "border-primary" : "border-gray-300"
              }`}
            />
            <button
              onClick={() => updateSettings({ theme: "sepia" })}
              className={`w-8 h-8 rounded-full border-2 bg-[#f4ecd8] ${
                settings.theme === "sepia" ? "border-primary" : "border-gray-300"
              }`}
            />
            <button
              onClick={() => updateSettings({ theme: "dark" })}
              className={`w-8 h-8 rounded-full border-2 bg-gray-900 ${
                settings.theme === "dark" ? "border-primary" : "border-gray-600"
              }`}
            />
          </div>
        </div>

        {/* Padding */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">边距</span>
          <div className="flex gap-2">
            {(["sm", "md", "lg"] as const).map((p) => (
              <button
                key={p}
                onClick={() => updateSettings({ padding: p })}
                className={`px-3 py-1 text-xs rounded border ${
                  settings.padding === p
                    ? "border-primary text-primary"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {{ sm: "小", md: "中", lg: "大" }[p]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
