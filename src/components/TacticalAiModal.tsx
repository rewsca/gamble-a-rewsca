import React, { useState } from 'react';
import { Search, Image as ImageIcon, Video, X, Upload, ExternalLink } from 'lucide-react';
import { sound } from '../game/sound';

interface TacticalAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextInfo: string;
}

export const TacticalAiModal: React.FC<TacticalAiModalProps> = ({
  isOpen,
  onClose,
  contextInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'image' | 'video'>('search');
  const [query, setQuery] = useState('Phân tích xác suất thắng và mẹo dự đoán sát thương trong đấu trường bóng 2D');
  const [mediaPrompt, setMediaPrompt] = useState(
    'Phân tích thế trận, vũ khí hai bóng và đề xuất lựa chọn đặt cược tối ưu (Ai thắng, Sát thương, Va chạm, Máu còn lại).'
  );
  const [selectedFileName, setSelectedFileName] = useState('');
  const [base64Data, setBase64Data] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [sources, setSources] = useState<Array<{ uri: string; title: string }>>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setMimeType(file.type || (activeTab === 'image' ? 'image/png' : 'video/mp4'));
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const commaIdx = dataUrl.indexOf(',');
      setBase64Data(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAnalysis = async () => {
    sound.playClick();
    setLoading(true);
    setErrorMsg('');
    setResultText('');
    setSources([]);

    try {
      if (activeTab === 'search') {
        const res = await fetch('/api/ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, contextInfo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi tra cứu.');
        setResultText(data.text || '');
        setSources(Array.isArray(data.sources) ? data.sources : []);
      } else if (activeTab === 'image') {
        if (!base64Data) {
          throw new Error('Vui lòng chọn một file hình ảnh trước khi phân tích.');
        }
        const res = await fetch('/api/ai/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, mimeType, prompt: mediaPrompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi phân tích ảnh.');
        setResultText(data.text || '');
      } else {
        if (!base64Data) {
          throw new Error('Vui lòng chọn một file video trước khi phân tích.');
        }
        const res = await fetch('/api/ai/analyze-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, mimeType, prompt: mediaPrompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi phân tích video.');
        setResultText(data.text || '');
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối máy chủ phân tích. Vui lòng kiểm tra GEMINI_API_KEY trong Settings > Secrets.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bàn Phân Tích Chiến Thuật AI"
    >
      <div className="w-full max-w-2xl bg-zinc-900 border-4 border-black shadow-[8px_8px_0px_#000] text-zinc-100 p-5 flex flex-col gap-4 max-h-[88vh]">
        <div className="flex items-center justify-between border-b-2 border-zinc-700 pb-3">
          <h2 className="text-xl font-bold tracking-wider text-red-500">
            PHÒNG PHÂN TÍCH CHIẾN THUẬT (SEARCH · ẢNH · VIDEO)
          </h2>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 bg-zinc-800 border-2 border-black hover:bg-red-600 text-white transition-colors"
            aria-label="Đóng bảng phân tích"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('search');
              setErrorMsg('');
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 border-black transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'search'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Search className="w-4 h-4" />
            TRA CỨU GOOGLE SEARCH
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('image');
              setBase64Data('');
              setSelectedFileName('');
              setErrorMsg('');
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 border-black transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'image'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            PHÂN TÍCH ẢNH TRẬN ĐẤU
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('video');
              setBase64Data('');
              setSelectedFileName('');
              setErrorMsg('');
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-2 border-black transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'video'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Video className="w-4 h-4" />
            PHÂN TÍCH VIDEO TRẬN ĐẤU
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="ai-search-input" className="text-xs font-semibold text-zinc-400">
              Nhập câu hỏi chiến thuật hoặc xác suất (Sử dụng Gemini 3.8 Flash + Google Search):
            </label>
            <input
              id="ai-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-700 text-sm text-white focus:border-red-500 focus:outline-none"
              placeholder="Nhập nội dung cần tra cứu..."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950 border-2 border-dashed border-zinc-600 hover:border-red-500 cursor-pointer text-xs font-semibold text-zinc-300">
              <Upload className="w-4 h-4 text-red-400" />
              <span>
                {selectedFileName
                  ? `Đã chọn: ${selectedFileName}`
                  : activeTab === 'image'
                  ? 'Tải lên ảnh chụp màn hình trận đấu / thông số bóng (PNG, JPG, WEBP)'
                  : 'Tải lên video quay màn hình ván đấu (MP4, WEBM)'}
              </span>
              <input
                type="file"
                accept={activeTab === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <input
              type="text"
              value={mediaPrompt}
              onChange={(e) => setMediaPrompt(e.target.value)}
              aria-label="Yêu cầu phân tích"
              className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-700 text-xs text-white focus:border-red-500 focus:outline-none"
            />
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleRunAnalysis}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-700 text-white font-bold text-sm border-2 border-black shadow-[3px_3px_0px_#000] cursor-pointer"
        >
          {loading ? 'ĐANG PHÂN TÍCH DỮ LIỆU...' : 'BẮT ĐẦU PHÂN TÍCH'}
        </button>

        {errorMsg && (
          <div className="p-3 bg-red-950/70 border-2 border-red-600 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        {resultText && (
          <div className="flex-1 overflow-y-auto p-3.5 bg-zinc-950 border-2 border-zinc-800 text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
            {resultText}
            {sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-zinc-800">
                <div className="font-bold text-zinc-400 mb-1">Nguồn tham khảo từ Google Search:</div>
                <ul className="space-y-1">
                  {sources.map((s, idx) => (
                    <li key={idx}>
                      <a
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-red-400 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{s.title || s.uri}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
