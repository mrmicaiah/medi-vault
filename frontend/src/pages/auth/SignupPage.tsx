import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy signup page - redirects to the new /apply page
 * Kept for backwards compatibility with any existing links
 */
export function SignupPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/apply', { replace: true });
  }, [navigate]);

  return (
    <div className="text-center">
      <p className="text-gray">Redirecting to application...</p>
    </div>
  );
}
