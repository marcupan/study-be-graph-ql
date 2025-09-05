'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../../utils/auth';
import { useQuery } from '@apollo/client';
import { GET_CURRENT_USER } from '../../graphql/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on the client side
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      setLoading(false);
    }
  }, [router]);

  // Verify token validity by fetching current user
  const { error } = useQuery(GET_CURRENT_USER, {
    skip: !isAuthenticated() || loading,
    onError: () => {
      // If token is invalid, redirect to login
      router.push('/login');
    },
  });

  // If there's an error with the token, show nothing while redirecting
  if (error) {
    return null;
  }

  // Show loading state or children
  return loading ? (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  ) : (
    <>{children}</>
  );
}
