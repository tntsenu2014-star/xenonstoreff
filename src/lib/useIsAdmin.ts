import { useEffect, useState } from 'react';
import { useUser } from './UserContext';

const ADMIN_EMAILS = ['gamingremo2010@gmail.com', 'gamingremo201@gmail.com', 'surangisenanayaka700@gmail.com', 'bloovalk@gmail.com'];

export function useIsAdmin() {
  const { user, loading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user && user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    }
  }, [user, loading]);

  return { isAdmin, isLoading: loading };
}
