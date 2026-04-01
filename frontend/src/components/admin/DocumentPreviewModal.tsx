import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string | null;
  documentName: string;
  fileName?: string;
  loading: boolean;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  fileName,
  loading,
}: DocumentPreviewModalProps) {
  const [imageError, setImageError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setImageError(false);
  }, [documentUrl]);

  if (!isOpen) return null;

  // Determine if the file is an image or PDF based on URL or filename
  const isImage = (url: string | null, name?: string): boolean => {
    if (!url && !name) return false;
    const checkStr = (name || url || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp)/.test(checkStr) || 
           checkStr.includes('image/') ||
           // Supabase signed URLs often don't have extensions, so check content hints
           (!checkStr.includes('.pdf') && !checkStr.includes('application/pdf'));
  };

  const isPDF = (url: string | null, name?: string): boolean => {
    if (!url && !name) return false;
    const checkStr = (name || url || '').toLowerCase();
    return checkStr.includes('.pdf') || checkStr.includes('application/pdf');
  };

  const handlePrint = () => {
    if (!documentUrl) return;
    
    // Open in new window and trigger print
    const printWindow = window.open(documentUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownload = () => {
    if (!documentUrl) return;
    
    const a = document.createElement('a');
    a.href = documentUrl;
    a.download = fileName || documentName || 'document';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenInNewTab = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const fileIsImage = isImage(documentUrl, fileName);
  const fileIsPDF = isPDF(documentUrl, fileName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-navy">{documentName}</h2>
            {fileName && (
              <p className="text-sm text-gray-500">{fileName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="mt-3 text-sm text-gray-500">Loading document...</p>
              </div>
            </div>
          ) : documentUrl ? (
            <div className="flex items-center justify-center h-full">
              {fileIsPDF ? (
                // PDF: Use iframe
                <iframe
                  src={documentUrl}
                  className="w-full h-full border border-gray-200 rounded bg-white"
                  title={documentName}
                />
              ) : fileIsImage && !imageError ? (
                // Image: Display directly
                <img
                  src={documentUrl}
                  alt={documentName}
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                // Fallback: Show link to open
                <div className="text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-4 text-gray-600">Preview not available for this file type</p>
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={handleOpenInNewTab}
                  >
                    Open in New Tab
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Unable to load document</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 shrink-0">
          <div className="text-xs text-gray-400">
            {fileIsPDF ? 'PDF Document' : fileIsImage ? 'Image' : 'Document'}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleOpenInNewTab}>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
