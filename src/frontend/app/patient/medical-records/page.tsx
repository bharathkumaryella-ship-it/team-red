'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '../../components/toast-provider';
import {
  FileText,
  Calendar,
  User,
  Shield,
  Pill,
  ClipboardList,
  Eye,
  X,
  Search,
  Download,
  Stethoscope
} from 'lucide-react';

type RecordItem = {
  id: number;
  appointment_id: number | null;
  diagnosis: string | null;
  notes: string | null;
  prescription: string | null;
  weight_kg: number | null;
  patient_age: number | null;
  created_at: string;
  doctor: { full_name: string; specialization: string | null };
};

type Listing = { data: RecordItem[]; pagination: { page: number; pages: number; total: number } };

export default function PatientMedicalRecordsPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { error: showError, info } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<Listing>('/patients/me/medical-records');
        setListing(data);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Unable to load medical records.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [showError]);

  async function open(id: number) {
    try {
      const response = await apiRequest<{ data: RecordItem }>(`/medical-records/${id}`);
      setSelected(response.data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load record details.');
    }
  }

  const filteredRecords = listing?.data.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.diagnosis && item.diagnosis.toLowerCase().includes(q)) ||
      (item.doctor.full_name && item.doctor.full_name.toLowerCase().includes(q)) ||
      (item.doctor.specialization && item.doctor.specialization.toLowerCase().includes(q)) ||
      (item.prescription && item.prescription.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Medical Records</h1>
          <p>Secure electronic health records, clinical diagnoses, and prescriptions.</p>
        </div>
        <div className="page-header-actions">
          <div className="navbar-security-badge">
            <Shield size={14} />
            <span>Encrypted At-Rest Record Storage</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records by diagnosis, doctor name, or prescription..."
          />
        </div>
        {searchQuery && (
          <button type="button" className="btn btn-ghost" onClick={() => setSearchQuery('')}>
            Clear
          </button>
        )}
      </div>

      {/* Records Listing */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
        </div>
      ) : !filteredRecords || filteredRecords.length === 0 ? (
        <div className="card">
          <div className="card-body empty-state">
            <div className="empty-state-icon">
              <ClipboardList />
            </div>
            <h3>No medical records found</h3>
            <p>
              {searchQuery
                ? 'No records match your search criteria. Try a different query.'
                : 'Medical records and prescription notes will appear here once consultations are finalized by your doctor.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredRecords.map((record) => (
            <div key={record.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Record #{record.id}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <Calendar size={12} />
                      <span>{new Date(record.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Diagnosis
                  </span>
                  <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: '2px 0 0 0' }}>
                    {record.diagnosis || 'Standard Consultation'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Stethoscope size={14} color="var(--color-primary)" />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Dr. {record.doctor.full_name} ({record.doctor.specialization || 'Specialist'})
                  </span>
                </div>

                {record.prescription && (
                  <div
                    style={{
                      background: 'var(--color-bg)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-secondary)', fontWeight: 600, marginBottom: '2px' }}>
                      <Pill size={14} />
                      <span>Prescription</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {record.prescription}
                    </p>
                  </div>
                )}
                {record.patient_age !== null && (
                  <div>
                    <span className="text-xs text-muted">Age at consultation</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{record.patient_age} years</p>
                  </div>
                )}
                {record.weight_kg !== null && (
                  <div>
                    <span className="text-xs text-muted">Weight</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{record.weight_kg} kg</p>
                  </div>
                )}
              </div>

              <div className="card-footer" style={{ justifyContent: 'space-between' }}>
                <span className="text-xs text-muted">
                  {record.appointment_id ? `Appt #${record.appointment_id}` : 'Direct Entry'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void open(record.id)}
                >
                  <Eye size={14} />
                  <span>View Full Record</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-panel" style={{ width: 'min(580px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--color-primary)" />
                <h2>Medical Record #{selected.id}</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelected(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div>
                  <span className="text-xs text-muted">Attending Physician</span>
                  <div style={{ fontWeight: 600 }}>Dr. {selected.doctor.full_name}</div>
                  <div className="text-xs text-muted">{selected.doctor.specialization || 'Clinical Specialist'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="text-xs text-muted">Date Recorded</span>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(selected.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Clinical Diagnosis
                </span>
                <div
                  style={{
                    padding: '14px',
                    background: 'var(--color-primary-light)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-primary-800)',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    marginTop: '4px'
                  }}
                >
                  {selected.diagnosis || 'General Clinical Observation'}
                </div>
              </div>

              <div>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Physician Clinical Notes
                </span>
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    marginTop: '4px'
                  }}
                >
                  {selected.notes || 'No confidential clinical notes attached.'}
                </div>
              </div>

              {selected.patient_age !== null && (
                <div>
                  <span className="text-xs text-muted">Age at consultation</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{selected.patient_age} years</p>
                </div>
              )}
              {selected.weight_kg !== null && (
                <div>
                  <span className="text-xs text-muted">Weight at consultation</span>
                  <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{selected.weight_kg} kg</p>
                </div>
              )}

              <div>
                <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Prescription & Treatment Plan
                </span>
                <div
                  style={{
                    padding: '12px 14px',
                    background: selected.prescription ? 'var(--color-success-light)' : 'var(--color-bg)',
                    border: selected.prescription ? '1px solid var(--color-success-border)' : '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-md)',
                    color: selected.prescription ? 'var(--color-success)' : 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    marginTop: '4px',
                    fontWeight: selected.prescription ? 500 : 400
                  }}
                >
                  {selected.prescription || 'No medications prescribed.'}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => info('Download PDF record generated.')}
              >
                <Download size={14} />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelected(null)}
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
