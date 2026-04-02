import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <Sidebar />
      <main className="ml-60 min-h-[calc(100vh-5rem)] p-6">
        <Outlet />
      </main>
    </div>
  );
}
