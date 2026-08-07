import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Upload, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import Select from '../components/Select';

interface Account {
  id: string;
  name: string;
}
interface Category {
  id: string;
  name: string;
}
interface ImportRow {
  date: string;
  description: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
}

export default function ImportExport() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportRow[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importAccountId, setImportAccountId] = useState('');
  const [importCategoryId, setImportCategoryId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [importResult, setImportResult] = useState<number | null>(null);

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

  async function handleExport(format: 'csv' | 'xlsx') {
    setExporting(format);
    try {
      const response = await api.get(`/export/${format}`, {
        params: { from: from || undefined, to: to || undefined },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = format === 'csv' ? 'lancamentos.csv' : 'lancamentos.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewRows(null);
    setPreviewError(null);
    setImportResult(null);
    setPreviewLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', f);
      const { data } = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewRows(data.rows);
    } catch (err: any) {
      setPreviewError(err.response?.data?.message ?? 'Erro ao ler o arquivo');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!previewRows || !importAccountId) return;
    setConfirming(true);
    try {
      const { data } = await api.post('/import/confirm', {
        accountId: importAccountId,
        categoryId: importCategoryId || undefined,
        rows: previewRows,
      });
      setImportResult(data.created);
      setPreviewRows(null);
      setFile(null);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Importar / Exportar</h1>
        <p className="text-sm text-slate-500">
          Exporte seus lançamentos ou importe um extrato bancário
        </p>
      </div>

      {/* EXPORTAÇÃO */}
      <div className="card">
        <h2 className="font-semibold mb-4">Exportar lançamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-sm font-medium">De (opcional)</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Até (opcional)</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Deixe as datas em branco para exportar todos os lançamentos.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileText size={16} /> {exporting === 'csv' ? 'Gerando...' : 'Exportar CSV'}
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting !== null}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <FileSpreadsheet size={16} /> {exporting === 'xlsx' ? 'Gerando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* IMPORTAÇÃO */}
      <div className="card">
        <h2 className="font-semibold mb-2">Importar extrato bancário</h2>
        <p className="text-xs text-slate-500 mb-4">
          Aceita arquivos CSV (com colunas de Data, Descrição e Valor), Excel (.xlsx) ou OFX
          exportados do seu banco. O sistema identifica o formato automaticamente pelo conteúdo do
          arquivo. Nada é salvo até você revisar e confirmar.
        </p>

        <label className="flex items-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg px-4 py-6 justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-500">
          <Upload size={18} />
          {file ? file.name : 'Clique para escolher um arquivo .csv, .xlsx ou .ofx'}
          <input type="file" accept=".csv,.xlsx,.ofx" className="hidden" onChange={handleFileChange} />
        </label>

        {previewLoading && <p className="text-sm text-slate-500 mt-3">Lendo arquivo...</p>}

        {previewError && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {previewError}
          </div>
        )}

        {importResult !== null && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={16} /> {importResult} lançamento(s) importado(s) com sucesso.
          </div>
        )}

        {previewRows && previewRows.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Importar para a conta</label>
                <div className="mt-1">
                  <Select
                    value={importAccountId}
                    onChange={setImportAccountId}
                    options={accounts?.map((a) => ({ value: a.id, label: a.name })) ?? []}
                    placeholder="Selecione..."
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Categoria (opcional, aplica a todos)</label>
                <div className="mt-1">
                  <Select
                    value={importCategoryId}
                    onChange={setImportCategoryId}
                    options={[
                      { value: '', label: 'Sem categoria' },
                      ...(categories?.map((c) => ({ value: c.id, label: c.name })) ?? []),
                    ]}
                  />
                </div>
              </div>
            </div>

            <p className="text-sm font-medium">Pré-visualização ({previewRows.length} lançamentos)</p>
            <div className="max-h-64 overflow-y-auto card p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2">Data</th>
                    <th className="text-left px-4 py-2">Descrição</th>
                    <th className="text-left px-4 py-2">Tipo</th>
                    <th className="text-right px-4 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {previewRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{formatDate(r.date)}</td>
                      <td className="px-4 py-2">{r.description}</td>
                      <td className="px-4 py-2">{r.type === 'RECEITA' ? 'Receita' : 'Despesa'}</td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          r.type === 'RECEITA' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={!importAccountId || confirming}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              <Download size={16} />
              {confirming ? 'Importando...' : `Confirmar importação de ${previewRows.length} lançamento(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
