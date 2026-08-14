import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, Target } from 'lucide-react';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import Select from '../components/Select';
import ProgressRing from '../components/ProgressRing';

interface Goal {
  id: string;
  title: string;
  targetAmount: string;
  currentAmount: string;
  deadline?: string | null;
  color: string;
}

interface Account {
  id: string;
  name: string;
}

function monthsUntil(deadline: string): number {
  const now = new Date();
  const end = new Date(deadline);
  const months =
    (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export default function Goals() {
  const queryClient = useQueryClient();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const [contributeAccountId, setContributeAccountId] = useState('');

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => (await api.get('/goals')).data,
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounts')).data,
  });

  const createGoalMutation = useMutation({
    mutationFn: (payload: any) => api.post('/goals', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowGoalModal(false);
    },
  });

  const contributeMutation = useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: any }) =>
      api.post(`/goals/${goalId}/contributions`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setContributingGoal(null);
    },
  });

  function handleCreateGoal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createGoalMutation.mutate({
      title: form.get('title'),
      targetAmount: Number(form.get('targetAmount')),
      deadline: form.get('deadline') || undefined,
      color: form.get('color'),
    });
  }

  function handleContribute(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    contributeMutation.mutate({
      goalId: contributingGoal!.id,
      payload: {
        amount: Number(form.get('amount')),
        accountId: contributeAccountId || undefined,
      },
    });
  }

  // Resumo agregado: quanto falta juntar por mês, somando todas as metas ativas
  const summary = goals?.reduce(
    (acc, g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const missing = Math.max(0, target - current);
      if (missing > 0) {
        const months = g.deadline ? monthsUntil(g.deadline) : 12;
        acc.monthlyNeeded += missing / months;
      }
      return acc;
    },
    { monthlyNeeded: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Metas</h1>
          <p className="text-sm text-slate-500">Objetivos financeiros e progresso</p>
        </div>
        <button
          onClick={() => setShowGoalModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {/* Card resumo, estilo "Metas em foco" */}
      {goals && goals.length > 0 && (
        <div className="card bg-gradient-to-br from-accent to-accent/80 text-white border-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-1">
            Metas em foco
          </p>
          <h2 className="text-xl font-bold mb-4">
            {summary && summary.monthlyNeeded > 0
              ? 'Continue firme para alcançar seus objetivos'
              : 'Todas as suas metas estão em dia!'}
          </h2>
          {summary && summary.monthlyNeeded > 0 && (
            <div className="bg-white/15 rounded-2xl p-4 inline-block">
              <p className="text-xs text-white/70">Necessário por mês, no total</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.monthlyNeeded)}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && <p className="text-slate-500">Carregando...</p>}
        {goals?.map((g) => {
          const target = Number(g.targetAmount);
          const current = Number(g.currentAmount);
          const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
          const reached = current >= target;
          const missing = Math.max(0, target - current);
          const months = g.deadline ? monthsUntil(g.deadline) : null;
          const perMonth = months ? missing / months : null;

          return (
            <div key={g.id} className="card">
              <div className="flex items-start gap-4 mb-4">
                <ProgressRing percent={pct} color={g.color} size={64} strokeWidth={6}>
                  <span className="text-xs font-bold" style={{ color: g.color }}>
                    {pct}%
                  </span>
                </ProgressRing>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{g.title}</p>
                    {reached && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Atingida!
                      </span>
                    )}
                  </div>
                  {g.deadline && (
                    <p className="text-xs text-slate-500">Prazo: {formatDate(g.deadline)}</p>
                  )}
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(current)}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      de {formatCurrency(target)}
                    </span>
                  </p>
                </div>
              </div>

              {!reached && perMonth !== null && perMonth > 0 && (
                <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 mb-3">
                  <Target size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Precisa de <strong>{formatCurrency(perMonth)}/mês</strong> para bater o prazo
                  </span>
                </div>
              )}

              {!reached && (
                <button
                  onClick={() => {
                    setContributeAccountId('');
                    setContributingGoal(g);
                  }}
                  className="w-full flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 rounded-lg py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <TrendingUp size={16} /> Registrar aporte
                </button>
              )}
            </div>
          );
        })}
        {goals?.length === 0 && (
          <p className="text-sm text-slate-500">Nenhuma meta cadastrada ainda.</p>
        )}
      </div>

      {showGoalModal && (
        <Modal title="Nova meta" onClose={() => setShowGoalModal(false)}>
          <form onSubmit={handleCreateGoal} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Título</label>
              <input
                name="title"
                required
                placeholder="Ex: Reforma do salão"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Valor alvo (R$)</label>
              <input name="targetAmount" type="number" step="0.01" min="0.01" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Prazo (opcional)</label>
              <input name="deadline" type="date" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <input name="color" type="color" defaultValue="#2563eb" className="mt-1 w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-1" />
            </div>
            <button
              type="submit"
              disabled={createGoalMutation.isPending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
            >
              {createGoalMutation.isPending ? 'Salvando...' : 'Salvar meta'}
            </button>
          </form>
        </Modal>
      )}

      {contributingGoal && (
        <Modal title={`Aporte — ${contributingGoal.title}`} onClose={() => setContributingGoal(null)}>
          <form onSubmit={handleContribute} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Valor do aporte (R$)</label>
              <input name="amount" type="number" step="0.01" min="0.01" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Debitar de qual conta? (opcional)</label>
              <div className="mt-1">
                <Select
                  value={contributeAccountId}
                  onChange={setContributeAccountId}
                  options={[
                    { value: '', label: 'Não debitar de nenhuma conta' },
                    ...(accounts?.map((a) => ({ value: a.id, label: a.name })) ?? []),
                  ]}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Se escolher uma conta, o valor sai do saldo dela e entra no progresso da meta.
              </p>
            </div>
            <button
              type="submit"
              disabled={contributeMutation.isPending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
            >
              {contributeMutation.isPending ? 'Salvando...' : 'Registrar aporte'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
