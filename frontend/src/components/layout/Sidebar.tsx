import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

const applicantNav: NavItem[] = [
  { label: 'Dashboard', path: '/applicant', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { label: 'Applicants', path: '/admin/applicants', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Employees', path: '/admin/employees', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'Clients', path: '/admin/clients', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { label: 'Documents', path: '/admin/documents', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
];

const STAFF_ROLES: string[] = ['admin', 'superadmin', 'manager'];
const ADMIN_ROLES: string[] = ['admin', 'superadmin'];

export function Sidebar() {
  const { role } = useAuth();
  const isAdminOrManager = role !== null && STAFF_ROLES.includes(role);
  const isAdmin = role !== null && ADMIN_ROLES.includes(role);
  
  const navItems = isAdminOrManager 
    ? adminNav.filter(item => !item.adminOnly || isAdmin)
    : applicantNav;

  return (
    <aside className="fixed left-0 top-16 z-20 flex h-[calc(100vh-4rem)] w-60 flex-col border-r border-border bg-navy">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/applicant' || item.path === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-maroon text-white'
                  : 'text-gray-300 hover:bg-navy-light hover:text-white'
              )
            }
          >
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-navy-light p-4">
        <p className="text-xs text-gray-400">MediVault v1.0</p>
      </div>
    </aside>
  );
}
