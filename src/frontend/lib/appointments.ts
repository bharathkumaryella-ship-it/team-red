export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export type Appointment = {
  id: number;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  reason?: string | null;
  created_at: string;
  doctor: { id: number; full_name: string; specialization: string | null; clinic_location?: string | null; phone?: string | null };
  patient?: { id: number; full_name: string; age?: number | null };
};

export type AppointmentListing = {
  data: Appointment[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export function displayTime(value: string) {
  return new Date(value).toLocaleString();
}
