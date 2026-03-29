import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { RouterConfig } from './router';

function App() {
  return (
    <AuthProvider>
      <RouterConfig />
    </AuthProvider>
  );
}

export default App;
