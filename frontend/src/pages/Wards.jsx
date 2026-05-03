import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

const TYPES = ['ICU', 'Emergency', 'General', 'Pediatric', 'Maternity', 'Private'];

export default function Wards() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [wards, setWards] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | ward
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { wards } = await api.wards.list();
      setWards(wards);
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
    'ward:created': load,
    'ward:updated': load,
    'ward:deleted': load,
    'bed:created': load,
    'bed:updated': load,
    'bed:deleted': load,
  });

  const onDelete = async (w) => {
    if (!confirm(`Delete ward "${w.name}" and all its beds?`)) return;
    try {
      await api.wards.remove(w.id);
      toast.success('Ward deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Wards</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Group beds by ward and monitor capacity per area.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing('new')} className="btn-primary">
            <Plus size={16} /> New ward
          </button>
        )}
      </div>

      {loading ? (
        <div className="card h-48 animate-pulse-soft" />
      ) : wards.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No wards yet"
          description="Create your first ward to start placing beds."
          action={
            isAdmin && (
              <button className="btn-primary" onClick={() => setEditing('new')}>
                <Plus size={16} /> Add ward
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {wards.map((w) => {
            const total = w.total_beds || 0;
            const occ = w.occupied_beds || 0;
            const avail = w.available_beds || 0;
            const pct = total ? Math.round((occ / total) * 100) : 0;
            return (
              <div key={w.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {w.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{w.type}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(w)} className="btn-ghost px-2 py-1.5">
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(w)}
                        className="btn-ghost px-2 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {w.description && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{w.description}</p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Total" value={total} />
                  <Stat label="Available" value={avail} tone="emerald" />
                  <Stat label="Occupied" value={occ} tone="rose" />
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Occupancy</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <WardFormModal
          open={!!editing}
          ward={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'slate' }) {
  const palette = {
    slate: 'text-slate-700 dark:text-slate-200',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    rose: 'text-rose-700 dark:text-rose-300',
  };
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-800/50">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${palette[tone]}`}>{value}</p>
    </div>
  );
}

function WardFormModal({ open, ward, onClose, onSaved }) {
  const isNew = !ward;
  const [form, setForm] = useState({
    name: ward?.name || '',
    type: ward?.type || 'General',
    description: ward?.description || '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) await api.wards.create(form);
      else await api.wards.update(ward.id, form);
      toast.success(isNew ? 'Ward created' : 'Ward updated');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'New ward' : `Edit ${ward.name}`}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="ward-form" className="btn-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="ward-form" onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Ward name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
