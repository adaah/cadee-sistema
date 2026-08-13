import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { MobileHeader } from './MobileHeader';
import { NewSemesterModal } from '@/components/semester/NewSemesterModal';
import { useSemesterTransition } from '@/hooks/useSemesterTransition';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

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
      <AppSidebar isCollapsed={isSidebarCollapsed} toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className={cn("flex-1 pb-24 md:pb-0 pt-14 md:pt-0 transition-all duration-300", isSidebarCollapsed ? "md:ml-20" : "md:ml-64")}>
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
