/**
 * Image optimization utilities for document uploads.
 * Handles HEIC conversion, image compression, and file validation.
 */

import imageCompression from 'browser-image-compression';

// Accepted file types
export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
];

export const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf';

// Image optimization settings
const IMAGE_SPECS = {
  maxSizeMB: 0.5,           // Target 500KB
  maxWidthOrHeight: 1500,   // Max dimension
  useWebWorker: true,       // Don't block UI
  fileType: 'image/jpeg' as const,
  initialQuality: 0.85,
};

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB before optimization
export const MAX_PDF_SIZE = 5 * 1024 * 1024;   // 5MB for PDFs

export interface ProcessingProgress {
  stage: 'validating' | 'converting' | 'optimizing' | 'complete' | 'error';
  message: string;
}

export type ProgressCallback = (progress: ProcessingProgress) => void;

/**
 * Check if a file is an image (not PDF)
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if a file is HEIC/HEIF format (common on iPhones)
 */
export function isHeicFile(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  const validType = ACCEPTED_TYPES.includes(file.type) || 
    ACCEPTED_EXTENSIONS.includes(ext) ||
    isHeicFile(file);

  if (!validType) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, HEIC, or PDF file.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 10MB.',
    };
  }

  // Additional check for PDFs
  if (file.type === 'application/pdf' && file.size > MAX_PDF_SIZE) {
    return {
      valid: false,
      error: 'PDF is too large. Maximum size for PDFs is 5MB.',
    };
  }

  return { valid: true };
}

/**
 * Convert HEIC/HEIF to JPEG
 * This is common for iPhone photos
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    // Dynamic import to avoid loading the library unless needed
    const heic2any = (await import('heic2any')).default;
    
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.85,
    });

    // heic2any can return an array for multi-image HEIC files
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([resultBlob], newName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error(
      'Could not process this iPhone photo. Please convert to JPEG using your Photos app and try again.'
    );
  }
}

/**
 * Optimize an image file (compress and resize)
 */
async function optimizeImage(file: File): Promise<File> {
  // Skip PDFs
  if (file.type === 'application/pdf') {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, IMAGE_SPECS);

    // Ensure .jpg extension
    let newName = file.name;
    if (!newName.toLowerCase().endsWith('.jpg') && !newName.toLowerCase().endsWith('.jpeg')) {
      newName = newName.replace(/\.[^.]+$/, '.jpg');
    }

    return new File([compressedFile], newName, { type: 'image/jpeg' });
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error(
      'Failed to process image. Please try a different file or take a new photo.'
    );
  }
}

/**
 * Process a file for upload:
 * 1. Validate file type and size
 * 2. Convert HEIC if needed
 * 3. Optimize images (compress and resize)
 * 
 * @param file - The file to process
 * @param onProgress - Optional callback for progress updates
 * @returns The processed file ready for upload
 */
export async function processFileForUpload(
  file: File,
  onProgress?: ProgressCallback
): Promise<File> {
  const updateProgress = (stage: ProcessingProgress['stage'], message: string) => {
    onProgress?.({ stage, message });
  };

  try {
    // Step 1: Validate
    updateProgress('validating', 'Checking file...');
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // PDFs don't need processing
    if (file.type === 'application/pdf') {
      updateProgress('complete', 'PDF ready for upload');
      return file;
    }

    // Step 2: Convert HEIC if needed
    let processedFile = file;
    if (isHeicFile(file)) {
      updateProgress('converting', 'Converting iPhone photo...');
      processedFile = await convertHeicToJpeg(file);
    }

    // Step 3: Optimize image
    updateProgress('optimizing', 'Optimizing image quality...');
    processedFile = await optimizeImage(processedFile);

    updateProgress('complete', 'Image ready for upload');
    return processedFile;
  } catch (error) {
    updateProgress('error', error instanceof Error ? error.message : 'Processing failed');
    throw error;
  }
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
