import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NewSemesterModalProps {
  open: boolean;
  planningTerm: string | null;
  currentTerm: string | null;
  unresolvedCodes: string[];
  canAdvance: boolean;
  onAdvance: () => void;
}

export function NewSemesterModal({
  open,
  planningTerm,
  currentTerm,
  unresolvedCodes,
  canAdvance,
  onAdvance,
}: NewSemesterModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border/60 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Novo semestre disponível</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  O semestre letivo mudou de <strong>{planningTerm}</strong> para <strong>{currentTerm}</strong>.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-sm text-foreground leading-relaxed">
                Para iniciar o planejamento do novo semestre, finalize as disciplinas da grade anterior:
                remova cada turma ou marque o <strong>resultado</strong> (cursada, reprovada ou trancada).
              </p>
              <p className="text-xs text-muted-foreground">
                Suas marcações de progresso serão mantidas. Apenas a grade de planejamento será limpa ao avançar.
              </p>

              {unresolvedCodes.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {unresolvedCodes.length} disciplina{unresolvedCodes.length > 1 ? 's' : ''} pendente{unresolvedCodes.length > 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {unresolvedCodes.map((code) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {canAdvance && (
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-3 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800 dark:text-green-200">
                    Todas as disciplinas foram finalizadas. Você pode avançar para o semestre {currentTerm}.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              {!canAdvance && (
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
                >
                  Resolver na tela inicial
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={onAdvance}
                disabled={!canAdvance}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Iniciar semestre {currentTerm}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
