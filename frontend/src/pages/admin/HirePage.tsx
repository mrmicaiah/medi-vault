import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

interface ApplicantData {
  application: {
    id: string;
    status: string;
    location_id?: string;
  };
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  steps: Array<{
    step_number: number;
    data: Record<string, unknown>;
  }>;
}

export function HirePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [applicant, setApplicant] = useState<ApplicantData | null>(null);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const [form, setForm] = useState({
    position: '',
    hire_date: new Date().toISOString().split('T')[0],
    pay_rate: '',
    pay_type: 'hourly',
    location_id: '',
    department: '',
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError('');

        // Load applicant data
        const appRes = await api.get<ApplicantData>(`/admin/applicants/${id}`);
        setApplicant(appRes);

        // Get position from step 1
        const step1 = appRes.steps?.find(s => s.step_number === 1)?.data || {};
        setForm(prev => ({
          ...prev,
          position: (step1.position_applied as string) || '',
          location_id: appRes.application?.location_id || '',
        }));

        // Load locations
        try {
          const locRes = await api.get<{ locations: Array<{ id: string; name: string }> }>('/agencies/me');
          setLocations(locRes.locations || []);
        } catch {
          // Fallback if API fails
          setLocations([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applicant');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !applicant) return;

    setSubmitting(true);
    setError('');

    try {
      // First approve the application if not already approved
      if (applicant.application.status !== 'approved') {
        await api.post(`/admin/applicant/${id}/status`, { status: 'approved' });
      }

      // Create employee record via the hire endpoint
      await api.post('/employees/hire', {
        application_id: id,
        job_title: form.position,
        start_date: form.hire_date,
        pay_rate: form.pay_rate ? parseFloat(form.pay_rate) : null,
        pay_type: form.pay_type,
        department: form.department || 'Home Care',
        notes: form.notes || null,
      });

      navigate('/admin/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hire applicant');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading...</p>
        </div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray">Applicant not found</p>
        <Link to="/admin/applicants" className="text-maroon hover:underline mt-2 inline-block">
          Back to Applicants
        </Link>
      </div>
    );
  }

  const { profile, application } = applicant;
  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/admin/applicant/${id}`} className="rounded-lg p-1 hover:bg-gray-100">
          <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Hire Applicant</h1>
          <p className="mt-1 text-sm text-gray">Convert approved applicant to employee</p>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon-subtle text-sm font-medium text-maroon">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium text-slate">{profile.first_name} {profile.last_name}</p>
              <p className="text-xs text-gray">{profile.email}</p>
            </div>
          </div>
          <Badge variant={application.status === 'approved' ? 'success' : 'warning'}>
            {application.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </Card>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card header="Employment Details">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Position"
            required
            value={form.position}
            onChange={(e) => handleChange('position', e.target.value)}
            options={[
              { value: '', label: 'Select position...' },
              { value: 'Personal Care Aide (PCA)', label: 'Personal Care Aide (PCA)' },
              { value: 'Home Health Aide (HHA)', label: 'Home Health Aide (HHA)' },
              { value: 'Certified Nursing Assistant (CNA)', label: 'Certified Nursing Assistant (CNA)' },
              { value: 'Registered Nurse (RN)', label: 'Registered Nurse (RN)' },
              { value: 'Licensed Practical Nurse (LPN)', label: 'Licensed Practical Nurse (LPN)' },
            ]}
          />

          <Input
            label="Start Date"
            type="date"
            required
            value={form.hire_date}
            onChange={(e) => handleChange('hire_date', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pay Rate"
              type="number"
              step="0.01"
              value={form.pay_rate}
              onChange={(e) => handleChange('pay_rate', e.target.value)}
              placeholder="15.00"
            />
            <Select
              label="Pay Type"
              value={form.pay_type}
              onChange={(e) => handleChange('pay_type', e.target.value)}
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'salary', label: 'Salary' },
                { value: 'per_visit', label: 'Per Visit' },
              ]}
            />
          </div>

          <Select
            label="Department"
            value={form.department}
            onChange={(e) => handleChange('department', e.target.value)}
            options={[
              { value: '', label: 'Select department...' },
              { value: 'Home Care', label: 'Home Care' },
              { value: 'Skilled Nursing', label: 'Skilled Nursing' },
              { value: 'Administration', label: 'Administration' },
            ]}
          />

          {locations.length > 0 && (
            <Select
              label="Primary Location"
              value={form.location_id}
              onChange={(e) => handleChange('location_id', e.target.value)}
              options={[
                { value: '', label: 'Select location...' },
                ...locations.map(loc => ({ value: loc.id, label: loc.name })),
              ]}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
              rows={3}
              placeholder="Any notes about this hire..."
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(`/admin/applicant/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Complete Hire
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
