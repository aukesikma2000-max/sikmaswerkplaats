'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveWorkshopUserRecord } from '@/lib/active-user';
import { getStartPage } from '@/lib/access-control';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getActiveWorkshopUserRecord();
    router.replace(getStartPage(user.role));
  }, [router]);

  return null;
}
