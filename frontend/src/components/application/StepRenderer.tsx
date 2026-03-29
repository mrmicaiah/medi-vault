import React from 'react';
import { ApplicationBasics } from './steps/ApplicationBasics';
import { PersonalInfo } from './steps/PersonalInfo';
import { EmergencyContact } from './steps/EmergencyContact';
import { Education } from './steps/Education';
import { Reference1 } from './steps/Reference1';
import { Reference2 } from './steps/Reference2';
import { EmploymentHistory } from './steps/EmploymentHistory';
import { WorkPreferences } from './steps/WorkPreferences';
import { ConfidentialityAgreement } from './steps/ConfidentialityAgreement';
import { ESignatureAgreement } from './steps/ESignatureAgreement';
import { WorkAuthorization } from './steps/WorkAuthorization';
import { IDFront } from './steps/IDFront';
import { IDBack } from './steps/IDBack';
import { SocialSecurityCard } from './steps/SocialSecurityCard';
import { Credentials } from './steps/Credentials';
import { CPRCertification } from './steps/CPRCertification';
import { TBTest } from './steps/TBTest';
import { OrientationTraining } from './steps/OrientationTraining';
import { CriminalBackground } from './steps/CriminalBackground';
import { VACodeDisclosure } from './steps/VACodeDisclosure';
import { JobDescription } from './steps/JobDescription';
import { FinalSignature } from './steps/FinalSignature';

// Steps that involve file uploads
const UPLOAD_STEPS = [11, 12, 13, 14, 15, 16, 17];

interface StepRendererProps {
  step: number;
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onFileSelect?: (file: File | null) => void;
  pendingFile?: File | null;
  saving: boolean;
  onChange?: () => void;
}

export function StepRenderer({ 
  step, 
  data, 
  onSave, 
  onFileSelect,
  pendingFile,
  saving, 
  onChange 
}: StepRendererProps) {
  const baseProps = { data, onSave, saving, onChange };
  
  // Add file props for upload steps
  const uploadProps = UPLOAD_STEPS.includes(step) 
    ? { ...baseProps, onFileSelect, pendingFile }
    : baseProps;

  switch (step) {
    case 1: return <ApplicationBasics {...baseProps} />;
    case 2: return <PersonalInfo {...baseProps} />;
    case 3: return <EmergencyContact {...baseProps} />;
    case 4: return <Education {...baseProps} />;
    case 5: return <Reference1 {...baseProps} />;
    case 6: return <Reference2 {...baseProps} />;
    case 7: return <EmploymentHistory {...baseProps} />;
    case 8: return <WorkPreferences {...baseProps} />;
    case 9: return <ConfidentialityAgreement {...baseProps} />;
    case 10: return <ESignatureAgreement {...baseProps} />;
    case 11: return <WorkAuthorization {...uploadProps} />;
    case 12: return <IDFront {...uploadProps} />;
    case 13: return <IDBack {...uploadProps} />;
    case 14: return <SocialSecurityCard {...uploadProps} />;
    case 15: return <Credentials {...uploadProps} />;
    case 16: return <CPRCertification {...uploadProps} />;
    case 17: return <TBTest {...uploadProps} />;
    case 18: return <OrientationTraining {...baseProps} />;
    case 19: return <CriminalBackground {...baseProps} />;
    case 20: return <VACodeDisclosure {...baseProps} />;
    case 21: return <JobDescription {...baseProps} />;
    case 22: return <FinalSignature {...baseProps} />;
    default: return <div className="text-center text-gray">Unknown step</div>;
  }
}
