import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';

interface Transaction {
  id: string;
  description: string;
  amount: string;
  type: 'RECEITA' | 'DESPESA';
  status: string;
  date: string;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  category?: { name: string } | null;
  account?: { name: string } | null;
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

export default function Transactions() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'' | 'RECEITA' | 'DESPESA'>('');

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', typeFilter],
    queryFn: async () =>
      (await api.get('/transactions', { params: typeFilter ? { type: typeFilter } : {} })).data,
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
    mutationFn: (payload: any) => api.post('/transactions', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setShowModal(false);
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      type: form.get('type'),
      description: form.get('description'),
      amount: Number(form.get('amount')),
      date: form.get('date'),
      accountId: form.get('accountId'),
      categoryId: form.get('categoryId') || undefined,
      status: form.get('status'),
      installments: Number(form.get('installments') || 1),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lançamentos</h1>
          <p className="text-sm text-slate-500">Receitas e despesas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} /> Novo lançamento
        </button>
      </div>

      <div className="flex gap-2">
        {(['', 'RECEITA', 'DESPESA'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              typeFilter === t
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-slate-300 dark:border-slate-700 text-slate-600'
            }`}
          >
            {t === '' ? 'Todos' : t === 'RECEITA' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3">Categoria</th>
              <th className="text-left px-4 py-3">Conta</th>
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {transactions?.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  {t.description}
                  {t.installmentTotal && t.installmentTotal > 1 && (
                    <span className="text-xs text-slate-400 ml-1">
                      ({t.installmentNumber}/{t.installmentTotal})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{t.category?.name ?? '-'}</td>
                <td className="px-4 py-3 text-slate-500">{t.account?.name ?? '-'}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800">
                    {t.status}
                  </span>
                </td>
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
            {transactions?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Novo lançamento" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select name="type" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm">
                <option value="DESPESA">Despesa</option>
                <option value="RECEITA">Receita</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <input name="description" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Valor total (R$)</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Parcelas</label>
                <input name="installments" type="number" min="1" defaultValue={1} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <input name="date" type="date" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Conta</label>
              <select name="accountId" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm">
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select name="categoryId" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm">
                <option value="">Sem categoria</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select name="status" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm">
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
                <option value="RECEBIDO">Recebido</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
