import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';
<<<<<<< HEAD
import { NewSemesterModal } from '@/components/semester/NewSemesterModal';
import { useSemesterTransition } from '@/hooks/useSemesterTransition';
=======
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
<<<<<<< HEAD
  const {
    pendingTransition,
    planningTerm,
    currentTerm,
    unresolvedCodes,
    canAdvance,
    advanceToNewSemester,
  } = useSemesterTransition();

=======
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 pb-24 md:pb-0 md:ml-16 pt-14 md:pt-0">
        <MobileHeader />
        {children}
      </main>
      <MobileNav />
<<<<<<< HEAD
      <NewSemesterModal
        open={pendingTransition}
        planningTerm={planningTerm}
        currentTerm={currentTerm}
        unresolvedCodes={unresolvedCodes}
        canAdvance={canAdvance}
        onAdvance={advanceToNewSemester}
      />
=======
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
    </div>
  );
}
