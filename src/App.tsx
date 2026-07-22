import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppProvider, useApp } from "./contexts/AppContext";
import { Onboarding } from "./components/onboarding/Onboarding";
import Index from "./pages/Index";
import Disciplinas from "./pages/Disciplinas";
import Planejador from "./pages/Planejador";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import NoCourseSelected from "./pages/NoCourseSelected";
import { useMemo } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { isOnboarded } = useApp();

  // Check if a course has been selected
  const hasSelectedCourse = useMemo(() => {
    try {
      const selectedPrograms = localStorage.getItem('selectedPrograms');
      const programs = selectedPrograms ? JSON.parse(selectedPrograms) : [];
      return Array.isArray(programs) && programs.length > 0;
    } catch {
      return false;
    }
  }, []);

  if (!isOnboarded) {
    return <Onboarding />;
  }

  if (!hasSelectedCourse) {
    return <NoCourseSelected />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/disciplinas" element={<Disciplinas />} />
        <Route path="/planejador" element={<Planejador />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AppProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
