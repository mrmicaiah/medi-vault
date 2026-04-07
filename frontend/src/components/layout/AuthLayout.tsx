import React from 'react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img 
            src="https://res.cloudinary.com/dxzw1zwez/image/upload/v1775588384/logo-stacked_c5tjdq.svg" 
            alt="MediSvault" 
            className="mx-auto h-32 w-auto"
          />
          <p className="mt-2 text-sm text-gray">
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
