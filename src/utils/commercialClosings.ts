import { Appointment, CommercialClosing } from '../types';

const PROD_KEY = 'maicon_commercial_closings_v461';
const TEST_KEY = 'maicon_commercial_closings_sandbox_v461';
const key = (sandbox: boolean) => sandbox ? TEST_KEY : PROD_KEY;

export const loadCommercialClosings = (sandbox=false): CommercialClosing[] => {
  try { const raw=localStorage.getItem(key(sandbox)); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
export const saveCommercialClosings = (items: CommercialClosing[], sandbox=false) => localStorage.setItem(key(sandbox), JSON.stringify(items));
export const nextClosingId = (items: CommercialClosing[]) => {
  const n=Math.max(0,...items.map(x=>Number(String(x.id).replace(/\D/g,''))||0))+1;
  return `F-${String(n).padStart(6,'0')}`;
};
export const closingSubtotal = (c: CommercialClosing, appointments: Appointment[]) => {
  const service = c.appointmentIds.reduce((sum,id)=>sum+(appointments.find(a=>a.id===id)?.price||0),0);
  return service + c.extraItems.reduce((sum,x)=>sum+(x.amount||0),0);
};
export const closingTotal = (c: CommercialClosing, appointments: Appointment[]) => {
  const subtotal=closingSubtotal(c,appointments);
  const discount=c.discountType==='percentual' ? subtotal*((c.discountValue||0)/100) : (c.discountValue||0);
  return Math.max(0,subtotal-discount);
};
export const findClosingForAppointment = (items: CommercialClosing[], appointmentId: string) => items.find(c=>c.appointmentIds.includes(appointmentId));
