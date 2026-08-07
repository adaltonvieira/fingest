import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth-store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
        twoFactorCode: needsTwoFactor ? twoFactorCode : undefined,
      });

      if (data.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        return;
      }

      setTokens(data.accessToken, data.refreshToken, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-surface-dark">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-brand-600">Fingest</h1>
        <p className="text-sm text-slate-500">
          {needsTwoFactor ? 'Digite o código do seu app autenticador' : 'Entre na sua conta'}
        </p>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {!needsTwoFactor ? (
          <>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="text-sm font-medium">Código de verificação</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="000000"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm tracking-widest text-center text-lg"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? 'Entrando...' : needsTwoFactor ? 'Verificar' : 'Entrar'}
        </button>

        {!needsTwoFactor && (
          <p className="text-sm text-center text-slate-500">
            Não tem conta?{' '}
            <Link to="/register" className="text-brand-600 font-medium">
              Cadastre-se
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
