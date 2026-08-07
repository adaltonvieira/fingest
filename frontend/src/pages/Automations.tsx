import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Repeat, Trash2, PlayCircle } from 'lucide-react';
import { api } from '../api/client';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import Select from '../components/Select';

interface RecurringRule {
  id: string;
  description: string;
  amount: string;
  type: 'RECEITA' | 'DESPESA';
  dayOfMonth: number;
  active: boolean;
  lastGeneratedMonth: string | null;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: 'RECEITA' | 'DESPESA';
}

export default function Automations() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');

  const { data: rules, isLoading } = useQuery<RecurringRule[]>({
    queryKey: ['recurring-rules'],
    queryFn: async () => (await api.get('/recurring-rules')).data,
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounts')).data,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories-flat'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.flatMap((c: any) => [c, ...(c.subcategories ?? [])]);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/recurring-rules', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
      setShowModal(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.put(`/recurring-rules/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-rules'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-rules'] }),
  });

  const runNowMutation = useMutation({
    mutationFn: () => api.post('/recurring-rules/run-now'),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert(`${res.data.generated} lançamento(s) gerado(s) para hoje.`);
    },
  });

  function openCreateModal() {
    setFormType('DESPESA');
    setFormAccountId(accounts?.[0]?.id ?? '');
    setFormCategoryId('');
    setShowModal(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      type: formType,
      description: form.get('description'),
      amount: Number(form.get('amount')),
      dayOfMonth: Number(form.get('dayOfMonth')),
      accountId: formAccountId,
      categoryId: formCategoryId || undefined,
    });
  }

  const accountOptions = accounts?.map((a) => ({ value: a.id, label: a.name })) ?? [];
  const categoryOptions = [
    { value: '', label: 'Sem categoria' },
    ...(categories?.filter((c) => c.type === formType).map((c) => ({ value: c.id, label: c.name })) ?? []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Automações</h1>
          <p className="text-sm text-slate-500">
            Lançamentos recorrentes gerados automaticamente todo mês
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runNowMutation.mutate()}
            disabled={runNowMutation.isPending}
            title="Gera agora os lançamentos de regras cujo dia é hoje (útil para testar sem esperar a virada do dia)"
            className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <PlayCircle size={16} /> Rodar agora
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} /> Nova automação
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3">Dia do mês</th>
              <th className="text-left px-4 py-3">Ativa</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {rules?.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 flex items-center gap-2">
                  <Repeat size={14} className="text-slate-400" />
                  {r.description}
                </td>
                <td className="px-4 py-3 text-slate-500">Todo dia {r.dayOfMonth}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleMutation.mutate({ id: r.id, active: !r.active })}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {r.active ? 'Ativa' : 'Pausada'}
                  </button>
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    r.type === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {r.type === 'RECEITA' ? '+' : '-'}
                  {formatCurrency(Number(r.amount))}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm('Excluir esta automação?')) deleteMutation.mutate(r.id);
                    }}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {rules?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nenhuma automação cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Nova automação" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <div className="mt-1">
                <Select
                  value={formType}
                  onChange={(v) => setFormType(v as 'RECEITA' | 'DESPESA')}
                  options={[
                    { value: 'DESPESA', label: 'Despesa' },
                    { value: 'RECEITA', label: 'Receita' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <input
                name="description"
                required
                placeholder="Ex: Aluguel do salão"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Valor (R$)</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Dia do mês (1-28)</label>
                <input name="dayOfMonth" type="number" min="1" max="28" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Conta</label>
              <div className="mt-1">
                <Select value={formAccountId} onChange={setFormAccountId} options={accountOptions} placeholder="Selecione a conta" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <div className="mt-1">
                <Select value={formCategoryId} onChange={setFormCategoryId} options={categoryOptions} />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              O lançamento será criado automaticamente todo mês, no dia escolhido, com status
              "Pendente".
            </p>
            <button
              type="submit"
              disabled={createMutation.isPending || !formAccountId}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar automação'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
