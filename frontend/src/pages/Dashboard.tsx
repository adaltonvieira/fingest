import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../api/client';
import KpiCard from '../components/KpiCard';
import { formatCurrency, formatDate } from '../utils/format';

interface DashboardSummary {
  saldoAtual: number;
  receitasMes: number;
  despesasMes: number;
  lucroMes: number;
  saldoPrevisto: number;
  contasAPagar: { total: number; quantidade: number };
  contasAReceber: { total: number; quantidade: number };
  ultimasMovimentacoes: Array<{
    id: string;
    description: string;
    amount: string;
    type: 'RECEITA' | 'DESPESA';
    date: string;
    status: string;
    category?: { name: string; color: string } | null;
  }>;
  vencendoEmBreve: Array<{
    id: string;
    description: string;
    amount: string;
    type: 'RECEITA' | 'DESPESA';
    dueDate: string;
  }>;
  despesasPorCategoria: Array<{ categoryName: string; color: string; total: number }>;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
  });

  if (isLoading || !data) {
    return <div className="text-slate-500">Carregando dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral das suas finanças</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Saldo Atual" value={formatCurrency(data.saldoAtual)} icon={<Wallet size={20} />} />
        <KpiCard
          label="Receitas do mês"
          value={formatCurrency(data.receitasMes)}
          icon={<TrendingUp size={20} />}
          tone="positive"
        />
        <KpiCard
          label="Despesas do mês"
          value={formatCurrency(data.despesasMes)}
          icon={<TrendingDown size={20} />}
          tone="negative"
        />
        <KpiCard
          label="Lucro do mês"
          value={formatCurrency(data.lucroMes)}
          icon={<Scale size={20} />}
          tone={data.lucroMes >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          label="Contas a Pagar"
          value={`${formatCurrency(data.contasAPagar.total)} (${data.contasAPagar.quantidade})`}
          icon={<ArrowDownCircle size={20} />}
          tone="negative"
        />
        <KpiCard
          label="Contas a Receber"
          value={`${formatCurrency(data.contasAReceber.total)} (${data.contasAReceber.quantidade})`}
          icon={<ArrowUpCircle size={20} />}
          tone="positive"
        />
        <KpiCard label="Saldo Previsto" value={formatCurrency(data.saldoPrevisto)} icon={<Scale size={20} />} />
      </div>

      {data.vencendoEmBreve.length > 0 && (
        <div className="card border-amber-300 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-700">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="font-semibold text-amber-800 dark:text-amber-400">
              Vencendo nos próximos 7 dias
            </h2>
          </div>
          <div className="divide-y divide-amber-200 dark:divide-amber-800">
            {data.vencendoEmBreve.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    Vence em {formatDate(t.dueDate)}
                  </p>
                </div>
                <span
                  className={
                    t.type === 'RECEITA'
                      ? 'text-emerald-600 font-semibold text-sm'
                      : 'text-red-600 font-semibold text-sm'
                  }
                >
                  {t.type === 'RECEITA' ? '+' : '-'}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <h2 className="font-semibold mb-4">Despesas por categoria</h2>
          {data.despesasPorCategoria.length === 0 ? (
            <p className="text-sm text-slate-500">Sem despesas neste mês.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.despesasPorCategoria}
                  dataKey="total"
                  nameKey="categoryName"
                  innerRadius={50}
                  outerRadius={90}
                >
                  {data.despesasPorCategoria.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Últimas movimentações</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.ultimasMovimentacoes.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-slate-500">
                    {t.category?.name ?? 'Sem categoria'} · {formatDate(t.date)}
                  </p>
                </div>
                <span
                  className={
                    t.type === 'RECEITA'
                      ? 'text-emerald-600 font-semibold text-sm'
                      : 'text-red-600 font-semibold text-sm'
                  }
                >
                  {t.type === 'RECEITA' ? '+' : '-'}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
            {data.ultimasMovimentacoes.length === 0 && (
              <p className="text-sm text-slate-500 py-4">Nenhuma movimentação ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
