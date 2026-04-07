import React from 'react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-maroon">
            <span className="text-lg font-bold text-white">M</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-navy">
            Medi<span className="text-maroon">Vault</span>
          </h1>
          <p className="mt-1 text-sm text-gray">
            Home Care Agency Management Platform
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-xs text-gray-light">
          Powered by MediSVault
        </p>
      </div>
    </div>
  );
}
