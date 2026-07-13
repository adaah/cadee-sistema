// Interface para dados de carga horária extraídos do histórico
export interface WorkloadData {
  mandatory: { required: number; completed: number; pending: number };
  elective: { required: number; completed: number; pending: number };
  complementary: { required: number; completed: number; pending: number };
  total: { required: number; completed: number; pending: number };
}

// Interface para dados de disciplinas por semestre
export interface SemesterDisciplineData {
  approved: string[];
  total: string[];
}

// Regex auxiliar para códigos de disciplina (usado em fallbacks)
export const codeRegex = /[A-Z]{3,}\d{2,}[A-Z]?/g;

// Função legada para capturar códigos aprovados (semestres não importam)
export function extractApprovedCodes(text: string): string[] {
  const approved = new Set<string>();
  const lines = text.split(/\n+/).filter(l => l.trim());

  // Padrões para identificar disciplinas aprovadas (permite espaços entre letras e números)
  const patterns = [
    /([A-Z]{3,4}\d{3,4})[\s\*]*.*?(APROVADO|APROV|APROVADA|DISPENSADO|DISPENSADA|DISP|CUMP|CUMPRIU)/i,
    /([A-Z]{3,4}\s*\d{3,4})[\s\*]*.*?(APROVADO|APROV|APROVADA|DISPENSADO|DISPENSADA|DISP|CUMP|CUMPRIU)/i,
  ];

  for (const line of lines) {
    const cleanLine = line.trim();
    for (const pattern of patterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        const code = match[1].replace(/\s/g, '').toUpperCase();
        approved.add(code);
        break;
      }
    }
  }

  // Equivalências explícitas: "Cumpriu CODE"
  const eqRegex = /CUMPRIU\s+([A-Z]{3,}\s*\d{2,}[A-Z]?)/gi;
  let eqMatch;
  while ((eqMatch = eqRegex.exec(text)) !== null) {
    approved.add(eqMatch[1].replace(/\s/g, ''));
  }

  return Array.from(approved);
}

// Função para extrair carga horária da tabela do histórico
export function extractWorkloadFromHistory(text: string): WorkloadData | null {
  // Procura pela seção de carga horária e captura todo o conteúdo seguinte
  const workloadMatch = text.match(/Carga\s+Horária[\s\S]*/i);
  if (!workloadMatch) return null;
  
  const workloadText = workloadMatch[0];
  
  // Procura por todos os números seguidos de "h" no texto
  const numbers = workloadText.match(/(\d+)\s*h/gi);
  
  if (!numbers || numbers.length < 9) return null;
  
  // Extrai apenas os números
  const values = numbers.map(n => parseInt(n.replace(/\s*h/i, '')));
  
  // Interpretação baseada no padrão identificado:
  // Ordem dos valores: [Total Exigido, Optativas Exigido, Complementares Exigido, Complementares Integralizado, Optativas Pendente, Optativas Integralizado1, Optativas Integralizado2, Obrigatórias Integralizado, Obrigatórias Pendente]
  
  const mandatoryCompleted = values[7];
  const mandatoryRequired = values[0];
  
  // Para optativas, usa o menor entre os valores middle (posições 5 e 6)
  const electiveCompleted = Math.min(values[5], values[6]);
  const electiveRequired = values[1];
  
  // Se o menor valor foi usado para optativas, complementares é 0, senão usa o valor 3
  const complementaryCompleted = values[5] === electiveCompleted ? 0 : values[3];
  const complementaryRequired = values[2];
  
  const totalCompleted = mandatoryCompleted + electiveCompleted + complementaryCompleted;
  const totalRequired = mandatoryRequired + electiveRequired + complementaryRequired;
  const totalPending = totalRequired - totalCompleted;
  
  return {
    mandatory: {
      required: mandatoryRequired,
      completed: mandatoryCompleted,
      pending: mandatoryRequired - mandatoryCompleted
    },
    elective: {
      required: electiveRequired,
      completed: electiveCompleted,
      pending: electiveRequired - electiveCompleted
    },
    complementary: {
      required: complementaryRequired,
      completed: complementaryCompleted,
      pending: complementaryRequired - complementaryCompleted
    },
    total: {
      required: totalRequired,
      completed: totalCompleted,
      pending: totalPending
    }
  };
}

// Função para extrair disciplinas por semestre do histórico
export function extractDisciplinesBySemester(text: string): Map<string, SemesterDisciplineData> {
  const semesterData = new Map<string, SemesterDisciplineData>();
  const codeRegex = /[A-Z]{3,}\d{2,}[A-Z]?/g;
  const approvedTokens = ['APR', 'CUMP', 'DISP'];
  const rejectedTokens = ['REP', 'REPF', 'REPMF', 'TRANC', 'CANC'];
  
  // Divide o texto em blocos por período (2022.1, 2022.2, etc.)
  const periodBlocks = text.split(/(\d{4}\.\d+)/);
  
  for (let i = 1; i < periodBlocks.length; i += 2) {
    const period = periodBlocks[i];
    const content = periodBlocks[i + 1] || '';
    
    if (!content) continue;
    
    // Junta o período e o conteúdo para análise completa
    const fullBlock = period + content;
    
    // Encontra todos os códigos neste bloco
    const codes = fullBlock.match(codeRegex) || [];
    if (codes.length === 0) continue;
    
    // Verifica o status das disciplinas neste período
    const approved: string[] = [];
    const rejected: string[] = [];
    const others: string[] = [];
    
    codes.forEach(code => {
      // Procura pelo código seguido de status no texto
      const codeIndex = fullBlock.indexOf(code);
      if (codeIndex === -1) return;
      
      // Pega um trecho do texto após o código para encontrar o status
      const textAfterCode = fullBlock.substring(codeIndex, codeIndex + 50);
      
      const isApproved = approvedTokens.some(token => textAfterCode.includes(token));
      const isRejected = rejectedTokens.some(token => textAfterCode.includes(token));
      
      if (isApproved) {
        approved.push(code);
      } else if (isRejected) {
        rejected.push(code);
      } else {
        others.push(code);
      }
    });
    
    // Armazena os dados do período
    semesterData.set(period, {
      approved: approved,
      total: codes
    });
  }
  
  return semesterData;
}

// Função específica para parsear o formato real do histórico UFBA
export function parseUFBAHistory(text: string): { codes: string[], semesters: Map<string, { approved: number, failed: number, dropped: number, notDone: number }> } {
  const approved = new Set<string>();
  const semesters = new Map<string, { approved: number, failed: number, dropped: number, notDone: number }>();
  
  // O texto está vindo como um bloco contínuo. Vamos procurar pelos padrões diretamente no texto.
  
  // Regex para encontrar disciplinas no formato contínuo
  // Procura por: NOME_DISCIPLINA   Professor(horas)   SITUAÇÃO   CODIGO   CH   NOTA
  const disciplinePattern = /([A-ZÀ-Ú\s]+[A-ZÀ-Ú])\s+([A-ZÀ-Ú\s.]+?\(\d+h\))\s+(APR|CUMP|DISP|REP|REPF|REPMF|TRANC|CANC)\s+([A-Z]{3,}\d{2,}[A-Z]?)\s+(\d+)\s+([\d.]+|--)/gi;
  
  let match;
  const disciplines = [];
  
  while ((match = disciplinePattern.exec(text)) !== null) {
    const disciplineName = match[1].trim();
    const professor = match[2].trim();
    const status = match[3].trim();
    const code = match[4].trim();
    const ch = match[5].trim();
    const grade = match[6].trim();
    
    // Procura pelo semestre mais próximo antes desta disciplina
    const beforeMatch = text.substring(0, match.index);
    const semesterMatches = beforeMatch.match(/(\d{4}\.\d+)/g);
    const currentSemester = semesterMatches ? semesterMatches[semesterMatches.length - 1] : '';
    
    disciplines.push({
      semester: currentSemester,
      code,
      status,
      disciplineName,
      professor,
      ch,
      grade
    });
    
    if (status === 'APR' || status === 'CUMP' || status === 'DISP') {
      approved.add(code);
    }
  }
  
  // Agrupa disciplinas por semestre
  disciplines.forEach(discipline => {
    if (!discipline.semester) return;
    
    if (!semesters.has(discipline.semester)) {
      semesters.set(discipline.semester, { approved: 0, failed: 0, dropped: 0, notDone: 0 });
    }
    
    const semesterData = semesters.get(discipline.semester)!;
    
    if (discipline.status === 'APR' || discipline.status === 'CUMP' || discipline.status === 'DISP') {
      semesterData.approved++;
    } else if (discipline.status === 'TRANC') {
      semesterData.dropped++;
    } else if (discipline.status === 'REP' || discipline.status === 'REPF' || discipline.status === 'REPMF') {
      semesterData.failed++;
    } else {
      // CANC e outros status são tratados como não feitas
      semesterData.notDone++;
    }
  });
  
  // Se não encontrou linhas no formato estruturado, tenta fallback
  if (semesters.size === 0) {
    return parseHistoryText(text);
  }
  
  return { 
    codes: Array.from(approved), 
    semesters 
  };
}

// Função principal para extrair disciplinas aprovadas (compatível com tela Disciplinas)
export function parseHistoryText(text: string): { codes: string[], semesters: Map<string, { approved: number, failed: number, dropped: number, notDone: number }> } {
  const approved = new Set<string>();
  const semesters = new Map<string, { approved: number, failed: number, dropped: number, notDone: number }>();
  
  const codeRegex = /[A-Z]{3,}\d{2,}[A-Z]?/g;
  const approvedTokens = ['APR', 'CUMP', 'DISP'];
  const rejectedTokens = ['REP', 'REPF', 'REPMF', 'TRANC', 'CANC'];
  
  // Divide o texto em blocos por período (2022.1, 2022.2, etc.)
  const periodBlocks = text.split(/(\d{4}\.\d+)/);
  
  for (let i = 1; i < periodBlocks.length; i += 2) {
    const period = periodBlocks[i];
    const content = periodBlocks[i + 1] || '';
    
    if (!content) continue;
    
    // Junta o período e o conteúdo para análise completa
    const fullBlock = period + content;
    
    // Encontra todos os códigos neste bloco
    const codes = fullBlock.match(codeRegex) || [];
    if (codes.length === 0) continue;
    
    // Verifica se o bloco contém status aprovado
    const hasRejected = rejectedTokens.some(token => fullBlock.includes(token));
    const hasApproved = approvedTokens.some(token => fullBlock.includes(token));
    
    // Se tem aprovação e não tem rejeição, adiciona todos os códigos do bloco
    if (hasApproved && !hasRejected) {
      codes.forEach(c => approved.add(c));
    }
    
    // Contabiliza dados do semestre
    const semesterData = semesters.get(period) || { approved: 0, failed: 0, dropped: 0, notDone: 0 };
    
    codes.forEach(code => {
      const codeIndex = fullBlock.indexOf(code);
      if (codeIndex === -1) return;
      
      const textAfterCode = fullBlock.substring(codeIndex, codeIndex + 50);
      
      if (approvedTokens.some(token => textAfterCode.includes(token))) {
        semesterData.approved++;
        approved.add(code);
      } else if (rejectedTokens.some(token => textAfterCode.includes(token))) {
        if (textAfterCode.includes('TRANC') || textAfterCode.includes('CANC')) {
          semesterData.dropped++;
        } else {
          semesterData.failed++;
        }
      } else {
        semesterData.notDone++;
      }
    });
    
    semesters.set(period, semesterData);
  }
  
  // Processa blocos sem período claro (últimas disciplinas, quebras de página)
  const disciplinePattern = /([A-ZÀ-Ú][^()]*[A-ZÀ-Ú])\s*\([^)]*\)\s*(APR|CUMP|DISP|REP|REPF|TRANC|CANC)\s+([A-Z]{3,}\d{2,}[A-Z]?)/gi;
  let match;
  while ((match = disciplinePattern.exec(text)) !== null) {
    const status = match[2];
    const code = match[3];
    
    if (approvedTokens.includes(status) && !rejectedTokens.includes(status)) {
      approved.add(code);
    }
  }
  
  // Padrão alternativo: status no final (formato PDF extraído)
  const altPattern = /([A-ZÀ-Ú][^()]*[A-ZÀ-Ú])\s*\([^)]*\)\s+([A-Z]{3,}\d{2,}[A-Z]?)\s+\d+\s+[\d.]+\s+(APR|CUMP|DISP|REP|REPF|TRANC|CANC)/gi;
  while ((match = altPattern.exec(text)) !== null) {
    const code = match[2];
    const status = match[3];
    
    if (approvedTokens.includes(status) && !rejectedTokens.includes(status)) {
      approved.add(code);
    }
  }
  
  // Processamento fallback para linhas individuais (formatos não estruturados)
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const codes = line.match(codeRegex) || [];
    if (codes.length === 0) continue;

    const hasRejected = rejectedTokens.some(token => line.includes(token));
    const hasApproved = approvedTokens.some(token => line.includes(token));
    
    if (hasApproved && !hasRejected) {
      codes.forEach(c => approved.add(c));
    }
  }

  // Equivalências: "Cumpriu <CODE>" ou "Cumpriu CODE - ..."
  const eqRegex = /Cumpriu\s+([A-Z]{3,}\d{2,}[A-Z]?)/gi;
  let eqMatch;
  while ((eqMatch = eqRegex.exec(text)) !== null) {
    approved.add(eqMatch[1]);
  }
  
  return { 
    codes: Array.from(approved), 
    semesters 
  };
}

// Função completa que extrai todos os dados do histórico
export function parseCompleteHistory(text: string): {
  codes: string[];
  semesters: Map<string, { approved: number, failed: number, dropped: number, notDone: number }>;
  workload: WorkloadData | null;
  disciplinesBySemester: Map<string, SemesterDisciplineData>;
} {
  // Tenta primeiro com o parser específico do formato UFBA
  const codesData = parseUFBAHistory(text);
  // Usa também captura simples de aprovadas (legada) e faz união
  const approvedOnly = extractApprovedCodes(text);
  const mergedCodes = new Set<string>([...codesData.codes, ...approvedOnly]);
  const workload = extractWorkloadFromHistory(text);
  const disciplinesBySemester = extractDisciplinesBySemester(text);
  
  return {
    codes: Array.from(mergedCodes),
    semesters: codesData.semesters,
    workload,
    disciplinesBySemester
  };
}
