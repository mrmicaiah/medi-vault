import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface ExpiringDocument {
  id: string;
  user_id: string;
  employee_name: string;
  email: string;
  document_type: string;
  file_name: string;
  expiration_date: string;
  days_until_expiry: number;
}

interface MissingDocReport {
  employee_id: string;
  user_id: string;
  employee_name: string;
  email: string;
  missing_documents: string[];
  missing_count: number;
}

interface ComplianceReport {
  total_employees: number;
  fully_compliant: number;
  partially_compliant: number;
  non_compliant: number;
  expiring_within_30_days: number;
  expired_documents: number;
  missing_documents: number;
  compliance_rate: number;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function CompliancePage() {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [expiring, setExpiring] = useState<ExpiringDocument[]>([]);
  const [missing, setMissing] = useState<MissingDocReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'expiring' | 'missing'>('overview');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  async function fetchComplianceData() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all compliance data in parallel
      const [reportRes, expiringRes, missingRes] = await Promise.all([
        fetch(`${API_BASE}/api/compliance/report`, { headers }),
        fetch(`${API_BASE}/api/compliance/expiring?days=30`, { headers }),
        fetch(`${API_BASE}/api/compliance/missing`, { headers })
      ]);

      if (reportRes.ok) {
        setReport(await reportRes.json());
      }
      if (expiringRes.ok) {
        setExpiring(await expiringRes.json());
      }
      if (missingRes.ok) {
        setMissing(await missingRes.json());
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={fetchComplianceData}
            className="mt-2 text-red-600 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Compliance Dashboard</h1>

      {/* Stats Cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Compliance Rate</div>
            <div className="text-2xl font-bold text-green-600">{report.compliance_rate}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Fully Compliant</div>
            <div className="text-2xl font-bold">{report.fully_compliant}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Expiring (30 days)</div>
            <div className="text-2xl font-bold text-yellow-600">{report.expiring_within_30_days}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Expired</div>
            <div className="text-2xl font-bold text-red-600">{report.expired_documents}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {(['overview', 'expiring', 'missing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'expiring' && expiring.length > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                  {expiring.length}
                </span>
              )}
              {tab === 'missing' && missing.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">
                  {missing.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && report && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Compliance Overview</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Total Employees</dt>
              <dd className="text-lg font-medium">{report.total_employees}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Partially Compliant</dt>
              <dd className="text-lg font-medium">{report.partially_compliant}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Non-Compliant</dt>
              <dd className="text-lg font-medium text-red-600">{report.non_compliant}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Missing Documents</dt>
              <dd className="text-lg font-medium">{report.missing_documents}</dd>
            </div>
          </dl>
        </div>
      )}

      {activeTab === 'expiring' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expiring.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No documents expiring in the next 30 days
                  </td>
                </tr>
              ) : (
                expiring.map(doc => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{doc.employee_name}</div>
                      <div className="text-sm text-gray-500">{doc.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{doc.document_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{doc.expiration_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        doc.days_until_expiry <= 7 ? 'bg-red-100 text-red-800' :
                        doc.days_until_expiry <= 14 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.days_until_expiry} days
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'missing' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missing Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {missing.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    All employees have required documents
                  </td>
                </tr>
              ) : (
                missing.map(emp => (
                  <tr key={emp.employee_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{emp.employee_name}</div>
                      <div className="text-sm text-gray-500">{emp.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {emp.missing_documents.map(doc => (
                          <span key={doc} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                        {emp.missing_count}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
