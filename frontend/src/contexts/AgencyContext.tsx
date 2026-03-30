import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface Agency {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  website?: string;
  phone?: string;
  email?: string;
}

interface AgencyContextType {
  agency: Agency | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgency = async () => {
    if (!profile?.agency_id) {
      setAgency(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Agency>('/agencies/me');
      setAgency(data);
    } catch (err) {
      console.error('[Agency] Failed to fetch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agency');
      setAgency(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.agency_id) {
      fetchAgency();
    } else {
      setAgency(null);
    }
  }, [profile?.agency_id]);

  return (
    <AgencyContext.Provider value={{ agency, loading, error, refetch: fetchAgency }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error('useAgency must be used within an AgencyProvider');
  }
  return context;
}
