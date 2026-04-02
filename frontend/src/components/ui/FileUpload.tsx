import React, { useState, useRef, useCallback } from 'react';
import { cn, formatFileSize } from '../../lib/utils';
import { 
  processFileForUpload, 
  validateFile, 
  ACCEPTED_EXTENSIONS,
  type ProcessingProgress 
} from '../../lib/imageOptimizer';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  helperText?: string;
  error?: string;
  currentFile?: { name: string; url?: string } | null;
  className?: string;
  /** Enable image optimization (compression, HEIC conversion) */
  optimizeImages?: boolean;
  /** Show camera capture option on mobile */
  allowCamera?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = ACCEPTED_EXTENSIONS,
  maxSize = 10 * 1024 * 1024,
  label,
  helperText,
  error,
  currentFile,
  className,
  optimizeImages = true,
  allowCamera = true,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setValidationError(null);
      setProcessingStatus(null);

      // Quick validation first
      const validation = validateFile(file);
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid file');
        return;
      }

      // Process file (optimize images, convert HEIC)
      if (optimizeImages && file.type !== 'application/pdf') {
        setProcessing(true);
        try {
          const optimizedFile = await processFileForUpload(file, setProcessingStatus);
          setSelectedFile(optimizedFile);
          onFileSelect(optimizedFile);
        } catch (err) {
          setValidationError(err instanceof Error ? err.message : 'Failed to process file');
        } finally {
          setProcessing(false);
        }
      } else {
        // PDFs and non-optimized files go straight through
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [optimizeImages, onFileSelect]
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

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const displayError = error || validationError;
  const displayFile = selectedFile || currentFile;

  // Processing status indicator
  const ProcessingIndicator = () => {
    if (!processing || !processingStatus) return null;

    const statusColors = {
      validating: 'text-blue-500',
      converting: 'text-amber-500',
      optimizing: 'text-teal-500',
      complete: 'text-green-500',
      error: 'text-red-500',
    };

    return (
      <div className="flex items-center gap-3 py-2">
        {processingStatus.stage !== 'complete' && processingStatus.stage !== 'error' && (
          <svg className="h-5 w-5 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        <span className={cn('text-sm font-medium', statusColors[processingStatus.stage])}>
          {processingStatus.message}
        </span>
      </div>
    );
  };

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
          'relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          processing && 'pointer-events-none opacity-75',
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
          disabled={processing}
        />

        {/* Hidden camera input for mobile */}
        {allowCamera && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            className="hidden"
            disabled={processing}
          />
        )}

        {processing ? (
          <div className="space-y-2">
            <svg className="mx-auto h-10 w-10 animate-pulse text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <ProcessingIndicator />
          </div>
        ) : displayFile ? (
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
          <div className="space-y-3">
            <svg className="mx-auto h-10 w-10 text-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate">
                Drag and drop your file here, or{' '}
                <span className="text-maroon">browse</span>
              </p>
              <p className="text-xs text-gray mt-1">
                JPEG, PNG, PDF, or HEIC (iPhone) • Max {formatFileSize(maxSize)}
              </p>
            </div>
            
            {/* Camera button for mobile - more prominent */}
            {allowCamera && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCameraClick();
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-maroon/30 bg-maroon/5 px-4 py-2 text-sm font-medium text-maroon hover:bg-maroon/10 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
            )}
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
