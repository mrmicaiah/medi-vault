import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatDate, daysUntil } from '../../lib/utils';

interface DocFile {
  id: string;
  name: string;
  category: string;
  status: 'approved' | 'pending' | 'expired';
  uploaded_at: string;
  expires_at?: string;
}

const categories = ['Identification', 'Certification', 'Health', 'Background', 'Agreements'];

export function EmployeeDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Identification');

  const employee = {
    id: id || '1',
    name: 'Emily Chen',
    email: 'emily@example.com',
    phone: '(555) 234-5678',
    position: 'Registered Nurse (RN)',
    status: 'active' as const,
    hire_date: '2025-06-15',
    address: '456 Oak Avenue, Richmond, VA 23221',
    employee_id: 'EMP-2025-042',
    department: 'Home Care',
  };

  const documents: DocFile[] = [
    { id: '1', name: 'Driver\'s License (Front)', category: 'Identification', status: 'approved', uploaded_at: '2025-06-10', expires_at: '2028-06-15' },
    { id: '2', name: 'Driver\'s License (Back)', category: 'Identification', status: 'approved', uploaded_at: '2025-06-10' },
    { id: '3', name: 'Social Security Card', category: 'Identification', status: 'approved', uploaded_at: '2025-06-10' },
    { id: '4', name: 'Work Authorization', category: 'Identification', status: 'approved', uploaded_at: '2025-06-10', expires_at: '2027-06-15' },
    { id: '5', name: 'RN License', category: 'Certification', status: 'approved', uploaded_at: '2025-06-10', expires_at: '2026-12-31' },
    { id: '6', name: 'CPR Certification', category: 'Certification', status: 'approved', uploaded_at: '2025-06-10', expires_at: '2026-06-10' },
    { id: '7', name: 'TB Test Results', category: 'Health', status: 'approved', uploaded_at: '2025-06-10', expires_at: '2026-06-10' },
    { id: '8', name: 'Criminal Background Check', category: 'Background', status: 'approved', uploaded_at: '2025-06-15' },
    { id: '9', name: 'Confidentiality Agreement', category: 'Agreements', status: 'approved', uploaded_at: '2025-06-15' },
    { id: '10', name: 'Job Description Acknowledgment', category: 'Agreements', status: 'approved', uploaded_at: '2025-06-15' },
  ];

  const filteredDocs = documents.filter((d) => d.category === activeTab);
  const docBadge: Record<string, 'success' | 'warning' | 'error'> = {
    approved: 'success', pending: 'warning', expired: 'error',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/employees" className="rounded-lg p-1 hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">{employee.name}</h1>
            <p className="mt-1 text-sm text-gray">{employee.position} - {employee.employee_id}</p>
          </div>
        </div>
        <Badge variant="success">{employee.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card header="Employee Information" className="lg:col-span-1">
          <div className="space-y-3">
            {[
              ['Email', employee.email],
              ['Phone', employee.phone],
              ['Address', employee.address],
              ['Department', employee.department],
              ['Hire Date', formatDate(employee.hire_date)],
              ['Employee ID', employee.employee_id],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase text-gray">{label}</p>
                <p className="mt-0.5 text-sm text-slate">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="none" className="lg:col-span-2">
          <div className="border-b border-border">
            <div className="flex overflow-x-auto px-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === cat
                      ? 'border-maroon text-maroon'
                      : 'border-transparent text-gray hover:text-slate'
                  }`}
                >
                  {cat}
                  <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">
                    {documents.filter((d) => d.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-2">
            {filteredDocs.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray">No documents in this category.</p>
            ) : (
              filteredDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate">{doc.name}</p>
                      <p className="text-xs text-gray">
                        Uploaded {formatDate(doc.uploaded_at)}
                        {doc.expires_at && (
                          <span className={daysUntil(doc.expires_at) <= 30 ? ' text-warning font-medium' : ''}>
                            {' '} - Expires {formatDate(doc.expires_at)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={docBadge[doc.status]}>{doc.status}</Badge>
                    <Button variant="ghost" size="sm">View</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
