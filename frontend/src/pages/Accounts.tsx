import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { formatCurrency } from '../utils/format';
import Modal from '../components/Modal';
import Select from '../components/Select';

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: string;
}

const ACCOUNT_TYPES = [
  { value: 'CORRENTE', label: 'Corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'CARTEIRA', label: 'Carteira' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
  { value: 'CRIPTO', label: 'Cripto' },
  { value: 'OUTRO', label: 'Outro' },
];

export default function Accounts() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState('CORRENTE');

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounts')).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/accounts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowModal(false);
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get('name'),
      type,
      initialBalance: Number(form.get('initialBalance') || 0),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contas</h1>
          <p className="text-sm text-slate-500">Suas contas, carteiras e saldos</p>
        </div>
        <button
          onClick={() => {
            setType('CORRENTE');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} /> Nova conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading && <p className="text-slate-500">Carregando...</p>}
        {accounts?.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center">
                <Wallet size={18} />
              </div>
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-slate-500">{a.type}</p>
              </div>
            </div>
            <p className="text-xl font-bold">{formatCurrency(Number(a.currentBalance))}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="Nova conta" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <div className="mt-1">
                <Select value={type} onChange={setType} options={ACCOUNT_TYPES} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Saldo inicial (R$)</label>
              <input name="initialBalance" type="number" step="0.01" defaultValue={0} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar conta'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
