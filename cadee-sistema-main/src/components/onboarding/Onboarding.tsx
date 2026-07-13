import { useEffect, useRef, useState, useMemo } from 'react';
import { Check, GraduationCap, Search, Loader2, MapPin, ChevronDown, Filter, X, School, BookOpen, Sun, Sunset, Moon, Clock } from 'lucide-react';
import { AnimatePresence, motion, AnimatePresence as MotionPresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { usePrograms } from '@/hooks/useApi';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { cn } from '@/lib/utils';
import { fuzzyFilter } from '@/lib/fuzzy';

// Função para converter códigos de turno em nomes legíveis
const getTurnoNome = (codigo: string): string => {
  const turnos: Record<string, string> = {
    'M': 'MATUTINO',
    'T': 'TARDE',
    'N': 'NOITE',
    'I': 'INTEGRAL',
    'MT': 'MATUTINO/TARDE',
    'MN': 'MATUTINO/NOITE',
    'TN': 'TARDE/NOITE',
    'MTN': 'MATUTINO/TARDE/NOITE'
  };
  
  return turnos[codigo] || codigo;
};

// Componente para o dropdown de localização
function LocationFilter({ locations, selectedLocation, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Encurtar o texto da localização se for muito longo
  const displayLocation = useMemo(() => {
    if (!selectedLocation) return 'Todas as localizações';
    return selectedLocation.length > 15 ? `${selectedLocation.substring(0, 12)}...` : selectedLocation;
  }, [selectedLocation]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-border/70 bg-background/50",
          "text-sm font-normal text-foreground/80 hover:bg-accent/30 transition-colors",
          isOpen && "ring-1 ring-primary/30"
        )}
      >
        <MapPin className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <span className="truncate">{displayLocation}</span>
        <ChevronDown className={cn("w-4 h-4 ml-auto flex-shrink-0 text-muted-foreground/70 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-10 mt-1 w-full min-w-[200px] rounded-xl bg-popover shadow-lg border border-border/50 overflow-hidden backdrop-blur-sm"
          >
            <div className="p-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md",
                  !selectedLocation 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                Todas as localizações
              </button>
              {locations.map((location) => (
                <button
                  key={location}
                  onClick={() => {
                    onSelect(location);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-lg",
                    selectedLocation === location
                      ? "bg-accent/90 text-accent-foreground"
                      : "hover:bg-accent/30 hover:text-accent-foreground"
                  )}
                >
                  {location}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente para o dropdown de modalidade
function ModeFilter({ modes, selectedMode, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Encurtar o texto da modalidade se for muito longo
  const displayMode = useMemo(() => {
    if (!selectedMode) return 'Todas as modalidades';
    return selectedMode.length > 15 ? `${selectedMode.substring(0, 12)}...` : selectedMode;
  }, [selectedMode]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 w-full rounded-xl border border-border/70 bg-background/50",
          "text-sm font-normal text-foreground/80 hover:bg-accent/30 transition-colors",
          isOpen && "ring-1 ring-primary/30"
        )}
      >
        <Filter className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <span className="truncate">{displayMode}</span>
        <ChevronDown className={cn("w-4 h-4 ml-auto flex-shrink-0 text-muted-foreground/70 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-10 mt-1 w-full min-w-[200px] rounded-xl bg-popover shadow-lg border border-border/50 overflow-hidden backdrop-blur-sm"
          >
            <div className="p-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md",
                  !selectedMode 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                Todas as modalidades
              </button>
              {modes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    onSelect(mode);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-lg",
                    selectedMode === mode
                      ? "bg-accent/90 text-accent-foreground"
                      : "hover:bg-accent/30 hover:text-accent-foreground"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Onboarding() {
  const { setIsOnboarded } = useApp();
  const { selectedPrograms, setSelectedPrograms } = useMyPrograms();
  const { data: programs = [], isLoading, error } = usePrograms();
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('SALVADOR');
  const [selectedMode, setSelectedMode] = useState<string>('PRESENCIAL');
  const [selectedId, setSelectedId] = useState<string | null>(selectedPrograms[0] || null);
  const [experienceMode, setExperienceMode] = useState<'simplificada' | 'completa' | null>(null);
  const [modalExperienceMode, setModalExperienceMode] = useState<'simplificada' | 'completa' | null>(null);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('experienceMode');
    if (stored === 'simplificada' || stored === 'completa') {
      setExperienceMode(stored);
    }
  }, []);
  
  // Extrair localizações e modalidades únicas dos programas
  const { locations, modes } = useMemo(() => {
    const locs = new Set<string>();
    const modeSet = new Set<string>();
    (programs as any[]).forEach(program => {
      if (program.location) locs.add(program.location);
      if (program.mode) modeSet.add(program.mode.toUpperCase());
    });
    return {
      locations: Array.from(locs).sort(),
      modes: Array.from(modeSet).sort()
    };
  }, [programs]);
  
  // Filtrar programas por localização, modalidade e pesquisa
  const filteredPrograms = useMemo(() => {
    let result = [...programs];
    
    // Filtrar por localização (case insensitive)
    if (selectedLocation) {
      result = result.filter(program => 
        program.location && program.location.toUpperCase() === selectedLocation.toUpperCase()
      );
    }
    
    // Filtrar por modalidade (case insensitive)
    if (selectedMode) {
      result = result.filter(program => 
        program.mode && program.mode.toUpperCase() === selectedMode.toUpperCase()
      );
    }
    
    // Aplicar busca fuzzy
    if (search.trim()) {
      return fuzzyFilter(result, search, ['title', 'program_type', 'mode', 'location']);
    }
    
    return result;
  }, [programs, selectedLocation, selectedMode, search]);

  const handleSelectProgram = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  const clearSelection = () => {
    setSelectedId(null);
  };

  const finalizeExperience = (mode: 'simplificada' | 'completa') => {
    setExperienceMode(mode);
    localStorage.setItem('experienceMode', mode);
    // Sincronizar com o hook useMode
    localStorage.setItem('mode', mode === 'simplificada' ? 'simplified' : 'full');
    setIsOnboarded(true);
    setShowExperienceModal(false);
    // Redirecionar conforme a escolha
    if (mode === 'simplificada') {
      window.location.href = '/planejador';
    } else {
      window.location.href = '/';
    }
  };

  const handleSubmit = () => {
    if (!selectedId) return;
    setSelectedPrograms([selectedId]);
    if (experienceMode) {
      finalizeExperience(experienceMode);
    } else {
      setModalExperienceMode(null);
      setShowExperienceModal(true);
    }
  };
  
  const selectedProgram = programs.find((p: any) => p.id_ref === selectedId);

  return (
    <>
      <div className="min-h-screen w-full flex items-start justify-center bg-gradient-to-br from-background to-muted/30 p-4 pt-6 sm:pt-8 sm:items-start sm:pt-12">
        <div className="w-full max-w-2xl h-auto max-h-[calc(100vh-2rem)] sm:h-[calc(100vh-6rem)] flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-3 mb-4 sm:mb-5 px-1"
          >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              CADEE
            </h1>
            <p className="text-xs text-muted-foreground">
              Catálogo Auxiliar de Disciplinas e Estruturação de Estudos
            </p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden flex flex-col flex-1 max-h-[calc(100vh-10rem)] sm:max-h-[none] sm:h-full"
        >
          <div className="p-4 sm:p-5 md:p-6 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-base font-semibold text-foreground mb-2 sm:mb-3">
              Selecione seu curso
            </h2>

            {/* Filtros */}
            <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
              {/* Barra de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pesquisar curso..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border/70 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all text-sm"
                />
              </div>
              
              {/* Filtros de localização e modalidade */}
              <div className="grid grid-cols-2 gap-3">
                <LocationFilter 
                  locations={locations} 
                  selectedLocation={selectedLocation} 
                  onSelect={setSelectedLocation} 
                />
                
                <ModeFilter 
                  modes={modes}
                  selectedMode={selectedMode}
                  onSelect={setSelectedMode}
                />
              </div>
            </div>

            {/* Course List */}
            <div className="flex-1 min-h-0 overflow-y-auto pb-4 -mx-2 px-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-12 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando cursos...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <p className="text-destructive">Erro ao carregar os cursos</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente novamente mais tarde</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {filteredPrograms.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8"
                      >
                        <p className="text-muted-foreground">Nenhum curso encontrado</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          Tente ajustar os filtros de busca
                        </p>
                      </motion.div>
                    ) : (
                      filteredPrograms.slice(0, 50).map((program, index) => {
                        const isSelected = selectedId === program.id_ref;
                        return (
                          <motion.button
                            key={program.id_ref}
                            layout
                            onClick={() => handleSelectProgram(program.id_ref)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0,
                              transition: { 
                                delay: Math.min(index * 0.03, 0.3),
                                duration: 0.3
                              }
                            }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "w-full flex items-start p-4 rounded-xl text-left transition-all",
                              "border-2",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-transparent bg-muted/50 hover:bg-muted"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div>
                                <p className="font-medium text-foreground text-sm truncate">
                                  {program.title}
                                </p>
                                {/* Mostrar a área apenas se não for um código de turno */}
                                {program.program_type === 'BACHARELADO' && 
                                 program.time_code && 
                                 !['MT', 'N', 'T', 'M', 'I', 'MN', 'TN', 'MTN'].includes(program.time_code) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {program.time_code}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                {program.program_type && (
                                  <span className="inline-flex items-center text-xs text-muted-foreground">
                                    {program.program_type === 'BACHARELADO' ? (
                                      <GraduationCap className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                                    ) : program.program_type === 'LICENCIATURA' ? (
                                      <School className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                                    ) : (
                                      <BookOpen className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                                    )}
                                    {program.program_type}
                                  </span>
                                )}
                                {program.time_code && (program.time_code === 'MT' || program.time_code === 'N' || program.time_code === 'T' || program.time_code === 'M' || program.time_code === 'I' || program.time_code === 'MN' || program.time_code === 'TN' || program.time_code === 'MTN') && (
                                  <span className="inline-flex items-center text-xs text-muted-foreground">
                                    {program.time_code === 'M' || program.time_code === 'MT' ? (
                                      <Sun className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                                    ) : program.time_code === 'T' ? (
                                      <Sunset className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                                    ) : program.time_code === 'N' ? (
                                      <Moon className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                                    ) : (
                                      <Clock className="w-3 h-3 mr-1.5 text-muted-foreground/70" />
                                    )}
                                    {getTurnoNome(program.time_code)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex-shrink-0 ml-3 flex items-center h-5">
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                isSelected 
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground/30"
                              )}>
                                {isSelected && (
                                  <motion.span
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-primary-foreground"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </motion.span>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Bottom Section - Fixed */}
            <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/50 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6 -mb-4 sm:mb-0 sm:mt-auto">
              {/* Selected Program Preview */}
              {selectedProgram && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50 relative"
                >
                  <button
                    onClick={clearSelection}
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remover seleção"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Curso selecionado:</h3>
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mr-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{selectedProgram.title}</p>
                      {selectedProgram.program_type === 'BACHARELADO' && 
                       selectedProgram.time_code && 
                       !['MT', 'N', 'T', 'M', 'I', 'MN', 'TN', 'MTN'].includes(selectedProgram.time_code) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedProgram.time_code}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {selectedProgram.program_type}
                        {selectedProgram.time_code && (selectedProgram.time_code === 'MT' || selectedProgram.time_code === 'N' || selectedProgram.time_code === 'T' || selectedProgram.time_code === 'M' || selectedProgram.time_code === 'I' || selectedProgram.time_code === 'MN' || selectedProgram.time_code === 'TN' || selectedProgram.time_code === 'MTN') && (
                          ` • ${getTurnoNome(selectedProgram.time_code)}`
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                onClick={handleSubmit}
                disabled={!selectedId}
                whileTap={{ scale: selectedId ? 0.98 : 1 }}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                  selectedId
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                {selectedId ? 'Continuar' : 'Selecione um curso'}
                {selectedId && (
                  <Check className="w-4 h-4" />
                )}
              </motion.button>

              <p className="text-[11px] sm:text-xs text-center text-muted-foreground mt-2 sm:mt-3">
                Seus dados são salvos localmente no navegador
              </p>
            </div>
          </div>
          
          </motion.div>
        </div>
      </div>

      {/* Modal de escolha de experiência */}
      <AnimatePresence>
        {showExperienceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowExperienceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border/60 p-6" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Como você quer usar o CADEE?</p>
                  <p className="text-sm text-muted-foreground">Você pode alterar depois nas Configurações.</p>
                </div>
                <button onClick={() => setShowExperienceModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 mb-4">
                <label className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  modalExperienceMode === 'simplificada' ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted"
                )}>
                  <input
                    type="radio"
                    name="experience-modal"
                    value="simplificada"
                    checked={modalExperienceMode === 'simplificada'}
                    onChange={() => setModalExperienceMode('simplificada')}
                    className="mt-1 accent-primary"
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Versão simplificada</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Ir direto para o Planejador. Ideal para começar rápido.</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  modalExperienceMode === 'completa' ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted"
                )}>
                  <input
                    type="radio"
                    name="experience-modal"
                    value="completa"
                    checked={modalExperienceMode === 'completa'}
                    onChange={() => setModalExperienceMode('completa')}
                    className="mt-1 accent-primary"
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">Versão completa</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Acesso a todos os recursos. Sempre pode mudar depois.</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowExperienceModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
                >
                  Voltar
                </button>
                <button
                  onClick={() => modalExperienceMode && finalizeExperience(modalExperienceMode)}
                  disabled={!modalExperienceMode}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-semibold",
                    modalExperienceMode
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
