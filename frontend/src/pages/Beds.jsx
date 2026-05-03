import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, BedDouble, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

const STATUSES = ['available', 'occupied', 'reserved', 'maintenance'];
const BED_TYPES = ['ICU', 'General', 'Private', 'Emergency'];

export default function Beds() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEdit = user?.role === 'admin' || user?.role === 'nurse';

  const [beds, setBeds] = useState([]);
  const [wards, setWards] = useState([]);
  const [filters, setFilters] = useState({ q: '', ward_id: '', status: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | bed | 'new'

  const load = async () => {
    try {
      const [b, w] = await Promise.all([api.beds.list(filters), api.wards.list()]);
      setBeds(b.beds);
      setWards(w.wards);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filters.ward_id, filters.status, filters.type, filters.q]);

  useSocket({
    'bed:created': load,
    'bed:updated': load,
    'bed:deleted': load,
    'patient:updated': load,
  });

  const onDelete = async (bed) => {
    if (!confirm(`Delete bed ${bed.code}?`)) return;
    try {
      await api.beds.remove(bed.id);
      toast.success('Bed deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const b of beds) {
      const key = b.ward_name || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }
    return Array.from(map.entries());
  }, [beds]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Beds</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage bed inventory across wards.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditing('new')} className="btn-primary">
            <Plus size={16} /> New bed
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="label">Search</label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="input pl-9"
                placeholder="Bed code or ward"
              />
            </div>
          </div>
          <div>
            <label className="label">Ward</label>
            <select
              className="input"
              value={filters.ward_id}
              onChange={(e) => setFilters((f) => ({ ...f, ward_id: e.target.value }))}
            >
              <option value="">All wards</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">All types</option>
              {BED_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {(filters.q || filters.ward_id || filters.status || filters.type) && (
            <button
              className="btn-ghost"
              onClick={() => setFilters({ q: '', ward_id: '', status: '', type: '' })}
            >
              <Filter size={16} /> Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card h-48 animate-pulse-soft" />
      ) : beds.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No beds match your filters"
          description="Try adjusting filters or add a new bed to get started."
          action={
            isAdmin && (
              <button className="btn-primary" onClick={() => setEditing('new')}>
                <Plus size={16} /> Add bed
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {grouped.map(([wardName, items]) => (
            <div key={wardName} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{wardName}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {items.length} bed{items.length !== 1 && 's'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((b) => (
                  <BedCard
                    key={b.id}
                    bed={b}
                    canEdit={canEdit}
                    isAdmin={isAdmin}
                    onEdit={() => setEditing(b)}
                    onDelete={() => onDelete(b)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <BedFormModal
          open={!!editing}
          bed={editing === 'new' ? null : editing}
          wards={wards}
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

function BedCard({ bed, canEdit, isAdmin, onEdit, onDelete }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{bed.code}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{bed.type} bed</p>
        </div>
        <StatusBadge status={bed.status} />
      </div>

      <div className="mt-3 min-h-[2.5rem] text-xs text-slate-600 dark:text-slate-400">
        {bed.patient_name ? (
          <>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {bed.patient_name}
            </span>
            {bed.patient_disease && <> · {bed.patient_disease}</>}
          </>
        ) : (
          <span className="italic">No patient assigned</span>
        )}
      </div>

      {(canEdit || isAdmin) && (
        <div className="mt-3 flex items-center justify-end gap-1">
          {canEdit && (
            <button onClick={onEdit} className="btn-ghost px-2 py-1.5 text-xs" title="Edit">
              <Pencil size={14} />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onDelete}
              className="btn-ghost px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BedFormModal({ open, bed, wards, onClose, onSaved }) {
  const isNew = !bed;
  const [form, setForm] = useState({
    code: bed?.code || '',
    ward_id: bed?.ward_id || wards[0]?.id || '',
    type: bed?.type || 'General',
    status: bed?.status || 'available',
    notes: bed?.notes || '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) await api.beds.create(form);
      else await api.beds.update(bed.id, form);
      toast.success(isNew ? 'Bed created' : 'Bed updated');
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
      title={isNew ? 'Add a new bed' : `Edit bed ${bed.code}`}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="bed-form" className="btn-primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="bed-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bed code</label>
            <input
              className="input"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {BED_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ward</label>
            <select
              className="input"
              value={form.ward_id}
              onChange={(e) => setForm({ ...form, ward_id: e.target.value })}
              required
            >
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[80px]"
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
