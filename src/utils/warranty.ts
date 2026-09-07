import { Appointment, EquipmentRecord, WarrantyPeriod } from '../types';

export type WarrantyState = 'ativa' | 'vencendo' | 'vencida' | 'sem_garantia';

export interface WarrantyInfo {
  period?: WarrantyPeriod;
  startDate?: string;
  endDate?: string;
  state: WarrantyState;
  daysRemaining?: number;
}

const MONTHS_BY_PERIOD: Partial<Record<WarrantyPeriod, number>> = {
  '1 Mês': 1,
  '3 Meses': 3,
  '6 Meses': 6,
  '12 Meses': 12,
  '24 Meses': 24,
  '36 Meses': 36,
};

export function appointmentHasSerial(appt: Appointment, serialNumber: string): boolean {
  const serial = String(serialNumber || '').trim().toUpperCase();
  if (!serial) return false;
  return (
    String(appt.serialNumber || '').trim().toUpperCase() === serial ||
    String(appt.maintenanceSerialNumber || '').trim().toUpperCase() === serial ||
    (appt.reservedSerialNumbers || []).some(s => String(s).trim().toUpperCase() === serial) ||
    (appt.equipment || []).some(eq => String(eq.serialNumber || '').trim().toUpperCase() === serial)
  );
}

export function getEquipmentHistory(appointments: Appointment[], clientId: string, clientName: string, serialNumber: string): Appointment[] {
  const name = clientName.trim().toLowerCase();
  return appointments
    .filter(a => (a.clientId === clientId || a.clientName.trim().toLowerCase() === name) && appointmentHasSerial(a, serialNumber))
    .sort((a, b) => `${a.date}T${a.startTime || '00:00'}`.localeCompare(`${b.date}T${b.startTime || '00:00'}`));
}

export function addMonthsToDate(dateString: string, months: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return '';
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  const originalDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, lastDay));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function warrantyState(endDate?: string, period?: WarrantyPeriod, today = new Date()): WarrantyInfo {
  if (!period || period === 'Sem garantia' || !endDate) return { period, state: 'sem_garantia' };
  const end = new Date(`${endDate}T23:59:59`);
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  if (daysRemaining < 0) return { period, endDate, state: 'vencida', daysRemaining };
  if (daysRemaining <= 30) return { period, endDate, state: 'vencendo', daysRemaining };
  return { period, endDate, state: 'ativa', daysRemaining };
}

export function buildWarrantyInfo(period: WarrantyPeriod | undefined, startDate: string | undefined, today = new Date()): WarrantyInfo {
  if (!period || period === 'Sem garantia' || !startDate) return { period, startDate, state: 'sem_garantia' };
  const months = MONTHS_BY_PERIOD[period];
  if (!months) return { period, startDate, state: 'sem_garantia' };
  const endDate = addMonthsToDate(startDate, months);
  return { ...warrantyState(endDate, period, today), startDate, endDate };
}

export function getEquipmentWarrantySummary(eq: EquipmentRecord, history: Appointment[], today = new Date()) {
  const completed = history.filter(a => a.status === 'concluido');
  const original = completed[0] || history[0];
  const startDate = original?.date || (eq.createdAt ? eq.createdAt.slice(0, 10) : undefined);
  const installationPeriod = original?.installationWarranty;
  const installation = buildWarrantyInfo(installationPeriod, startDate, today);
  const product = buildWarrantyInfo(eq.productWarranty, startDate, today);

  const states = [installation.state, product.state];
  let overall: WarrantyState = 'sem_garantia';
  if (states.includes('vencendo')) overall = 'vencendo';
  else if (states.includes('ativa')) overall = 'ativa';
  else if (states.includes('vencida')) overall = 'vencida';

  return { installation, product, overall, startDate, originalAppointment: original };
}
