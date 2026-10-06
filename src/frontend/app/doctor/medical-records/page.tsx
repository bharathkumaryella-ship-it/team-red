'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment, AppointmentListing } from '@/lib/appointments';
import { useToast } from '../../components/toast-provider';
import {
  FileText,
  Plus,
  Edit3,
  Calendar,
  User,
  Pill,
  Save,
  CheckCircle,
  AlertCircle,
  Search,
  ClipboardList
} from 'lucide-react';

type RecordItem = {
  id: number;
  appointment_id: number;
  diagnosis: string;
  notes: string | null;
  prescription: string | null;
  weight_kg: number | null;
  patient_age: number | null;
  patient: { id: number; full_name: string; age: number | null };
};

type RecordListing = { data: RecordItem[]; pagination: { page: number; pages: number; total: number } };

export default function DoctorMedicalRecordsPage() {
  const [records, setRecords] = useState<RecordListing | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { success, error: showError } = useToast();
  const selectedAppointment = appointments.find((item) => String(item.id) === selectedAppointmentId);

  function selectPatientByName(name: string) {
    setPatientName(name);
    const match = appointments.find((item) => item.patient?.full_name.toLowerCase() === name.trim().toLowerCase());
    setSelectedAppointmentId(match ? String(match.id) : '');
    setPatientAge(match?.patient?.age == null ? '' : String(match.patient.age));
  }

  async function load() {
    setLoading(true);
    try {
      const [recordResult, appointmentResult] = await Promise.all([
        apiRequest<RecordListing>('/doctor/medical-records'),
        apiRequest<AppointmentListing>('/doctor/appointments?status=COMPLETED&limit=100'),
      ]);
      setRecords(recordResult);
      const existing = new Set(recordResult.data.map((record) => record.appointment_id));
      setAppointments(appointmentResult.data.filter((item) => !existing.has(item.id)));
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load medical records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest('/medical-records', {
        method: 'POST',
        body: {
          appointment_id: Number(selectedAppointmentId),
          diagnosis: form.get('diagnosis'),
          notes: form.get('notes'),
          prescription: form.get('prescription'),
          weight_kg: form.get('weight_kg') === '' ? null : Number(form.get('weight_kg')),
          patient_age: form.get('patient_age') === '' ? null : Number(form.get('patient_age')),
        },
      });
      event.currentTarget.reset();
      setSelectedAppointmentId('');
      setPatientName('');
      setPatientAge('');
      success('Clinical record created successfully.');
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to create medical record.');
    } finally {
      setSaving(false);
    }
  }

  async function open(id: number) {
    try {
      const result = await apiRequest<{ data: RecordItem }>(`/doctor/medical-records/${id}`);
      setSelected(result.data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load record details.');
    }
  }

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ data: RecordItem }>(`/doctor/medical-records/${selected.id}`, {
        method: 'PATCH',
        body: {
          diagnosis: form.get('diagnosis'),
          notes: form.get('notes'),
          prescription: form.get('prescription'),
          weight_kg: form.get('weight_kg') === '' ? null : Number(form.get('weight_kg')),
          patient_age: form.get('patient_age') === '' ? null : Number(form.get('patient_age')),
        },
      });
      setSelected(result.data);
      success(`Record #${selected.id} updated successfully.`);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to update medical record.');
    } finally {
      setSaving(false);
    }
  }

  const filteredRecords = records?.data.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.patient.full_name.toLowerCase().includes(q) ||
      r.diagnosis.toLowerCase().includes(q) ||
      (r.prescription && r.prescription.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Medical Records Management</h1>
          <p>Author and maintain diagnostic records, clinical treatment logs, and patient prescriptions.</p>
        </div>
      </div>

      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Left Form: Create or Edit */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selected ? <Edit3 size={18} color="var(--color-primary)" /> : <Plus size={18} color="var(--color-primary)" />}
              <h3>{selected ? `Edit Record #${selected.id} (${selected.patient.full_name})` : 'New Clinical Record'}</h3>
            </div>
            {selected && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelected(null)}
              >
                Switch to New Record
              </button>
            )}
          </div>

          <div className="card-body">
            {selected ? (
              <form className="stacked-form" onSubmit={update}>
                <div className="card" style={{ background: 'var(--color-primary-light)' }}>
                  <div className="card-body">
                    <label>
                      <span className="form-label">Patient Name</span>
                      <input value={selected.patient.full_name} readOnly />
                    </label>
                    <label style={{ display: 'block', marginTop: '12px' }}>
                      <span className="form-label">Patient Age</span>
                      <input name="patient_age" type="number" min="0" max="130" step="1" required defaultValue={selected.patient_age ?? selected.patient.age ?? ''} placeholder="Enter age in years" />
                    </label>
                  </div>
                </div>
                <div>
                  <label>
                    <span className="form-label">Clinical Diagnosis *</span>
                    <textarea
                      name="diagnosis"
                      required
                      maxLength={2000}
                      rows={3}
                      defaultValue={selected.diagnosis}
                    />
                  </label>
                </div>

                <div>
                  <label>
                    <span className="form-label">Patient Weight (kg)</span>
                    <input name="weight_kg" type="number" min="0.1" max="500" step="0.1" defaultValue={selected.weight_kg ?? ''} placeholder="e.g. 68.5" />
                  </label>
                </div>

                <div>
                  <label>
                    <span className="form-label">Physician Notes</span>
                    <textarea
                      name="notes"
                      maxLength={10000}
                      rows={4}
                      placeholder="Confidential observations and treatment notes..."
                      defaultValue={selected.notes || ''}
                    />
                  </label>
                </div>

                <div>
                  <label>
                    <span className="form-label">
                      <Pill size={14} /> Prescriptions & Regimen
                    </span>
                    <textarea
                      name="prescription"
                      maxLength={5000}
                      rows={3}
                      placeholder="Medication names, dosage schedules, duration..."
                      defaultValue={selected.prescription || ''}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelected(null)}
                  >
                    Cancel Edit
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Update Record'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form className="stacked-form" onSubmit={create}>
                <div>
                  <label>
                    <span className="form-label">Patient Name *</span>
                    <input
                      name="patient_name"
                      required
                      list="eligible-patients"
                      value={patientName}
                      onChange={(event) => selectPatientByName(event.target.value)}
                      placeholder="Enter patient name"
                      autoComplete="off"
                    />
                    <datalist id="eligible-patients">
                      {[...new Set(appointments.map((item) => item.patient?.full_name).filter((name): name is string => Boolean(name)))].map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </label>
                  {appointments.length === 0 && (
                    <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                      To create a record, complete a consultation under your Schedule first.
                    </span>
                  )}
                </div>

                <div>
                  <label>
                    <span className="form-label">Patient Age</span>
                    <input
                      name="patient_age"
                      type="number"
                      required
                      min="0"
                      max="130"
                      step="1"
                      value={patientAge}
                      onChange={(event) => setPatientAge(event.target.value)}
                      placeholder={selectedAppointment ? 'Enter age in years' : 'Enter or select a patient first'}
                    />
                  </label>
                  <span className="text-xs text-muted">Age is filled from the patient profile when available and can be corrected for this visit.</span>
                </div>

                <div>
                  <label>
                    <span className="form-label">Patient Weight (kg)</span>
                    <input name="weight_kg" type="number" min="0.1" max="500" step="0.1" placeholder="e.g. 68.5" />
                  </label>
                </div>

                <div>
                  <label>
                    <span className="form-label">Clinical Diagnosis *</span>
                    <textarea
                      name="diagnosis"
                      required
                      maxLength={2000}
                      rows={3}
                      placeholder="Primary diagnosis, ICD-10 notes, or key clinical observations..."
                    />
                  </label>
                </div>

                <div>
                  <label>
                    <span className="form-label">Physician Notes</span>
                    <textarea
                      name="notes"
                      maxLength={10000}
                      rows={4}
                      placeholder="Detailed patient history, tests ordered, or recovery recommendations..."
                    />
                  </label>
                </div>

                <div>
                  <label>
                    <span className="form-label">
                      <Pill size={14} /> Prescriptions & Instructions
                    </span>
                    <textarea
                      name="prescription"
                      maxLength={5000}
                      rows={3}
                      placeholder="E.g. Amoxicillin 500mg - 1 capsule every 8h for 7 days..."
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={saving || !selectedAppointment}
                    className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Creating...' : 'Create Medical Record'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right List: Existing Records */}
        <div className="card">
          <div className="card-header">
            <h3>Authored Clinical Records</h3>
          </div>

          <div style={{ padding: '16px 24px 0' }}>
            <div className="search-input-wrap">
              <Search size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search authored records..."
              />
            </div>
          </div>

          <div className="card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
              </div>
            ) : !filteredRecords || filteredRecords.length === 0 ? (
              <div className="empty-state" style={{ padding: '36px 16px' }}>
                <div className="empty-state-icon">
                  <ClipboardList />
                </div>
                <h3>No records found</h3>
                <p>
                  {searchQuery
                    ? 'No records match your search filter.'
                    : 'You have not yet authored medical records for completed appointments.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '16px',
                      background: selected?.id === r.id ? 'var(--color-primary-light)' : 'var(--color-bg)',
                      border: selected?.id === r.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border-light)',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem'
                          }}
                        >
                          {r.patient.full_name.charAt(0)}
                        </div>
                        <strong style={{ fontSize: '0.9rem' }}>{r.patient.full_name}</strong>
                      </div>
                      <span className="text-xs text-muted">Record #{r.id}</span>
                    </div>

                    <p
                      style={{
                        margin: '6px 0',
                        fontSize: '0.8125rem',
                        color: 'var(--color-text)',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {r.diagnosis}
                    </p>
                    <p className="text-xs text-muted" style={{ margin: '4px 0' }}>
                      Age: {r.patient.age ?? 'Not provided'}{r.weight_kg !== null ? ` · Weight: ${r.weight_kg} kg` : ''}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void open(r.id)}
                      >
                        <Edit3 size={14} />
                        <span>Edit Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
