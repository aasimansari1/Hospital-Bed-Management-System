export default function StatusBadge({ status }) {
  const cls = `badge-${status}`;
  const dot = {
    available: 'bg-emerald-500',
    occupied: 'bg-rose-500',
    reserved: 'bg-amber-500',
    maintenance: 'bg-slate-500',
  }[status];
  return (
    <span className={cls}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
