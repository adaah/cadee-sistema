import { useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useApp } from '@/contexts/AppContext';
import { useMySections } from '@/hooks/useMySections';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { Sun, Moon, Trash2, RotateCcw, User, Download, Upload, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

  const handleExport = async () => {
    const data = exportSettings();
    const blob = new Blob([data], { type: 'application/json' });
    const fileName = `cadee-configuracoes-${new Date().toISOString().split('T')[0]}.json`;
    const file = new File([blob], fileName, { type: 'application/json' });

    // Try to use Web Share API for mobile sharing
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Configurações CADEE',
          text: 'Minhas configurações do CADEE'
        });
        toast({
          title: "Exportação concluída",
          description: "Suas configurações foram compartilhadas."
        });
        return;
      } catch (error) {
        // User cancelled or share failed, fall back to download
        if ((error as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
        }
      }
    }

    // Fallback to traditional download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
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
          {/* Courses */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-card-foreground">Meu curso</h3>
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
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja mudar de curso? Todos os dados serão perdidos e as informações serão reiniciadas.')) {
                  handleAddCourse();
                }
              }}
              className="w-full py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Mudar Curso
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
            <p className="mt-1">
              Desenvolvido por{' '}
              <a
                href="https://github.com/FormigTeen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Matheus Freitas (FormigTeen)
              </a>
              {' '}e{' '}
              <a
                href="https://github.com/adaah"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Eduarda Almeida (adaah)
              </a>
            </p>
            <p className="mt-1">
              Orientador:{' '}
              <span className="text-primary">
                Rodrigo Rocha
              </span>
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Configuracoes;
