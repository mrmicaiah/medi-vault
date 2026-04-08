import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface Applicant {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
  location_name: string;
  position?: string;
}

interface ApplicantDetail {
  city?: string;
  certifications?: string[];
  has_cpr_certification?: string;
  has_tb_test?: string;
  has_drivers_license?: string;
  will_travel_30_min?: string;
  will_work_bed_bound?: string;
  available_days?: string[];
  hours_per_week?: string;
  comfortable_with_smokers?: string;
  position_applied?: string;
  id_front_uploaded?: boolean;
  id_back_uploaded?: boolean;
  ssn_card_uploaded?: boolean;
  work_auth_uploaded?: boolean;
  credentials_uploaded?: boolean;
  cpr_uploaded?: boolean;
  tb_uploaded?: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  emergency_name?: string;
  emergency_relationship?: string;
  emergency_phone?: string;
  ssn_last_four?: string;
  // Training interest fields
  interested_in_hha?: string;
  interested_in_cpr?: string;
  has_cpr?: string;
}

const detailCache = new Map<string, ApplicantDetail>();

// Position colors
const POSITION_COLORS: Record<string, { bg: string; text: string }> = {
  pca: { bg: 'bg-blue-500', text: 'text-white' },
  hha: { bg: 'bg-teal-500', text: 'text-white' },
  cna: { bg: 'bg-purple-500', text: 'text-white' },
  lpn: { bg: 'bg-amber-500', text: 'text-white' },
  rn: { bg: 'bg-rose-500', text: 'text-white' },
  default: { bg: 'bg-gray-400', text: 'text-white' },
};

const getPositionColor = (position?: string) => {
  if (!position) return POSITION_COLORS.default;
  return POSITION_COLORS[position.toLowerCase()] || POSITION_COLORS.default;
};

const YesNo = ({ value }: { value: boolean | string | undefined }) => {
  const isYes = value === true || value === 'yes';
  return (
    <span className={`font-semibold ${isYes ? 'text-success' : 'text-error'}`}>
      {isYes ? 'YES