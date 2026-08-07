import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, Download, History } from 'lucide-react';
import { api } from '../api/client';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  description: string;
  createdAt: string;
}

export default function Security() {
  const queryClient = useQueryClient();
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(
    null,
  );
  const [enableCode, setEnableCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Consulta o status real de 2FA do usuário ao carregar a página, em vez de
  // depender só do estado da sessão atual.
  const { data: me } = useQuery<{ twoFactorEnabled: boolean }>({
    queryKey: ['auth-me'],
    queryFn: async () => (await api.get('/auth/me')).data,
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | null>(null);
  const effectiveTwoFactorEnabled = twoFactorEnabled ?? me?.twoFactorEnabled ?? false;

  const { data: auditLog, isLoading: loadingAudit } = useQuery<AuditEntry[]>({
    queryKey: ['audit-log'],
    queryFn: async () => (await api.get('/audit-log', { params: { limit: 30 } })).data,
  });

  const setupMutation = useMutation({
    mutationFn: () => api.post('/auth/2fa/setup'),
    onSuccess: ({ data }) => {
      setSetupData(data);
      setTwoFactorEnabled(false);
    },
  });

  const enableMutation = useMutation({
    mutationFn: (code: string) => api.post('/auth/2fa/enable', { code }),
    onSuccess: () => {
      setTwoFactorEnabled(true);
      setSetupData(null);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setMessage({ type: 'success', text: 'Autenticação de dois fatores ativada com sucesso!' });
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.response?.data?.message ?? 'Código inválido' });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (code: string) => api.post('/auth/2fa/disable', { code }),
    onSuccess: () => {
      setTwoFactorEnabled(false);
      setShowDisableForm(false);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setMessage({ type: 'success', text: 'Autenticação de dois fatores desativada.' });
    },
    onError: (err: any) => {
      setMessage({ type: 'error', text: err.response?.data?.message ?? 'Código inválido' });
    },
  });

  function handleEnable(e: FormEvent) {
    e.preventDefault();
    enableMutation.mutate(enableCode);
  }

  function handleDisable(e: FormEvent) {
    e.preventDefault();
    disableMutation.mutate(disableCode);
  }

  async function handleBackup() {
    const response = await api.get('/backup/export', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `fingest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Segurança</h1>
        <p className="text-sm text-slate-500">
          Autenticação de dois fatores, backup e histórico de atividades
        </p>
      </div>

      {message && (
        <div
          className={`text-sm rounded-lg px-3 py-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 2FA */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          {effectiveTwoFactorEnabled ? (
            <ShieldCheck size={20} className="text-emerald-600" />
          ) : (
            <ShieldOff size={20} className="text-slate-400" />
          )}
          <h2 className="font-semibold">Autenticação de dois fatores (2FA)</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Adicione uma camada extra de segurança exigindo um código do seu app autenticador
          (Google Authenticator, Authy, etc.) ao entrar na conta.
        </p>

        {effectiveTwoFactorEnabled === true && !showDisableForm && (
          <button
            onClick={() => setShowDisableForm(true)}
            className="text-sm font-medium text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-50"
          >
            Desativar 2FA
          </button>
        )}

        {showDisableForm && (
          <form onSubmit={handleDisable} className="space-y-3 max-w-xs">
            <div>
              <label className="text-sm font-medium">Digite o código atual para confirmar</label>
              <input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                maxLength={6}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-center tracking-widest"
              />
            </div>
            <button
              type="submit"
              disabled={disableMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              {disableMutation.isPending ? 'Desativando...' : 'Confirmar desativação'}
            </button>
          </form>
        )}

        {!effectiveTwoFactorEnabled && !setupData && (
          <button
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            {setupMutation.isPending ? 'Gerando...' : 'Ativar 2FA'}
          </button>
        )}

        {setupData && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <img
                src={setupData.qrCodeDataUrl}
                alt="QR Code para configurar 2FA"
                className="w-40 h-40 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <div className="text-sm text-slate-500 space-y-2">
                <p>1. Abra seu app autenticador (Google Authenticator, Authy, etc.)</p>
                <p>2. Escaneie o QR code ao lado</p>
                <p>
                  3. Ou digite manualmente esta chave:{' '}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                    {setupData.secret}
                  </code>
                </p>
                <p>4. Digite o código de 6 dígitos gerado pelo app abaixo para confirmar</p>
              </div>
            </div>

            <form onSubmit={handleEnable} className="flex items-end gap-3 max-w-sm">
              <div className="flex-1">
                <label className="text-sm font-medium">Código de confirmação</label>
                <input
                  value={enableCode}
                  onChange={(e) => setEnableCode(e.target.value)}
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-center tracking-widest"
                />
              </div>
              <button
                type="submit"
                disabled={enableMutation.isPending}
                className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                {enableMutation.isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Backup */}
      <div className="card">
        <h2 className="font-semibold mb-2">Backup completo</h2>
        <p className="text-sm text-slate-500 mb-4">
          Baixe um arquivo com todos os seus dados (contas, categorias, lançamentos, cartões,
          metas e automações) em formato JSON, para guardar como cópia de segurança.
        </p>
        <button
          onClick={handleBackup}
          className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Download size={16} /> Baixar backup completo
        </button>
      </div>

      {/* Auditoria */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-slate-400" />
          <h2 className="font-semibold">Histórico de atividades</h2>
        </div>
        {loadingAudit ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {auditLog?.map((entry) => (
              <div key={entry.id} className="py-2.5 text-sm">
                <p>{entry.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(entry.createdAt))}
                </p>
              </div>
            ))}
            {auditLog?.length === 0 && (
              <p className="text-sm text-slate-500 py-4">Nenhuma atividade registrada ainda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
