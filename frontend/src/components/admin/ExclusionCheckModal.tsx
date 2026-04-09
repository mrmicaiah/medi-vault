import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { api } from '../../lib/api';

interface EmployeeDue {
  id: string;
  name: string;
  email?: string;
  position?: string;
  needs_oig: boolean;
  needs_sam: boolean;
}

interface ExclusionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Optional: pre-select specific employees
  preselectedEmployees?: { id: string; name: string }[];
  // Optional: pre-select check type
  preselectedCheckType?: 'oig' | 'sam';
}

export function ExclusionCheckModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedEmployees,
  preselectedCheckType,
}: ExclusionCheckModalProps) {
  const [step, setStep] = useState<'select' | 'confirm' | 'done'>('select');
  const [checkType, setCheckType] = useState<'oig' | 'sam'>(preselectedCheckType || 'oig');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Employees due for checks
  const [employeesDue, setEmployeesDue] = useState<EmployeeDue[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // Selected employees
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Result
  const [result, setResult] = useState<'clear' | 'match_found'>('clear');
  const [notes, setNotes] = useState('');
  
  // Success state
  const [successCount, setSuccessCount] = useState(0);

  // Load employees due when modal opens or check type changes
  useEffect(() => {
    if (isOpen && !preselectedEmployees) {
      loadEmployeesDue();
    }
  }, [isOpen, checkType, preselectedEmployees]);

  // Set preselected employees if provided
  useEffect(() => {
    if (preselectedEmployees && preselectedEmployees.length > 0) {
      setSelectedIds(new Set(preselectedEmployees.map(e => e.id)));
    }
  }, [preselectedEmployees]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setSelectedIds(new Set());
      setResult('clear');
      setNotes('');
      setError(null);
      setSuccessCount(0);
    }
  }, [isOpen]);

  async function loadEmployeesDue() {
    setLoadingEmployees(true);
    setError(null);
    try {
      const res = await api.get<{ employees: EmployeeDue[]; total: number }>(
        `/admin/exclusion-checks/due?check_type=${checkType}`
      );
      setEmployeesDue(res.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  }

  function toggleEmployee(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    const allIds = preselectedEmployees 
      ? preselectedEmployees.map(e => e.id)
      : employeesDue.map(e => e.id);
    setSelectedIds(new Set(allIds));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await api.post('/admin/exclusion-checks/batch', {
        employee_ids: Array.from(selectedIds),
        check_type: checkType,
        check_date: today,
        result: result,
        notes: notes || null,
      });
      
      setSuccessCount(selectedIds.size);
      setStep('done');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log checks');
    } finally {
      setLoading(false);
    }
  }

  const employeeList = preselectedEmployees || employeesDue;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'done' 
          ? 'Checks Logged Successfully' 
          : `Log ${checkType.toUpperCase()} Exclusion Checks`
      }
    >
      {step === 'select' && (
        <div className="space-y-4">
          {/* Check Type Selector */}
          {!preselectedCheckType && (
            <div>
              <label className="block text-sm font-medium text-slate mb-2">Check Type</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setCheckType('oig')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    checkType === 'oig'
                      ? 'border-maroon bg-maroon/5 text-maroon'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">OIG LEIE</div>
                  <div className="text-xs text-gray mt-1">Office of Inspector General</div>
                </button>
                <button
                  onClick={() => setCheckType('sam')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    checkType === 'sam'
                      ? 'border-maroon bg-maroon/5 text-maroon'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">SAM.gov</div>
                  <div className="text-xs text-gray mt-1">System for Award Management</div>
                </button>
              </div>
            </div>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {/* Employee Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate">
                Select Employees ({selectedIds.size} selected)
              </label>
              <div className="flex gap-2">
                <button 
                  onClick={selectAll}
                  className="text-xs text-maroon hover:underline"
                >
                  Select All
                </button>
                <button 
                  onClick={selectNone}
                  className="text-xs text-gray hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            
            {loadingEmployees ? (
              <div className="flex justify-center py-8">
                <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : employeeList.length === 0 ? (
              <div className="text-center py-8 bg-success/5 rounded-lg border border-success/20">
                <svg className="mx-auto h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-success">All employees checked!</p>
                <p className="text-xs text-gray mt-1">No {checkType.toUpperCase()} checks due this month</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                {employeeList.map((emp) => (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-border last:border-b-0 ${
                      selectedIds.has(emp.id) ? 'bg-maroon/5' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="h-4 w-4 text-maroon border-gray-300 rounded focus:ring-maroon"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate">{emp.name}</p>
                      {'position' in emp && emp.position && (
                        <p className="text-xs text-gray">{emp.position}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => setStep('confirm')} 
              disabled={selectedIds.size === 0}
            >
              Continue ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray">Logging checks for:</p>
            <p className="text-lg font-semibold text-navy">
              {selectedIds.size} employee{selectedIds.size !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-maroon font-medium mt-1">
              {checkType.toUpperCase()} Check — {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Result Selection */}
          <div>
            <label className="block text-sm font-medium text-slate mb-2">Result</label>
            <div className="flex gap-3">
              <button
                onClick={() => setResult('clear')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  result === 'clear'
                    ? 'border-success bg-success/5 text-success'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">Clear</span>
                </div>
                <div className="text-xs mt-1 opacity-70">No exclusions found</div>
              </button>
              <button
                onClick={() => setResult('match_found')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  result === 'match_found'
                    ? 'border-error bg-error/5 text-error'
                    : 'border-border hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-semibold">Match Found</span>
                </div>
                <div className="text-xs mt-1 opacity-70">Exclusion detected</div>
              </button>
            </div>
          </div>

          {result === 'match_found' && (
            <Alert variant="error">
              <strong>Warning:</strong> Logging a match means this employee may be excluded from 
              federally funded healthcare programs. Ensure you verify this result and take 
              appropriate action.
            </Alert>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
              placeholder="Any additional notes about this check..."
            />
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={() => setStep('select')}>Back</Button>
            <Button onClick={handleSubmit} loading={loading}>
              Log {selectedIds.size} Check{selectedIds.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-navy">
            {successCount} {checkType.toUpperCase()} Check{successCount !== 1 ? 's' : ''} Logged
          </h3>
          <p className="text-sm text-gray mt-2">
            Results have been recorded for compliance tracking.
          </p>
          <Button className="mt-6" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
