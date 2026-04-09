import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';

// Document types that can be uploaded
export const DOCUMENT_TYPES = [
  // Compliance checks (monthly)
  { value: 'background_check', label: 'Background Check', category: 'compliance', hasExpiration: true },
  { value: 'oig_exclusion_check', label: 'OIG Exclusion Check', category: 'compliance', hasExpiration: true },
  { value: 'sam_exclusion_check', label: 'SAM Exclusion Check', category: 'compliance', hasExpiration: true },
  { value: 'state_exclusion_check', label: 'State Registry Check', category: 'compliance', hasExpiration: true },
  
  // Licenses & Certifications
  { value: 'license', label: 'License (CNA/LPN/RN)', category: 'certification', hasExpiration: true, hasFrontBack: true, hasNumber: true },
  { value: 'cpr_certification', label: 'CPR Certification', category: 'certification', hasExpiration: true },
  { value: 'first_aid', label: 'First Aid Certification', category: 'certification', hasExpiration: true },
  { value: 'professional_credentials', label: 'Other Credentials', category: 'certification', hasExpiration: true },
  
  // Medical
  { value: 'tb_test_results', label: 'TB Test Results', category: 'medical', hasExpiration: true },
  { value: 'physical_exam', label: 'Physical Exam', category: 'medical', hasExpiration: true },
  { value: 'drug_screening', label: 'Drug Screening', category: 'medical', hasExpiration: true },
  
  // Identification
  { value: 'drivers_license', label: "Driver's License", category: 'identification', hasExpiration: true, hasFrontBack: true, hasNumber: true },
  { value: 'id_card', label: 'State ID Card', category: 'identification', hasExpiration: true, hasFrontBack: true, hasNumber: true },
  
  // Other
  { value: 'training_record', label: 'Training Record', category: 'other', hasExpiration: false },
  { value: 'other', label: 'Other Document', category: 'other', hasExpiration: false },
];

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  // For updating existing document
  existingDocument?: {
    id: string;
    type: string;
    name: string;
    filename?: string;
    expires_at?: string;
    document_number?: string;
  };
  onSuccess: () => void;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  existingDocument,
  onSuccess,
}: DocumentUploadModalProps) {
  const isUpdate = !!existingDocument;
  const [documentType, setDocumentType] = useState(existingDocument?.type || '');
  const [expirationDate, setExpirationDate] = useState(existingDocument?.expires_at?.split('T')[0] || '');
  const [documentNumber, setDocumentNumber] = useState(existingDocument?.document_number || '');
  const [notes, setNotes] = useState('');
  const [checkResult, setCheckResult] = useState<'clear' | 'match_found' | ''>('');
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileBack, setFileBack] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileBackInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = DOCUMENT_TYPES.find(t => t.value === documentType);
  const isComplianceCheck = selectedType?.category === 'compliance';
  const hasFrontBack = selectedType?.hasFrontBack || false;
  const hasNumber = selectedType?.hasNumber || false;
  const hasExpiration = selectedType?.hasExpiration || false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isBack = false) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF or image file (JPEG, PNG, WebP, HEIC)');
        return;
      }
      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setError(null);
      if (isBack) {
        setFileBack(selectedFile);
      } else {
        setFile(selectedFile);
      }
    }
  };

  const handleSubmit = async () => {
    if (!documentType) {
      setError('Please select a document type');
      return;
    }
    if (!file && !isUpdate) {
      setError('Please select a file to upload');
      return;
    }
    if (hasFrontBack && !fileBack && !isUpdate) {
      // Back is optional for updates, but warn on new
      // Actually let's make it optional always
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('employee_id', employeeId);
      
      if (file) {
        formData.append('file', file);
      }
      if (fileBack) {
        formData.append('file_back', fileBack);
      }
      if (expirationDate) {
        formData.append('expiration_date', expirationDate);
      }
      if (documentNumber) {
        formData.append('document_number', documentNumber);
      }
      if (notes) {
        formData.append('notes', notes);
      }
      if (isComplianceCheck && checkResult) {
        formData.append('check_result', checkResult);
      }
      if (isUpdate && existingDocument) {
        formData.append('previous_document_id', existingDocument.id);
      }

      await api.postFormData('/admin/employees/documents/upload', formData);

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setDocumentType(existingDocument?.type || '');
    setExpirationDate(existingDocument?.expires_at?.split('T')[0] || '');
    setDocumentNumber(existingDocument?.document_number || '');
    setNotes('');
    setCheckResult('');
    setFile(null);
    setFileBack(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isUpdate ? `Update ${existingDocument?.name}` : 'Upload Document'}
    >
      <div className="space-y-4">
        {/* Employee Name */}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray uppercase font-semibold">Employee</p>
          <p className="text-sm font-medium text-navy">{employeeName}</p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 rounded-lg p-3">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Document Type */}
        {!isUpdate && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Document Type *</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
            >
              <option value="">Select document type...</option>
              <optgroup label="Compliance Checks">
                {DOCUMENT_TYPES.filter(t => t.category === 'compliance').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="Licenses & Certifications">
                {DOCUMENT_TYPES.filter(t => t.category === 'certification').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="Medical">
                {DOCUMENT_TYPES.filter(t => t.category === 'medical').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="Identification">
                {DOCUMENT_TYPES.filter(t => t.category === 'identification').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
              <optgroup label="Other">
                {DOCUMENT_TYPES.filter(t => t.category === 'other').map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate">
            {hasFrontBack ? 'Front Image/PDF' : 'Document File'} {!isUpdate && '*'}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            onChange={(e) => handleFileChange(e, false)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-maroon/50 hover:bg-maroon/5 transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-slate">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-gray hover:text-error"
                >
                  ×
                </button>
              </div>
            ) : (
              <div>
                <svg className="h-8 w-8 text-gray mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray">Click to upload {hasFrontBack ? 'front' : ''}</p>
                <p className="text-xs text-gray mt-1">PDF, JPEG, PNG (max 10MB)</p>
              </div>
            )}
          </button>
        </div>

        {/* Back Image (for licenses/IDs) */}
        {hasFrontBack && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Back Image/PDF (optional)</label>
            <input
              ref={fileBackInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
              onChange={(e) => handleFileChange(e, true)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileBackInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-maroon/50 hover:bg-maroon/5 transition-colors"
            >
              {fileBack ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-slate">{fileBack.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFileBack(null); }}
                    className="text-gray hover:text-error"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div>
                  <svg className="h-6 w-6 text-gray mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray">Click to upload back</p>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Document Number (for licenses) */}
        {hasNumber && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">License/ID Number</label>
            <Input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Enter license or ID number"
            />
          </div>
        )}

        {/* Expiration Date */}
        {hasExpiration && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Expiration Date</label>
            <Input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray">Leave blank if no expiration</p>
          </div>
        )}

        {/* Check Result (for compliance checks) */}
        {isComplianceCheck && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Check Result</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="checkResult"
                  value="clear"
                  checked={checkResult === 'clear'}
                  onChange={(e) => setCheckResult(e.target.value as 'clear')}
                  className="text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">✅ Clear</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="checkResult"
                  value="match_found"
                  checked={checkResult === 'match_found'}
                  onChange={(e) => setCheckResult(e.target.value as 'match_found')}
                  className="text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">⚠️ Match Found</span>
              </label>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
            placeholder="Any additional notes about this document..."
          />
        </div>

        {/* Version Info */}
        {isUpdate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> The previous version will be retained in history. This new upload will become the current document.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={uploading}>
            {isUpdate ? 'Update Document' : 'Upload Document'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
