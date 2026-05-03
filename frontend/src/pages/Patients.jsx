import { useEffect, useState } from 'react';
import { Plus, Pencil, LogOut, BedDouble, Search, Users, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

export default function Patients() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [patients, setPatients] = useState([]);
  const [beds, setBeds] = useState([]);
  const [filters, setFilters] = useState({ status: 'admitted', q: '' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | patient
  const [assigning, setAssigning] = useState(null); // patient

  const load = async () => {
    try {
      const [p, b] = await Promise.all([
        api.patients.list(filters),
        api.beds.list({ status: 'available' }),
      ]);
      setPatients(p.patients);
      setBeds(b.beds);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filters.status, filters.q]);

  useSocket({
    'patient:created': load,
    'patient:updated': load,
    'patient:deleted': load,
    'bed:updated': load,
  });

  const onDischarge = async (p) => {
    if (!confirm(`Discharge ${p.name}?`)) return;
    try {
      await api.patients.discharge(p.id);
      toast.success(`${p.name} discharged`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onDelete = async (p) => {
    if (!confirm(`Delete patient record for ${p.name}? This cannot be undone.`)) return;
    try {
      await api.patients.remove(p.id);
      toast.success('Patient removed');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Patients</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Admit, manage, and discharge patients.
          </p>
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary">
          <Plus size={16} /> Admit patient
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
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
                placeholder="Patient name, disease, or contact"
              />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card h-48 animate-pulse-soft" />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Admit a new patient to assign them to an available bed."
          action={
            <button className="btn-primary" onClick={() => setEditing('new')}>
              <Plus size={16} /> Admit patient
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="table-th">Patient</th>
                  <th className="table-th">Age / Gender</th>
                  <th className="table-th">Disease</th>
                  <th className="table-th">Bed / Ward</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                  >
                    <td className="table-td">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {p.name}
                      </span>
                    </td>
                    <td className="table-td">
                      {p.age} · <span className="capitalize">{p.gender || '—'}</span>
                    </td>
                    <td className="table-td">{p.disease || '—'}</td>
                    <td className="table-td">
                      {p.bed_code ? (
                        <span>
                          <span className="font-medium">{p.bed_code}</span>
                          <span className="text-slate-400"> · {p.ward_name}</span>
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="table-td">
                      <span
                        className={`badge ${
                          p.status === 'admitted'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <span className="capitalize">{p.status}</span>
                      </span>
                    </td>
                    <td className="table-td">{p.contact || '—'}</td>
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'admitted' && (
                          <>
                            <button
                              onClick={() => setAssigning(p)}
                              className="btn-ghost px-2 py-1.5 text-xs"
                              title="Assign / change bed"
                            >
                              <BedDouble size={14} />
                            </button>
                            <button
                              onClick={() => setEditing(p)}
                              className="btn-ghost px-2 py-1.5 text-xs"
                              title="Edit details"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => onDischarge(p)}
                              className="btn-ghost px-2 py-1.5 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              title="Discharge"
                            >
                              <LogOut size={14} />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => onDelete(p)}
                            className="btn-ghost px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <PatientFormModal
          open={!!editing}
          patient={editing === 'new' ? null : editing}
          beds={beds}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {assigning && (
        <AssignBedModal
          open={!!assigning}
          patient={assigning}
          beds={beds}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function PatientFormModal({ open, patient, beds, onClose, onSaved }) {
  const isNew = !patient;
  const [form, setForm] = useState({
    name: patient?.name || '',
    age: patient?.age ?? '',
    gender: patient?.gender || '',
    disease: patient?.disease || '',
    contact: patient?.contact || '',
    bed_id: patient?.bed_id || '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        bed_id: form.bed_id ? Number(form.bed_id) : undefined,
        gender: form.gender || undefined,
      };
      if (isNew) {
        await api.patients.create(payload);
        toast.success('Patient admitted');
      } else {
        const { bed_id, ...rest } = payload;
        await api.patients.update(patient.id, rest);
        toast.success('Patient updated');
      }
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
      title={isNew ? 'Admit a new patient' : `Edit ${patient.name}`}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="patient-form" className="btn-primary" disabled={busy}>
            {busy ? 'Saving...' : isNew ? 'Admit patient' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="patient-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Full name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">Age</label>
            <input
              className="input"
              type="number"
              min="0"
              max="140"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Gender</label>
            <select
              className="input"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Disease / Reason</label>
            <input
              className="input"
              value={form.disease}
              onChange={(e) => setForm({ ...form, disease: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="label">Contact</label>
            <input
              className="input"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Phone or emergency contact"
            />
          </div>
          {isNew && (
            <div className="col-span-2">
              <label className="label">Assign bed (optional)</label>
              <select
                className="input"
                value={form.bed_id}
                onChange={(e) => setForm({ ...form, bed_id: e.target.value })}
              >
                <option value="">Don't assign yet</option>
                {beds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.ward_name} · {b.type}
                  </option>
                ))}
              </select>
              {beds.length === 0 && (
                <p className="mt-1 text-xs text-rose-600">
                  No available beds. Patient will be admitted unassigned.
                </p>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

function AssignBedModal({ open, patient, beds, onClose, onSaved }) {
  const [bedId, setBedId] = useState(patient?.bed_id || '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!bedId) return toast.error('Select a bed');
    setBusy(true);
    try {
      await api.patients.assignBed(patient.id, Number(bedId));
      toast.success('Bed assigned');
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
      title={`Assign bed for ${patient.name}`}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="assign-form" className="btn-primary" disabled={busy}>
            {busy ? 'Assigning...' : 'Assign bed'}
          </button>
        </>
      }
    >
      <form id="assign-form" onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Available beds</label>
          <select className="input" value={bedId} onChange={(e) => setBedId(e.target.value)} required>
            <option value="">Select a bed</option>
            {beds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {b.ward_name} · {b.type}
              </option>
            ))}
          </select>
          {beds.length === 0 && (
            <p className="mt-2 text-xs text-rose-600">No available beds in the system.</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
