import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard as CardIcon, ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/Modal';
import Select from '../components/Select';

interface CreditCardType {
  id: string;
  name: string;
  bank?: string | null;
  limit: string;
  closingDay: number;
  dueDay: number;
  color: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  amount: string;
  date: string;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
}

interface Invoice {
  id: string;
  referenceMonth: string;
  closingDate: string;
  dueDate: string;
  status: 'ABERTA' | 'FECHADA' | 'PAGA';
  items: InvoiceItem[];
  total: number;
}

interface Account {
  id: string;
  name: string;
}

function monthLabel(dateStr: string) {
  const d = new Date(dateStr);
  const utc = new Date(d.getUTCFullYear(), d.getUTCMonth(), 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(utc);
}

export default function CreditCards() {
  const queryClient = useQueryClient();
  const [showCardModal, setShowCardModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const { data: cards, isLoading: loadingCards } = useQuery<CreditCardType[]>({
    queryKey: ['credit-cards'],
    queryFn: async () => (await api.get('/credit-cards')).data,
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ['invoices', selectedCard?.id],
    queryFn: async () => (await api.get(`/credit-cards/${selectedCard!.id}/invoices`)).data,
    enabled: !!selectedCard,
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounts')).data,
  });

  const createCardMutation = useMutation({
    mutationFn: (payload: any) => api.post('/credit-cards', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setShowCardModal(false);
    },
  });

  const createPurchaseMutation = useMutation({
    mutationFn: (payload: any) => api.post(`/credit-cards/${selectedCard!.id}/purchases`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCard?.id] });
      setShowPurchaseModal(false);
    },
  });

  const payInvoiceMutation = useMutation({
    mutationFn: ({ invoiceId, accountId }: { invoiceId: string; accountId: string }) =>
      api.post(`/credit-cards/${selectedCard!.id}/invoices/${invoiceId}/pay`, { accountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCard?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  function handleCreateCard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createCardMutation.mutate({
      name: form.get('name'),
      bank: form.get('bank') || undefined,
      limit: Number(form.get('limit')),
      closingDay: Number(form.get('closingDay')),
      dueDay: Number(form.get('dueDay')),
    });
  }

  function handleCreatePurchase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createPurchaseMutation.mutate({
      description: form.get('description'),
      amount: Number(form.get('amount')),
      date: form.get('date'),
      installments: Number(form.get('installments') || 1),
    });
  }

  const selectedInvoice = invoices?.find((i) => i.id === selectedInvoiceId);

  // ---------- Detalhe da fatura ----------
  if (selectedCard && selectedInvoiceId && selectedInvoice) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedInvoiceId(null)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={16} /> Voltar para faturas
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Fatura {monthLabel(selectedInvoice.referenceMonth)}
          </h1>
          <p className="text-sm text-slate-500">{selectedCard.name}</p>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase">Total da fatura</p>
            <p className="text-2xl font-bold">{formatCurrency(selectedInvoice.total)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Fechamento: {formatDate(selectedInvoice.closingDate)} · Vencimento:{' '}
              {formatDate(selectedInvoice.dueDate)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedInvoice.status === 'PAGA'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {selectedInvoice.status === 'PAGA' ? 'Paga' : 'Em aberto'}
            </span>
            {selectedInvoice.status !== 'PAGA' && accounts && accounts.length > 0 && (
              <div className="w-56">
                <Select
                  value=""
                  onChange={(accountId) => {
                    payInvoiceMutation.mutate({ invoiceId: selectedInvoice.id, accountId });
                  }}
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                  placeholder={payInvoiceMutation.isPending ? 'Pagando...' : 'Pagar fatura com...'}
                />
              </div>
            )}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Descrição</th>
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-right px-4 py-3">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedInvoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {item.description}
                    {item.installmentTotal && item.installmentTotal > 1 && (
                      <span className="text-xs text-slate-400 ml-1">
                        ({item.installmentNumber}/{item.installmentTotal})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    {formatCurrency(Number(item.amount))}
                  </td>
                </tr>
              ))}
              {selectedInvoice.items.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma compra nesta fatura.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------- Faturas de um cartão ----------
  if (selectedCard) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCard(null)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={16} /> Voltar para cartões
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedCard.name}</h1>
            <p className="text-sm text-slate-500">
              {selectedCard.bank ?? 'Cartão'} · Limite {formatCurrency(Number(selectedCard.limit))} ·
              Fecha dia {selectedCard.closingDay}, vence dia {selectedCard.dueDay}
            </p>
          </div>
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} /> Nova compra
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoices?.map((inv) => (
            <button
              key={inv.id}
              onClick={() => setSelectedInvoiceId(inv.id)}
              className="card text-left hover:border-brand-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold capitalize">{monthLabel(inv.referenceMonth)}</p>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    inv.status === 'PAGA'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {inv.status === 'PAGA' ? 'Paga' : 'Em aberto'}
                </span>
              </div>
              <p className="text-xl font-bold mt-2">{formatCurrency(inv.total)}</p>
              <p className="text-xs text-slate-500 mt-1">Vence em {formatDate(inv.dueDate)}</p>
            </button>
          ))}
          {invoices?.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma fatura ainda. Registre uma compra para começar.</p>
          )}
        </div>

        {showPurchaseModal && (
          <Modal title="Nova compra no cartão" onClose={() => setShowPurchaseModal(false)}>
            <form onSubmit={handleCreatePurchase} className="space-y-3">
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
                <label className="text-sm font-medium">Data da compra</label>
                <input name="date" type="date" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </div>
              <button
                type="submit"
                disabled={createPurchaseMutation.isPending}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
              >
                {createPurchaseMutation.isPending ? 'Salvando...' : 'Salvar compra'}
              </button>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  // ---------- Lista de cartões ----------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cartões de crédito</h1>
          <p className="text-sm text-slate-500">Seus cartões e faturas</p>
        </div>
        <button
          onClick={() => setShowCardModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} /> Novo cartão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loadingCards && <p className="text-slate-500">Carregando...</p>}
        {cards?.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCard(c)}
            className="card text-left hover:border-brand-400 transition-colors"
            style={{ borderTopColor: c.color, borderTopWidth: 3 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: c.color }}
              >
                <CardIcon size={18} />
              </div>
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-slate-500">{c.bank ?? 'Cartão de crédito'}</p>
              </div>
            </div>
            <p className="text-sm text-slate-500">Limite</p>
            <p className="text-lg font-bold">{formatCurrency(Number(c.limit))}</p>
            <p className="text-xs text-slate-400 mt-2">
              Fecha dia {c.closingDay} · Vence dia {c.dueDay}
            </p>
          </button>
        ))}
        {cards?.length === 0 && (
          <p className="text-sm text-slate-500">Nenhum cartão cadastrado ainda.</p>
        )}
      </div>

      {showCardModal && (
        <Modal title="Novo cartão" onClose={() => setShowCardModal(false)}>
          <form onSubmit={handleCreateCard} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input name="name" required placeholder="Ex: Nubank" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Banco (opcional)</label>
              <input name="bank" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Limite (R$)</label>
              <input name="limit" type="number" step="0.01" min="0.01" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Dia de fechamento</label>
                <input name="closingDay" type="number" min="1" max="28" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Dia de vencimento</label>
                <input name="dueDay" type="number" min="1" max="28" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
            <button
              type="submit"
              disabled={createCardMutation.isPending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
            >
              {createCardMutation.isPending ? 'Salvando...' : 'Salvar cartão'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
