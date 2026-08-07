import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import Select from '../components/Select';

interface Category {
  id: string;
  name: string;
  type: 'RECEITA' | 'DESPESA';
  color: string;
  subcategories: Category[];
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<'RECEITA' | 'DESPESA'>('DESPESA');

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/categories', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-flat'] });
      setShowModal(false);
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get('name'),
      type,
      color: form.get('color'),
    });
  }

  const receitas = categories?.filter((c) => c.type === 'RECEITA') ?? [];
  const despesas = categories?.filter((c) => c.type === 'DESPESA') ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Categorias</h1>
          <p className="text-sm text-slate-500">Organize receitas e despesas</p>
        </div>
        <button
          onClick={() => {
            setType('DESPESA');
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={16} /> Nova categoria
        </button>
      </div>

      {isLoading && <p className="text-slate-500">Carregando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Despesas</h2>
          <div className="space-y-2">
            {despesas.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </div>
            ))}
            {despesas.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria de despesa.</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Receitas</h2>
          <div className="space-y-2">
            {receitas.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </div>
            ))}
            {receitas.length === 0 && <p className="text-sm text-slate-500">Nenhuma categoria de receita.</p>}
          </div>
        </div>
      </div>

      {showModal && (
        <Modal title="Nova categoria" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <div className="mt-1">
                <Select
                  value={type}
                  onChange={(v) => setType(v as 'RECEITA' | 'DESPESA')}
                  options={[
                    { value: 'DESPESA', label: 'Despesa' },
                    { value: 'RECEITA', label: 'Receita' },
                  ]}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <input name="color" type="color" defaultValue="#6366F1" className="mt-1 w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-1" />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar categoria'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
