import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AgencyProvider } from './contexts/AgencyContext';
import { RouterConfig } from './router';

// MediVault - Home Care Agency Management Platform
// v1.0.2

function App() {
  return (
    <AuthProvider>
      <AgencyProvider>
        <RouterConfig />
      </AgencyProvider>
    </AuthProvider>
  );
}

export default App;
