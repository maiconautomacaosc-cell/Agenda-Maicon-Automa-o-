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

export interface EquipmentRecord {
  id: string;
  serialNumber: string; // MA-000000
  model?: string;
  description?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  neighborhood?: string;
  city?: string;
  serialNumber?: string; // compatibilidade: primeiro/último MA principal
  serviceOrder?: string; // compatibilidade: OS mais recente
  equipment?: EquipmentRecord[];
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
  serialNumber?: string; // compatibilidade: primeiro MA do atendimento
  serviceOrder?: string; // uma OS por atendimento, quando solicitada
  equipment?: EquipmentRecord[]; // zero, um ou vários equipamentos no mesmo atendimento
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  serviceType: ServiceType;
  serviceTypeName: string;
  description: string;
  lockModel?: string;
  price?: number;
  paymentMethod?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'faturado' | 'a_combinar';
  status: AppointmentStatus;
  notes?: string;
  reminderMinutesBefore: number;
  alarmDismissed?: boolean;
  googleEventId?: string;
  googleSyncedAt?: string;
  syncedToCalendar?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DayOccupancyStatus = 'livre' | 'parcial' | 'ocupado';

export interface DayInfo {
  date: string;
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
  code: string;
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
  date: string;
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
