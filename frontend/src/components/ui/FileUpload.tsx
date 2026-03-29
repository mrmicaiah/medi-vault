import React, { useState, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { formatFileSize } from '../../lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  helperText?: string;
  error?: string;
  currentFile?: { name: string; url?: string } | null;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024,
  label,
  helperText,
  error,
  currentFile,
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      setValidationError(null);
      if (file.size > maxSize) {
        setValidationError(`File size exceeds ${formatFileSize(maxSize)} limit`);
        return false;
      }
      if (accept) {
        const allowedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const mimeMatch = allowedTypes.some(
          (t) => t === ext || file.type.includes(t.replace('.', ''))
        );
        if (!mimeMatch) {
          setValidationError(`File type not allowed. Accepted: ${accept}`);
          return false;
        }
      }
      return true;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const displayError = error || validationError;
  const displayFile = selectedFile || currentFile;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-navy">{label}</label>
      )}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragActive
            ? 'border-maroon bg-maroon-subtle'
            : displayError
              ? 'border-error bg-error-bg'
              : 'border-border hover:border-maroon hover:bg-maroon-subtle/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {displayFile ? (
          <div className="space-y-2">
            <svg className="mx-auto h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-slate">
              {'name' in displayFile ? displayFile.name : (displayFile as File).name}
            </p>
            {selectedFile && (
              <p className="text-xs text-gray">{formatFileSize(selectedFile.size)}</p>
            )}
            <p className="text-xs text-maroon">Click or drop to replace</p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg className="mx-auto h-10 w-10 text-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-slate">
              Drag and drop your file here, or{' '}
              <span className="text-maroon">browse</span>
            </p>
            <p className="text-xs text-gray">
              Accepted formats: {accept} (max {formatFileSize(maxSize)})
            </p>
          </div>
        )}
      </div>

      {displayError && <p className="text-sm text-error">{displayError}</p>}
      {helperText && !displayError && (
        <p className="text-sm text-gray">{helperText}</p>
      )}
    </div>
  );
}
