import { Appointment, Client, Quote } from '../types';
import { getTodayString } from './date';

const STORAGE_KEYS = {
  CLIENTS: 'maicon_agenda_clients_v1',
  APPOINTMENTS: 'maicon_agenda_appts_v1',
  SETTINGS: 'maicon_agenda_settings_v1',
  QUOTES: 'maicon_agenda_quotes_v1',
};

export interface AppSettings {
  defaultReminderMinutes: number;
  alarmSoundEnabled: boolean;
  alarmMelody: 'modern_chime' | 'urgent_beep' | 'radar_alert' | 'success_bell';
  autoOpenMapApp: 'google' | 'waze';
  technicianName: string;
  pixKey: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultReminderMinutes: 60,
  alarmSoundEnabled: true,
  alarmMelody: 'modern_chime',
  autoOpenMapApp: 'google',
  technicianName: 'Maicon Automação',
  pixKey: 'Maiconautomacaosc@gmail.com',
};

// Initial realistic demo clients for Maicon Automação
const INITIAL_CLIENTS: Client[] = [
  {
    id: 'cli-1',
    name: 'Carlos Eduardo Silva',
    phone: '(11) 98765-4321',
    address: 'Av. Paulista, 1578, Apto 142 - Bela Vista, São Paulo - SP',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    serialNumber: 'MA-000029',
    serviceOrder: 'OS-000029',
    notes: 'Portaria 24h. Fechadura digital Intelbras FR101.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cli-2',
    name: 'Dra. Mariana Vasconcelos',
    phone: '(11) 97123-8899',
    address: 'Rua Oscar Freire, 920, Sala 504 - Jardins, São Paulo - SP',
    neighborhood: 'Jardins',
    city: 'São Paulo',
    serialNumber: 'MA-000030',
    serviceOrder: 'OS-000030',
    notes: 'Consultório médico. Instalação de fechadura biométrica de embutir.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cli-3',
    name: 'Roberto Mendes (Condomínio Solar)',
    phone: '(11) 99456-1122',
    address: 'Rua Vergueiro, 2300, Bloco B - Vila Mariana, São Paulo - SP',
    neighborhood: 'Vila Mariana',
    city: 'São Paulo',
    serialNumber: 'MA-000031',
    serviceOrder: 'OS-000031',
    notes: 'Síndico. Manutenção preventiva em 4 fechaduras das áreas comuns.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cli-4',
    name: 'Patrícia Albuquerque',
    phone: '(11) 96321-7744',
    address: 'Al. dos Anapurus, 740, Casa 3 - Moema, São Paulo - SP',
    neighborhood: 'Moema',
    city: 'São Paulo',
    serialNumber: 'MA-000032',
    serviceOrder: 'OS-000032',
    notes: 'Integração com Alexa e aplicativo Tuya/Smart Life.',
    createdAt: new Date().toISOString(),
  },
];

export function getInitialAppointments(): Appointment[] {
  const today = getTodayString();
  const d = new Date(`${today}T12:00:00`);
  
  // Tomorrow
  const tom = new Date(d);
  tom.setDate(d.getDate() + 1);
  const tomStr = tom.toISOString().split('T')[0];

  // 2 days after
  const after2 = new Date(d);
  after2.setDate(d.getDate() + 2);
  const after2Str = after2.toISOString().split('T')[0];

  // 3 days after
  const after3 = new Date(d);
  after3.setDate(d.getDate() + 3);
  const after3Str = after3.toISOString().split('T')[0];

  return [
    {
      id: 'appt-1',
      clientId: 'cli-1',
      clientName: 'Carlos Eduardo Silva',
      clientPhone: '(11) 98765-4321',
      address: 'Av. Paulista, 1578, Apto 142 - Bela Vista, São Paulo - SP',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      date: today,
      startTime: '09:00',
      endTime: '10:30',
      durationMinutes: 90,
      serviceType: 'instalacao_sobrepor',
      serviceTypeName: 'Instalação Fechadura Sobrepor',
      description: 'Instalação de fechadura digital Intelbras FR 101 em porta de madeira maciça.',
      lockModel: 'Intelbras FR 101',
      price: 250,
      paymentMethod: 'pix',
      status: 'pendente',
      reminderMinutesBefore: 60,
      notes: 'Cliente já comprou a fechadura. Fazer furação e teste das senhas.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'appt-2',
      clientId: 'cli-2',
      clientName: 'Dra. Mariana Vasconcelos',
      clientPhone: '(11) 97123-8899',
      address: 'Rua Oscar Freire, 920, Sala 504 - Jardins, São Paulo - SP',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      date: today,
      startTime: '14:00',
      endTime: '16:00',
      durationMinutes: 120,
      serviceType: 'instalacao_embutir',
      serviceTypeName: 'Instalação Fechadura Embutir',
      description: 'Instalação de fechadura biométrica Yale YMC 420D com maçaneta embutida.',
      lockModel: 'Yale YMC 420D',
      price: 420,
      paymentMethod: 'cartao_credito',
      status: 'pendente',
      reminderMinutesBefore: 30,
      notes: 'Porta pivotante. Requer rebaixo com tupia/formão.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'appt-3',
      clientId: 'cli-3',
      clientName: 'Roberto Mendes (Condomínio Solar)',
      clientPhone: '(11) 99456-1122',
      address: 'Rua Vergueiro, 2300, Bloco B - Vila Mariana, São Paulo - SP',
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      date: tomStr,
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      serviceType: 'manutencao_preventiva',
      serviceTypeName: 'Manutenção Preventiva',
      description: 'Revisão geral, troca de baterias e lubrificação das travas de 4 portas de acesso.',
      lockModel: 'Intelbras IFR 7000',
      price: 380,
      paymentMethod: 'faturado',
      status: 'pendente',
      reminderMinutesBefore: 60,
      notes: 'Emitir nota/recibo para o condomínio.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'appt-4',
      clientId: 'cli-4',
      clientName: 'Patrícia Albuquerque',
      clientPhone: '(11) 96321-7744',
      address: 'Al. dos Anapurus, 740, Casa 3 - Moema, São Paulo - SP',
      neighborhood: 'Moema',
      city: 'São Paulo',
      date: after2Str,
      startTime: '15:30',
      endTime: '17:00',
      durationMinutes: 90,
      serviceType: 'automacao_alexa_google',
      serviceTypeName: 'Automação & Hub Zigbee/Alexa',
      description: 'Configuração de gateway Zigbee Tuya e integração de rotinas de voz com Alexa.',
      lockModel: 'Tuya Smart Lock Zigbee',
      price: 220,
      paymentMethod: 'pix',
      status: 'pendente',
      reminderMinutesBefore: 60,
      notes: 'Rede Wi-Fi 2.4GHz necessária.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'appt-5',
      clientId: 'cli-1',
      clientName: 'Carlos Eduardo Silva',
      clientPhone: '(11) 98765-4321',
      address: 'Av. Paulista, 1578, Apto 142 - Bela Vista, São Paulo - SP',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      date: after3Str,
      startTime: '08:30',
      endTime: '10:00',
      durationMinutes: 90,
      serviceType: 'orcamento_tecnico',
      serviceTypeName: 'Visita Técnica e Orçamento',
      description: 'Avaliação de portas corta-fogo para colocação de fechaduras biométricas.',
      lockModel: 'A definir',
      price: 100,
      paymentMethod: 'pix',
      status: 'pendente',
      reminderMinutesBefore: 60,
      notes: 'Abater valor da visita se aprovar o serviço.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function loadClients(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
      return INITIAL_CLIENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CLIENTS;
  }
}

export function saveClients(clients: Client[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  } catch (err) {
    console.error('Failed to save clients:', err);
  }
}

export function loadAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (!raw) {
      const initial = getInitialAppointments();
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialAppointments();
  }
}

export function saveAppointments(appts: Appointment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appts));
  } catch (err) {
    console.error('Failed to save appointments:', err);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    if (parsed.pixKey === 'maiconbentes23@gmail.com') {
      parsed.pixKey = 'Maiconautomacaosc@gmail.com';
      saveSettings({ ...DEFAULT_SETTINGS, ...parsed });
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function getInitialQuotes(): Quote[] {
  const today = getTodayString();
  return [
    {
      id: 'orc-1',
      code: 'ORC-2026-001',
      clientId: 'cli-2',
      clientName: 'Dra. Mariana Vasconcelos',
      clientPhone: '(11) 97123-8899',
      address: 'Rua Oscar Freire, 920, Sala 504 - Jardins, São Paulo - SP',
      neighborhood: 'Jardins',
      city: 'São Paulo',
      lockModel: 'Yale YMC 420D (Biométrica)',
      doorType: 'Porta de Madeira Pivotante 45mm',
      items: [
        {
          id: 'item-1',
          description: 'Instalação de Fechadura Biométrica de Embutir com Maçaneta',
          quantity: 1,
          unitPrice: 280,
          total: 280,
          isPredefined: true,
        },
        {
          id: 'item-2',
          description: 'Usinagem e Rebaixo Especial em Porta Pivotante',
          quantity: 1,
          unitPrice: 100,
          total: 100,
          isPredefined: false,
        },
        {
          id: 'item-3',
          description: 'Configuração de Biometrias, Tags e Senhas de Usuários',
          quantity: 1,
          unitPrice: 0,
          total: 0,
          isPredefined: true,
        },
      ],
      discountAmount: 20,
      totalAmount: 360,
      paymentTerms: 'À vista via Pix com desconto ou até 3x sem juros no cartão de crédito',
      validityDays: 15,
      warrantyInfo: 'Garantia de 90 dias para a instalação e suporte pós-venda',
      notes: 'Instalação agendada após aprovação formal.',
      status: 'aprovado',
      date: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'orc-2',
      code: 'ORC-2026-002',
      clientId: 'cli-4',
      clientName: 'Patrícia Albuquerque',
      clientPhone: '(11) 96321-7744',
      address: 'Al. dos Anapurus, 740, Casa 3 - Moema, São Paulo - SP',
      neighborhood: 'Moema',
      city: 'São Paulo',
      lockModel: 'Tuya Smart Lock Zigbee + Hub Wi-Fi',
      doorType: 'Porta de Entrada Social de Alumínio',
      items: [
        {
          id: 'item-2-1',
          description: 'Instalação de Fechadura Digital de Sobrepor',
          quantity: 1,
          unitPrice: 200,
          total: 200,
          isPredefined: true,
        },
        {
          id: 'item-2-2',
          description: 'Configuração de Hub Zigbee & Automação com Alexa e Rotinas',
          quantity: 1,
          unitPrice: 150,
          total: 150,
          isPredefined: true,
        },
      ],
      discountAmount: 0,
      totalAmount: 350,
      paymentTerms: 'Pix ou Cartão de Débito/Crédito na finalização',
      validityDays: 10,
      warrantyInfo: 'Garantia de 90 dias nos serviços executados',
      notes: 'Necessário sinal Wi-Fi 2.4GHz ativo próximo à porta.',
      status: 'pendente',
      date: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function loadQuotes(): Quote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (!raw) {
      const initial = getInitialQuotes();
      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialQuotes();
  }
}

export function saveQuotes(quotes: Quote[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
  } catch (err) {
    console.error('Failed to save quotes:', err);
  }
}

export function exportBackupData(): string {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    clients: loadClients(),
    appointments: loadAppointments(),
    quotes: loadQuotes(),
    settings: loadSettings(),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (Array.isArray(data.clients) && Array.isArray(data.appointments)) {
      saveClients(data.clients);
      saveAppointments(data.appointments);
      if (Array.isArray(data.quotes)) {
        saveQuotes(data.quotes);
      }
      if (data.settings) {
        saveSettings(data.settings);
      }
      return true;
    }
    return false;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}
