import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
  allStepsData?: Record<number, { data: Record<string, unknown>; status: string }>;
}

// Position type from Step 1
type PositionType = 'pca' | 'hha' | 'cna' | 'lpn' | 'rn' | '';

// Get position label for display
const POSITION_LABELS: Record<string, string> = {
  pca: 'Personal Care Aide (PCA)',
  hha: 'Home Health Aide (HHA)',
  cna: 'Certified Nursing Assistant (CNA)',
  lpn: 'Licensed Practical Nurse (LPN)',
  rn: 'Registered Nurse (RN)',
};

export function JobDescription({ data, onSave, allStepsData }: StepProps) {
  // Get position from Step 1 data
  const step1Data = allStepsData?.[1]?.data || {};
  const position = (step1Data.position_applied as PositionType) || '';
  const positionLabel = POSITION_LABELS[position] || 'Home Care Position';

  const [form, setForm] = useState({
    agreed: (data.agreed as boolean) || false,
    signature: (data.signature as string) || '',
    signed_date: (data.signed_date as string) || new Date().toISOString().split('T')[0],
    position_signed: position, // Store which position JD they signed
  });

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value, position_signed: position };
    setForm(updated);
    onSave(updated);
  };

  // Render the appropriate job description based on position
  const renderJobDescription = () => {
    // LPN gets its own job description
    if (position === 'lpn') {
      return <LPNJobDescription />;
    }
    
    // RN gets its own job description
    if (position === 'rn') {
      return <RNJobDescription />;
    }
    
    // PCA, CNA, HHA all use the same job description
    return <CNAHHAJobDescription />;
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Review the job description for <strong>{positionLabel}</strong> and acknowledge your understanding of the role requirements.
      </p>

      <div className="h-96 overflow-y-auto rounded-lg border border-border bg-gray-50 text-sm text-slate scrollbar-thin">
        {renderJobDescription()}
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.agreed}
            onChange={(e) => handleChange('agreed', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-maroon focus:ring-maroon"
          />
          <span className="text-sm text-slate">
            I have read and understand the job description, responsibilities, qualifications, and physical requirements for the <strong>{positionLabel}</strong> position.
          </span>
        </label>

        <Input
          label="Typed Signature (Full Legal Name)"
          required
          value={form.signature}
          onChange={(e) => handleChange('signature', e.target.value)}
          placeholder="Type your full legal name"
        />

        <div>
          <label className="block text-sm font-medium text-navy">Date</label>
          <p className="mt-1 text-sm text-slate">{formatDate(form.signed_date)}</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CNA / HHA / PCA Job Description Component
// =============================================================================
function CNAHHAJobDescription() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="bg-navy text-white p-4 rounded-t-lg -mx-4 -mt-4 mb-4">
        <h4 className="text-lg font-bold">Job Description - CNA / Home Health Aide</h4>
        <p className="text-sm text-gray-300">Please review the position requirements and responsibilities</p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4">
        <p className="text-sm font-semibold text-amber-800">
          RISK OF EXPOSURE TO BLOODBORNE PATHOGENS - HIGH
        </p>
      </div>

      {/* Position Overview */}
      <Section title="Position Overview">
        <p><strong>Title:</strong> Certified Nursing Assistant / Home Health Aide</p>
        <p><strong>Reports To:</strong> Registered Nurse / Director of Nursing</p>
        <p><strong>Role:</strong> Provides personal care and related services in the home under the direction, instruction, and supervision of the staff nurse and Director of Nursing. Tasks must be assigned by and performed under supervision of an RN who is responsible for client care.</p>
      </Section>

      {/* Position Responsibilities */}
      <Section title="Position Responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>Follow plan of care to provide safe, competent care to client</li>
          <li>Assist client with personal hygiene and maintain safe environment</li>
          <li>Plan and prepare nutritious meals; market when instructed</li>
          <li>Assist with ambulation and prescribed exercises per physician orders</li>
          <li>Encourage client independence according to nursing care plan</li>
          <li>Communicate client response to nurse and family professionally</li>
          <li>Report any change in client mental/physical condition or home situation</li>
          <li>Perform routine housekeeping for safe, comfortable environment</li>
          <li>Document services and prepare visit reports promptly</li>
          <li>Confirm weekly scheduling of visits for coordination</li>
          <li>Work with families and community agencies as directed</li>
          <li>Attend in-service training as required</li>
          <li>Take and record vital signs if specified in plan of service</li>
        </ul>
      </Section>

      {/* Restrictions */}
      <Section title="Restrictions">
        <p>Under no circumstances may an Attendant be assigned to receive or reduce any intravenous procedures, or any other sterile or invasive procedures, other than rectal temperatures.</p>
      </Section>

      {/* Job Conditions */}
      <Section title="Job Conditions and Physical Requirements">
        <ul className="list-disc pl-5 space-y-1">
          <li>Ability to drive and access client homes (may not be wheelchair accessible)</li>
          <li>Hearing, eyesight, and physical dexterity sufficient for assessment and safe transfers</li>
          <li>May be required to bend, stoop, reach, and move client weight up to 250 lbs</li>
          <li>Must be able to lift and/or carry up to 30 lbs</li>
          <li>Must effectively communicate in English</li>
        </ul>
      </Section>

      {/* Equipment */}
      <Section title="Equipment Operation">
        <p>BP Cuff, Thermometer, Stethoscope, and Hand Washing Materials</p>
      </Section>

      {/* Confidentiality */}
      <Section title="Confidentiality">
        <p>Has access to all client medical records which may be discussed with the Registered Nurse and Director of Nursing only.</p>
      </Section>

      {/* Qualifications */}
      <Section title="Qualifications">
        <p className="mb-2">Must speak, read, and write English AND meet one of the following:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Completed nursing program for RN or LPN licensure</li>
          <li>Completed nurse aide program approved by Virginia Board of Nursing</li>
          <li>Certified as nurse aide by Virginia Board of Nursing</li>
          <li>Enrolled in nursing program with at least one clinical course completed</li>
          <li>Passed competency evaluation per 42 CFR 484.36</li>
          <li>Completed DMAS Personal Care Aide Training Curriculum (personal care only)</li>
        </ul>
      </Section>

      {/* Additional Requirements */}
      <Section title="Additional Requirements">
        <ul className="list-disc pl-5 space-y-1">
          <li>Must have criminal background check</li>
          <li>Must have current CPR certification</li>
          <li>Must be free from health problems injurious to patient, self, or co-workers with appropriate evidence</li>
          <li>Must understand and respect client rights including ethics and confidentiality</li>
        </ul>
      </Section>
    </div>
  );
}

// =============================================================================
// LPN Job Description Component
// =============================================================================
function LPNJobDescription() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="bg-navy text-white p-4 rounded-t-lg -mx-4 -mt-4 mb-4">
        <h4 className="text-lg font-bold">Job Description - Licensed Practical Nurse</h4>
        <p className="text-sm text-gray-300">Please review the position requirements and responsibilities</p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4">
        <p className="text-sm font-semibold text-amber-800">
          RISK OF EXPOSURE TO BLOODBORNE PATHOGENS - HIGH
        </p>
      </div>

      {/* Position Overview */}
      <Section title="Position Overview">
        <p><strong>Title:</strong> Licensed Practical Nurse (LPN)</p>
        <p><strong>Reports To:</strong> Director of Nursing</p>
        <p><strong>Role:</strong> Provide skilled nursing care under the direct supervision of the Registered Nurse. Perform selected skilled actions in the provision of curative, rehabilitative, palliative, or preventative nursing care. Responsible and accountable for making decisions based on individual nursing experience and educational preparation.</p>
      </Section>

      {/* Clinical Responsibilities */}
      <Section title="Clinical Responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>Assist the RN in carrying out the plan of care</li>
          <li>Assist RN in performing specialized procedures under physician orders</li>
          <li>Assist with preparation, implementation, and evaluation of client care plan</li>
          <li>Prepare care plan for Home Attendant</li>
          <li>Help teach client appropriate self-care techniques</li>
          <li>Assist in rehabilitation by reporting abnormalities in range of motion, body mechanics, or alignment</li>
          <li>Participate in development and revision of physician plan of treatment</li>
          <li>Process change orders as needed</li>
          <li>Participate in client discharge planning</li>
          <li>Maintain ongoing knowledge of current drug therapy</li>
        </ul>
      </Section>

      {/* Observation and Reporting */}
      <Section title="Observation and Reporting">
        <p className="mb-2">Observe, record, and report to appropriate person:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>General physical and mental condition of clients</li>
          <li>Signs and symptoms indicative of untoward changes</li>
          <li>Client symptoms, reactions, and changes</li>
          <li>Stress in relationships between clients and staff, families, or visitors</li>
          <li>Signs and symptoms indicative of medical conditions</li>
        </ul>
      </Section>

      {/* Documentation */}
      <Section title="Documentation">
        <ul className="list-disc pl-5 space-y-1">
          <li>Prepare clinical and progress notes (not to include admission)</li>
          <li>Submit clinical notes no less than weekly</li>
          <li>Complete progress notes and other clinical record forms as indicated</li>
        </ul>
      </Section>

      {/* Professional Development */}
      <Section title="Professional Development">
        <ul className="list-disc pl-5 space-y-1">
          <li>Recognize and understand effects of social and economic problems on clients</li>
          <li>Provide for emotional and physical comfort and safety of clients</li>
          <li>Foster cooperative effort among personnel by understanding functions of others</li>
          <li>Active participation in team and staff conferences</li>
          <li>Participate in nursing organizations and in-service programs</li>
        </ul>
      </Section>

      {/* Job Conditions */}
      <Section title="Job Conditions and Physical Requirements">
        <ul className="list-disc pl-5 space-y-1">
          <li>Must have valid driver license and be able to drive to client residences</li>
          <li>Ability to access client homes (may not be wheelchair accessible)</li>
          <li>Hearing, eyesight, and physical dexterity sufficient for assessment and safe transfers</li>
          <li>Physical activities include walking, sitting, stooping, standing</li>
          <li>Minimal to maximum lifting and turning of clients</li>
          <li>Effective verbal and written communication in English required</li>
        </ul>
      </Section>

      {/* Equipment */}
      <Section title="Equipment Operation">
        <p>Thermometer, BP Cuff, Glucometer, Penlight, Hand Washing Materials</p>
      </Section>

      {/* Confidentiality */}
      <Section title="Confidentiality">
        <p>Has access to client medical records, personnel records, and client financial accounts which may be discussed with Director of Nursing only.</p>
      </Section>

      {/* Qualifications */}
      <Section title="Qualifications">
        <ul className="list-disc pl-5 space-y-1">
          <li>Graduate from accredited School of Nursing</li>
          <li>Licensed in Virginia as a Practical Nurse</li>
          <li>Minimum one year experience in community/home health or hospital (home care preferred)</li>
          <li>Knowledge of Medicare regulations and guidelines</li>
          <li>Working knowledge of home health care principles and documentation</li>
          <li>Understanding of time management and management processes</li>
          <li>Ability to communicate effectively with nursing staff, physicians, and others</li>
          <li>Criminal background check required</li>
          <li>Current CPR certification required</li>
        </ul>
      </Section>
    </div>
  );
}

// =============================================================================
// RN Job Description Component
// =============================================================================
function RNJobDescription() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="bg-navy text-white p-4 rounded-t-lg -mx-4 -mt-4 mb-4">
        <h4 className="text-lg font-bold">Job Description - Registered Nurse</h4>
        <p className="text-sm text-gray-300">Please review the position requirements and responsibilities</p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mb-4">
        <p className="text-sm font-semibold text-amber-800">
          RISK OF EXPOSURE TO BLOODBORNE PATHOGENS - HIGH
        </p>
      </div>

      {/* Position Overview */}
      <Section title="Position Overview">
        <p><strong>Title:</strong> Registered Nurse (RN)</p>
        <p><strong>Reports To:</strong> Director of Nursing</p>
        <p><strong>Role:</strong> Provides nursing care in accordance with the client plan of care including comprehensive health and psychosocial evaluation, monitoring of client condition, health promotion and prevention, coordination of services, teaching and training activities, and direct nursing care.</p>
      </Section>

      {/* Care Coordination */}
      <Section title="Care Coordination Responsibilities">
        <ul className="list-disc pl-5 space-y-1">
          <li>Coordinate total client care through comprehensive health and psychosocial evaluations</li>
          <li>Monitor client condition and promote sound preventive practices</li>
          <li>Evaluate effectiveness of nursing service to client and family on ongoing basis</li>
          <li>Coordinate client services and discuss involvement of health team members</li>
          <li>Consult with attending physician concerning alterations to care plans</li>
          <li>Participate in case conferences and discuss client concerns with supervisor</li>
          <li>Obtain orders for paraprofessional services and submit referrals</li>
          <li>May be requested to fill in for other nurses on vacation or sick leave</li>
        </ul>
      </Section>

      {/* Client Admission */}
      <Section title="Client Admission Coordination">
        <ul className="list-disc pl-5 space-y-1">
          <li>Conduct initial and ongoing comprehensive assessment including OASIS assessments</li>
          <li>Obtain medical history from client and/or family member</li>
          <li>Conduct physical examination including vital signs, physical and mental status assessment</li>
          <li>Evaluate client, family, and home situation to determine health teaching needs</li>
          <li>Evaluate client environment and available family assistance</li>
          <li>Determine if Home Attendant services are required and frequency needed</li>
          <li>Explain nursing and agency services to clients and families</li>
          <li>Develop and implement the nursing care plan</li>
        </ul>
      </Section>

      {/* Skilled Nursing */}
      <Section title="Skilled Nursing Care">
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide nursing services, treatments, and preventative procedures as ordered by physician</li>
          <li>Initiate preventative and rehabilitative nursing procedures for client care and safety</li>
          <li>Observe signs and symptoms; report to physician reactions to treatments and drug reactions</li>
          <li>Report changes in client physical or emotional condition</li>
          <li>Teach, supervise, and counsel client and caregivers regarding nursing care needs</li>
        </ul>
      </Section>

      {/* Home Attendant Supervision */}
      <Section title="Home Attendant Supervision">
        <ul className="list-disc pl-5 space-y-1">
          <li>Supervise and evaluate care given by Home Attendant at minimum every 14 days</li>
          <li>Provide written evaluation of Home Attendants in geographical area</li>
          <li>Participate in periodic conferences concerning Home Attendant performance</li>
          <li>Chart services rendered on client by Home Attendant</li>
          <li>Report to agency and physician any alterations in client condition or home environment</li>
          <li>Submit incident reports and clinical records outlining services and problems</li>
        </ul>
      </Section>

      {/* Documentation */}
      <Section title="Documentation Requirements">
        <ul className="list-disc pl-5 space-y-1">
          <li>Perform admission, transfer, recertification, resumption of care, and discharge OASIS</li>
          <li>Submit clinical notes within 72 hours</li>
          <li>Submit progress notes and clinical record forms no less than weekly</li>
          <li>Submit tally of client care visits made each day</li>
          <li>Prepare and present client record to Clinical Record Review Committee as indicated</li>
        </ul>
      </Section>

      {/* Professional Development */}
      <Section title="Professional Development and Compliance">
        <ul className="list-disc pl-5 space-y-1">
          <li>Participate in staff development meetings and in-service education</li>
          <li>Participate in development and revision of policies and procedures</li>
          <li>Coordinate implementation of ordered nursing procedures</li>
          <li>Provide in-service education and orientation for health team members</li>
          <li>Participate in educational experiences for student nurses</li>
          <li>Maintain ongoing knowledge of current drug therapy</li>
          <li>Adhere to Federal, State, and accreditation requirements including Medicare and Medicaid regulations</li>
        </ul>
      </Section>

      {/* Discharge Planning */}
      <Section title="Discharge Planning">
        <ul className="list-disc pl-5 space-y-1">
          <li>Participate in client discharge planning process</li>
          <li>Participate in development and revision of physician plan of care</li>
          <li>Assist with discharge planning and documentation</li>
          <li>Plan for clients and families including in-service education and in-home orientation</li>
          <li>Refer clients for social services when necessary</li>
        </ul>
      </Section>
    </div>
  );
}

// =============================================================================
// Shared Section Component
// =============================================================================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 bg-white border-l-4 border-navy p-4 rounded">
      <h5 className="text-sm font-bold text-navy uppercase mb-2">{title}</h5>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
