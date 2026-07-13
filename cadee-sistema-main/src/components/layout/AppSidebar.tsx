import { Home, BookOpen, Calendar, Settings, Sun, Moon, Github } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Início', url: '/', icon: Home },
  { title: 'Disciplinas', url: '/disciplinas', icon: BookOpen },
  { title: 'Planejador', url: '/planejador', icon: Calendar },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { theme, toggleTheme } = useApp();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary">CADEE</h1>
        <p className="text-xs text-muted-foreground mt-1">Catálogo Auxiliar de Disciplinas e Estruturação de Estudos</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.url}>
              <NavLink
                to={item.url}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground
                  hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                  transition-all duration-200"
                activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-5 h-5" />
                <span className="text-sm">Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-5 h-5" />
                <span className="text-sm">Claro</span>
              </>
            )}
          </button>
          
          <a
            href="https://github.com/FormigTeen/sigaa-static"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </aside>
  );
}
