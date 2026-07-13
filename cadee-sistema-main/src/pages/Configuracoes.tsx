import { useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useApp } from '@/contexts/AppContext';
import { useMySections } from '@/hooks/useMySections';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { Sun, Moon, Trash2, RotateCcw, User, Download, Upload, Check, X, Layers } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMode } from '@/hooks/useMode';

const Configuracoes = () => {
  const { 
    theme, 
    toggleTheme, 
    setIsOnboarded,
    completedDisciplines,
    exportSettings,
    importSettings
  } = useApp();
  const { clearSections } = useMySections();
  
  const { myPrograms, removeProgram } = useMyPrograms();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const hasPrograms = myPrograms.length > 0;
  const { mode, setMode, isSimplified, isFull } = useMode();

  const handleResetAll = () => {
    if (confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleClearSchedule = () => {
    clearSections();
    toast({
      title: "Grade limpa",
      description: "Todas as turmas foram removidas do planejador."
    });
  };

  const handleAddCourse = () => {
    // Reabre o onboarding para adicionar mais um curso
    setIsOnboarded(false);
  };

  const handleExport = () => {
    const data = exportSettings();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadee-configuracoes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: "Suas configurações foram salvas em um arquivo JSON."
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importSettings(content);
      
      if (success) {
        setImportSuccess(true);
        toast({
          title: "Importação concluída",
          description: "Suas configurações foram restauradas com sucesso."
        });
        setTimeout(() => setImportSuccess(false), 2000);
      } else {
        toast({
          title: "Erro na importação",
          description: "O arquivo selecionado não é válido.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Configurações
          </h1>
          <p className="text-muted-foreground">
            Personalize sua experiência no portal
          </p>
        </div>

        <div className="space-y-6">
          {/* Mode */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">Modo de Uso</h3>
                <p className="text-sm text-muted-foreground">Escolha como você quer usar o CADEE</p>
              </div>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setMode('simplified')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                  mode === 'simplified'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>Simplificado</span>
              </button>
              <button
                onClick={() => setMode('full')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                  mode === 'full'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>Completo</span>
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {isFull
                ? 'Acompanhe seu curso por completo: registre cursadas, filtre por disponíveis, gerencie favoritos e monte sua grade com as turmas.'
                : 'Modo enxuto para a matrícula no SIGAA: pesquise disciplinas e turmas, favorite o essencial e siga direto ao que importa (sem marcar cursadas ou usar filtros avançados).'}
            </p>
          </div>

          {/* Courses */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">Meus Cursos</h3>
                {!hasPrograms && (
                  <p className="text-sm text-muted-foreground">Nenhum curso adicionado</p>
                )}
              </div>
            </div>
            {/* Lista de cursos como tags */}
            {hasPrograms && (
              <div className="flex flex-wrap gap-2 mb-4">
                {myPrograms.map((program) => (
                  <span
                    key={program.id_ref}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-xs text-foreground"
                    title={`${program.title} • ${program.location}`}
                  >
                    <span className="max-w-[220px] truncate">{program.title}</span>
                    <button
                      onClick={() => removeProgram(program.id_ref)}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Remover curso ${program.title}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={handleAddCourse}
              className="w-full py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Adicionar Curso
            </button>
          </div>

          {/* Theme */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-card-foreground mb-4">Aparência</h3>
            <div className="flex gap-3">
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                  theme === 'light' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span>Claro</span>
              </button>
              <button
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all ${
                  theme === 'dark' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span>Escuro</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-card-foreground mb-4">Estatísticas</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Disciplinas cursadas</span>
                <span className="font-medium text-card-foreground">{completedDisciplines.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dados salvos localmente</span>
                <span className="font-medium text-success">Ativo</span>
              </div>
            </div>
          </div>

          {/* Export/Import */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-card-foreground mb-4">Backup & Sincronização</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Exporte suas configurações para usar em outro dispositivo ou faça backup dos seus dados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Exportar</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                  importSuccess
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {importSuccess ? <Check className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                <span>{importSuccess ? 'Importado!' : 'Importar'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-card-foreground mb-4">Ações</h3>
            <div className="space-y-3">
              <button
                onClick={handleClearSchedule}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>Limpar grade horária</span>
              </button>
              <button
                onClick={handleResetAll}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Resetar todos os dados</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>CADEE - Catálogo Auxiliar de Disciplinas e Estruturação de Estudos</p>
            <p className="mt-1">Desenvolvido com ❤️ para estudantes</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Configuracoes;
