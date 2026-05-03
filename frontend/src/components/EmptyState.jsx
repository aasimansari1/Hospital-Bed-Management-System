export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="card grid place-items-center px-6 py-12 text-center">
      {Icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
          <Icon size={26} />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
