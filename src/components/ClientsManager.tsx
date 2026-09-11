import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  MessageSquare, 
  CalendarPlus, 
  Edit3, 
  Trash2, 
  History, 
  CheckCircle2, 
  X, 
  Save, 
  KeyRound,
  FileText,
  Tag,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  ShieldX,
  ChevronRight
} from 'lucide-react';
import { Client, Appointment, EquipmentRecord, PaymentRecord, CommercialClosing } from '../types';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import { getClientEquipmentRecords, getEquipmentHistory, getEquipmentWarrantySummary, WarrantyState } from '../utils/warranty';
import { openWhatsApp } from '../utils/whatsapp';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { CommercialClosingModal } from './CommercialClosingModal';
import { loadCommercialClosings, saveCommercialClosings, nextClosingId, findClosingForAppointment } from '../utils/commercialClosings';

interface ClientsManagerProps {
  clients: Client[];
  appointments: Appointment[];
  onSaveClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onScheduleForClient: (client: Client) => void;
  onScheduleMaintenance: (client: Client, equipment: EquipmentRecord) => void;
  onOpenWhatsAppForAppt: (appt: Appointment) => void;
  onQuoteForClient?: (client: Client) => void;
  onUpdateEquipment?: (client: Client, equipment: EquipmentRecord) => Promise<void> | void;
  onUpdateAppointmentFinancial?: (appointment: Appointment) => Promise<void> | void;
  sandboxActive?: boolean;
}

export const ClientsManager: React.FC<ClientsManagerProps> = ({
  clients,
  appointments,
  onSaveClient,
  onDeleteClient,
  onScheduleForClient,
  onScheduleMaintenance,
  onQuoteForClient,
  onUpdateEquipment,
  onUpdateAppointmentFinancial,
  sandboxActive = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRecord | null>(null);
  const [isWarrantyCenterOpen, setIsWarrantyCenterOpen] = useState(false);
  const [warrantyFilter, setWarrantyFilter] = useState<WarrantyState | 'todos'>('todos');
  const [warrantySearch, setWarrantySearch] = useState('');
  const [editingEquipment, setEditingEquipment] = useState<EquipmentRecord | null>(null);
  const [equipmentBrand, setEquipmentBrand] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [equipmentManufacturerSerial, setEquipmentManufacturerSerial] = useState('');
  const [equipmentDescription, setEquipmentDescription] = useState('');
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [editingFinance, setEditingFinance] = useState<Appointment | null>(null);
  const [financePrice, setFinancePrice] = useState('');
  const [financeMethod, setFinanceMethod] = useState<Appointment['paymentMethod']>('pix');
  const [financePayments, setFinancePayments] = useState<PaymentRecord[]>([]);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentRecord['method']>('pix');
  const [payKind, setPayKind] = useState<PaymentRecord['kind']>('sinal');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0,10));
  const [payNote, setPayNote] = useState('');
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [savingFinance, setSavingFinance] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<PaymentRecord | null>(null);
  const [commercialClosings, setCommercialClosings] = useState<CommercialClosing[]>(() => loadCommercialClosings(sandboxActive));
  const [closingPreview, setClosingPreview] = useState<CommercialClosing | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');


  const openNewClientModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setAddress('');
    setNeighborhood('');
    setCity('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setAddress(client.address);
    setNeighborhood(client.neighborhood || '');
    setCity(client.city || '');
    setNotes(client.notes || '');
    setIsModalOpen(true);
  };

  const openPaymentReceipt = (payment: PaymentRecord) => setReceiptPreview(payment);

  const openCommercialClosing = (appointment: Appointment) => {
    const latest = loadCommercialClosings(sandboxActive);
    setCommercialClosings(latest);
    const existing = findClosingForAppointment(latest, appointment.id);
    if (existing) { setClosingPreview(existing); return; }
    const now = new Date().toISOString();
    const migratedPayments = (appointment.payments || []).map((payment) => ({
      ...payment,
      origin: 'migrado_os' as const,
      sourceAppointmentId: appointment.id,
      sourceServiceOrder: appointment.serviceOrder,
    }));
    setClosingPreview({
      id: nextClosingId(latest),
      clientId: appointment.clientId,
      clientName: appointment.clientName,
      appointmentIds: [appointment.id],
      appointmentValues: { [appointment.id]: appointment.price == null ? null : Number(appointment.price) },
      extraItems: [],
      discountType: 'valor',
      discountValue: 0,
      payments: migratedPayments,
      status: appointment.price == null ? 'em_composicao' : 'em_andamento',
      createdAt: now,
      updatedAt: now,
    });
  };
  const persistCommercialClosing = (closing: CommercialClosing) => {
    const current = loadCommercialClosings(sandboxActive);
    // Uma OS só pode pertencer a um fechamento comercial por vez. Remanejamento é explícito e atômico.
    const cleaned = current.map(c => c.id === closing.id ? c : ({...c, appointmentIds: c.appointmentIds.filter(id => !closing.appointmentIds.includes(id))}));
    const next = [...cleaned.filter(c=>c.id!==closing.id && c.appointmentIds.length>0), closing];
    saveCommercialClosings(next, sandboxActive); setCommercialClosings(next); setClosingPreview(null);
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length <= 10) {
      formatted = digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      formatted = digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    setPhone(formatted.trim());
  };


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    const newClient: Client = {
      id: editingClient ? editingClient.id : `cli-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '(11) 99999-9999',
      address: address.trim() || 'A combinar',
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      serialNumber: editingClient?.serialNumber,
      serviceOrder: editingClient?.serviceOrder,
      equipment: editingClient?.equipment,
      notes: notes.trim(),
      driveFolderId: editingClient?.driveFolderId,
      driveFolderUrl: editingClient?.driveFolderUrl,
      createdAt: editingClient ? editingClient.createdAt : new Date().toISOString(),
    };

    onSaveClient(newClient);
    setIsModalOpen(false);
  };

  const warrantyRecords = clients.flatMap(client =>
    getClientEquipmentRecords(client, appointments).map(eq => {
      const history = getEquipmentHistory(appointments, client.id, client.name, eq.serialNumber);
      const summary = getEquipmentWarrantySummary(eq, history);
      return { client, eq, history, summary };
    })
  );

  const filteredWarrantyRecords = warrantyRecords.filter(({ client, eq, summary }) => {
    const q = warrantySearch.trim().toLowerCase();
    const matchesSearch = !q ||
      client.name.toLowerCase().includes(q) ||
      eq.serialNumber.toLowerCase().includes(q) ||
      (eq.brand || '').toLowerCase().includes(q) ||
      (eq.model || '').toLowerCase().includes(q);
    const matchesFilter = warrantyFilter === 'todos' || summary.overall === warrantyFilter;
    return matchesSearch && matchesFilter;
  });

  const warrantyCounts = warrantyRecords.filter(item => !item.client.isTestClient).reduce((acc, item) => {
    acc[item.summary.overall] = (acc[item.summary.overall] || 0) + 1;
    return acc;
  }, { ativa: 0, vencendo: 0, vencida: 0, sem_garantia: 0 } as Record<WarrantyState, number>);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.neighborhood && c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.serialNumber && c.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.serviceOrder && c.serviceOrder.toLowerCase().includes(searchTerm.toLowerCase())) ||
    getClientEquipmentRecords(c, appointments).some(eq =>
      eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.model || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-4">
      {/* Header with Search and New Client Button */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Banco de Clientes
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsWarrantyCenterOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800 text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Central de Garantias</span>
            </button>
            <button
              id="btn-new-client-top"
              onClick={openNewClientModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-lg shadow-cyan-950/40 active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Cadastrar Cliente</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative pt-1 border-t border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, telefone, N° de Série (ex: MA-000029), OS (ex: OS-000029) ou endereço..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full p-10 text-center rounded-3xl bg-zinc-900 border border-dashed border-zinc-800 space-y-3">
            <Users className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhum cliente encontrado</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Cadastre novos clientes com N° de Série (MA-XXXXXX) e Ordem de Serviço (OS-XXXXXX) para controle e garantia de fechaduras.
            </p>
            <button
              onClick={openNewClientModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold shadow-md shadow-cyan-950/40 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              Cadastrar Primeiro Cliente
            </button>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientAppts = appointments.filter(
              a => a.clientId === client.id || a.clientName.toLowerCase() === client.name.toLowerCase()
            );
            const completedCount = clientAppts.filter(a => a.status === 'concluido').length;
            const totalSpent = clientAppts
              .filter(a => a.status === 'concluido' && a.price)
              .reduce((acc, c) => acc + (c.price || 0), 0);

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-3 hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white text-sm">{client.name}</h3>{client.isTestClient && <span className="px-2 py-0.5 rounded-full border border-violet-700 bg-violet-950/60 text-violet-300 text-[9px] font-black tracking-wider">TESTE</span>}</div>
                      <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{client.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditClientModal(client)}
                        className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                        title="Editar cliente"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (client.isTestClient) {
                            alert('Este é o ambiente permanente de testes e está protegido contra exclusão acidental.');
                            return;
                          }
                          if (window.confirm(`Deseja excluir o cliente "${client.name}"?`)) onDeleteClient(client.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${client.isTestClient ? 'bg-zinc-950 text-zinc-700 cursor-not-allowed' : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 cursor-pointer'}`}
                        title={client.isTestClient ? 'Cliente Teste protegido' : 'Excluir'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Serial Number & Service Order Badges */}
                  {(client.serialNumber || client.serviceOrder) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {client.serialNumber && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 text-[11px] font-mono font-bold shadow-xs">
                          <Tag className="w-3 h-3 text-cyan-400" />
                          <span>Série: {client.serialNumber}</span>
                        </span>
                      )}
                      {client.serviceOrder && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-700/60 text-amber-300 text-[11px] font-mono font-bold shadow-xs">
                          <ClipboardList className="w-3 h-3 text-amber-400" />
                          <span>OS: {client.serviceOrder}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  <div className="flex items-start gap-1.5 text-xs text-zinc-300 bg-zinc-950 p-2 rounded-xl border border-zinc-800 mt-2.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>

                  {/* Notes if any */}
                  {client.notes && (
                    <div className="text-[11px] text-zinc-400 bg-zinc-950/70 p-2 rounded-lg border border-zinc-800 mt-1.5">
                      💬 <span className="text-zinc-300">{client.notes}</span>
                    </div>
                  )}

                  {/* Badges metrics */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-2">
                    <span>
                      {clientAppts.length} serv. ({completedCount} conc.)
                    </span>
                    {totalSpent > 0 && (
                      <span className="font-semibold text-emerald-400">
                        {formatCurrencyBRL(totalSpent)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick actions for client */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => onScheduleForClient(client)}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Agendar</span>
                  </button>

                  {onQuoteForClient && (
                    <button
                      onClick={() => onQuoteForClient(client)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Orçar</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const msg = `Olá, ${client.name}! Aqui é o Maicon da Maicon Automação (Fechaduras Eletrônicas).${client.serialNumber ? ` Ref. Fechadura Nº de Série ${client.serialNumber}.` : ''} Tudo bem? Como posso te ajudar hoje?`;
                      openWhatsApp(client.phone, msg, 'standard');
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/40 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedClientForHistory(client);
                      setSelectedEquipment(null);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Equipamentos</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Central de Garantias */}
      {isWarrantyCenterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300"><ShieldCheck className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-bold text-white">Central de Garantias</h3>
                  <p className="text-[11px] text-zinc-400">Acompanhamento por MA • instalação e produto</p>
                </div>
              </div>
              <button onClick={() => setIsWarrantyCenterOpen(false)} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 border-b border-zinc-800 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  ['ativa', 'Ativas', warrantyCounts.ativa, 'text-emerald-300 border-emerald-800 bg-emerald-950/40'],
                  ['vencendo', 'Até 30 dias', warrantyCounts.vencendo, 'text-amber-300 border-amber-800 bg-amber-950/40'],
                  ['vencida', 'Vencidas', warrantyCounts.vencida, 'text-rose-300 border-rose-800 bg-rose-950/40'],
                  ['sem_garantia', 'Sem garantia', warrantyCounts.sem_garantia, 'text-zinc-300 border-zinc-700 bg-zinc-950'],
                ] as const).map(([key, label, count, cls]) => (
                  <button key={key} onClick={() => setWarrantyFilter(warrantyFilter === key ? 'todos' : key)} className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${cls} ${warrantyFilter === key ? 'ring-2 ring-cyan-500/70' : ''}`}>
                    <div className="text-xl font-black">{count}</div><div className="text-[10px] font-bold uppercase tracking-wide">{label}</div>
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input value={warrantySearch} onChange={e => setWarrantySearch(e.target.value)} placeholder="Buscar cliente, MA, marca ou modelo..." className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500" />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {filteredWarrantyRecords.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800 text-zinc-500">Nenhum equipamento encontrado neste filtro.</div>
              ) : filteredWarrantyRecords
                  .sort((a, b) => a.eq.serialNumber.localeCompare(b.eq.serialNumber))
                  .map(({ client, eq, history, summary }) => {
                    const statusMap = {
                      ativa: { label: 'Garantia ativa', cls: 'bg-emerald-950 text-emerald-300 border-emerald-800', icon: ShieldCheck },
                      vencendo: { label: 'Vence em até 30 dias', cls: 'bg-amber-950 text-amber-300 border-amber-800', icon: AlertTriangle },
                      vencida: { label: 'Garantia vencida', cls: 'bg-rose-950 text-rose-300 border-rose-800', icon: ShieldX },
                      sem_garantia: { label: 'Sem garantia', cls: 'bg-zinc-950 text-zinc-400 border-zinc-700', icon: ShieldX },
                    }[summary.overall];
                    const StatusIcon = statusMap.icon;
                    return (
                      <button key={`${client.id}-${eq.serialNumber}`} onClick={() => { setSelectedClientForHistory(client); setSelectedEquipment(eq); setIsWarrantyCenterOpen(false); }} className="w-full text-left p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-cyan-800 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2"><span className="font-mono font-bold text-cyan-300">{eq.serialNumber}</span><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusMap.cls}`}><StatusIcon className="w-3 h-3" />{statusMap.label}</span></div>
                            <div className="text-white font-bold mt-1 truncate">{client.name}</div>
                            <div className="text-zinc-400 text-[11px] mt-0.5">{[eq.brand, eq.model].filter(Boolean).join(' ') || eq.description || 'Equipamento'} • {history.length} atendimento{history.length !== 1 ? 's' : ''}</div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-zinc-500">
                              <span>Instalação: <b className="text-zinc-300">{summary.installation.period || 'Não informada'}</b>{summary.installation.endDate ? ` • até ${formatDateBR(summary.installation.endDate)}` : ''}</span>
                              <span>Produto: <b className="text-zinc-300">{summary.product.period || 'Não informada'}</b>{summary.product.endDate ? ` • até ${formatDateBR(summary.product.endDate)}` : ''}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0 mt-1" />
                        </div>
                      </button>
                    );
                  })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Client History Popover */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Histórico de Atendimentos</h3>
                  <p className="text-xs text-zinc-400">{selectedClientForHistory.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client header badge with serial number and OS */}
            {(selectedClientForHistory.serialNumber || selectedClientForHistory.serviceOrder) && (
              <div className="px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800 flex flex-wrap items-center gap-2">
                {selectedClientForHistory.serialNumber && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-bold">
                    <Tag className="w-3 h-3 text-cyan-400" />
                    <span>N° Série: {selectedClientForHistory.serialNumber}</span>
                  </span>
                )}
                {selectedClientForHistory.serviceOrder && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-950 border border-amber-700/60 text-amber-300 text-xs font-mono font-bold">
                    <ClipboardList className="w-3 h-3 text-amber-400" />
                    <span>OS: {selectedClientForHistory.serviceOrder}</span>
                  </span>
                )}
              </div>
            )}

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {!selectedEquipment ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">Equipamentos cadastrados</div>
                      <div className="text-zinc-500 text-[11px]">Cada MA acompanha o equipamento durante toda a vida útil.</div>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      {getClientEquipmentRecords(selectedClientForHistory, appointments).length} MA
                    </span>
                  </div>

                  {getClientEquipmentRecords(selectedClientForHistory, appointments).length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 text-zinc-400">
                      Nenhum equipamento com MA cadastrado para este cliente.
                    </div>
                  ) : getClientEquipmentRecords(selectedClientForHistory, appointments).map(eq => {
                    const eqHistory = getEquipmentHistory(appointments, selectedClientForHistory.id, selectedClientForHistory.name, eq.serialNumber);
                    return (
                      <button key={eq.id || eq.serialNumber} onClick={() => setSelectedEquipment(eq)} className="w-full text-left p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-cyan-800 transition-colors cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono font-bold text-cyan-300">{eq.serialNumber}</div>
                            <div className="text-white font-semibold mt-1">{[eq.brand, eq.model].filter(Boolean).join(' ') || eq.description || 'Equipamento sem marca/modelo'}</div>
                            <div className="text-zinc-500 text-[11px] mt-1">{eq.serviceTypeName || 'Equipamento cadastrado'} • {eqHistory.length} atendimento{eqHistory.length !== 1 ? 's' : ''}</div>
                          </div>
                          <KeyRound className="w-5 h-5 text-cyan-400 shrink-0" />
                        </div>
                      </button>
                    );
                  })}

                  <div className="pt-2 border-t border-zinc-800">
                    <div className="text-zinc-400 font-bold mb-2">Histórico geral do cliente</div>
                    {appointments.filter(a => a.clientId === selectedClientForHistory.id || a.clientName.toLowerCase() === selectedClientForHistory.name.toLowerCase()).sort((a,b) => b.date.localeCompare(a.date)).slice(0,5).map(a => (
                      <div key={a.id} className="p-2.5 mb-2 rounded-xl bg-zinc-950 border border-zinc-800 flex justify-between gap-2">
                        <span className="text-zinc-200">{formatDateBR(a.date)} • {a.serviceTypeName}</span>
                        {a.serviceOrder && <span className="font-mono text-amber-300">{a.serviceOrder}</span>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (() => {
                const history = getEquipmentHistory(appointments, selectedClientForHistory.id, selectedClientForHistory.name, selectedEquipment.serialNumber).reverse();
                const warranty = getEquipmentWarrantySummary(selectedEquipment, [...history].reverse());
                return (
                  <>
                    <button onClick={() => setSelectedEquipment(null)} className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer">← Voltar aos equipamentos</button>
                    <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/60">
                      <div className="font-mono text-cyan-300 font-bold text-base">{selectedEquipment.serialNumber}</div>
                      <div className="text-white font-bold mt-1">{[selectedEquipment.brand, selectedEquipment.model].filter(Boolean).join(' ') || selectedEquipment.description || 'Equipamento'}</div>
                      {selectedEquipment.manufacturerSerialNumber && <div className="text-zinc-400 mt-1">Série fabricante: {selectedEquipment.manufacturerSerialNumber}</div>}
                      {selectedEquipment.description && (
                        <div className="mt-3 p-2.5 rounded-xl bg-zinc-950/70 border border-cyan-900/70">
                          <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold">Local do equipamento</div>
                          <div className="text-zinc-200 font-semibold mt-1">{selectedEquipment.description}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                          <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold">Garantia instalação</div>
                          <div className="text-zinc-200 font-semibold mt-1">{warranty.installation.period || 'Não informada'}</div>
                          {warranty.installation.endDate && <div className="text-[11px] text-zinc-400 mt-0.5">Vence em {formatDateBR(warranty.installation.endDate)}</div>}
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                          <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-bold">Garantia produto</div>
                          <div className="text-zinc-200 font-semibold mt-1">{warranty.product.period || 'Não informada'}</div>
                          {warranty.product.endDate && <div className="text-[11px] text-zinc-400 mt-0.5">Vence em {formatDateBR(warranty.product.endDate)}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button onClick={() => { setEditingEquipment(selectedEquipment); setEquipmentBrand(selectedEquipment.brand || ''); setEquipmentModel(selectedEquipment.model || ''); setEquipmentManufacturerSerial(selectedEquipment.manufacturerSerialNumber || ''); setEquipmentDescription(selectedEquipment.description || ''); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold cursor-pointer">
                        <Edit3 className="w-4 h-4" /> Editar dados do equipamento
                      </button>
                      <button onClick={() => { onScheduleMaintenance(selectedClientForHistory, selectedEquipment); setSelectedClientForHistory(null); setSelectedEquipment(null); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold cursor-pointer">
                        <CalendarPlus className="w-4 h-4" /> Nova manutenção deste MA
                      </button>
                    </div>
                    <div className="text-white font-bold pt-1">Histórico do equipamento</div>
                    {history.length === 0 ? <div className="p-4 text-center text-zinc-500">Nenhum atendimento localizado para este MA.</div> : history.map(a => (
                      <div key={a.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                        <div className="flex justify-between gap-2"><span className="text-white font-bold">{a.serviceTypeName}</span><span className="font-mono text-amber-300">{a.serviceOrder || 'Sem OS'}</span></div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-zinc-400">📅 {formatDateBR(a.date)} às {a.startTime}</div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.status === 'concluido' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : a.status === 'cancelado' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>{a.status === 'concluido' ? 'Concluído' : a.status === 'cancelado' ? 'Cancelado' : 'Aberto'}</span>
                        </div>
                        {a.description && <div className="text-zinc-300">{a.description}</div>}
                        <div className="flex items-center justify-between gap-2"><div className="text-emerald-400 font-semibold">{a.price != null ? formatCurrencyBRL(a.price) : 'Valor ainda não definido'}</div><button onClick={()=>openCommercialClosing(a)} className="px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-200 font-bold">Abrir financeiro da OS</button></div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Client */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]">
            <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>


              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1578, Apto 142"
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bela Vista"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade (opcional)"
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Observações / Tipo de Fechadura</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Portaria com identificação facial, fechadura Intelbras FR101..."
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md shadow-cyan-950/40 cursor-pointer"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingFinance && (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-700 shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between gap-3"><div><div className="text-white font-black text-lg">Financeiro do atendimento</div><div className="text-amber-300 font-mono text-sm">OS {editingFinance.serviceOrder || 'sem OS'}</div></div><button onClick={()=>setEditingFinance(null)} className="p-2 rounded-xl bg-zinc-900 text-zinc-400"><X className="w-5 h-5"/></button></div>
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/60 p-3 text-xs text-emerald-200">Correção segura: valor e pagamentos podem ser ajustados sem reabrir o atendimento e sem alterar MA, QR, OS ou data.</div>
            <div className="grid grid-cols-2 gap-2"><div><label className="text-xs text-zinc-400">Valor total</label><input type="number" step="0.01" min="0" value={financePrice} onChange={e=>setFinancePrice(e.target.value)} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white"/></div><div><label className="text-xs text-zinc-400">Forma combinada</label><select value={financeMethod} onChange={e=>setFinanceMethod(e.target.value as Appointment['paymentMethod'])} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white"><option value="pix">Pix</option><option value="cartao_credito">Cartão crédito</option><option value="cartao_debito">Cartão débito</option><option value="dinheiro">Dinheiro</option><option value="faturado">Faturado</option><option value="a_combinar">A combinar</option></select></div></div>
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="font-bold text-white">{editPaymentId ? 'Corrigir recebimento' : 'Registrar recebimento'}</div>
              <div className="grid grid-cols-2 gap-2"><input type="number" step="0.01" min="0" placeholder="Valor recebido" value={payAmount} onChange={e=>setPayAmount(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"/><select value={payKind} onChange={e=>setPayKind(e.target.value as PaymentRecord['kind'])} className="bg-zinc-950 border border-zinc-700 rounded-xl px-2 py-2 text-white"><option value="sinal">Sinal / entrada</option><option value="pagamento">Pagamento</option><option value="pagamento_final">Pagamento final</option></select></div>
              <div className="grid grid-cols-2 gap-2"><select value={payMethod} onChange={e=>setPayMethod(e.target.value as PaymentRecord['method'])} className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"><option value="pix">Pix</option><option value="cartao_credito">Cartão crédito</option><option value="cartao_debito">Cartão débito</option><option value="dinheiro">Dinheiro</option><option value="faturado">Faturado</option></select><input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"/></div>
              <input value={payNote} onChange={e=>setPayNote(e.target.value)} placeholder="Observação (opcional)" className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white"/>
              <div className="flex gap-2"><button onClick={()=>{const amount=Number(payAmount); if(!amount||amount<=0)return; if(editPaymentId){setFinancePayments(items=>items.map(item=>item.id===editPaymentId?{...item,amount,method:payMethod,kind:payKind,date:payDate||item.date,note:payNote.trim()||undefined}:item));}else{setFinancePayments(items=>[...items,{id:`pay-${Date.now()}`,amount,method:payMethod,kind:payKind,date:payDate||new Date().toISOString().slice(0,10),note:payNote.trim()||undefined,createdAt:new Date().toISOString()}]);} setPayAmount(''); setPayNote(''); setPayDate(new Date().toISOString().slice(0,10)); setEditPaymentId(null);}} className="flex-1 py-2 rounded-xl bg-amber-500 text-black font-black">{editPaymentId?'Salvar correção':'+ Adicionar recebimento'}</button>{editPaymentId&&<button onClick={()=>{setEditPaymentId(null);setPayAmount('');setPayNote('');setPayDate(new Date().toISOString().slice(0,10));}} className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold">Cancelar</button>}</div>
            </div>
            <div className="space-y-2">{financePayments.map((p,i)=><div key={p.id} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center gap-2"><div className="min-w-0"><div className="text-white font-bold">{p.kind==='sinal'?'Sinal / entrada':p.kind==='pagamento_final'?'Pagamento final':'Pagamento'} • {formatCurrencyBRL(p.amount)}</div><div className="text-[11px] text-zinc-500">{p.method.replaceAll('_',' ')} • {formatDateBR(p.date)}{p.note?` • ${p.note}`:''}</div></div><div className="flex gap-1 shrink-0"><button onClick={()=>openPaymentReceipt(p)} className="text-cyan-300 px-2 font-bold">Recibo</button><button onClick={()=>{setEditPaymentId(p.id);setPayAmount(String(p.amount));setPayMethod(p.method);setPayKind(p.kind);setPayDate(p.date);setPayNote(p.note||'');}} className="text-amber-300 px-2 font-bold">Editar</button><button onClick={()=>{if(confirm('Excluir este recebimento? O saldo será recalculado.')) setFinancePayments(x=>x.filter((_,j)=>j!==i));}} className="text-rose-400 px-2">Excluir</button></div></div>)}</div>
            {(()=>{const total=Number(financePrice)||0; const received=financePayments.length?financePayments.reduce((n,p)=>n+p.amount,0):(editingFinance.status==='concluido' && editingFinance.payments===undefined ? total:0); const balance=Math.max(0,total-received); return <div className="grid grid-cols-3 gap-2 text-center"><div className="p-2 rounded-xl bg-zinc-900"><div className="text-[10px] text-zinc-500">TOTAL</div><div className="text-white font-bold">{formatCurrencyBRL(total)}</div></div><div className="p-2 rounded-xl bg-zinc-900"><div className="text-[10px] text-zinc-500">RECEBIDO</div><div className="text-emerald-400 font-bold">{formatCurrencyBRL(received)}</div></div><div className="p-2 rounded-xl bg-zinc-900"><div className="text-[10px] text-zinc-500">SALDO</div><div className="text-amber-300 font-bold">{formatCurrencyBRL(balance)}</div></div></div>})()}
            <button disabled={savingFinance} onClick={async()=>{const updated={...editingFinance,price:Number(financePrice)||0,paymentMethod:financeMethod,payments:financePayments}; setSavingFinance(true); try{await onUpdateAppointmentFinancial?.(updated); setEditingFinance(null);}finally{setSavingFinance(false)}}} className="w-full py-3 rounded-xl bg-cyan-500 text-black font-black disabled:opacity-50"><Save className="w-4 h-4 inline mr-2"/>{savingFinance?'Salvando...':'Salvar financeiro'}</button>
          </div>
        </div>
      )}


      {closingPreview && selectedClientForHistory && (
        <CommercialClosingModal closing={closingPreview} client={selectedClientForHistory} appointments={appointments} onSave={persistCommercialClosing} onClose={()=>setClosingPreview(null)} />
      )}

      {receiptPreview && editingFinance && (
        <PaymentReceiptModal
          appointment={editingFinance}
          payment={receiptPreview}
          payments={financePayments}
          totalServiceValue={Number(financePrice) || 0}
          onClose={() => setReceiptPreview(null)}
        />
      )}

      {editingEquipment && selectedClientForHistory && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-white font-black text-lg">Editar dados do equipamento</div><div className="text-cyan-300 font-mono text-sm mt-1">{editingEquipment.serialNumber}</div></div>
              <button onClick={() => setEditingEquipment(null)} className="p-2 rounded-xl bg-zinc-900 text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/60 p-3 text-xs text-emerald-200">Edição segura pós-finalização. MA, QR, OS e data original não serão alterados.</div>
            <div className="grid grid-cols-2 gap-2"><input value={equipmentBrand} onChange={e=>setEquipmentBrand(e.target.value)} placeholder="Marca" className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white outline-none"/><input value={equipmentModel} onChange={e=>setEquipmentModel(e.target.value)} placeholder="Modelo" className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white outline-none"/></div>
            <input value={equipmentManufacturerSerial} onChange={e=>setEquipmentManufacturerSerial(e.target.value)} placeholder="Nº de série do fabricante" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white outline-none"/>
            <input value={equipmentDescription} onChange={e=>setEquipmentDescription(e.target.value)} placeholder="Local do equipamento / descrição" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-white outline-none"/>
            <button disabled={savingEquipment} onClick={async()=>{ const updated={...editingEquipment,brand:equipmentBrand.trim()||undefined,model:equipmentModel.trim()||undefined,manufacturerSerialNumber:equipmentManufacturerSerial.trim()||undefined,description:equipmentDescription.trim()||undefined}; setSavingEquipment(true); try { await onUpdateEquipment?.(selectedClientForHistory, updated); setSelectedEquipment(updated); setEditingEquipment(null); } finally { setSavingEquipment(false); } }} className="w-full py-3 rounded-xl bg-cyan-500 text-black font-black disabled:opacity-50 flex items-center justify-center gap-2"><Save className="w-4 h-4"/>{savingEquipment?'Salvando...':'Salvar dados do equipamento'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

