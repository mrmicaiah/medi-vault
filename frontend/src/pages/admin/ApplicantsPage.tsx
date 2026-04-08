import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

// Per-applicant note from manager (visible at top of page)
const APPLICANT_NOTE_KEY = 'medivault_applicant_note';

interface ApplicantNote {
  message: string;
  managerName: string;
  timestamp: number;
  applicantId: string;
  applicantName: string;
}

const getApplicantNote = (): ApplicantNote | null => {
  try {
    const stored = localStorage.getItem(APPLICANT_NOTE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
};

const setApplicantNote = (note: ApplicantNote | null) => {
  if (note) {
    localStorage.setItem(APPLICANT_NOTE_KEY, JSON.stringify(note));
  } else {
    localStorage.removeItem(APPLICANT_NOTE_KEY);
  }
};

interface Applicant {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
  location_id?: string;
  location_name: string;
  position?: string;
}

interface Location {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

interface AgencyWithLocations {
  id: string;
  name: string;
  locations: Location[];
}

interface ApplicantDetail {
  position_applied?: string;
  employment_type?: string;
  desired_hourly_rate?: string;
  desired_start_date?: string;
  speaks_other_languages?: string;
  other_languages?: string;
  how_heard?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  emergency_name?: string;
  emergency_relationship?: string;
  emergency_phone?: string;
  available_days?: string[];
  shift_preferences?: string[];
  hours_per_week?: string;
  has_transportation?: string;
  max_travel_miles?: string;
  comfortable_with_pets?: string;
  comfortable_with_smokers?: string;
  credential_type?: string;
  work_auth_uploaded?: boolean;
  id_front_uploaded?: boolean;
  id_back_uploaded?: boolean;
  ssn_card_uploaded?: boolean;
  credentials_uploaded?: boolean;
  cpr_uploaded?: boolean;
  tb_uploaded?: boolean;
  ssn_last_four?: string;
  // Step completion tracking
  stepsCompletion?: Record<number, boolean>;
}

const detailCache = new Map<string, ApplicantDetail>();

// Position configuration
const POSITION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  cna: { label: 'CNA', color: 'bg-purple-500', icon: '🩺' },
  hha: { label: 'HHA', color: 'bg-teal-500', icon: '🏠' },
  pca: { label: 'PCA', color: 'bg-blue-500', icon: '👤' },
  lpn: { label: 'LPN', color: 'bg-amber-500', icon: '💉' },
  rn: { label: 'RN', color: 'bg-rose-500', icon: '⚕️' },
};

const POSITION_ORDER = ['cna', 'hha', 'pca', 'lpn', 'rn'];

const getPositionConfig = (position?: string) => {
  if (!position) return null;
  return POSITION_CONFIG[position.toLowerCase()] || null;
};

const DOC_STEPS: Record<string, number> = {
  work_auth: 11,
  id_front: 12,
  id_back: 13,
  ssn_card: 14,
  credentials: 15,
  cpr: 16,
  tb: 17,
};

// Step names for progress display
const STEP_NAMES: Record<number, string> = {
  1: 'Application Basics',
  2: 'Personal Info',
  3: 'Emergency Contact',
  4: 'Education',
  5: 'Reference 1',
  6: 'Reference 2',
  7: 'Employment History',
  8: 'Availability',
  9: 'Confidentiality',
  10: 'E-Signature',
  11: 'Work Authorization',
  12: 'ID Front',
  13: 'ID Back',
  14: 'SSN Card',
  15: 'Credentials',
  16: 'CPR Cert',
  17: 'TB Test',
  18: 'Orientation',
  19: 'Criminal Background',
  20: 'VA Code Disclosure',
  21: 'Job Description',
  22: 'Final Signature',
};

const TOTAL_STEPS = 22;

export function ApplicantsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { role, profile } = useAuth();
  
  // Admins can filter by location, managers see only their location
  const isAdmin = role === 'admin' || role === 'superadmin';
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');
  
  // Per-applicant note state (posted from side panel, shown at top)
  const [applicantNote, setApplicantNoteState] = useState<ApplicantNote | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [showNoteCompose, setShowNoteCompose] = useState(false);
  
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [applicantDetail, setApplicantDetail] = useState<ApplicantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  
  // Pool collapse state - using Set for expanded pools (all collapsed by default)
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [hiredExpanded, setHiredExpanded] = useState(false);
  const [notStartedExpanded, setNotStartedExpanded] = useState(false);
  
  // Toggle for rejected only
  const [showRejected, setShowRejected] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
  const [ssnRevealed, setSsnRevealed] = useState(false);
  const [revealedSsn, setRevealedSsn] = useState<string | null>(null);
  const [loadingSsn, setLoadingSsn] = useState(false);
  const [editingSsn, setEditingSsn] = useState(false);
  const [newSsn, setNewSsn] = useState('');
  const [savingSsn, setSavingSsn] = useState(false);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type: string } | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferToLocation, setTransferToLocation] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load applicant note on mount
  useEffect(() => {
    setApplicantNoteState(getApplicantNote());
  }, []);

  useEffect(() => {
    loadApplicants();
    loadLocations();
  }, [selectedLocationFilter]);

  const loadApplicants = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedLocationFilter ? `?location_id=${selectedLocationFilter}` : '';
      const res = await api.get<{ applications: Applicant[] }>(`/admin/pipeline${params}`);
      setApplicants(res.applications || []);
    } catch (err) {
      console.error('Error loading applicants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const res = await api.get<AgencyWithLocations>('/agencies/me');
      setLocations(res.locations || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  // Filter and organize applicants
  const { recentApplicants, positionPools, uncategorizedApplicants, hiredByPosition, notStartedApplicants, rejectedCount } = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Separate by status
    const hired = applicants.filter(a => a.status === 'hired');
    const notStarted = applicants.filter(a => a.status === 'not_started');
    const rejected = applicants.filter(a => a.status === 'rejected');
    const active = applicants.filter(a => 
      a.status !== 'hired' && 
      a.status !== 'not_started' && 
      (a.status !== 'rejected' || showRejected)
    );
    
    // Apply search to active applicants
    let filtered = active;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.first_name?.toLowerCase().includes(query) ||
        a.last_name?.toLowerCase().includes(query) ||
        a.email?.toLowerCase().includes(query) ||
        a.location_name?.toLowerCase().includes(query)
      );
    }
    
    // Sort all by created_at desc (most recent first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    hired.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    notStarted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Recent = past 7 days (active only)
    const recent = filtered.filter(a => new Date(a.created_at) >= oneWeekAgo);
    
    // Group active by position
    const pools: Record<string, Applicant[]> = {};
    const uncategorized: Applicant[] = [];
    
    filtered.forEach(a => {
      const pos = a.position?.toLowerCase();
      if (pos && POSITION_CONFIG[pos]) {
        if (!pools[pos]) pools[pos] = [];
        pools[pos].push(a);
      } else {
        uncategorized.push(a);
      }
    });
    
    // Group hired by position
    const hiredPools: Record<string, Applicant[]> = {};
    hired.forEach(a => {
      const pos = a.position?.toLowerCase() || 'uncategorized';
      if (!hiredPools[pos]) hiredPools[pos] = [];
      hiredPools[pos].push(a);
    });
    
    return {
      recentApplicants: recent,
      positionPools: pools,
      uncategorizedApplicants: uncategorized,
      hiredByPosition: hiredPools,
      notStartedApplicants: notStarted,
      rejectedCount: rejected.length,
    };
  }, [applicants, showRejected, searchQuery]);

  const totalHired = useMemo(() => {
    return Object.values(hiredByPosition).reduce((sum, arr) => sum + arr.length, 0);
  }, [hiredByPosition]);

  const togglePool = (poolId: string) => {
    setExpandedPools(prev => {
      const next = new Set(prev);
      if (next.has(poolId)) {
        next.delete(poolId);
      } else {
        next.add(poolId);
      }
      return next;
    });
  };

  const handleTransferApplicant = async () => {
    if (!selectedApplicant || !transferToLocation) return;
    try {
      setTransferring(true);
      await api.post(`/transfers/applicant/${selectedApplicant.id}`, {
        to_location_id: transferToLocation,
        reason: transferReason || undefined,
      });
      const newLocation = locations.find(l => l.id === transferToLocation);
      setApplicants(prev => prev.map(a => 
        a.id === selectedApplicant.id 
          ? { ...a, location_id: transferToLocation, location_name: newLocation?.name || '' }
          : a
      ));
      setSelectedApplicant(prev => prev ? { ...prev, location_id: transferToLocation, location_name: newLocation?.name || '' } : null);
      setShowTransferModal(false);
      setTransferToLocation('');
      setTransferReason('');
      setError(null);
      loadApplicants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer applicant');
    } finally {
      setTransferring(false);
    }
  };

  const handleDeleteApplicant = async () => {
    if (!selectedApplicant) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/applicants/${selectedApplicant.id}`);
      setApplicants(prev => prev.filter(a => a.id !== selectedApplicant.id));
      detailCache.delete(selectedApplicant.id);
      setShowDeleteConfirm(false);
      closePanel();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const selectApplicant = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setPanelOpen(true);
    setEditMode(false);
    setSsnRevealed(false);
    setRevealedSsn(null);
    setEditingSsn(false);
    setPreviewDoc(null);
    setShowNoteCompose(false);
    setNoteDraft('');
    
    const cached = detailCache.get(applicant.id);
    if (cached) {
      setApplicantDetail(cached);
      initEditForm(cached, applicant);
      return;
    }
    
    setLoadingDetail(true);
    setApplicantDetail(null);
    
    try {
      const res = await api.get<{ 
        application: unknown; 
        profile: Record<string, unknown>;
        steps: Array<{ step_number: number; data: Record<string, unknown>; is_completed?: boolean }>;
        ssn_last_four?: string;
      }>(`/admin/applicants/${applicant.id}`);
      
      const stepsMap = new Map<number, Record<string, unknown>>();
      const stepsCompletion: Record<number, boolean> = {};
      (res.steps || []).forEach(s => {
        stepsMap.set(s.step_number, s.data || {});
        stepsCompletion[s.step_number] = s.is_completed || false;
      });
      
      const step1 = stepsMap.get(1) || {};
      const step2 = stepsMap.get(2) || {};
      const step3 = stepsMap.get(3) || {};
      const step8 = stepsMap.get(8) || {};
      const step11 = stepsMap.get(11) || {};
      const step12 = stepsMap.get(12) || {};
      const step13 = stepsMap.get(13) || {};
      const step14 = stepsMap.get(14) || {};
      const step15 = stepsMap.get(15) || {};
      const step16 = stepsMap.get(16) || {};
      const step17 = stepsMap.get(17) || {};
      const profile = res.profile || {};
      
      const detail: ApplicantDetail = {
        position_applied: step1.position_applied as string,
        employment_type: step1.employment_type as string,
        desired_hourly_rate: step1.desired_hourly_rate as string,
        desired_start_date: step1.desired_start_date as string,
        speaks_other_languages: step1.speaks_other_languages as string,
        other_languages: step1.other_languages as string,
        how_heard: step1.how_heard as string,
        first_name: (step2.first_name as string) || (profile.first_name as string),
        last_name: (step2.last_name as string) || (profile.last_name as string),
        email: (profile.email as string) || (step2.email as string),
        phone: (step2.phone as string) || (profile.phone as string),
        city: step2.city as string,
        address_line1: step2.address_line1 as string,
        address_line2: step2.address_line2 as string,
        state: step2.state as string,
        zip: step2.zip as string,
        date_of_birth: step2.date_of_birth as string,
        emergency_name: [step3.ec_first_name, step3.ec_last_name].filter(Boolean).join(' ') as string,
        emergency_relationship: step3.ec_relationship as string,
        emergency_phone: step3.ec_phone as string,
        available_days: step8.available_days as string[],
        shift_preferences: step8.shift_preferences as string[],
        hours_per_week: step8.hours_per_week as string,
        has_transportation: step8.has_transportation as string,
        max_travel_miles: step8.max_travel_miles as string,
        comfortable_with_pets: step8.comfortable_with_pets as string,
        comfortable_with_smokers: step8.comfortable_with_smokers as string,
        credential_type: step15.credential_type as string,
        work_auth_uploaded: !!(step11.file_name || step11.file_url || step11.storage_path),
        id_front_uploaded: !!(step12.file_name || step12.file_url || step12.storage_path),
        id_back_uploaded: !!(step13.file_name || step13.file_url || step13.storage_path),
        ssn_card_uploaded: !!(step14.file_name || step14.file_url || step14.storage_path),
        credentials_uploaded: !!(step15.file_name || step15.file_url || step15.storage_path),
        cpr_uploaded: !!(step16.file_name || step16.file_url || step16.storage_path),
        tb_uploaded: !!(step17.file_name || step17.file_url || step17.storage_path),
        ssn_last_four: res.ssn_last_four,
        stepsCompletion,
      };
      
      detailCache.set(applicant.id, detail);
      setApplicantDetail(detail);
      initEditForm(detail, applicant);
    } catch (err) {
      console.error('Error loading applicant detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const initEditForm = (detail: ApplicantDetail, applicant: Applicant) => {
    setEditForm({
      first_name: detail.first_name || applicant.first_name || '',
      last_name: detail.last_name || applicant.last_name || '',
      email: detail.email || applicant.email || '',
      phone: detail.phone || '',
      city: detail.city || '',
      address_line1: detail.address_line1 || '',
      address_line2: detail.address_line2 || '',
      state: detail.state || '',
      zip: detail.zip || '',
      date_of_birth: detail.date_of_birth || '',
      emergency_name: detail.emergency_name || '',
      emergency_relationship: detail.emergency_relationship || '',
      emergency_phone: detail.emergency_phone || '',
    });
  };

  const handleRevealSsn = async () => {
    if (!selectedApplicant) return;
    setLoadingSsn(true);
    try {
      const res = await api.get<{ ssn: string; ssn_raw: string }>(`/admin/applicants/${selectedApplicant.id}/ssn`);
      setRevealedSsn(res.ssn);
      setSsnRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal SSN');
    } finally {
      setLoadingSsn(false);
    }
  };

  const handleEditSsn = () => {
    setEditingSsn(true);
    if (revealedSsn) {
      setNewSsn(revealedSsn.replace(/-/g, ''));
    } else {
      setNewSsn('');
    }
  };

  const handleSaveSsn = async () => {
    if (!selectedApplicant) return;
    const cleanSsn = newSsn.replace(/\D/g, '');
    if (cleanSsn.length !== 9) {
      setError('SSN must be exactly 9 digits');
      return;
    }
    setSavingSsn(true);
    try {
      const res = await api.put<{ success: boolean; ssn_last_four: string }>(
        `/admin/applicants/${selectedApplicant.id}/ssn`,
        { ssn: cleanSsn }
      );
      const formattedSsn = `${cleanSsn.slice(0, 3)}-${cleanSsn.slice(3, 5)}-${cleanSsn.slice(5)}`;
      setRevealedSsn(formattedSsn);
      setSsnRevealed(true);
      setEditingSsn(false);
      setApplicantDetail(prev => prev ? { ...prev, ssn_last_four: res.ssn_last_four } : null);
      detailCache.delete(selectedApplicant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save SSN');
    } finally {
      setSavingSsn(false);
    }
  };

  const formatSsnInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const handleSaveEdit = async () => {
    if (!selectedApplicant) return;
    setSaving(true);
    try {
      await api.put(`/admin/applicants/${selectedApplicant.id}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        city: editForm.city,
        address_line1: editForm.address_line1,
        address_line2: editForm.address_line2,
        state: editForm.state,
        zip: editForm.zip,
        date_of_birth: editForm.date_of_birth,
        emergency_name: editForm.emergency_name,
        emergency_relationship: editForm.emergency_relationship,
        emergency_phone: editForm.emergency_phone,
      });
      setApplicantDetail(prev => prev ? { ...prev, ...editForm } : null);
      detailCache.delete(selectedApplicant.id);
      setApplicants(prev => prev.map(a => 
        a.id === selectedApplicant.id 
          ? { ...a, first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email }
          : a
      ));
      setSelectedApplicant(prev => prev ? { ...prev, first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email } : null);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditMode(false);
    setSsnRevealed(false);
    setRevealedSsn(null);
    setEditingSsn(false);
    setPreviewDoc(null);
    setShowNoteCompose(false);
    setNoteDraft('');
    setTimeout(() => {
      setSelectedApplicant(null);
      setApplicantDetail(null);
    }, 250);
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadError(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedApplicant || !uploadType) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedApplicant.user_id}/${uploadType}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadErr) throw uploadErr;
      detailCache.delete(selectedApplicant.id);
      await selectApplicant(selectedApplicant);
      setShowUploadModal(false);
      setUploadType('');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleViewDoc = async (docType: string, label: string) => {
    if (!selectedApplicant) return;
    const stepNumber = DOC_STEPS[docType];
    if (!stepNumber) return;
    setLoadingDoc(docType);
    try {
      const res = await api.get<{ signed_url: string; file_name?: string }>(`/admin/applicants/${selectedApplicant.id}/documents/${stepNumber}/url`);
      if (res.signed_url) {
        setPreviewDoc({ url: res.signed_url, name: res.file_name || label, type: docType });
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoadingDoc(null);
    }
  };

  const goToView = (id: string) => navigate(`/admin/applicant/${id}`);
  const goToHire = (id: string) => navigate(`/admin/hire/${id}`);

  const getPositionLabel = (position?: string) => {
    if (!position) return '';
    const config = getPositionConfig(position);
    return config?.label || position.toUpperCase();
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatAvailability = (days?: string[]) => {
    if (!days || days.length === 0) return '—';
    if (days.length === 7) return 'Any Day';
    if (days.length >= 5) return 'Most Days';
    return days.slice(0, 3).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ') + (days.length > 3 ? '...' : '');
  };

  const formatHours = (hours?: string) => {
    const map: Record<string, string> = { 
      'part_time': 'Part Time', 'full_time': 'Full Time', 'fill_in': 'Fill In', 'live_in': 'Live-In',
      '10-20': '10–20 hrs', '20-30': '20–30 hrs', '30-40': '30–40 hrs', '40+': '40+ hrs' 
    };
    return map[hours || ''] || hours || '—';
  };

  const formatSmokerPref = (pref?: string) => {
    const map: Record<string, string> = { yes: 'OK with', no: 'Not OK', prefer_no_smoking: 'Prefer No', no_preference: 'No pref' };
    return map[pref || ''] || pref || '—';
  };

  const formatTransportation = (hasTransport?: string, maxMiles?: string) => {
    if (hasTransport === 'yes') return maxMiles ? `Yes (${maxMiles} mi)` : 'Yes';
    return hasTransport === 'no' ? 'No' : '—';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      not_started: 'bg-gray-100 text-gray',
      in_progress: 'bg-blue-100 text-blue-700',
      submitted: 'bg-amber-100 text-amber-700',
      under_review: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      hired: 'bg-success text-white',
      rejected: 'bg-red-100 text-red-700',
    };
    const labels: Record<string, string> = {
      not_started: 'Not Started', in_progress: 'In Progress', submitted: 'Submitted',
      under_review: 'Reviewing', approved: 'Approved', hired: 'Hired', rejected: 'Rejected',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const DocLight = ({ uploaded, label, docType }: { uploaded: boolean; label: string; docType: string }) => {
    const isLoading = loadingDoc === docType;
    return (
      <button
        onClick={() => uploaded && handleViewDoc(docType, label)}
        disabled={!uploaded || isLoading}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${uploaded ? 'hover:bg-success/10 cursor-pointer' : 'cursor-default opacity-60'}`}
        title={uploaded ? `View ${label}` : `${label} not uploaded`}
      >
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isLoading ? 'bg-warning animate-pulse' : uploaded ? 'bg-success' : 'bg-error'}`} />
        <span className="text-xs text-gray">{label}</span>
        {uploaded && !isLoading && (
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    );
  };

  const canDelete = selectedApplicant && selectedApplicant.status !== 'hired';

  // Applicant Row Component
  const ApplicantRow = ({ applicant, showStatus = true }: { applicant: Applicant; showStatus?: boolean }) => {
    const config = getPositionConfig(applicant.position);
    return (
      <div
        onClick={() => selectApplicant(applicant)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
      >
        {/* Position badge */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white ${config?.color || 'bg-gray-400'}`}>
          {config?.label || '—'}
        </div>
        
        {/* Name and email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate">
            {applicant.first_name} {applicant.last_name}
          </p>
          <p className="text-xs text-gray truncate">{applicant.email}</p>
        </div>
        
        {/* Status and location */}
        {showStatus && (
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs text-gray">{applicant.location_name || '—'}</span>
            {getStatusBadge(applicant.status)}
          </div>
        )}
        
        {!showStatus && (
          <span className="hidden sm:block text-xs text-gray">{applicant.location_name || '—'}</span>
        )}
        
        <span className="text-xs text-gray-400 flex-shrink-0">{formatTimeAgo(applicant.created_at)}</span>
        
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  };

  // Pool Section Component
  const PoolSection = ({ 
    id, 
    title, 
    icon, 
    color, 
    applicants,
    showStatus = true,
  }: { 
    id: string;
    title: string; 
    icon: string; 
    color: string;
    applicants: Applicant[];
    showStatus?: boolean;
  }) => {
    const isExpanded = expandedPools.has(id);
    const count = applicants.length;
    
    if (count === 0) return null;
    
    return (
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => togglePool(id)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="font-semibold text-navy">{title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${color}`}>{count}</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {isExpanded && (
          <div className="border-t border-border">
            {applicants.map(a => (
              <ApplicantRow key={a.id} applicant={a} showStatus={showStatus} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Per-Applicant Note Banner (posted from side panel) */}
      {applicantNote && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-50/50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Note about {applicantNote.applicantName}
                  <span className="font-normal text-amber-600 ml-2">— from {applicantNote.managerName}</span>
                </p>
                <p className="text-sm text-slate mt-1">{applicantNote.message}</p>
                <p className="text-xs text-gray mt-2">
                  Posted {new Date(applicantNote.timestamp).toLocaleDateString('en-US', { 
                    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setApplicantNote(null);
                setApplicantNoteState(null);
              }}
              className="text-amber-600/60 hover:text-amber-700 p-1 rounded hover:bg-amber-100 transition-colors"
              title="Clear note"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Applicants</h1>
          <p className="text-sm text-gray mt-1">
            {applicants.length} total • {recentApplicants.length} new this week
          </p>
        </div>
        
        {/* Location filter for admins */}
        {isAdmin && locations.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray">Location:</span>
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none bg-white min-w-[160px]"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      {/* Search and Toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none"
            />
          </div>
        </div>

        {rejectedCount > 0 && (
          <button
            onClick={() => setShowRejected(!showRejected)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showRejected ? 'bg-error/10 border-error/30 text-error' : 'bg-white border-border text-gray hover:border-gray-300'
            }`}
          >
            <span>{showRejected ? 'Hide' : 'Show'} Rejected</span>
            <span className="bg-error/20 text-error text-xs px-1.5 py-0.5 rounded-full font-medium">{rejectedCount}</span>
          </button>
        )}
      </div>

      {/* Recent Applications */}
      {recentApplicants.length > 0 && (
        <div className="bg-gradient-to-r from-maroon/5 to-transparent rounded-xl border border-maroon/20 overflow-hidden">
          <button
            onClick={() => setRecentExpanded(!recentExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-maroon/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🆕</span>
              <span className="font-semibold text-navy">New This Week</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-maroon">{recentApplicants.length}</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray transition-transform ${recentExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {recentExpanded && (
            <div className="border-t border-maroon/20 bg-white">
              {recentApplicants.map(a => (
                <ApplicantRow key={a.id} applicant={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Position Pools */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray uppercase tracking-wide px-1">Talent Pools</h2>
        
        {POSITION_ORDER.map(pos => {
          const config = POSITION_CONFIG[pos];
          const poolApplicants = positionPools[pos] || [];
          return (
            <PoolSection
              key={pos}
              id={pos}
              title={`${config.label} Pool`}
              icon={config.icon}
              color={config.color}
              applicants={poolApplicants}
            />
          );
        })}
        
        {/* Uncategorized */}
        {uncategorizedApplicants.length > 0 && (
          <PoolSection
            id="uncategorized"
            title="Uncategorized"
            icon="📋"
            color="bg-gray-400"
            applicants={uncategorizedApplicants}
          />
        )}
      </div>

      {/* Hired Applicants Section */}
      {totalHired > 0 && (
        <div className="bg-gradient-to-r from-success/5 to-transparent rounded-xl border border-success/20 overflow-hidden">
          <button
            onClick={() => setHiredExpanded(!hiredExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-success/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <span className="font-semibold text-navy">Hired Applicants</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-success">{totalHired}</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray transition-transform ${hiredExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {hiredExpanded && (
            <div className="border-t border-success/20 bg-white">
              {/* Group hired by position */}
              {POSITION_ORDER.map(pos => {
                const config = POSITION_CONFIG[pos];
                const hiredInPosition = hiredByPosition[pos] || [];
                if (hiredInPosition.length === 0) return null;
                
                return (
                  <div key={pos} className="border-b border-gray-100 last:border-b-0">
                    <div className="px-5 py-2 bg-gray-50 flex items-center gap-2">
                      <span className="text-sm">{config.icon}</span>
                      <span className="text-xs font-semibold text-navy">{config.label}</span>
                      <span className="text-xs text-gray">({hiredInPosition.length})</span>
                    </div>
                    {hiredInPosition.map(a => (
                      <ApplicantRow key={a.id} applicant={a} showStatus={false} />
                    ))}
                  </div>
                );
              })}
              
              {/* Uncategorized hired */}
              {(hiredByPosition['uncategorized'] || []).length > 0 && (
                <div className="border-b border-gray-100 last:border-b-0">
                  <div className="px-5 py-2 bg-gray-50 flex items-center gap-2">
                    <span className="text-sm">📋</span>
                    <span className="text-xs font-semibold text-navy">Uncategorized</span>
                    <span className="text-xs text-gray">({hiredByPosition['uncategorized'].length})</span>
                  </div>
                  {hiredByPosition['uncategorized'].map(a => (
                    <ApplicantRow key={a.id} applicant={a} showStatus={false} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Not Started Section */}
      {notStartedApplicants.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setNotStartedExpanded(!notStartedExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⏸️</span>
              <span className="font-semibold text-navy">Not Started</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gray-400">{notStartedApplicants.length}</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray transition-transform ${notStartedExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {notStartedExpanded && (
            <div className="border-t border-gray-200 bg-white">
              {notStartedApplicants.map(a => (
                <ApplicantRow key={a.id} applicant={a} showStatus={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {applicants.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray">No applicants yet</p>
        </div>
      )}

      {/* Side Panel */}
      {selectedApplicant && (
        <>
          <div 
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={closePanel} 
          />
          <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">
                  {editMode ? 'Edit Applicant' : `${selectedApplicant.first_name} ${selectedApplicant.last_name}`}
                </h2>
                {!editMode && (applicantDetail?.position_applied || selectedApplicant.position) && (
                  <span className="text-sm font-bold text-white bg-white/20 px-2 py-0.5 rounded">
                    {getPositionLabel(applicantDetail?.position_applied || selectedApplicant.position)}
                  </span>
                )}
              </div>
              <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : editMode ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Personal Info</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray mb-1">First Name</label>
                        <input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">Last Name</label>
                        <input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Email</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Phone</label>
                      <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Date of Birth</label>
                      <input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Social Security</h3>
                    {editingSsn ? (
                      <div className="space-y-2">
                        <input type="text" value={formatSsnInput(newSsn)} onChange={(e) => setNewSsn(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="XXX-XX-XXXX" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none font-mono" />
                        <p className="text-xs text-gray">Enter 9 digits. Leading zeros are preserved.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingSsn(false)} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-gray-50">Cancel</button>
                          <button onClick={handleSaveSsn} disabled={savingSsn || newSsn.replace(/\D/g, '').length !== 9} className="flex-1 py-2 text-sm bg-maroon text-white rounded-lg hover:bg-maroon/90 disabled:opacity-50">{savingSsn ? 'Saving...' : 'Save SSN'}</button>
                        </div>
                      </div>
                    ) : ssnRevealed ? (
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{revealedSsn}</span>
                        <button onClick={handleEditSsn} className="text-xs text-maroon hover:underline">Edit</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate">{applicantDetail?.ssn_last_four ? `***-**-${applicantDetail.ssn_last_four}` : 'Not on file'}</span>
                        <div className="flex gap-2">
                          {applicantDetail?.ssn_last_four && <button onClick={handleRevealSsn} disabled={loadingSsn} className="text-xs text-maroon hover:underline disabled:opacity-50">{loadingSsn ? 'Loading...' : 'Reveal'}</button>}
                          <button onClick={handleEditSsn} className="text-xs text-maroon hover:underline">{applicantDetail?.ssn_last_four ? 'Edit' : 'Add'}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Address</h3>
                    <div>
                      <label className="block text-xs text-gray mb-1">Street Address</label>
                      <input type="text" value={editForm.address_line1} onChange={(e) => setEditForm({ ...editForm, address_line1: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Apt/Suite</label>
                      <input type="text" value={editForm.address_line2} onChange={(e) => setEditForm({ ...editForm, address_line2: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray mb-1">City</label>
                        <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">State</label>
                        <input type="text" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">ZIP</label>
                        <input type="text" value={editForm.zip} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Emergency Contact</h3>
                    <div>
                      <label className="block text-xs text-gray mb-1">Name</label>
                      <input type="text" value={editForm.emergency_name} onChange={(e) => setEditForm({ ...editForm, emergency_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray mb-1">Relationship</label>
                        <input type="text" value={editForm.emergency_relationship} onChange={(e) => setEditForm({ ...editForm, emergency_relationship: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">Phone</label>
                        <input type="tel" value={editForm.emergency_phone} onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Location</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate">{selectedApplicant.location_name || 'Not assigned'}</span>
                      {locations.length > 1 && (
                        <button onClick={() => setShowTransferModal(true)} className="text-xs text-maroon hover:underline">Transfer</button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => setEditMode(false)} className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="py-3 bg-maroon text-white text-sm font-semibold rounded-lg hover:bg-maroon/90 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {[
                      { label: 'City', value: applicantDetail?.city || '—' },
                      { label: 'Position', value: getPositionLabel(applicantDetail?.position_applied || selectedApplicant.position) || '—' },
                      { label: 'Credential', value: applicantDetail?.credential_type ? applicantDetail.credential_type.toUpperCase() : '—' },
                      { label: 'Hours', value: formatHours(applicantDetail?.hours_per_week) },
                      { label: 'Transport', value: formatTransportation(applicantDetail?.has_transportation, applicantDetail?.max_travel_miles) },
                      { label: 'Availability', value: formatAvailability(applicantDetail?.available_days) },
                      { label: 'Smokers?', value: formatSmokerPref(applicantDetail?.comfortable_with_smokers) },
                    ].map((row, i, arr) => (
                      <div key={i} className={`grid grid-cols-[110px_1fr] px-4 py-3 items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <span className="text-xs font-semibold text-navy">{row.label}</span>
                        <span className="text-sm text-slate">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <button onClick={() => goToView(selectedApplicant.id)} className="py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors">Full Profile</button>
                    <button onClick={() => setEditMode(true)} className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                    <button onClick={() => goToHire(selectedApplicant.id)} className="py-3 bg-success text-navy text-sm font-semibold rounded-lg hover:bg-success/90 transition-colors">Onboard</button>
                  </div>

                  {/* Post Note About This Applicant */}
                  {(role === 'manager' || isAdmin) && (
                    <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-gray uppercase tracking-wide">Post Note to Staff</span>
                      </div>
                      {!showNoteCompose ? (
                        <button
                          onClick={() => setShowNoteCompose(true)}
                          className="w-full py-2.5 border border-dashed border-amber-300 text-amber-700 text-sm rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          Add note about {selectedApplicant.first_name}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder={`Add a note about ${selectedApplicant.first_name} for other staff to see...`}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowNoteCompose(false);
                                setNoteDraft('');
                              }}
                              className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={!noteDraft.trim()}
                              onClick={() => {
                                const newNote: ApplicantNote = {
                                  message: noteDraft.trim(),
                                  managerName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Manager',
                                  timestamp: Date.now(),
                                  applicantId: selectedApplicant.id,
                                  applicantName: `${selectedApplicant.first_name} ${selectedApplicant.last_name}`,
                                };
                                setApplicantNote(newNote);
                                setApplicantNoteState(newNote);
                                setNoteDraft('');
                                setShowNoteCompose(false);
                              }}
                              className="flex-1 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Post Note
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-gray uppercase tracking-wide">Documents</span>
                      <span className="text-[10px] text-gray-400">Click to preview</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <DocLight uploaded={applicantDetail?.id_front_uploaded || false} label="ID Front" docType="id_front" />
                      <DocLight uploaded={applicantDetail?.id_back_uploaded || false} label="ID Back" docType="id_back" />
                      <DocLight uploaded={applicantDetail?.ssn_card_uploaded || false} label="SSN Card" docType="ssn_card" />
                      <DocLight uploaded={applicantDetail?.work_auth_uploaded || false} label="Work Auth" docType="work_auth" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <DocLight uploaded={applicantDetail?.credentials_uploaded || false} label="Credentials" docType="credentials" />
                      <DocLight uploaded={applicantDetail?.cpr_uploaded || false} label="CPR" docType="cpr" />
                      <DocLight uploaded={applicantDetail?.tb_uploaded || false} label="TB" docType="tb" />
                    </div>
                    
                    {previewDoc && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-navy">{previewDoc.name}</span>
                          <div className="flex gap-2">
                            <a href={previewDoc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-maroon hover:underline">Open ↗</a>
                            <button onClick={() => setPreviewDoc(null)} className="text-xs text-gray hover:text-navy">Close</button>
                          </div>
                        </div>
                        <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '200px' }}>
                          {previewDoc.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)/) || previewDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)/) ? (
                            <img src={previewDoc.url} alt={previewDoc.name} className="w-full h-full object-contain" />
                          ) : (
                            <iframe src={previewDoc.url} className="w-full h-full" title={previewDoc.name} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={handleUploadClick} className="w-full mt-5 py-3 bg-white border border-border text-navy text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Upload Document</button>

                  {/* Application Progress Section */}
                  {applicantDetail?.stepsCompletion && (
                    <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-gray uppercase tracking-wide">Application Progress</span>
                        <span className="text-xs text-gray">
                          {Object.values(applicantDetail.stepsCompletion).filter(Boolean).length}/{TOTAL_STEPS} complete
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full transition-all"
                          style={{ width: `${(Object.values(applicantDetail.stepsCompletion).filter(Boolean).length / TOTAL_STEPS) * 100}%` }}
                        />
                      </div>
                      
                      {/* Step grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                          const stepNum = i + 1;
                          const isComplete = applicantDetail.stepsCompletion?.[stepNum] || false;
                          return (
                            <div key={stepNum} className="flex items-center gap-2 py-1">
                              <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${isComplete ? 'bg-success' : 'bg-gray-200'}`}>
                                {isComplete ? (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <span className="text-[8px] text-gray font-medium">{stepNum}</span>
                                )}
                              </div>
                              <span className={`text-xs truncate ${isComplete ? 'text-slate' : 'text-gray font-medium'}`}>
                                {STEP_NAMES[stepNum]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Missing steps summary */}
                      {Object.values(applicantDetail.stepsCompletion).filter(Boolean).length < TOTAL_STEPS && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] text-warning font-medium">
                            Missing: {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1)
                              .filter(n => !applicantDetail.stepsCompletion?.[n])
                              .map(n => STEP_NAMES[n])
                              .join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {canDelete && (
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full mt-3 py-3 bg-white border border-error/30 text-error text-sm font-medium rounded-lg hover:bg-error/5 transition-colors">
                      Delete Application
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center">Powered by MediVault</p>
            </div>
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedApplicant && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowUploadModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[70] p-6">
            <h3 className="text-lg font-semibold text-navy mb-4">Upload Document</h3>
            <p className="text-sm text-gray mb-4">Upload a document for {selectedApplicant.first_name} {selectedApplicant.last_name}</p>
            {uploadError && <Alert variant="error" className="mb-4">{uploadError}</Alert>}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate mb-1">Document Type</label>
              <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20">
                <option value="">Select type...</option>
                <option value="credentials">Professional Credentials</option>
                <option value="cpr">CPR Certification</option>
                <option value="tb">TB Test Results</option>
                <option value="id_front">Photo ID (Front)</option>
                <option value="id_back">Photo ID (Back)</option>
                <option value="ssn">Social Security Card</option>
                <option value="work_auth">Work Authorization</option>
                <option value="other">Other</option>
              </select>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!uploadType || uploading} loading={uploading} onClick={() => fileInputRef.current?.click()}>Select File</Button>
            </div>
          </div>
        </>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedApplicant && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowTransferModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[70] p-6">
            <h3 className="text-lg font-semibold text-navy mb-4">Transfer Applicant</h3>
            <p className="text-sm text-gray mb-4">Transfer {selectedApplicant.first_name} {selectedApplicant.last_name} to another location</p>
            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate mb-1">Current Location</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray">{selectedApplicant.location_name || 'Not assigned'}</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate mb-1">Transfer To</label>
              <select value={transferToLocation} onChange={(e) => setTransferToLocation(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20">
                <option value="">Select location...</option>
                {locations.filter(l => l.id !== selectedApplicant.location_id).map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate mb-1">Reason (optional)</label>
              <input type="text" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="e.g., Closer to applicant's home" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20" />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setShowTransferModal(false); setTransferToLocation(''); setTransferReason(''); }}>Cancel</Button>
              <Button className="flex-1" disabled={!transferToLocation || transferring} loading={transferring} onClick={handleTransferApplicant}>Transfer</Button>
            </div>
          </div>
        </>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && selectedApplicant && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[70] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-navy">Delete Application</h3>
            </div>
            <p className="text-sm text-gray mb-2">Are you sure you want to delete the application for <strong>{selectedApplicant.first_name} {selectedApplicant.last_name}</strong>?</p>
            <p className="text-sm text-gray mb-6">This will move the application to the trash. A superadmin can restore it if needed.</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <button onClick={handleDeleteApplicant} disabled={deleting} className="flex-1 py-2.5 bg-error text-white text-sm font-semibold rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete Application'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
