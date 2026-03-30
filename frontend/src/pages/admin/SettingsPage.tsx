import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';

interface Location {
  id: string;
  name: string;
  slug: string;
  address_line1?: string;
  address_line2?: string;
  city: string;
  state: string;
  zip?: string;
  phone?: string;
  email?: string;
  is_hiring: boolean;
  is_active: boolean;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  website?: string;
  phone?: string;
  email?: string;
  locations: Location[];
}

type Tab = 'company' | 'locations';

export function SettingsPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('company');
  
  const [companyForm, setCompanyForm] = useState({
    name: '',
    tagline: '',
    website: '',
    phone: '',
    email: '',
    primary_color: '',
    secondary_color: '',
  });
  
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    is_hiring: true,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAgency();
  }, []);

  const loadAgency = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Agency>('/agencies/me');
      setAgency(data);
      setCompanyForm({
        name: data.name || '',
        tagline: data.tagline || '',
        website: data.website || '',
        phone: data.phone || '',
        email: data.email || '',
        primary_color: data.primary_color || '#6B1D2E',
        secondary_color: data.secondary_color || '#1A2B4A',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agency');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updates: Record<string, string> = {};
      if (companyForm.name !== agency?.name) updates.name = companyForm.name;
      if (companyForm.tagline !== agency?.tagline) updates.tagline = companyForm.tagline;
      if (companyForm.website !== agency?.website) updates.website = companyForm.website;
      if (companyForm.phone !== agency?.phone) updates.phone = companyForm.phone;
      if (companyForm.email !== agency?.email) updates.email = companyForm.email;
      if (companyForm.primary_color !== agency?.primary_color) updates.primary_color = companyForm.primary_color;
      if (companyForm.secondary_color !== agency?.secondary_color) updates.secondary_color = companyForm.secondary_color;
      
      if (Object.keys(updates).length === 0) {
        setSuccess('No changes to save');
        return;
      }
      
      await api.put('/agencies/me', updates);
      setSuccess('Company settings saved');
      loadAgency();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      await api.postFormData('/agencies/me/logo', formData);
      setSuccess('Logo uploaded successfully');
      loadAgency();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLocation = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (editingLocation) {
        await api.put(`/agencies/me/locations/${editingLocation.id}`, locationForm);
        setSuccess('Location updated');
      } else {
        await api.post('/agencies/me/locations', locationForm);
        setSuccess('Location created');
      }
      
      setEditingLocation(null);
      setShowAddLocation(false);
      resetLocationForm();
      loadAgency();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    try {
      setSaving(true);
      await api.delete(`/agencies/me/locations/${locationId}`);
      setSuccess('Location deleted');
      loadAgency();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHiring = async (location: Location) => {
    try {
      await api.put(`/agencies/me/locations/${location.id}`, {
        is_hiring: !location.is_hiring,
      });
      loadAgency();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const resetLocationForm = () => {
    setLocationForm({
      name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      is_hiring: true,
    });
  };

  const startEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      address_line1: location.address_line1 || '',
      address_line2: location.address_line2 || '',
      city: location.city,
      state: location.state,
      zip: location.zip || '',
      phone: location.phone || '',
      email: location.email || '',
      is_hiring: location.is_hiring,
    });
    setShowAddLocation(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-gray">Manage your company and locations</p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'company'
              ? 'bg-white text-maroon shadow-sm'
              : 'text-gray hover:text-slate'
          }`}
        >
          Company
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'locations'
              ? 'bg-white text-maroon shadow-sm'
              : 'text-gray hover:text-slate'
          }`}
        >
          Locations ({agency?.locations.length || 0})
        </button>
      </div>

      {activeTab === 'company' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card padding="lg">
            <h3 className="font-semibold text-navy mb-4">Company Logo</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="h-32 w-32 rounded-xl border-2 border-dashed border-border bg-gray-50 flex items-center justify-center overflow-hidden">
                {agency?.logo_url ? (
                  <img src={agency.logo_url} alt={agency.name} className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-4xl font-bold text-gray-300">{agency?.name?.[0] || 'A'}</span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={saving} className="rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white hover:bg-maroon-light disabled:opacity-50">
                {saving ? 'Uploading...' : 'Upload Logo'}
              </button>
              <p className="text-xs text-gray text-center">PNG, JPG, WebP, or SVG. Max 5MB.</p>
            </div>
          </Card>

          <Card padding="lg" className="lg:col-span-2">
            <h3 className="font-semibold text-navy mb-4">Company Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate mb-1">Company Name</label>
                <input type="text" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate mb-1">Tagline</label>
                <input type="text" value={companyForm.tagline} onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })} placeholder="Always Ready to Meet Your Needs" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Phone</label>
                <input type="tel" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Email</label>
                <input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate mb-1">Website</label>
                <input type="url" value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} placeholder="https://example.com" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Primary Color</label>
                <div className="flex gap-2">
                  <input type="color" value={companyForm.primary_color} onChange={(e) => setCompanyForm({ ...companyForm, primary_color: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-border" />
                  <input type="text" value={companyForm.primary_color} onChange={(e) => setCompanyForm({ ...companyForm, primary_color: e.target.value })} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Secondary Color</label>
                <div className="flex gap-2">
                  <input type="color" value={companyForm.secondary_color} onChange={(e) => setCompanyForm({ ...companyForm, secondary_color: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-border" />
                  <input type="text" value={companyForm.secondary_color} onChange={(e) => setCompanyForm({ ...companyForm, secondary_color: e.target.value })} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={handleSaveCompany} disabled={saving} className="rounded-lg bg-maroon px-6 py-2 text-sm font-medium text-white hover:bg-maroon-light disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'locations' && (
        <div className="space-y-4">
          {!showAddLocation && !editingLocation && (
            <button onClick={() => { setShowAddLocation(true); resetLocationForm(); }} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-gray hover:border-maroon hover:text-maroon transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Location
            </button>
          )}

          {(showAddLocation || editingLocation) && (
            <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-navy">{editingLocation ? 'Edit Location' : 'Add Location'}</h3>
                <button onClick={() => { setShowAddLocation(false); setEditingLocation(null); resetLocationForm(); }} className="text-gray hover:text-slate">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate mb-1">Location Name *</label>
                  <input type="text" value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="e.g., Arlington" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate mb-1">Address Line 1</label>
                  <input type="text" value={locationForm.address_line1} onChange={(e) => setLocationForm({ ...locationForm, address_line1: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate mb-1">Address Line 2</label>
                  <input type="text" value={locationForm.address_line2} onChange={(e) => setLocationForm({ ...locationForm, address_line2: e.target.value })} placeholder="Suite, Unit, Floor..." className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate mb-1">City *</label>
                  <input type="text" value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate mb-1">State *</label>
                    <input type="text" value={locationForm.state} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} maxLength={2} placeholder="VA" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate mb-1">ZIP</label>
                    <input type="text" value={locationForm.zip} onChange={(e) => setLocationForm({ ...locationForm, zip: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate mb-1">Phone</label>
                  <input type="tel" value={locationForm.phone} onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate mb-1">Email</label>
                  <input type="email" value={locationForm.email} onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" />
                </div>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={locationForm.is_hiring} onChange={(e) => setLocationForm({ ...locationForm, is_hiring: e.target.checked })} className="h-4 w-4 rounded border-border text-maroon focus:ring-maroon" />
                    <span className="text-sm text-slate">Currently hiring at this location</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => { setShowAddLocation(false); setEditingLocation(null); resetLocationForm(); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-slate hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveLocation} disabled={saving || !locationForm.name || !locationForm.city || !locationForm.state} className="rounded-lg bg-maroon px-6 py-2 text-sm font-medium text-white hover:bg-maroon-light disabled:opacity-50">
                  {saving ? 'Saving...' : editingLocation ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {agency?.locations.map((location) => (
              <Card key={location.id} padding="md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-navy">{location.name}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${location.is_hiring ? 'bg-success-bg text-success' : 'bg-gray-100 text-gray'}`}>
                        {location.is_hiring ? 'Hiring' : 'Not Hiring'}
                      </span>
                    </div>
                    <p className="text-sm text-gray mt-1">{[location.address_line1, location.address_line2, `${location.city}, ${location.state}`, location.zip].filter(Boolean).join(', ')}</p>
                    {(location.phone || location.email) && <p className="text-sm text-gray mt-1">{[location.phone, location.email].filter(Boolean).join(' • ')}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleHiring(location)} className={`p-2 rounded-lg transition-colors ${location.is_hiring ? 'text-success hover:bg-success-bg' : 'text-gray hover:bg-gray-100'}`} title={location.is_hiring ? 'Stop hiring' : 'Start hiring'}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={location.is_hiring ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} /></svg>
                    </button>
                    <button onClick={() => startEditLocation(location)} className="p-2 rounded-lg text-gray hover:bg-gray-100 hover:text-slate transition-colors" title="Edit">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDeleteLocation(location.id)} className="p-2 rounded-lg text-gray hover:bg-error-bg hover:text-error transition-colors" title="Delete">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {agency?.locations.length === 0 && !showAddLocation && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <h3 className="mt-4 text-sm font-medium text-slate">No locations</h3>
              <p className="mt-1 text-sm text-gray">Get started by adding your first location.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
