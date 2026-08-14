import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import { ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';

interface MonthComparison {
  year: number;
  month: number;
  label: string;
  receitas: number;
  despesas: number;
  lucro: number;
}

interface MonthlyReport {
  year: number;
  month: number;
  receitas: number;
  despesas: number;
  lucro: number;
  quantidadeReceitas: number;
  quantidadeDespesas: number;
  breakdown: Array<{
    categoryName: string;
    color: string;
    type: 'RECEITA' | 'DESPESA';
    total: number;
  }>;
  transactions: Array<{
    id: string;
    description: string;
    amount: string;
    type: 'RECEITA' | 'DESPESA';
    date: string;
    category?: { name: string } | null;
  }>;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function Reports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: comparison, isLoading: loadingComparison } = useQuery<MonthComparison[]>({
    queryKey: ['reports-comparison'],
    queryFn: async () => (await api.get('/reports/comparison', { params: { months: 6 } })).data,
  });

  const { data: report, isLoading: loadingReport } = useQuery<MonthlyReport>({
    queryKey: ['reports-monthly', year, month],
    queryFn: async () => (await api.get('/reports/monthly', { params: { year, month } })).data,
  });

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  const despesasBreakdown = report?.breakdown.filter((b) => b.type === 'DESPESA') ?? [];
  const receitasBreakdown = report?.breakdown.filter((b) => b.type === 'RECEITA') ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Relatórios</h1>
        <p className="text-sm text-slate-500">Comparativo mensal e detalhamento por período</p>
      </div>

      {/* Comparativo dos últimos 6 meses */}
      <div className="card">
        <h2 className="font-semibold mb-4">Comparativo — últimos 6 meses</h2>
        {loadingComparison ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparison}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#0ea5a3" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Relatório do mês selecionado */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-lg">
            {MONTH_NAMES[month - 1]} de {year}
          </h2>
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/60 rounded-full p-1 gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors"
            >
              Próximo →
            </button>
          </div>
        </div>

        {loadingReport || !report ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Receitas</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(report.receitas)}</p>
                  <p className="text-xs text-slate-400 mt-1">{report.quantidadeReceitas} lançamento(s)</p>
                </div>
                <span className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <ArrowUpRight size={18} />
                </span>
              </div>
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Despesas</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(report.despesas)}</p>
                  <p className="text-xs text-slate-400 mt-1">{report.quantidadeDespesas} lançamento(s)</p>
                </div>
                <span className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                  <ArrowDownRight size={18} />
                </span>
              </div>
              <div className="card flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Lucro</p>
                  <p className={`text-2xl font-bold ${report.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(report.lucro)}
                  </p>
                </div>
                <span className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
                  <Scale size={18} />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-3 text-sm">Despesas por categoria</h3>
                {despesasBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma despesa neste mês.</p>
                ) : (
                  <div className="space-y-2">
                    {despesasBreakdown
                      .sort((a, b) => b.total - a.total)
                      .map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                            {b.categoryName}
                          </div>
                          <span className="font-medium text-red-600">{formatCurrency(b.total)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <div className="card">
                <h3 className="font-semibold mb-3 text-sm">Receitas por categoria</h3>
                {receitasBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma receita neste mês.</p>
                ) : (
                  <div className="space-y-2">
                    {receitasBreakdown
                      .sort((a, b) => b.total - a.total)
                      .map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                            {b.categoryName}
                          </div>
                          <span className="font-medium text-emerald-600">{formatCurrency(b.total)}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Descrição</th>
                    <th className="text-left px-4 py-3">Categoria</th>
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-right px-4 py-3">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3">{t.description}</td>
                      <td className="px-4 py-3 text-slate-500">{t.category?.name ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          t.type === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {t.type === 'RECEITA' ? '+' : '-'}
                        {formatCurrency(Number(t.amount))}
                      </td>
                    </tr>
                  ))}
                  {report.transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        Nenhum lançamento neste mês.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
