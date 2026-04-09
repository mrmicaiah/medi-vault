import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';

interface EmployeeDocument {
  id: string;
  document_type: string;
  name: string;
  filename: string;
  uploaded_at: string;
  expiration_date: string | null;
  status: string;
  version: number;
  source: string;
}

interface EmployeeDocumentUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  document: EmployeeDocument | null;
}

export function EmployeeDocumentUpdateModal({
  isOpen,
  onClose,
  onSuccess,
  document,
}: EmployeeDocumentUpdateModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !document) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or image file (JPEG, PNG, GIF)');
        return;
      }
      
      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(droppedFile.type)) {
        setError('Please upload a PDF or image file (JPEG, PNG, GIF)');
        return;
      }
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('document_type', document.document_type);
      formData.append('file', file);
      
      // Only pass previous_document_id if it's from documents table
      if (document.source === 'documents_table') {
        formData.append('previous_document_id', document.id);
      }

      await api.postFormData('/employee/documents/upload', formData);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">
              Update {document.name}
            </h2>
            <p className="mt-1 text-sm text-gray">
              Upload a new version of this document
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray hover:text-slate"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current document info */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray">Current document:</p>
          <p className="text-sm font-medium text-slate">{document.filename}</p>
          {document.expiration_date && (
            <p className="mt-1 text-sm text-gray">
              Expires: {new Date(document.expiration_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex gap-3">
            <svg className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800">
                Your new document will be sent to your manager for review. 
                Once approved, they will set the new expiration date.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* File upload area */}
        <div
          className={`mb-6 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            file 
              ? 'border-green-300 bg-green-50' 
              : 'border-gray-300 hover:border-maroon hover:bg-maroon/5'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{ cursor: 'pointer' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.gif"
            onChange={handleFileChange}
          />
          
          {file ? (
            <div>
              <svg className="mx-auto h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm font-medium text-slate">{file.name}</p>
              <p className="mt-1 text-xs text-gray">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button
                type="button"
                className="mt-2 text-sm text-maroon hover:text-maroon-dark"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                Remove and choose different file
              </button>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm font-medium text-slate">Click to upload or drag and drop</p>
              <p className="mt-1 text-xs text-gray">PDF, JPEG, PNG, GIF (max 10MB)</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>
    </div>
  );
}
