export default function StatCard({ icon: Icon, label, value, accent = 'brand', sub }) {
  const palette = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <div className="card p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${palette[accent]}`}>
          {Icon && <Icon size={20} />}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
      {sub && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}
