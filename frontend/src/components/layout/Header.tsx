import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../lib/utils';

export function Header() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-maroon">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <span className="font-display text-xl font-bold text-navy">
            Medi<span className="text-maroon">Vault</span>
          </span>
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon-subtle text-sm font-medium text-maroon">
            {profile ? getInitials(profile.first_name, profile.last_name) : '?'}
          </div>
          <span className="hidden text-sm font-medium text-slate sm:block">
            {profile ? `${profile.first_name} ${profile.last_name}` : 'User'}
          </span>
          <svg className="h-4 w-4 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
            <div className="border-b border-border px-4 py-2">
              <p className="text-sm font-medium text-navy">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-gray">{profile?.email}</p>
            </div>
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
    </header>
  );
}
