import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function WorkPreferences({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    available_days: (data.available_days as string[]) || [],
    shift_preference: (data.shift_preference as string) || '',
    max_travel_miles: (data.max_travel_miles as string) || '',
    has_transportation: (data.has_transportation as string) || '',
    has_drivers_license: (data.has_drivers_license as string) || '',
    willing_to_relocate: (data.willing_to_relocate as string) || '',
    desired_hours_per_week: (data.desired_hours_per_week as string) || '',
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray">Tell us about your availability and work preferences.</p>

      <div>
        <label className="block text-sm font-medium text-navy mb-2">
          Available Days <span className="text-error">*</span>
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

      <Select
        label="Shift Preference"
        required
        value={form.shift_preference}
        onChange={(e) => handleChange('shift_preference', e.target.value)}
        options={[
          { value: 'morning', label: 'Morning (6am - 2pm)' },
          { value: 'afternoon', label: 'Afternoon (2pm - 10pm)' },
          { value: 'evening', label: 'Evening / Night (10pm - 6am)' },
          { value: 'flexible', label: 'Flexible / Any' },
        ]}
      />

      <Input
        label="Desired Hours Per Week"
        type="number"
        value={form.desired_hours_per_week}
        onChange={(e) => handleChange('desired_hours_per_week', e.target.value)}
        placeholder="e.g., 40"
      />

      <Input
        label="Maximum Travel Distance (miles)"
        type="number"
        value={form.max_travel_miles}
        onChange={(e) => handleChange('max_travel_miles', e.target.value)}
        placeholder="e.g., 25"
      />

      <Select
        label="Do you have reliable transportation?"
        required
        value={form.has_transportation}
        onChange={(e) => handleChange('has_transportation', e.target.value)}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />

      <Select
        label="Do you have a valid driver's license?"
        required
        value={form.has_drivers_license}
        onChange={(e) => handleChange('has_drivers_license', e.target.value)}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />

      <Select
        label="Willing to relocate?"
        value={form.willing_to_relocate}
        onChange={(e) => handleChange('willing_to_relocate', e.target.value)}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'maybe', label: 'Open to discussion' },
        ]}
      />
    </div>
  );
}
