import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { RouterConfig } from './router';

// MediVault - Home Care Agency Management Platform
// v1.0.1

function App() {
  return (
    <AuthProvider>
      <RouterConfig />
    </AuthProvider>
  );
}

export default App;
