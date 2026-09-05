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

export type WarrantyPeriod = 'Sem garantia' | '1 Mês' | '3 Meses' | '6 Meses' | '12 Meses' | '24 Meses' | '36 Meses';
export type ProductSupplyType = 'Produto do cliente' | 'Produto vendido';

export interface EquipmentRecord {
  id: string;
  serialNumber: string; // MA-000000
  serviceType?: ServiceType;
  serviceTypeName?: string;
  model?: string;
  manufacturerSerialNumber?: string; // número de série original do fabricante/produto
  description?: string;
  photoUrls?: string[];
  productSupplyType?: ProductSupplyType;
  supplier?: string;
  invoiceProof?: string;
  productWarranty?: WarrantyPeriod;
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
  driveFolderId?: string;
  driveFolderUrl?: string;
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
  reservedSerialNumbers?: string[]; // MA reservado antecipadamente para gerar/imprimir o QR antes da visita
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  serviceType: ServiceType; // tipo principal, mantido para compatibilidade e filtros
  serviceTypes?: ServiceType[]; // um atendimento pode reunir vários tipos de serviço
  serviceTypeName: string;
  description: string;
  lockModel?: string;
  price?: number;
  paymentMethod?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'faturado' | 'a_combinar';
  status: AppointmentStatus;
  notes?: string;
  photoUrls?: string[]; // fotos gerais registradas na finalização do atendimento
  photoUploadError?: string;
  installationWarranty?: WarrantyPeriod;
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveFolderError?: string;
  serviceOrderPdfUrl?: string;
  serviceOrderPdfError?: string;
  warrantyUrl?: string;
  reminderMinutesBefore: number;
  alarmDismissed?: boolean;
  googleEventId?: string;
  googleSyncedAt?: string;
  syncedToCalendar?: boolean;
  createdAt: string;
  updatedAt: string;
  // Sincronização com as abas oficiais CLIENTES / O.S da planilha principal.
  mainSheetSyncStatus?: 'pending' | 'synced' | 'error';
  mainSheetSyncedAt?: string;
  mainSheetSyncError?: string; // último erro exato da gravação na planilha principal
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
