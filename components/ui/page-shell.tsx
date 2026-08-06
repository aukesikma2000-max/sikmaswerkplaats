"use client";

import { useEffect, useState } from 'react';
import { FrontDeskHeader } from '@/components/layout/front-desk-header';
import { Sidebar } from '@/components/layout/sidebar';
import { GlobalRepairSearch } from '@/components/global-repair-search';
import { DEFAULT_WORKSHOP_USER, getActiveWorkshopUserRecord, type WorkshopUser } from '@/lib/active-user';

type PageShellProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showSearch?: boolean;
  backgroundClassName?: string;
};

export function PageShell({ children, showSearch = false, backgroundClassName = 'bg-[#F8F8F8]' }: PageShellProps) {
  const [activeUser, setActiveUser] = useState<WorkshopUser>(DEFAULT_WORKSHOP_USER);

  useEffect(() => {
    const syncUser = () => {
      setActiveUser(getActiveWorkshopUserRecord());
    };

    syncUser();
    window.addEventListener('sikma-active-user-changed', syncUser as EventListener);
    window.addEventListener('sikma-users-changed', syncUser as EventListener);

    return () => {
      window.removeEventListener('sikma-active-user-changed', syncUser as EventListener);
      window.removeEventListener('sikma-users-changed', syncUser as EventListener);
    };
  }, []);

  const isFrontDesk = activeUser.role === 'Front Desk';

  return (
    <div className={`min-h-screen p-4 lg:p-6 ${backgroundClassName} ${isFrontDesk ? 'pt-24 lg:pt-28' : ''}`}>
      {isFrontDesk ? <FrontDeskHeader /> : null}
      <div className={`mx-auto flex flex-col gap-6 ${isFrontDesk ? 'max-w-7xl' : 'max-w-7xl lg:flex-row'}`}>
        {isFrontDesk ? null : <Sidebar />}
        <main className={`${isFrontDesk ? 'w-full' : 'flex-1'}`}>
          <div className="space-y-6">
            {showSearch && !isFrontDesk ? <GlobalRepairSearch /> : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
