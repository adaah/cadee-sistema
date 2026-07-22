import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';
import { NewSemesterModal } from '@/components/semester/NewSemesterModal';
import { useSemesterTransition } from '@/hooks/useSemesterTransition';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const {
    showNewSemesterModal,
    planningTerm,
    currentTerm,
    unresolvedCodes,
    canAdvance,
    advanceToNewSemester,
    dismissModalToResolve,
  } = useSemesterTransition();

  const handleResolveOnHome = () => {
    dismissModalToResolve();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 pb-24 md:pb-0 md:ml-16 pt-14 md:pt-0">
        <MobileHeader />
        {children}
      </main>
      <MobileNav />
      <NewSemesterModal
        open={showNewSemesterModal}
        planningTerm={planningTerm}
        currentTerm={currentTerm}
        unresolvedCodes={unresolvedCodes}
        canAdvance={canAdvance}
        onAdvance={advanceToNewSemester}
        onResolveOnHome={handleResolveOnHome}
      />
    </div>
  );
}
