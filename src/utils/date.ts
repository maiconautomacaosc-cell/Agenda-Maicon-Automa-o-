import { Appointment, DayInfo, DayOccupancyStatus } from '../types';

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateFriendly(dateStr: string): string {
  if (!dateStr) return '';
  const today = getTodayString();
  
  const d = new Date(`${dateStr}T12:00:00`);
  const todayDate = new Date(`${today}T12:00:00`);
  const diffDays = Math.round((d.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const dayOfWeek = weekDays[d.getDay()];
  const formattedBR = `${String(d.getDate()).padStart(2, '0')} de ${months[d.getMonth()]}`;

  if (diffDays === 0) return `Hoje (${formattedBR})`;
  if (diffDays === 1) return `Amanhã (${formattedBR})`;
  if (diffDays === -1) return `Ontem (${formattedBR})`;

  return `${dayOfWeek}, ${formattedBR}`;
}

export function formatCurrencyBRL(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export function calculateDayOccupancy(appointments: Appointment[]): { status: DayOccupancyStatus; totalHours: number } {
  const activeAppts = appointments.filter(a => a.status !== 'cancelado');
  if (activeAppts.length === 0) {
    return { status: 'livre', totalHours: 0 };
  }

  // If there is any personal commitment / blocked day, mark day as occupied immediately
  const hasPersonalBlockedDay = activeAppts.some(a => a.serviceType === 'compromisso_particular');
  if (hasPersonalBlockedDay) {
    const totalMinutes = activeAppts.reduce((acc, curr) => acc + (curr.durationMinutes || 90), 0);
    return { status: 'ocupado', totalHours: Math.round((totalMinutes / 60) * 10) / 10 };
  }

  const totalMinutes = activeAppts.reduce((acc, curr) => acc + (curr.durationMinutes || 90), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Assuming a standard workday of ~8 hours (e.g., 08:00 to 18:00):
  // 1-3.5 hours = 'parcial' (partially occupied, space for more jobs)
  // >= 4 hours or >= 3 services = 'ocupado'
  if (totalHours >= 4 || activeAppts.length >= 3) {
    return { status: 'ocupado', totalHours };
  }
  return { status: 'parcial', totalHours };
}

export function generateMonthDays(year: number, month: number, allAppointments: Appointment[]): DayInfo[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const days: DayInfo[] = [];
  const todayStr = getTodayString();

  // Day of week for first day (0=Sunday, 1=Monday, etc.)
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const pDay = prevMonthLastDay - i;
    const pMonth = month === 0 ? 11 : month - 1;
    const pYear = month === 0 ? year - 1 : year;
    const dateStr = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
    const dayAppts = allAppointments.filter(a => a.date === dateStr);
    const { status, totalHours } = calculateDayOccupancy(dayAppts);

    days.push({
      date: dateStr,
      dayNumber: pDay,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      appointments: dayAppts,
      status,
      totalHoursBooked: totalHours,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAppts = allAppointments.filter(a => a.date === dateStr);
    const { status, totalHours } = calculateDayOccupancy(dayAppts);

    days.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      appointments: dayAppts,
      status,
      totalHoursBooked: totalHours,
    });
  }

  // Next month padding to complete 35 or 42 grid slots
  const remainingSlots = (7 - (days.length % 7)) % 7;
  for (let day = 1; day <= remainingSlots; day++) {
    const nMonth = month === 11 ? 0 : month + 1;
    const nYear = month === 11 ? year + 1 : year;
    const dateStr = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAppts = allAppointments.filter(a => a.date === dateStr);
    const { status, totalHours } = calculateDayOccupancy(dayAppts);

    days.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      appointments: dayAppts,
      status,
      totalHoursBooked: totalHours,
    });
  }

  return days;
}

export function parseMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutesToTime(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats a serial number with prefix MA- and 6 digits (e.g. 29 -> MA-000029)
 */
export function formatSerialNumber(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed.startsWith('MA-') ? trimmed : `MA-${trimmed}`;
  const padded = digits.padStart(6, '0').slice(-6);
  return `MA-${padded}`;
}

/**
 * Formats a service order with prefix OS- and 6 digits (e.g. 29 -> OS-000029)
 */
export function formatServiceOrder(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed.startsWith('OS-') ? trimmed : `OS-${trimmed}`;
  const padded = digits.padStart(6, '0').slice(-6);
  return `OS-${padded}`;
}

