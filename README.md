# CADEE - Sistema de Planejamento Acadêmico

Sistema web para planejamento e gerenciamento de grade curricular, desenvolvido para estudantes universitários da UFBA. O sistema permite visualizar disciplinas, planejar horários, acompanhar progresso acadêmico e importar histórico escolar.

## 🚀 Tecnologias

### Frontend
- **React 18.3.1** - Biblioteca UI
- **TypeScript 5.8.3** - Tipagem estática
- **Vite 5.4.19** - Build tool e dev server
- **React Router DOM 6.30.1** - Roteamento

### UI & Estilização
- **TailwindCSS 3.4.17** - Framework CSS
- **Radix UI** - Componentes acessíveis e compostáveis
- **shadcn/ui** - Componentes UI baseados em Radix
- **Framer Motion 12.24.12** - Animações
- **Lucide React 0.462.0** - Ícones

### Estado & Dados
- **Jotai 2.16.0** - Gerenciamento de estado atômico
- **TanStack Query 5.83.0** - Cache e sincronização de servidor
- **Immer 11.1.3** - Imutabilidade
- **Axios 1.13.2** - Cliente HTTP

### Utilitários
- **date-fns 3.6.0** - Manipulação de datas
- **Fuse.js 7.1.0** - Busca fuzzy
- **Ramda 0.32.0** - Programação funcional
- **PDF.js 5.4.530** - Processamento de PDFs
- **Recharts 2.15.4** - Gráficos

## 📋 Funcionalidades

### 🏠 Página Inicial (Home)
- **Controle do Semestre**: Visualização das disciplinas planejadas para o período atual
- **Meu Progresso**: Acompanhamento do progresso acadêmico com gráficos e estatísticas
- **Resumo de Carga Horária**: Breakdown por tipo (obrigatórias, optativas, complementares)
- **Transição de Semestre**: Avanço automático para o próximo período com validação de pré-requisitos

### 📚 Catálogo de Disciplinas
- **Busca Inteligente**: Filtro por nome ou código de disciplina
- **Filtros Avançados**: 
  - Por tipo (obrigatórias, optativas, gerais)
  - Por status (disponíveis, cursadas, favoritos, ofertadas)
  - Por semestre
- **Visualização por Semestre**: Organização por período do curso
- **Indicadores de Status**:
  - 🟢 Cursada
  - 🟡 Disponível (pré-requisitos atendidos)
  - ⚪ Bloqueada (pré-requisitos pendentes)
- **Importação de Histórico**: Upload de PDF ou colagem de texto do histórico escolar
- **Detalhes da Disciplina**: Informações completas incluindo pré-requisitos, equivalências e co-requisitos
- **Sistema de Favoritos**: Marcação de disciplinas de interesse

### 📅 Planejador de Grade
- **Grade Horária Interativa**: Visualização em formato de matriz (dias × horários)
- **Adição de Turmas**: Seleção de turmas com visualização de conflitos de horário
- **Análise de Disponibilidade**:
  - Vagas totais, solicitadas e aceitas
  - Vagas reservadas para o curso
  - Nível de competição (baixo, médio, alto)
- **Filtros**:
  - Por turno (manhã, tarde, noite)
  - Por dia da semana
  - Por professor
- **Detalhes da Turma**: Informações completas incluindo professores, horários e local
- **Validação de Pré-requisitos**: Bloqueio automático de disciplinas sem pré-requisitos atendidos
- **Sistema de Favoritos**: Marcação de turmas de interesse

### ⚙️ Configurações
- **Seleção de Curso**: Escolha do programa de graduação
- **Modo de Experiência**:
  - **Simplificado**: Funcionalidades básicas de visualização
  - **Completo**: Recursos avançados de planejamento e gestão
- **Tema**: Suporte a modo claro/escuro
- **Exportar/Importar Configurações**: Backup e restauração de dados

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── common/         # Componentes compartilhados
│   ├── disciplines/    # Componentes específicos de disciplinas
│   ├── layout/         # Layout da aplicação
│   ├── planner/        # Componentes do planejador
│   ├── progress/       # Componentes de progresso
│   ├── semester/       # Componentes de semestre
│   └── ui/             # Componentes UI base (shadcn/ui)
├── contexts/           # Contextos globais
│   └── AppContext.tsx  # Estado global da aplicação
├── hooks/              # Hooks personalizados
│   ├── useApi.ts       # Integração com API
│   ├── useMyCourses.ts # Cursos do usuário
│   ├── useMySections.ts # Turmas planejadas
│   ├── useMyPrograms.ts # Programas do usuário
│   └── ...
├── lib/                # Utilitários e helpers
├── pages/              # Páginas da aplicação
│   ├── Index.tsx       # Página inicial
│   ├── Disciplinas.tsx # Catálogo de disciplinas
│   ├── Planejador.tsx  # Planejador de grade
│   ├── Configuracoes.tsx # Configurações
│   └── NotFound.tsx    # Página 404
├── services/           # Serviços externos
│   └── api.ts          # Cliente API SIGAA
└── utils/              # Funções utilitárias
```

## 🔌 Integração com API

O sistema utiliza a API estática do SIGAA (Sistema Integrado de Gestão de Atividades Acadêmicas):

- **Base URL**: `https://FormigTeen.github.io/sigaa-static/api/v1`
- **Endpoints**:
  - `/programs.json` - Lista de programas de graduação
  - `/courses.json` - Índice de disciplinas
  - `/course/{code}.json` - Detalhes de disciplina
  - `/course/{code}/sections.json` - Turmas de uma disciplina
  - `/sections.json` - Todas as turmas disponíveis

### Dados Sincronizados
- Programas de graduação da UFBA
- Grade curricular completa
- Turmas ofertadas no período atual
- Pré-requisitos e equivalências
- Vagas e disponibilidade

## 🎯 Modos de Experiência

### Modo Simplificado
- Visualização básica de disciplinas
- Consulta ao catálogo
- Visualização de progresso

### Modo Completo
- Planejamento de grade horária
- Marcação de disciplinas cursadas
- Sistema de favoritos
- Importação de histórico
- Análise de competição por vagas
- Transição automática de semestre

## 💾 Persistência de Dados

O sistema utiliza `localStorage` para persistir:
- Disciplinas concluídas
- Status de disciplinas por semestre
- Turmas planejadas
- Programas selecionados
- Configurações de tema e modo
- Dados de progresso importados

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Build para Produção
```bash
# Build
npm run build

# Preview do build
npm run preview
```

## 🎨 Características Técnicas

### Performance
- **Code Splitting**: Divisão automática de código por rota
- **Lazy Loading**: Carregamento sob demanda de componentes
- **Query Caching**: Cache inteligente de requisições API
- **Optimização de Dependências**: Pré-bundling de dependências frequentes

### Acessibilidade
- Componentes Radix UI (WCAG compliant)
- Suporte a navegação por teclado
- Tags ARIA apropriadas
- Contraste de cores adequado

### Responsividade
- Design mobile-first
- Layout adaptativo para diferentes tamanhos de tela
- Navegação otimizada para dispositivos móveis

## 📝 Funcionalidades Especiais

### Importação de Histórico
- Suporte a upload de PDF
- Parse automático de disciplinas aprovadas
- Detecção de carga horária
- Visualização prévia dos dados importados

### Análise de Competição
- Cálculo automático do nível de disputa
- Indicadores visuais (baixo/médio/alto)
- Consideração de vagas reservadas
- Histórico de solicitações

### Transição de Semestre
- Validação automática de pré-requisitos
- Detecção de disciplinas não cursadas
- Sugestão de ajustes
- Preservação de histórico

## 🛠️ Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build para produção
npm run build:dev # Build em modo desenvolvimento
npm run lint     # Executar ESLint
npm run preview  # Preview do build de produção
```

## 📄 Licença

Este projeto é privado e confidencial.

## 👥 Desenvolvimento

Desenvolvido para estudantes da Universidade Federal da Bahia (UFBA) como ferramenta de auxílio ao planejamento acadêmico.
