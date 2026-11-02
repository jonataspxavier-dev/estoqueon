import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Erro, Spinner } from '../components/ui';

const demos = [
  { perfil: 'Gerente', email: 'gerente@estoqueon.com', senha: 'gerente123' },
  { perfil: 'Vendedor', email: 'vendedor@estoqueon.com', senha: 'vendedor123' },
];

export function Login() {
  const { usuario, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <span className="text-2xl font-bold">EstoqueOn</span>
        </div>
        <div>
          <h2 className="text-4xl leading-tight font-bold">
            Estoque e vendas do seu comércio,
            <br />
            sob controle.
          </h2>
          <ul className="mt-8 space-y-4 text-brand-100">
            <li className="flex items-center gap-3">
              <Bell size={20} /> Alertas automáticos de estoque baixo
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 size={20} /> Relatórios de faturamento e lucro bruto
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck size={20} /> Vendas que nunca deixam o estoque negativo
            </li>
          </ul>
        </div>
        <p className="text-sm text-brand-100/70">Node.js · TypeScript · MySQL · React</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/favicon.svg" alt="" className="h-10 w-10" />
            <span className="text-2xl font-bold text-brand-900">EstoqueOn</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
          <p className="mt-1 text-sm text-slate-500">Acesse o painel com seu e-mail e senha.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="senha">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                className="input"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {erro && <Erro mensagem={erro} />}
            <button className="btn-primary w-full py-2.5" disabled={enviando}>
              {enviando && <Spinner className="text-white" />} Entrar
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Acesso de demonstração</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demos.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEmail(d.email);
                    setSenha(d.senha);
                  }}
                >
                  {d.perfil}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
