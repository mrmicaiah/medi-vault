import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAgency } from '../../contexts/AgencyContext';
import { getInitials } from '../../lib/utils';
import type { UserRole } from '../../types';

const STAFF_ROLES: UserRole[] = ['admin', 'superadmin', 'manager'];

export function Header() {
  const { user, profile, role, signOut } = useAuth();
  const { agency } = useAgency();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isStaff = role !== null && STAFF_ROLES.includes(role);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email?.split('@')[0] || user?.email?.split('@')[0] || 'User';
  
  const initials = profile?.first_name && profile?.last_name
    ? getInitials(profile.first_name, profile.last_name)
    : (profile?.email?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {agency?.logo_url ? (
            <img 
              src={agency.logo_url} 
              alt={agency.name} 
              className="h-12 w-auto max-w-[200px] object-contain"
            />
          ) : (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-maroon">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <span className="font-display text-xl font-bold text-navy">
                Medi<span className="text-maroon">Vault</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        {isStaff && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-maroon-subtle text-maroon capitalize">
            {role}
          </span>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon-subtle text-sm font-medium text-maroon">
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-slate sm:block">
              {displayName}
            </span>
            <svg className="h-4 w-4 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
              <div className="border-b border-border px-4 py-2">
                <p className="text-sm font-medium text-navy">
                  {displayName}
                </p>
                <p className="text-xs text-gray">{profile?.email || user?.email}</p>
              </div>
              {role === 'superadmin' && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/admin/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
