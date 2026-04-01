import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { Input, Select } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface PhotoIDUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  applicationId: string;
  frontData?: Record<string, unknown>;
  backData?: Record<string, unknown>;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'District of Columbia' },
];

const ID_TYPES = [
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'state_id', label: 'State ID' },
  { value: 'passport', label: 'US Passport' },
];

export function PhotoIDUploadModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  frontData = {},
  backData = {},
}: PhotoIDUploadModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  // Shared metadata (from front ID)
  const [formData, setFormData] = useState({
    id_type: (frontData.id_type as string) || '',
    id_number: (frontData.id_number as string) || '',
    issuing_state: (frontData.issuing_state as string) || '',
    expiration_date: (frontData.expiration_date as string) || '',
  });
  
  // Separate file states
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  
  // Existing file names for display
  const existingFrontFileName = (frontData.file_name as string) || '';
  const existingBackFileName = (backData.file_name as string) || '';

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        id_type: (frontData.id_type as string) || '',
        id_number: (frontData.id_number as string) || '',
        issuing_state: (frontData.issuing_state as string) || '',
        expiration_date: (frontData.expiration_date as string) || '',
      });
      setFrontFile(null);
      setBackFile(null);
      setError(null);
      setUploadProgress(null);
    }
  }, [isOpen, frontData]);

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const deleteOldFile = async (storagePath: string) => {
    try {
      const { error } = await supabase.storage.from('documents').remove([storagePath]);
      if (error) {
        console.warn('Failed to delete old file (non-critical):', error);
      }
    } catch (err) {
      console.warn('Error deleting old file:', err);
    }
  };

  const uploadFileToStorage = async (
    file: File, 
    folderName: string
  ): Promise<{ path: string; url: string }> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${folderName}/${timestamp}_${sanitizedFileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    return {
      path: data.path,
      url: urlData?.signedUrl || '',
    };
  };

  const handleSubmit = async () => {
    // Require at least one new file or existing files
    const hasFrontFile = frontFile || existingFrontFileName;
    const hasBackFile = backFile || existingBackFileName;
    
    if (!hasFrontFile && !hasBackFile) {
      setError('Please select at least one file to upload');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      
      // Upload Front if new file selected
      if (frontFile) {
        setUploadProgress('Uploading front of ID...');
        
        // Delete old front file if exists
        const oldFrontPath = frontData?.storage_path as string | undefined;
        if (oldFrontPath) {
          await deleteOldFile(oldFrontPath);
        }
        
        const { path, url } = await uploadFileToStorage(frontFile, 'id-front');
        
        setUploadProgress('Saving front ID info...');
        await api.post(`/applications/${applicationId}/steps`, {
          step_number: 12,
          data: {
            ...formData,
            skip: false,
            file_name: frontFile.name,
            file_size: frontFile.size,
            file_type: frontFile.type,
            storage_path: path,
            storage_url: url,
            uploaded_at: now,
          },
          status: 'completed',
        });
      } else if (existingFrontFileName) {
        // Just update the metadata without changing the file
        setUploadProgress('Updating ID info...');
        await api.post(`/applications/${applicationId}/steps`, {
          step_number: 12,
          data: {
            ...frontData,
            ...formData,
          },
          status: 'completed',
        });
      }

      // Upload Back if new file selected
      if (backFile) {
        setUploadProgress('Uploading back of ID...');
        
        // Delete old back file if exists
        const oldBackPath = backData?.storage_path as string | undefined;
        if (oldBackPath) {
          await deleteOldFile(oldBackPath);
        }
        
        const { path, url } = await uploadFileToStorage(backFile, 'id-back');
        
        setUploadProgress('Saving back ID info...');
        await api.post(`/applications/${applicationId}/steps`, {
          step_number: 13,
          data: {
            skip: false,
            file_name: backFile.name,
            file_size: backFile.size,
            file_type: backFile.type,
            storage_path: path,
            storage_url: url,
            uploaded_at: now,
            // Note: expiration_date is on front only, dashboard inherits it
          },
          status: 'completed',
        });
      }

      setUploadProgress(null);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload documents');
      setUploadProgress(null);
    } finally {
      setSaving(false);
    }
  };

  // Check if we can submit: need at least metadata filled out
  const canSubmit = 
    formData.id_type && 
    formData.id_number && 
    formData.issuing_state && 
    formData.expiration_date &&
    !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">
            Update Photo ID
          </h2>
          <button
            onClick={onClose}
            className="text-gray hover:text-slate"
            disabled={saving}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {uploadProgress && (
          <Alert variant="info" className="mb-4">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {uploadProgress}
            </div>
          </Alert>
        )}

        <div className="space-y-6">
          {/* ID Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate">ID Information</h3>
            
            <Select
              label="ID Type"
              required
              value={formData.id_type}
              onChange={(e) => handleFieldChange('id_type', e.target.value)}
              options={ID_TYPES}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ID Number"
                required
                value={formData.id_number}
                onChange={(e) => handleFieldChange('id_number', e.target.value)}
                placeholder="Enter ID number"
              />
              <Select
                label="Issuing State"
                required
                value={formData.issuing_state}
                onChange={(e) => handleFieldChange('issuing_state', e.target.value)}
                options={US_STATES}
              />
            </div>
            
            <Input
              label="Expiration Date"
              type="date"
              required
              value={formData.expiration_date}
              onChange={(e) => handleFieldChange('expiration_date', e.target.value)}
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-sm font-medium text-slate">Upload Images</h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Front of ID */}
              <div className="space-y-2">
                <FileUpload
                  label="Front of ID"
                  onFileSelect={setFrontFile}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10 * 1024 * 1024}
                  currentFile={
                    frontFile 
                      ? { name: frontFile.name } 
                      : existingFrontFileName 
                        ? { name: existingFrontFileName } 
                        : null
                  }
                  helperText="Photo of front side"
                />
                {existingFrontFileName && !frontFile && (
                  <p className="text-xs text-success">✓ On file</p>
                )}
              </div>
              
              {/* Back of ID */}
              <div className="space-y-2">
                <FileUpload
                  label="Back of ID"
                  onFileSelect={setBackFile}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10 * 1024 * 1024}
                  currentFile={
                    backFile 
                      ? { name: backFile.name } 
                      : existingBackFileName 
                        ? { name: existingBackFileName } 
                        : null
                  }
                  helperText="Photo of back side"
                />
                {existingBackFileName && !backFile && (
                  <p className="text-xs text-success">✓ On file</p>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray">
              Both front and back are required. You can update one or both images.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            {saving ? 'Uploading...' : 'Save Photo ID'}
          </Button>
        </div>
      </div>
    </div>
  );
}
