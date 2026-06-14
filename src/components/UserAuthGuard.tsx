import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../lib/UserContext';
import { Loader2 } from 'lucide-react';

interface UserAuthGuardProps {
  children: React.ReactNode;
}

export default function UserAuthGuard({ children }: UserAuthGuardProps) {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/profile?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
    }
  }, [loading, user, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : null;
}
