import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HeartPulse, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

const demoCreds = [
  { role: 'Admin', email: 'admin@hbms.local', password: 'admin123' },
  { role: 'Nurse', email: 'nurse@hbms.local', password: 'nurse123' },
  { role: 'Receptionist', email: 'desk@hbms.local', password: 'desk123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [email, setEmail] = useState('admin@hbms.local');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <HeartPulse size={20} />
          </div>
          <span className="text-lg font-bold">HBMS</span>
        </div>
        <div className="space-y-5">
          <h2 className="text-4xl font-extrabold leading-tight">
            Modern hospital bed management,
            <br />in real time.
          </h2>
          <p className="max-w-md text-sm text-brand-100/90">
            Live availability, ward analytics, and patient admissions — all in one professional dashboard
            built for hospital staff.
          </p>
          <div className="grid max-w-md grid-cols-3 gap-3">
            {['Live status', 'Role-based', 'Analytics'].map((t) => (
              <div key={t} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <p className="text-sm font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-brand-100/70">© {new Date().getFullYear()} HBMS — Demo build</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <HeartPulse size={18} />
            </div>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">HBMS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Use your hospital staff credentials.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button disabled={busy} className="btn-primary w-full justify-center" type="submit">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Sign in
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
              Create one
            </Link>
          </p>

          <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Demo accounts
            </p>
            <div className="mt-3 space-y-2">
              {demoCreds.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => {
                    setEmail(c.email);
                    setPassword(c.password);
                  }}
                  className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{c.role}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {c.email} / {c.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
