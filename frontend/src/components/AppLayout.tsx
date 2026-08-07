import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Wallet, Tags, CreditCard, Repeat, Target, BarChart3, FileUp, Shield, Moon, Sun, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Lançamentos', icon: ArrowLeftRight, end: false },
  { to: '/accounts', label: 'Contas', icon: Wallet, end: false },
  { to: '/credit-cards', label: 'Cartões', icon: CreditCard, end: false },
  { to: '/goals', label: 'Metas', icon: Target, end: false },
  { to: '/automations', label: 'Automações', icon: Repeat, end: false },
  { to: '/reports', label: 'Relatórios', icon: BarChart3, end: false },
  { to: '/import-export', label: 'Importar/Exportar', icon: FileUp, end: false },
  { to: '/security', label: 'Segurança', icon: Shield, end: false },
  { to: '/categories', label: 'Categorias', icon: Tags, end: false },
];

export default function AppLayout() {
  const logout = useAuthStore((s) => s.logout);
  const { dark, toggle } = useThemeStore();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141a] p-4 flex flex-col">
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="text-xl font-bold text-brand-600">Fingest</div>
          <button
            onClick={toggle}
            title={dark ? 'Tema claro' : 'Tema escuro'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <LogOut size={18} />
          Sair
        </button>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
