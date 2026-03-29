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

interface StepRendererProps {
  step: number;
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
  onChange?: () => void;
}

export function StepRenderer({ step, data, onSave, saving, onChange }: StepRendererProps) {
  const props = { data, onSave, saving, onChange };

  switch (step) {
    case 1: return <ApplicationBasics {...props} />;
    case 2: return <PersonalInfo {...props} />;
    case 3: return <EmergencyContact {...props} />;
    case 4: return <Education {...props} />;
    case 5: return <Reference1 {...props} />;
    case 6: return <Reference2 {...props} />;
    case 7: return <EmploymentHistory {...props} />;
    case 8: return <WorkPreferences {...props} />;
    case 9: return <ConfidentialityAgreement {...props} />;
    case 10: return <ESignatureAgreement {...props} />;
    case 11: return <WorkAuthorization {...props} />;
    case 12: return <IDFront {...props} />;
    case 13: return <IDBack {...props} />;
    case 14: return <SocialSecurityCard {...props} />;
    case 15: return <Credentials {...props} />;
    case 16: return <CPRCertification {...props} />;
    case 17: return <TBTest {...props} />;
    case 18: return <OrientationTraining {...props} />;
    case 19: return <CriminalBackground {...props} />;
    case 20: return <VACodeDisclosure {...props} />;
    case 21: return <JobDescription {...props} />;
    case 22: return <FinalSignature {...props} />;
    default: return <div className="text-center text-gray">Unknown step</div>;
  }
}
