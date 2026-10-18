import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  BookOpen,
  CheckCircle,
  FileCode,
  FolderArchive,
} from 'lucide-react';
import {
  MobilePageHeader,
  MobileFormField,
  MobileSheet,
  MobileEmptyState,
} from '../../../components/mobile';
import { showToast } from '../../../components/Toast';

interface DocumentItem {
  id: string;
  course: string;
  title: string;
  type: 'pdf' | 'code' | 'zip';
  size: string;
  updatedAt: string;
  url?: string;
}

const DEMO_DOCS: DocumentItem[] = [
  {
    id: 'doc-1',
    course: 'PRN211',
    title: 'Syllabus & Course Outline: .NET Application Development',
    type: 'pdf',
    size: '1.4 MB',
    updatedAt: '12/10/2026',
  },
  {
    id: 'doc-2',
    course: 'PRN211',
    title: 'Lab 4 Starter Solution: EF Core & REST API',
    type: 'zip',
    size: '8.2 MB',
    updatedAt: 'Hôm qua',
  },
  {
    id: 'doc-3',
    course: 'SWP391',
    title: 'Hướng dẫn bảo vệ Sprint 2 & Mẫu báo cáo đồ án phần mềm',
    type: 'pdf',
    size: '2.8 MB',
    updatedAt: '15/10/2026',
  },
  {
    id: 'doc-4',
    course: 'CSN301',
    title: 'Bộ slide bài giảng Chương 4: Mạng nơ-ron tích chập (CNN)',
    type: 'pdf',
    size: '6.5 MB',
    updatedAt: '10/10/2026',
  },
  {
    id: 'doc-5',
    course: 'CSN301',
    title: 'Jupyter Notebook: Huấn luyện mô hình phân loại ảnh với PyTorch',
    type: 'code',
    size: '340 KB',
    updatedAt: '08/10/2026',
  },
];

export function MobileDocumentsScreen() {
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  const filteredDocs = DEMO_DOCS.filter((d) => {
    if (selectedCourse !== 'all' && d.course !== selectedCourse) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.course.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleDownload = (doc: DocumentItem) => {
    showToast(`Đang tải xuống "${doc.title}"...`, 'info');
    setActiveDoc(null);
  };

  return (
    <div className="mobile-app-shell">
      <MobilePageHeader
        title="Tài liệu học tập"
        subtitle="Giáo trình & Bài tập các môn FPT"
      />

      <main className="mobile-view-container">
        {/* Search Input */}
        <section className="mb-3.5">
          <MobileFormField
            label="Tìm tài liệu"
            placeholder="Tìm theo tên bài học hoặc mã môn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </section>

        {/* Filter Course Chips */}
        <div className="mobile-chip-row mb-4">
          <button
            type="button"
            onClick={() => setSelectedCourse('all')}
            className={`mobile-chip ${selectedCourse === 'all' ? 'active' : ''}`}
          >
            Tất cả ({DEMO_DOCS.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourse('PRN211')}
            className={`mobile-chip ${selectedCourse === 'PRN211' ? 'active' : ''}`}
          >
            PRN211 (.NET)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourse('SWP391')}
            className={`mobile-chip ${selectedCourse === 'SWP391' ? 'active' : ''}`}
          >
            SWP391 (Đồ án)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCourse('CSN301')}
            className={`mobile-chip ${selectedCourse === 'CSN301' ? 'active' : ''}`}
          >
            CSN301 (AI)
          </button>
        </div>

        {/* Documents List */}
        <div className="flex flex-col gap-2.5">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <motion.div
                key={doc.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveDoc(doc)}
                className="mobile-card p-3.5 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--m-brand-soft)] text-[var(--m-brand-primary)] flex items-center justify-center shrink-0">
                  {doc.type === 'zip' ? (
                    <FolderArchive size={20} />
                  ) : doc.type === 'code' ? (
                    <FileCode size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--m-surface-subtle)] text-[var(--m-brand-primary)]">
                      {doc.course}
                    </span>
                    <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase">
                      {doc.type} · {doc.size}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--m-text-primary)] truncate">
                    {doc.title}
                  </h3>
                  <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
                    Cập nhật: {doc.updatedAt}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(doc);
                  }}
                  className="mobile-touch-target p-2 text-[var(--m-brand-primary)] hover:bg-[var(--m-brand-soft)] rounded-full shrink-0"
                  aria-label="Tải về"
                >
                  <Download size={18} />
                </button>
              </motion.div>
            ))
          ) : (
            <MobileEmptyState
              title="Không tìm thấy tài liệu"
              description="Không có tài liệu nào khớp với từ khóa tìm kiếm của bạn."
            />
          )}
        </div>
      </main>

      {/* Document Detail Sheet */}
      <MobileSheet
        isOpen={Boolean(activeDoc)}
        onClose={() => setActiveDoc(null)}
        title={activeDoc?.title || 'Thông tin tài liệu'}
        subtitle={`${activeDoc?.course} · ${activeDoc?.size}`}
      >
        {activeDoc && (
          <div className="flex flex-col gap-3.5 py-2">
            <div className="p-3.5 rounded-xl bg-[var(--m-surface-subtle)] flex flex-col gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--m-text-muted)]">Môn học:</span>
                <span className="font-bold text-[var(--m-text-primary)]">{activeDoc.course}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--m-text-muted)]">Dung lượng:</span>
                <span className="font-semibold text-[var(--m-text-primary)]">{activeDoc.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--m-text-muted)]">Ngày tải lên:</span>
                <span className="text-[var(--m-text-primary)]">{activeDoc.updatedAt}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDownload(activeDoc)}
              className="w-full mobile-touch-target rounded-xl bg-[var(--m-brand-primary)] text-white text-xs font-bold shadow-sm"
            >
              Tải tài liệu về điện thoại
            </button>
          </div>
        )}
      </MobileSheet>
    </div>
  );
}
