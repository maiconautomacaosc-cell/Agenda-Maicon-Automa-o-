import { Appointment, CommercialClosing } from '../types';

const PROD_KEY = 'maicon_commercial_closings_v461';
const TEST_KEY = 'maicon_commercial_closings_sandbox_v461';
const key = (sandbox: boolean) => sandbox ? TEST_KEY : PROD_KEY;

export const loadCommercialClosings = (sandbox=false): CommercialClosing[] => {
  try { const raw=localStorage.getItem(key(sandbox)); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
export const saveCommercialClosings = (items: CommercialClosing[], sandbox=false) => localStorage.setItem(key(sandbox), JSON.stringify(items));
export const resetCommercialClosings = (sandbox=false) => localStorage.removeItem(key(sandbox));

// v4.6.3 — FC propositalmente curto e visualmente diferente de MA/OS.
export const nextClosingId = (items: CommercialClosing[]) => {
  const used = items
    .map(x => {
      const m = String(x.id).match(/^(?:FC|F)-(\d+)$/i);
      return m ? Number(m[1]) : 0;
    })
    .filter(Boolean);
  const n = Math.max(0, ...used) + 1;
  if (n > 9999) throw new Error('Limite de 9.999 fechamentos atingido.');
  return `FC-${String(n).padStart(4,'0')}`;
};

export const appointmentCommercialValue = (c: CommercialClosing, appointment: Appointment): number | null => {
  if (c.appointmentValues && Object.prototype.hasOwnProperty.call(c.appointmentValues, appointment.id)) {
    const value = c.appointmentValues[appointment.id];
    return value == null ? null : Number(value);
  }
  return appointment.price == null ? null : Number(appointment.price);
};

export const closingUndefinedAppointmentIds = (c: CommercialClosing, appointments: Appointment[]) =>
  c.appointmentIds.filter(id => {
    const appointment = appointments.find(a => a.id === id);
    return !appointment || appointmentCommercialValue(c, appointment) == null;
  });

export const closingSubtotal = (c: CommercialClosing, appointments: Appointment[]) => {
  const service = c.appointmentIds.reduce((sum,id) => {
    const appointment = appointments.find(a=>a.id===id);
    if (!appointment) return sum;
    return sum + (appointmentCommercialValue(c, appointment) ?? 0);
  },0);
  return service + c.extraItems.reduce((sum,x)=>sum+(x.amount||0),0);
};
export const closingTotal = (c: CommercialClosing, appointments: Appointment[]) => {
  const subtotal=closingSubtotal(c,appointments);
  const discount=c.discountType==='percentual' ? subtotal*((c.discountValue||0)/100) : (c.discountValue||0);
  return Math.max(0,subtotal-discount);
};
export const findClosingForAppointment = (items: CommercialClosing[], appointmentId: string) => items.find(c=>c.appointmentIds.includes(appointmentId));
