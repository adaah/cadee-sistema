import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 pb-24 md:pb-0 md:ml-16 pt-14 md:pt-0">
        <MobileHeader />
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
