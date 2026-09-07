import { Appointment, Client, EquipmentRecord, WarrantyPeriod } from '../types';

export type WarrantyState = 'ativa' | 'vencendo' | 'vencida' | 'sem_garantia';

export interface WarrantyInfo {
  period?: WarrantyPeriod;
  startDate?: string;
  endDate?: string;
  state: WarrantyState;
  daysRemaining?: number;
}

export function normalizeMaSerial(value?: string): string {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  const compact = raw.replace(/[^A-Z0-9]/g, '');
  const match = compact.match(/^MA(\d+)$/);
  if (match) return `MA-${match[1].padStart(6, '0')}`;
  return raw;
}

function sameClient(appt: Appointment, client: Client): boolean {
  return appt.clientId === client.id || appt.clientName.trim().toLowerCase() === client.name.trim().toLowerCase();
}

function mergeEquipment(base: EquipmentRecord | undefined, incoming: EquipmentRecord): EquipmentRecord {
  if (!base) return incoming;
  return {
    ...base,
    ...incoming,
    id: base.id || incoming.id,
    serialNumber: normalizeMaSerial(base.serialNumber || incoming.serialNumber),
    serviceType: incoming.serviceType || base.serviceType,
    serviceTypeName: incoming.serviceTypeName || base.serviceTypeName,
    brand: incoming.brand || base.brand,
    model: incoming.model || base.model,
    manufacturerSerialNumber: incoming.manufacturerSerialNumber || base.manufacturerSerialNumber,
    description: incoming.description || base.description,
    photoUrls: incoming.photoUrls?.length ? incoming.photoUrls : base.photoUrls,
    productSupplyType: incoming.productSupplyType || base.productSupplyType,
    supplier: incoming.supplier || base.supplier,
    invoiceProof: incoming.invoiceProof || base.invoiceProof,
    productWarranty: incoming.productWarranty || base.productWarranty,
    createdAt: base.createdAt || incoming.createdAt,
  };
}

/**
 * Compatibilidade 4.0: monta a lista de equipamentos tanto do cadastro moderno
 * client.equipment quanto de atendimentos/MA antigos. Isso mantém clientes reais
 * anteriores à estrutura de EquipmentRecord visíveis na Central de Garantias.
 */
export function getClientEquipmentRecords(client: Client, appointments: Appointment[]): EquipmentRecord[] {
  const bySerial = new Map<string, EquipmentRecord>();
  const put = (eq: EquipmentRecord) => {
    const serial = normalizeMaSerial(eq.serialNumber);
    if (!serial) return;
    const normalized = { ...eq, serialNumber: serial };
    bySerial.set(serial, mergeEquipment(bySerial.get(serial), normalized));
  };

  (client.equipment || []).forEach(put);

  if (client.serialNumber) {
    const serial = normalizeMaSerial(client.serialNumber);
    put({
      id: `legacy-${client.id}-${serial}`,
      serialNumber: serial,
      createdAt: client.createdAt || new Date().toISOString(),
    });
  }

  appointments.filter(a => sameClient(a, client)).forEach(appt => {
    (appt.equipment || []).forEach(eq => put({
      ...eq,
      serialNumber: normalizeMaSerial(eq.serialNumber),
      createdAt: eq.createdAt || appt.createdAt || `${appt.date}T12:00:00`,
    }));

    const serials = [
      appt.serialNumber,
      appt.maintenanceSerialNumber,
      ...(appt.reservedSerialNumbers || []),
    ].map(normalizeMaSerial).filter(Boolean);

    serials.forEach(serial => {
      const detailed = (appt.equipment || []).find(eq => normalizeMaSerial(eq.serialNumber) === serial);
      put({
        id: detailed?.id || `legacy-${appt.id}-${serial}`,
        serialNumber: serial,
        serviceType: detailed?.serviceType || appt.serviceType,
        serviceTypeName: detailed?.serviceTypeName || appt.serviceTypeName,
        brand: detailed?.brand,
        model: detailed?.model || (!detailed?.brand ? appt.lockModel : undefined),
        manufacturerSerialNumber: detailed?.manufacturerSerialNumber,
        description: detailed?.description || appt.description,
        photoUrls: detailed?.photoUrls || appt.photoUrls,
        productSupplyType: detailed?.productSupplyType,
        supplier: detailed?.supplier,
        invoiceProof: detailed?.invoiceProof,
        productWarranty: detailed?.productWarranty,
        createdAt: detailed?.createdAt || appt.createdAt || `${appt.date}T12:00:00`,
      });
    });
  });

  return Array.from(bySerial.values()).sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
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
  const serial = normalizeMaSerial(serialNumber);
  if (!serial) return false;
  return (
    normalizeMaSerial(appt.serialNumber) === serial ||
    normalizeMaSerial(appt.maintenanceSerialNumber) === serial ||
    (appt.reservedSerialNumbers || []).some(s => normalizeMaSerial(s) === serial) ||
    (appt.equipment || []).some(eq => normalizeMaSerial(eq.serialNumber) === serial)
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
