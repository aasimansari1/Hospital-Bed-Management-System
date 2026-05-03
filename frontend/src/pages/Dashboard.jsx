import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  CheckCircle2,
  Activity,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import StatCard from '../components/StatCard.jsx';
import { useSocket } from '../hooks/useSocket.js';

const STATUS_COLORS = {
  available: '#10b981',
  occupied: '#f43f5e',
  reserved: '#f59e0b',
  maintenance: '#64748b',
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, t, d] = await Promise.all([
        api.stats.summary(),
        api.stats.trend(7),
        api.stats.distribution(),
      ]);
      setSummary(s);
      setTrend(t.trend);
      setDistribution(d.distribution);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useSocket({
    'bed:created': load,
    'bed:updated': load,
    'bed:deleted': load,
    'patient:created': load,
    'patient:updated': load,
    'patient:deleted': load,
  });

  const totals = summary?.totals;
  const occupancyPct = useMemo(() => {
    if (!totals?.total) return 0;
    return Math.round(((totals.occupied || 0) / totals.total) * 100);
  }, [totals]);

  const pie = totals
    ? [
        { name: 'Available', value: totals.available || 0, color: STATUS_COLORS.available },
        { name: 'Occupied', value: totals.occupied || 0, color: STATUS_COLORS.occupied },
        { name: 'Reserved', value: totals.reserved || 0, color: STATUS_COLORS.reserved },
        { name: 'Maintenance', value: totals.maintenance || 0, color: STATUS_COLORS.maintenance },
      ]
    : [];

  const showFullAlert = totals && totals.total > 0 && totals.available === 0;
  const showLowAlert = totals && totals.available > 0 && totals.available / totals.total < 0.1;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-28 animate-pulse-soft" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showFullAlert && (
        <Alert tone="rose" icon={AlertTriangle} title="All beds are full">
          No available beds across the hospital. Consider freeing reserved or maintenance beds.
        </Alert>
      )}
      {!showFullAlert && showLowAlert && (
        <Alert tone="amber" icon={AlertTriangle} title="Limited bed availability">
          Less than 10% of beds remain available. Capacity is critical.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BedDouble}
          label="Total beds"
          value={totals?.total ?? 0}
          accent="brand"
          sub={`${distribution.length} wards`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Available"
          value={totals?.available ?? 0}
          accent="emerald"
          sub={`${100 - occupancyPct}% free`}
        />
        <StatCard
          icon={Activity}
          label="Occupied"
          value={totals?.occupied ?? 0}
          accent="rose"
          sub={`${occupancyPct}% occupancy`}
        />
        <StatCard
          icon={Clock}
          label="Reserved"
          value={totals?.reserved ?? 0}
          accent="amber"
          sub={`${totals?.maintenance ?? 0} in maintenance`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Occupancy trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days</p>
            </div>
            <TrendingUp className="text-brand-500" size={18} />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,.3)',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="occupied"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Bed status mix
          </h3>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Live snapshot</p>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pie}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pie.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,.3)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ward occupancy</h3>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Beds occupied vs total per ward</p>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,.3)',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="beds" fill="#cbd5e1" name="Total" radius={[6, 6, 0, 0]} />
                <Bar dataKey="occupied" fill="#2563eb" name="Occupied" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Patients
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary?.patients?.admitted || 0} admitted
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Row label="Admitted" value={summary?.patients?.admitted || 0} />
            <Row label="Discharged" value={summary?.patients?.discharged || 0} />
            <Row label="Wards" value={distribution.length} />
            <Row label="Occupancy" value={`${occupancyPct}%`} highlight />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-brand-600 dark:text-brand-300' : 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </span>
    </div>
  );
}

function Alert({ tone, icon: Icon, title, children }) {
  const palette = {
    rose: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200',
  };
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 animate-slide-in ${palette[tone]}`}>
      <Icon size={20} />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
