import React, { useState } from 'react';
import { Input, Textarea, Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function WorkPreferences({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    // Availability
    available_days: (data.available_days as string[]) || [],
    shift_preferences: (data.shift_preferences as string[]) || [],
    work_weekends: (data.work_weekends as string) || '',
    hours_per_week: (data.hours_per_week as string) || '',
    
    // Transportation
    has_transportation: (data.has_transportation as string) || '',
    max_travel_miles: (data.max_travel_miles as string) || '',
    
    // Client Preferences
    comfortable_with_pets: (data.comfortable_with_pets as string) || '',
    comfortable_with_smokers: (data.comfortable_with_smokers as string) || '',
    conditions_not_work_with: (data.conditions_not_work_with as string) || '',
  });

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shifts = [
    { value: 'morning', label: 'Morning Shift (6am - 12pm)' },
    { value: 'afternoon', label: 'Afternoon Shift (12pm - 6pm)' },
    { value: 'evening', label: 'Evening Shift (6pm - 10pm)' },
    { value: 'overnight', label: 'Overnight Shift (10pm - 6am)' },
  ];

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  const toggleDay = (day: string) => {
    const current = form.available_days;
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    handleChange('available_days', updated);
  };

  const toggleShift = (shift: string) => {
    const current = form.shift_preferences;
    const updated = current.includes(shift)
      ? current.filter((s) => s !== shift)
      : [...current, shift];
    handleChange('shift_preferences', updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">Tell us about your availability and work preferences so we can match you with the right clients.</p>

      {/* Availability */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Availability</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Select the days you are available to work <span className="text-error">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  form.available_days.includes(day)
                    ? 'border-maroon bg-maroon-subtle text-maroon'
                    : 'border-border text-gray hover:border-gray-light'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Select the time of day you are available (select all that apply) <span className="text-error">*</span>
          </label>
          <div className="space-y-2">
            {shifts.map((shift) => (
              <label key={shift.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.shift_preferences.includes(shift.value)}
                  onChange={() => toggleShift(shift.value)}
                  className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{shift.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Are you able to work every other weekend? <span className="text-error">*</span>
          </label>
          <p className="text-xs text-gray mb-2">Note: All aides are required to work at least every other weekend.</p>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="work_weekends"
                  value={val}
                  checked={form.work_weekends === val}
                  onChange={(e) => handleChange('work_weekends', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        <Select
          label="How many hours a week do you want to work?"
          required
          value={form.hours_per_week}
          onChange={(e) => handleChange('hours_per_week', e.target.value)}
          options={[
            { value: 'part_time', label: 'Part Time (under 30 hours)' },
            { value: 'full_time', label: 'Full Time (30-40 hours)' },
            { value: 'fill_in', label: 'Fill In When Available' },
            { value: 'live_in', label: 'Live-In Provider' },
          ]}
        />
      </div>

      {/* Transportation */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Transportation</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Do you have reliable transportation? <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="has_transportation"
                  value={val}
                  checked={form.has_transportation === val}
                  onChange={(e) => handleChange('has_transportation', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label="Maximum travel distance (miles)"
          type="number"
          value={form.max_travel_miles}
          onChange={(e) => handleChange('max_travel_miles', e.target.value)}
          placeholder="e.g., 25"
          helperText="How far are you willing to travel to a client's home?"
        />
      </div>

      {/* Client Preferences */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Client Preferences</h3>
        
        <Select
          label="Are you comfortable working with pets?"
          required
          value={form.comfortable_with_pets}
          onChange={(e) => handleChange('comfortable_with_pets', e.target.value)}
          options={[
            { value: 'dogs', label: 'I am comfortable working with dogs' },
            { value: 'cats', label: 'I am comfortable working with cats' },
            { value: 'either', label: 'I am comfortable working with dogs or cats' },
            { value: 'no_dogs', label: 'I am NOT comfortable working with dogs' },
            { value: 'no_cats', label: 'I am NOT comfortable working with cats' },
            { value: 'no_pets', label: 'I am NOT comfortable working with ANY pets' },
          ]}
        />

        <Select
          label="Are you comfortable around smokers?"
          required
          value={form.comfortable_with_smokers}
          onChange={(e) => handleChange('comfortable_with_smokers', e.target.value)}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'prefer_no_smoking', label: 'I prefer if the client does not smoke in the home' },
          ]}
        />

        <Textarea
          label="Any specific conditions you do NOT want to work with?"
          required
          value={form.conditions_not_work_with}
          onChange={(e) => handleChange('conditions_not_work_with', e.target.value)}
          placeholder="e.g., Alzheimer's, hospice care, heavy lifting, etc."
          helperText="Important: Please disclose any restrictions so we can match you appropriately."
        />
      </div>
    </div>
  );
}
