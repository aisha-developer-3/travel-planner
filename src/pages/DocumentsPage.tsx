import React, { useMemo, useRef, useState } from 'react';
import {
  Edit3,
  Eye,
  FileText,
  Folder,
  Lock,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import type { DocumentFolder, TravelDocument } from '../types/travel';
import { formatDisplayDate } from '../utils/travelMath';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const FOLDERS: Array<'All' | DocumentFolder> = [
  'All',
  'Passport',
  'Visa',
  'Flight Tickets',
  'Hotel Confirmations',
  'Travel Insurance',
  'Other Documents',
];

export const DocumentsPage: React.FC = () => {
  const {
    activeTrip,
    documents,
    preferences,
    globalSearch,
    saveDocument,
    renameDocument,
    deleteDocument,
    showToast,
  } = useTravel();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<'All' | DocumentFolder>('All');
  const [uploadFolder, setUploadFolder] = useState<DocumentFolder>('Passport');
  const [localSearch, setLocalSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<TravelDocument | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<TravelDocument | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [deletingDoc, setDeletingDoc] = useState<TravelDocument | null>(null);

  const filteredDocs = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return documents.filter((doc) => {
      if (activeTrip && doc.tripId !== activeTrip.id) return false;
      if (selectedFolder !== 'All' && doc.folder !== selectedFolder) return false;
      if (!q) return true;
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.folder.toLowerCase().includes(q)
      );
    });
  }, [activeTrip, documents, globalSearch, localSearch, selectedFolder]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTrip) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      const doc: TravelDocument = {
        id: `doc-${Date.now().toString(36)}`,
        tripId: activeTrip.id,
        folder: selectedFolder === 'All' ? uploadFolder : selectedFolder,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: reader.result,
        uploadedAt: new Date().toISOString(),
      };
      await saveDocument(doc);
      showToast(`Saved "${doc.name}" locally`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingDoc || !newDocName.trim()) return;
    await renameDocument(renamingDoc.id, newDocName.trim());
    showToast('Document renamed');
    setRenamingDoc(null);
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice */}
      <div className="rounded-2xl border border-[#D4E7FA] dark:border-sky-900/60 bg-[#EBF5FF]/70 dark:bg-sky-950/30 px-4 py-3.5 flex items-start gap-3 text-xs sm:text-sm text-[#172B42] dark:text-slate-200">
        <Lock className="h-4 w-4 text-[#1687D9] shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Local-Only Privacy Vault:</strong> Documents uploaded here are stored exclusively in this browser&apos;s IndexedDB storage for offline access and are never transmitted to an external server.
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Document folders"
        >
          {FOLDERS.map((folder) => {
            const active = selectedFolder === folder;
            return (
              <button
                key={folder}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedFolder(folder)}
                className={`min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1687D9] text-white border-[#1687D9]'
                    : 'bg-white dark:bg-slate-900 text-[#718096] dark:text-slate-300 border-[#E5ECF3] dark:border-slate-800 hover:text-[#172B42]'
                }`}
              >
                <Folder className="h-3.5 w-3.5" />
                <span>{folder}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="relative flex-1 sm:w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search documents..."
              aria-label="Search documents"
              className="w-full h-10 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm focus:border-[#1687D9] focus:outline-none"
            />
          </div>

          {selectedFolder === 'All' && (
            <select
              aria-label="Target folder for upload"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value as DocumentFolder)}
              className="h-10 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
            >
              {FOLDERS.filter((f) => f !== 'All').map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.svg,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Document Cards */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-[#1687D9]" />
          <p className="mt-3 text-base font-semibold">No documents in this folder</p>
          <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
            Upload passports, visas, boarding passes, or hotel confirmations for offline access.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Upload File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <article
              key={doc.id}
              className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FF] dark:bg-sky-950 text-[#1687D9] dark:text-sky-400">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[#1687D9] dark:text-sky-400">
                    {doc.folder}
                  </span>
                  <h3 className="text-sm font-bold text-[#172B42] dark:text-white truncate">
                    {doc.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#718096] dark:text-slate-400 truncate tabular-nums">
                    {doc.fileName} · {Math.max(1, Math.round(doc.size / 1024))} KB ·{' '}
                    {formatDisplayDate(doc.uploadedAt, preferences.dateFormat)}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(doc)}
                  className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl bg-[#F5F8FC] dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[#172B42] dark:text-slate-200 hover:bg-[#EBF5FF] hover:text-[#1687D9]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingDoc(doc);
                      setNewDocName(doc.name);
                    }}
                    aria-label={`Rename ${doc.name}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-[#F5F8FC] hover:text-[#1687D9] dark:hover:bg-slate-800"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingDoc(doc)}
                    aria-label={`Delete ${doc.name}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.name ?? 'Document Preview'}
        subtitle={previewDoc ? `${previewDoc.folder} · ${previewDoc.fileName}` : undefined}
        maxWidth="max-w-2xl"
      >
        {previewDoc ? (
          <div className="space-y-4">
            {previewDoc.mimeType.startsWith('image/') ? (
              <img
                src={previewDoc.dataUrl}
                alt={previewDoc.name}
                className="w-full max-h-[60vh] object-contain rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC]"
              />
            ) : previewDoc.mimeType === 'application/pdf' ? (
              <iframe
                src={previewDoc.dataUrl}
                title={previewDoc.name}
                className="w-full h-[60vh] rounded-xl border border-[#E5ECF3]"
              />
            ) : (
              <div className="rounded-xl bg-[#F5F8FC] dark:bg-slate-800 p-6 text-center text-sm text-[#718096]">
                Preview unavailable for this file type. Download the file below to view it.
              </div>
            )}
            <div className="flex justify-end">
              <a
                href={previewDoc.dataUrl}
                download={previewDoc.fileName}
                className="min-h-[40px] inline-flex items-center rounded-xl bg-[#1687D9] px-4 py-2 text-sm font-semibold text-white"
              >
                Download Local Copy
              </a>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Rename Modal */}
      <Modal
        open={!!renamingDoc}
        onClose={() => setRenamingDoc(null)}
        title="Rename Document"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <div>
            <label htmlFor="doc-rename" className="block text-xs font-semibold mb-1">
              Document Name
            </label>
            <input
              id="doc-rename"
              type="text"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenamingDoc(null)}
              className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-4 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#1687D9] px-4 text-sm font-semibold text-white"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onConfirm={async () => {
          if (deletingDoc) {
            await deleteDocument(deletingDoc.id);
            showToast('Document deleted', 'info');
          }
        }}
        title="Delete Document?"
        message={`Permanently delete "${deletingDoc?.name}" from local storage?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
