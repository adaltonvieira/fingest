import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  CreditCard,
  Repeat,
  Target,
  BarChart3,
  FileUp,
  Shield,
  Moon,
  Sun,
  LogOut,
  Plus,
  Grid3x3,
  X,
} from 'lucide-react';
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

const BOTTOM_NAV_ITEMS = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/reports', label: 'Análises', icon: BarChart3, end: false },
  { to: '/goals', label: 'Metas', icon: Target, end: false },
];

export default function AppLayout() {
  const logout = useAuthStore((s) => s.logout);
  const { dark, toggle } = useThemeStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  const sidebarContent = (
    <>
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
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
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
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141a] p-4 flex-col">
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30">
          <div className="text-lg font-bold text-brand-600">Fingest</div>
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <main className="flex-1 px-4 sm:px-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-[#12141a] border-t border-black/5 dark:border-slate-800 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between">
          {BOTTOM_NAV_ITEMS.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                  isActive ? 'text-brand-600' : 'text-slate-400',
                )
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}

          <button
            onClick={() => navigate('/transactions')}
            className="flex-1 flex flex-col items-center -mt-6"
          >
            <span className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Plus size={24} />
            </span>
          </button>

          {BOTTOM_NAV_ITEMS.slice(2).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                  isActive ? 'text-brand-600' : 'text-slate-400',
                )
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-400"
          >
            <Grid3x3 size={22} />
            Mais
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-white dark:bg-[#12141a] rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Mais opções</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex flex-col items-center gap-2 rounded-2xl p-4 text-xs font-medium text-center',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300',
                    )
                  }
                >
                  <Icon size={20} />
                  {label}
                </NavLink>
              ))}
              <button
                onClick={logout}
                className="flex flex-col items-center gap-2 rounded-2xl p-4 text-xs font-medium text-center bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
