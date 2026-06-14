import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../lib/UserContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

const ADMIN_EMAILS = ['gamingremo2010@gmail.com', 'gamingremo201@gmail.com', 'surangisenanayaka700@gmail.com', 'bloovalk@gmail.com'];

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
        // Allowed
      } else {
        if (window.location.pathname.startsWith('/secure-portal') && window.location.pathname !== '/secure-portal/login') {
          navigate('/');
        }
      }
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (user && user.email && ADMIN_EMAILS.includes(user.email)) ? <div className="admin-portal">{children}</div> : null;
}
