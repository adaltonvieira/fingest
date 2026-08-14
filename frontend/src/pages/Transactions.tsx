import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowUpRight, ArrowDownRight, Copy, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import Select from '../components/Select';

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

const STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'RECEBIDO', label: 'Recebido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

interface PaymentCharge {
  id: string;
  method: 'PIX' | 'CARD';
  status: 'PENDENTE' | 'PAGO' | 'EXPIRADO' | 'CANCELADO';
  paymentUrl: string | null;
}

/** Gera e exibe uma cobrança InfinitePay (Pix ou cartão) para uma receita pendente. */
function ChargeSection({ transactionId }: { transactionId: string }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: existingCharge } = useQuery<PaymentCharge | null>({
    queryKey: ['payment-charge', transactionId],
    queryFn: async () =>
      (await api.get(`/payments/charges/by-transaction/${transactionId}`)).data,
  });

  const createChargeMutation = useMutation({
    mutationFn: (method: 'PIX' | 'CARD') => api.post('/payments/charges', { transactionId, method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-charge', transactionId] });
    },
  });

  const charge = existingCharge;

  if (charge && charge.status === 'PENDENTE' && charge.paymentUrl) {
    return (
      <div className="rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 p-3 space-y-2">
        <p className="text-xs font-medium text-brand-700 dark:text-brand-400">
          Cobrança {charge.method === 'PIX' ? 'Pix' : 'cartão'} gerada — aguardando pagamento
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={charge.paymentUrl}
            className="flex-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 truncate"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(charge.paymentUrl!);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    );
  }

  if (charge && charge.status === 'PAGO') {
    return (
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 size={16} /> Cobrança paga
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-2">Gerar cobrança de cartão</p>
      <button
        type="button"
        onClick={() => createChargeMutation.mutate('CARD')}
        disabled={createChargeMutation.isPending}
        className="w-full flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 rounded-lg py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        Gerar link de cartão (InfinitePay)
      </button>
      <p className="text-xs text-slate-400 mt-1">
        Pix é registrado manualmente — marque como "Recebido" quando o valor cair na conta.
      </p>
      {createChargeMutation.isError && (
        <p className="text-xs text-red-600 mt-2">
          {(createChargeMutation.error as any)?.response?.data?.message ??
            'Não foi possível gerar a cobrança.'}
        </p>
      )}
    </div>
  );
}

export default function Transactions() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'' | 'RECEITA' | 'DESPESA'>('');
  const [formType, setFormType] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formStatus, setFormStatus] = useState('PENDENTE');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editStatus, setEditStatus] = useState('PENDENTE');

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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.put(`/transactions/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setEditingTransaction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setEditingTransaction(null);
    },
  });

  function openCreateModal() {
    setFormType(typeFilter === 'RECEITA' ? 'RECEITA' : 'DESPESA');
    setFormAccountId(accounts?.[0]?.id ?? '');
    setFormCategoryId('');
    setFormStatus('PENDENTE');
    setShowModal(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      type: formType,
      description: form.get('description'),
      amount: Number(form.get('amount')),
      date: form.get('date'),
      accountId: formAccountId,
      categoryId: formCategoryId || undefined,
      status: formStatus,
      installments: Number(form.get('installments') || 1),
    });
  }

  function openEditModal(t: Transaction) {
    setEditStatus(t.status);
    setEditingTransaction(t);
  }

  const accountOptions = accounts?.map((a) => ({ value: a.id, label: a.name })) ?? [];
  const categoryOptions = [
    { value: '', label: 'Sem categoria' },
    ...(categories?.filter((c) => c.type === formType).map((c) => ({ value: c.id, label: c.name })) ?? []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lançamentos</h1>
          <p className="text-sm text-slate-500">Receitas e despesas</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} /> Novo lançamento
        </button>
      </div>

      <div className="inline-flex bg-slate-100 dark:bg-slate-800/60 rounded-full p-1 gap-1">
        {(['', 'RECEITA', 'DESPESA'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === t
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            {t === '' ? 'Todos' : t === 'RECEITA' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
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
              <tr
                key={t.id}
                onClick={() => openEditModal(t)}
                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        t.type === 'RECEITA'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                          : 'bg-red-50 text-red-600 dark:bg-red-500/10'
                      }`}
                    >
                      {t.type === 'RECEITA' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </span>
                    <span>
                      {t.description}
                      {t.installmentTotal && t.installmentTotal > 1 && (
                        <span className="text-xs text-slate-400 ml-1">
                          ({t.installmentNumber}/{t.installmentTotal})
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{t.category?.name ?? '-'}</td>
                <td className="px-4 py-3 text-slate-500">{t.account?.name ?? '-'}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      t.status === 'PAGO' || t.status === 'RECEBIDO'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : t.status === 'CANCELADO'
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}
                  >
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
              <p className="text-xs mt-1 text-slate-500">
                Selecionado agora:{' '}
                <span className={formType === 'RECEITA' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {formType === 'RECEITA' ? 'Receita' : 'Despesa'}
                </span>
              </p>
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
            <div>
              <label className="text-sm font-medium">Status</label>
              <div className="mt-1">
                <Select value={formStatus} onChange={setFormStatus} options={STATUS_OPTIONS} />
              </div>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending || !formAccountId}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </form>
        </Modal>
      )}

      {editingTransaction && (
        <Modal title="Editar lançamento" onClose={() => setEditingTransaction(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              updateMutation.mutate({
                id: editingTransaction.id,
                payload: {
                  description: form.get('description'),
                  amount: Number(form.get('amount')),
                  date: form.get('date'),
                  status: editStatus,
                },
              });
            }}
            className="space-y-3"
          >
            <div className="text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500">
              Tipo:{' '}
              <span className={editingTransaction.type === 'RECEITA' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                {editingTransaction.type === 'RECEITA' ? 'Receita' : 'Despesa'}
              </span>{' '}
              (não pode ser alterado — exclua e crie um novo lançamento se precisar trocar o tipo)
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <input
                name="description"
                required
                defaultValue={editingTransaction.description}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Valor (R$)</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={Number(editingTransaction.amount)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <input
                name="date"
                type="date"
                required
                defaultValue={editingTransaction.date.slice(0, 10)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <div className="mt-1">
                <Select value={editStatus} onChange={setEditStatus} options={STATUS_OPTIONS} />
              </div>
            </div>
            {editingTransaction.type === 'RECEITA' && editingTransaction.status === 'PENDENTE' && (
              <ChargeSection transactionId={editingTransaction.id} />
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este lançamento?')) {
                    deleteMutation.mutate(editingTransaction.id);
                  }
                }}
                className="px-4 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium"
              >
                Excluir
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
