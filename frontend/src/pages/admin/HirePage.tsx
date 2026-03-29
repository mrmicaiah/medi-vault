import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';

export function HirePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const applicant = {
    id: id || '1',
    name: 'Maria Johnson',
    email: 'maria@example.com',
    position_applied: 'PCA',
    status: 'approved' as const,
  };

  const [form, setForm] = useState({
    position: applicant.position_applied,
    department: '',
    hire_date: new Date().toISOString().split('T')[0],
    pay_rate: '',
    pay_type: 'hourly',
    employee_id: '',
    supervisor: '',
    location: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await new Promise((r) => setTimeout(r, 1000));
      navigate('/admin/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hire applicant');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="mt-1 text-sm text-gray">Convert an approved applicant to an employee.</p>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon-subtle text-sm font-medium text-maroon">
              {applicant.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-medium text-slate">{applicant.name}</p>
              <p className="text-xs text-gray">{applicant.email}</p>
            </div>
          </div>
          <Badge variant="success">{applicant.status}</Badge>
        </div>
      </Card>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      <Card header="Employment Details">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Position"
              required
              value={form.position}
              onChange={(e) => handleChange('position', e.target.value)}
              options={[
                { value: 'PCA', label: 'Personal Care Aide (PCA)' },
                { value: 'HHA', label: 'Home Health Aide (HHA)' },
                { value: 'CNA', label: 'Certified Nursing Assistant (CNA)' },
                { value: 'RN', label: 'Registered Nurse (RN)' },
                { value: 'LPN', label: 'Licensed Practical Nurse (LPN)' },
              ]}
            />
            <Select
              label="Department"
              value={form.department}
              onChange={(e) => handleChange('department', e.target.value)}
              options={[
                { value: 'home_care', label: 'Home Care' },
                { value: 'skilled_nursing', label: 'Skilled Nursing' },
                { value: 'companion', label: 'Companion Care' },
              ]}
            />
          </div>

          <Input
            label="Hire Date"
            type="date"
            required
            value={form.hire_date}
            onChange={(e) => handleChange('hire_date', e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Pay Rate ($)"
              type="number"
              required
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
              ]}
            />
          </div>

          <Input
            label="Employee ID"
            value={form.employee_id}
            onChange={(e) => handleChange('employee_id', e.target.value)}
            placeholder="Auto-generated if left blank"
            helperText="Leave blank to auto-generate"
          />

          <Input
            label="Supervisor"
            value={form.supervisor}
            onChange={(e) => handleChange('supervisor', e.target.value)}
            placeholder="Supervisor name"
          />

          <Select
            label="Primary Location"
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
            options={[
              { value: 'richmond', label: 'Richmond Office' },
              { value: 'norfolk', label: 'Norfolk Office' },
              { value: 'virginia_beach', label: 'Virginia Beach Office' },
              { value: 'remote', label: 'Remote / Field' },
            ]}
          />

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate(`/admin/applicant/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Complete Hire
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
