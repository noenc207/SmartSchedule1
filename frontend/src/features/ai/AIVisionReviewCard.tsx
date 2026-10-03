import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Download,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { VisionAnalysisResponse, VisionEventDto, aiApi } from '../../services/aiApi';

interface AIVisionReviewCardProps {
  result: VisionAnalysisResponse;
  onImportSelected?: (events: VisionEventDto[]) => void;
  onAskAi?: (prompt: string) => void;
}

export const AIVisionReviewCard: React.FC<AIVisionReviewCardProps> = ({
  result,
  onImportSelected,
  onAskAi,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(result.events.map((_, i) => i))
  );
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [feedbackType, setFeedbackType] = useState<'accepted' | 'rejected' | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === result.events.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(result.events.map((_, i) => i)));
    }
  };

  const handleFeedback = async (accepted: boolean) => {
    if (feedbackSent) return;
    try {
      await aiApi.sendVisionFeedback({
        resultId: result.resultId,
        accepted,
      });
      setFeedbackSent(true);
      setFeedbackType(accepted ? 'accepted' : 'rejected');
    } catch (err) {
      console.warn('Failed to send vision feedback:', err);
    }
  };

  const handleImport = () => {
    const selectedEvents = result.events.filter((_, i) => selectedIndices.has(i));
    setIsImporting(true);
    if (onImportSelected) {
      onImportSelected(selectedEvents);
    } else if (onAskAi) {
      // Default fallback prompt to AI Agent
      const titles = selectedEvents.map(e => e.title).join(', ');
      onAskAi(`Hãy nhập các môn học này vào thời khóa biểu của tôi: ${titles}`);
    }
  };

  const confidencePct = Math.round(result.confidence * 100);
  const confidenceColor =
    confidencePct >= 90
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
      : confidencePct >= 75
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-md dark:border-indigo-900/40 dark:bg-slate-900">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-50 bg-indigo-50/60 px-4 py-2.5 dark:border-indigo-900/30 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
            {result.documentType === 'TIMETABLE' ? 'Thời khóa biểu' : result.documentType}
          </span>
          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {result.provider}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceColor}`}>
            {confidencePct}% Tin cậy
          </span>
        </div>
      </div>

      {/* Summary Content */}
      <div className="p-4">
        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {result.summary}
        </p>

        {/* Warnings list if any */}
        {result.warnings && result.warnings.length > 0 && (
          <div className="mt-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1 text-xs text-amber-900 dark:text-amber-300">
                {result.warnings.map((w, idx) => (
                  <p key={idx}>{w}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Extracted Events List */}
        {result.events && result.events.length > 0 && (
          <div className="mt-3.5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Lịch học nhận diện ({selectedIndices.size}/{result.events.length})
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {selectedIndices.size === result.events.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="space-y-2">
              {result.events.map((ev, index) => {
                const isSelected = selectedIndices.has(index);
                return (
                  <div
                    key={index}
                    onClick={() => toggleSelect(index)}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                      isSelected
                        ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-800 dark:bg-indigo-950/20'
                        : 'border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/50'
                    }`}
                  >
                    <div className="mt-0.5 text-indigo-600 dark:text-indigo-400">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {ev.title}
                        </span>
                        {ev.day_of_week && (
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {ev.day_of_week}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {ev.start_time} {ev.end_time ? `– ${ev.end_time}` : ''}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {ev.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deadlines Section if any */}
        {result.deadlines && result.deadlines.length > 0 && (
          <div className="mt-3 rounded-lg border border-purple-100 bg-purple-50/50 p-2.5 dark:border-purple-900/40 dark:bg-purple-950/20">
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
              Hạn chót / Deadline trích xuất được:
            </span>
            <div className="mt-1.5 space-y-1">
              {result.deadlines.map((dl, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-purple-950 dark:text-purple-100">
                    • {dl.title}
                  </span>
                  <span className="font-mono text-[11px] text-purple-700 dark:text-purple-300">
                    {dl.due_date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            disabled={selectedIndices.size === 0 || isImporting}
            onClick={handleImport}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Download className="h-3.5 w-3.5" />
            <span>
              {isImporting
                ? 'Đang gửi yêu cầu...'
                : `Nhập ${selectedIndices.size} môn đã chọn vào lịch`}
            </span>
          </button>

          {/* Feedback buttons */}
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            {feedbackSent ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Đã ghi nhận</span>
              </span>
            ) : (
              <>
                <span className="mr-1 text-[11px]">Đúng không?</span>
                <button
                  type="button"
                  title="Nhận diện chính xác"
                  onClick={() => handleFeedback(true)}
                  className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Cần chỉnh sửa"
                  onClick={() => handleFeedback(false)}
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
