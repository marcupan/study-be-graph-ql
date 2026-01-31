'use client';

import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

import { isAuthenticated } from '../../utils/auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  return <>{children}</>;
}