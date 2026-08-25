export type AppointmentStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';

export type ServiceType =
  | 'instalacao_sobrepor'
  | 'instalacao_embutir'
  | 'manutencao_preventiva'
  | 'manutencao_corretiva'
  | 'troca_bateria_config'
  | 'automacao_alexa_google'
  | 'orcamento_tecnico'
  | 'compromisso_particular'
  | 'outro';

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  neighborhood?: string;
  city?: string;
  serialNumber?: string; // Formato: MA-000029 (prefixo MA- e 6 dígitos)
  serviceOrder?: string; // Formato: OS-000029 (prefixo OS- e 6 dígitos)
  notes?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  address: string;
  neighborhood?: string;
  city?: string;
  serialNumber?: string; // N° de Série
  serviceOrder?: string; // N° da OS
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm (estimated or duration)
  durationMinutes: number; // e.g. 60, 90, 120
  serviceType: ServiceType;
  serviceTypeName: string;
  description: string;
  lockModel?: string; // e.g. Intelbras IFR 1001, Yale YMC 420D, etc.
  price?: number;
  paymentMethod?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'faturado' | 'a_combinar';
  status: AppointmentStatus;
  notes?: string;
  reminderMinutesBefore: number; // 0 (at time), 15, 30, 60, 120, 1440 (1 day)
  alarmDismissed?: boolean;
  googleEventId?: string;
  googleSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  export interface Appointment {
  // ...campos que já existem

  googleEventId?: string;
  syncedToCalendar?: boolean;
  }
}

export type DayOccupancyStatus = 'livre' | 'parcial' | 'ocupado';

export interface DayInfo {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  appointments: Appointment[];
  status: DayOccupancyStatus;
  totalHoursBooked: number;
}

export type QuoteStatus = 'pendente' | 'aprovado' | 'recusado' | 'convertido';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isPredefined?: boolean;
}

export interface Quote {
  id: string;
  code: string; // e.g. "ORC-2026-001"
  clientId?: string;
  clientName: string;
  clientPhone: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  lockModel?: string;
  doorType?: string;
  items: QuoteItem[];
  discountAmount?: number;
  totalAmount: number;
  paymentTerms: string;
  validityDays: number;
  warrantyInfo: string;
  notes?: string;
  status: QuoteStatus;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export type ViewTab = 'agenda' | 'diario' | 'orcamentos' | 'clientes' | 'financeiro' | 'consultoria';

export interface FilterState {
  searchTerm: string;
  status: AppointmentStatus | 'todos';
  serviceType: ServiceType | 'todos';
  dateRange: 'todos' | 'hoje' | 'amanha' | 'esta_semana' | 'este_mes' | 'futuros' | 'passados';
}
