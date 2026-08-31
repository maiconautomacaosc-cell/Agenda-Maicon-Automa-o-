import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  DollarSign, 
  KeyRound, 
  Bell, 
  Plus, 
  Check, 
  Sparkles,
  Users,
  AlertTriangle,
  Lock,
  Ban
} from 'lucide-react';
import { Appointment, Client, ServiceType, AppointmentStatus } from '../types';
import { getTodayString, formatDateBR } from '../utils/date';
import { getGoogleCalendarUrl, downloadNativeCalendarIcs } from '../utils/calendarSync';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAppointment: (appt: Appointment, saveClientToDb: boolean) => void;
  clients: Client[];
  initialAppointment?: Appointment | null;
  initialDate?: string;
  initialServiceType?: ServiceType;
  existingAppointments?: Appointment[];
}

const SERVICE_OPTIONS: { type: ServiceType; label: string; defaultDuration: number }[] = [
  { type: 'instalacao_sobrepor', label: 'Instalação Fechadura Sobrepor', defaultDuration: 90 },
  { type: 'instalacao_embutir', label: 'Instalação Fechadura Embutir (com mortise)', defaultDuration: 120 },
  { type: 'manutencao_preventiva', label: 'Manutenção Preventiva / Revisão', defaultDuration: 60 },
  { type: 'manutencao_corretiva', label: 'Manutenção Corretiva / Reparo', defaultDuration: 90 },
  { type: 'troca_bateria_config', label: 'Troca de Bateria & Reconfiguração', defaultDuration: 45 },
  { type: 'automacao_alexa_google', label: 'Automação Hub Zigbee / Alexa / Google', defaultDuration: 90 },
  { type: 'orcamento_tecnico', label: 'Visita Técnica / Orçamento', defaultDuration: 60 },
  { type: 'compromisso_particular', label: '🚫 Compromisso Particular (Dia Ocupado / Indisponível)', defaultDuration: 600 },
  { type: 'outro', label: 'Outro Serviço Personalizado', defaultDuration: 60 },
];

const QUICK_PARTICULAR_MOTIVES = [
  { label: '🩺 Consulta Médica', name: 'Consulta Médica' },
  { label: '🌴 Folga / Descanso', name: 'Folga / Descanso' },
  { label: '🚗 Viagem / Estrada', name: 'Viagem / Fora da Cidade' },
  { label: '🏠 Assuntos Pessoais', name: 'Assuntos Pessoais' },
  { label: '🛠️ Oficina / Ferramentas', name: 'Manutenção de Ferramentas / Oficina' },
  { label: '🎓 Treinamento / Curso', name: 'Curso / Treinamento' },
];

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  onSaveAppointment,
  clients,
  initialAppointment,
  initialDate,
  initialServiceType,
  existingAppointments = [],
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [date, setDate] = useState(initialDate || getTodayString());
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType || 'instalacao_sobrepor');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([initialServiceType || 'instalacao_sobrepor']);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<Appointment['paymentMethod']>('pix');
  const [status, setStatus] = useState<AppointmentStatus>('pendente');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(60);
  const [notes, setNotes] = useState('');
  const [saveClientToDb, setSaveClientToDb] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [isAllDayBlocked, setIsAllDayBlocked] = useState(false);

  useEffect(() => {
    if (initialAppointment) {
      setClientName(initialAppointment.clientName);
      setClientPhone(initialAppointment.clientPhone);
      setAddress(initialAppointment.address);
      setNeighborhood(initialAppointment.neighborhood || '');
      setDate(initialAppointment.date);
      setStartTime(initialAppointment.startTime);
      setDurationMinutes(initialAppointment.durationMinutes || 90);
      setServiceType(initialAppointment.serviceType);
      setServiceTypes(initialAppointment.serviceTypes?.length ? initialAppointment.serviceTypes : [initialAppointment.serviceType]);
      setDescription(initialAppointment.description || '');
      setPrice(initialAppointment.price ? String(initialAppointment.price) : '');
      setPaymentMethod(initialAppointment.paymentMethod || 'pix');
      setStatus(initialAppointment.status);
      setReminderMinutesBefore(initialAppointment.reminderMinutesBefore ?? 60);
      setNotes(initialAppointment.notes || '');
      setSelectedClientId(initialAppointment.clientId || '');
      setIsAllDayBlocked(initialAppointment.serviceType === 'compromisso_particular' && initialAppointment.durationMinutes >= 480);
    } else {
      // Reset form
      const st = initialServiceType || 'instalacao_sobrepor';
      setServiceType(st);
      setServiceTypes([st]);
      if (st === 'compromisso_particular') {
        setClientName('Compromisso Particular');
        setClientPhone('(11) 99999-9999');
        setAddress('Particular');
        setStartTime('08:00');
        setDurationMinutes(600); // 10h (08:00 às 18:00)
        setIsAllDayBlocked(true);
        setDescription('Dia reservado para compromisso particular / indisponível para atendimento');
      } else {
        setClientName('');
        setClientPhone('');
        setAddress('');
        setNeighborhood('');
        setStartTime('09:00');
        setDurationMinutes(90);
        setIsAllDayBlocked(false);
        setDescription('');
      }
      setDate(initialDate || getTodayString());
      setPrice('');
      setPaymentMethod('pix');
      setStatus('pendente');
      setReminderMinutesBefore(60);
      setNotes('');
      setSelectedClientId('');
    }
  }, [initialAppointment, initialDate, initialServiceType, isOpen]);

  if (!isOpen) return null;

  const isParticular = serviceTypes.includes('compromisso_particular');

  // Check if chosen date already has a compromisso_particular
  const existingDayBlocks = existingAppointments.filter(
    (a) => a.date === date && a.serviceType === 'compromisso_particular' && a.status !== 'cancelado' && a.id !== initialAppointment?.id
  );

  const handleSelectClient = (c: Client) => {
    setSelectedClientId(c.id);
    setClientName(c.name);
    setClientPhone(c.phone);
    setAddress(c.address);
    if (c.neighborhood) setNeighborhood(c.neighborhood);
    setShowClientSuggestions(false);
  };

  const handleServiceChange = (st: ServiceType) => {
    if (st === 'compromisso_particular') {
      setServiceType(st);
      setServiceTypes([st]);
      const found = SERVICE_OPTIONS.find(o => o.type === st);
      if (found && !initialAppointment) setDurationMinutes(found.defaultDuration);
      if (!clientName || clientName.trim() === '') setClientName('Compromisso Particular');
      setStartTime('08:00');
      setIsAllDayBlocked(true);
      if (!address) setAddress('Particular');
      if (!clientPhone) setClientPhone('(11) 99999-9999');
      if (!description) setDescription('Dia reservado para compromisso particular / indisponível para atendimento');
      return;
    }

    setIsAllDayBlocked(false);
    setServiceTypes(prev => {
      const withoutParticular = prev.filter(t => t !== 'compromisso_particular');
      const exists = withoutParticular.includes(st);
      const next = exists ? withoutParticular.filter(t => t !== st) : [...withoutParticular, st];
      // Nunca deixa um atendimento técnico sem nenhum tipo marcado.
      if (next.length === 0) return withoutParticular;
      setServiceType(next[0]);
      if (!initialAppointment && !exists) {
        const found = SERVICE_OPTIONS.find(o => o.type === st);
        if (found) setDurationMinutes(current => Math.max(current, found.defaultDuration));
      }
      return next;
    });
  };

  const handleToggleAllDay = (checked: boolean) => {
    setIsAllDayBlocked(checked);
    if (checked) {
      setStartTime('08:00');
      setDurationMinutes(600); // 10h -> 18:00
    } else {
      setStartTime('09:00');
      setDurationMinutes(120);
    }
  };

  // Format phone number live
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length <= 10) {
      // (XX) XXXX-XXXX
      formatted = digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      // (XX) XXXXX-XXXX
      formatted = digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    setClientPhone(formatted.trim());
  };

  const calculateEndTime = () => {
    const [h, m] = startTime.split(':').map(Number);
    const totalMin = (h || 0) * 60 + (m || 0) + durationMinutes;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert(isParticular ? 'Por favor, informe o motivo do compromisso particular.' : 'Por favor, informe o nome do cliente.');
      return;
    }
    if (!date) {
      alert('Por favor, selecione a data.');
      return;
    }

    const selectedTechnicalTypes = serviceTypes.filter(t => t !== 'compromisso_particular');
    if (!isParticular && selectedTechnicalTypes.length === 0) {
      alert('Selecione pelo menos um tipo de atendimento.');
      return;
    }
    const serviceTypeName = selectedTechnicalTypes
      .map(t => SERVICE_OPTIONS.find(s => s.type === t)?.label || 'Outro Serviço')
      .join(' + ');
    const primaryServiceType = isParticular ? 'compromisso_particular' : selectedTechnicalTypes[0];

    const newAppt: Appointment = {
      id: initialAppointment ? initialAppointment.id : `appt-${Date.now()}`,
      clientId: selectedClientId || (isParticular ? 'cli-particular' : `cli-${Date.now()}`),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || (isParticular ? 'Particular' : '(11) 99999-9999'),
      address: address.trim() || (isParticular ? 'Compromisso Particular' : 'A combinar'),
      neighborhood: neighborhood.trim(),
      date,
      startTime,
      endTime: calculateEndTime(),
      durationMinutes,
      serviceType: primaryServiceType,
      serviceTypes: isParticular ? ['compromisso_particular'] : selectedTechnicalTypes,
      serviceTypeName: isParticular ? 'Compromisso Particular (Dia Ocupado)' : serviceTypeName,
      lockModel: initialAppointment?.lockModel || '',
      // MA e OS nunca são digitados no agendamento. Se já foram gerados na conclusão, apenas preserva.
      serialNumber: isParticular ? undefined : initialAppointment?.serialNumber,
      serviceOrder: isParticular ? undefined : initialAppointment?.serviceOrder,
      equipment: initialAppointment?.equipment,
      description: description.trim() || (isParticular ? 'Compromisso Particular / Bloqueio de Agenda' : serviceTypeName),
      price: price ? parseFloat(price.replace(',', '.')) : undefined,
      paymentMethod: isParticular ? 'a_combinar' : paymentMethod,
      status,
      reminderMinutesBefore,
      notes: notes.trim(),
      googleEventId: initialAppointment?.googleEventId,
      googleSyncedAt: initialAppointment?.googleSyncedAt,
      createdAt: initialAppointment ? initialAppointment.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveAppointment(newAppt, !isParticular && saveClientToDb);
    onClose();
  };

  const filteredClients = clients.filter(c => 
    clientName && c.name.toLowerCase().includes(clientName.toLowerCase()) && c.name.toLowerCase() !== clientName.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="appointment-modal-dialog"
        className={`w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh] border ${
          isParticular 
            ? 'bg-zinc-900 border-purple-800/60 shadow-purple-950/40' 
            : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isParticular 
            ? 'bg-purple-950/40 border-purple-800/40' 
            : 'bg-zinc-950 border-zinc-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isParticular 
                ? 'bg-purple-900/60 border-purple-700 text-purple-300' 
                : 'bg-zinc-900 border-zinc-800 text-cyan-400'
            }`}>
              {isParticular ? <Ban className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isParticular
                  ? (initialAppointment ? 'Editar Compromisso Particular' : 'Bloquear Horário / Dia Ocupado')
                  : (initialAppointment ? 'Editar Agendamento' : 'Novo Agendamento & Cliente')}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {isParticular
                  ? 'Marca o dia como Ocupado para não agendar atendimentos'
                  : 'Instalação, Manutenção e Automação de Fechaduras'}
              </p>
            </div>
          </div>
          <button
            id="close-appointment-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Warning if day is already blocked with another personal commitment */}
        {existingDayBlocks.length > 0 && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-950/60 border border-amber-600/50 flex items-start gap-2.5 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Aviso de Agenda: </span>
              A data <span className="font-mono font-bold underline">{formatDateBR(date)}</span> já possui um compromisso particular registrado (
              {existingDayBlocks.map(b => b.clientName).join(', ')}).
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Service / Block Type Selector */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Tipo de Entrada na Agenda
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((opt) => {
                const selected = serviceTypes.includes(opt.type);
                const particular = opt.type === 'compromisso_particular';
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => handleServiceChange(opt.type)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      selected
                        ? particular
                          ? 'bg-purple-950/70 border-purple-500 text-purple-100'
                          : 'bg-cyan-950/60 border-cyan-500 text-cyan-100'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-zinc-600'}`}>
                        {selected && <Check className="w-3 h-3" />}
                      </span>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {!isParticular && (
              <p className="text-[11px] text-zinc-500">Você pode marcar mais de um tipo no mesmo atendimento. Ex.: 2 instalações sobrepor + 1 embutir continuam sendo uma única visita.</p>
            )}

            {/* If it's a personal commitment */}
            {isParticular && (
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Escolha rápida do motivo:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PARTICULAR_MOTIVES.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => {
                        setClientName(m.name);
                        setDescription(`Compromisso: ${m.name}`);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                        clientName === m.name
                          ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-purple-600 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Client or Motive Details */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                {isParticular ? <Ban className="w-3.5 h-3.5 text-purple-400" /> : <User className="w-3.5 h-3.5 text-cyan-400" />}
                {isParticular ? 'Motivo do Compromisso Particular' : 'Dados do Cliente'}
              </span>
              {!isParticular && clients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClientSuggestions(!showClientSuggestions)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  Buscar da Lista ({clients.length})
                </button>
              )}
            </div>

            {/* Client quick list popover if toggled */}
            {!isParticular && showClientSuggestions && clients.length > 0 && (
              <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-700 max-h-36 overflow-y-auto space-y-1">
                <div className="text-[10px] text-zinc-400 font-semibold px-1 font-mono">Clientes já cadastrados:</div>
                {clients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c)}
                    className="w-full text-left p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-200 text-xs flex justify-between items-center transition-colors"
                  >
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <label className="block text-zinc-300 font-semibold mb-1">
                {isParticular ? 'Título / Motivo do Bloqueio *' : 'Nome do Cliente *'}
              </label>
              <input
                id="input-client-name"
                type="text"
                required
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setSelectedClientId('');
                }}
                placeholder={isParticular ? "Ex: Consulta Médica, Viagem com a Família, Folga..." : "Ex: Carlos Eduardo ou Condomínio Solar"}
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              />

              {/* Auto-suggest dropdown while typing */}
              {!isParticular && filteredClients.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden max-h-36 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-cyan-500 hover:text-black font-semibold flex justify-between items-center cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.name}</span>
                        {c.serialNumber && (
                          <span className="text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded text-cyan-300 font-mono font-bold">
                            {c.serialNumber}
                          </span>
                        )}
                        {c.serviceOrder && (
                          <span className="text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded text-amber-300 font-mono font-bold">
                            {c.serviceOrder}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono opacity-80">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isParticular && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      Telefone / WhatsApp *
                    </label>
                    <input
                      id="input-client-phone"
                      type="text"
                      required
                      value={clientPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      Bairro / Cidade
                    </label>
                    <input
                      id="input-neighborhood"
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Moema, São Paulo"
                      className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    Endereço Completo com Número e Apto
                  </label>
                  <input
                    id="input-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Av. Paulista, 1578, Apto 142 - Bela Vista"
                    className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {!initialAppointment && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveClientToDb}
                      onChange={(e) => setSaveClientToDb(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4"
                    />
                    <span className="text-zinc-300 text-[11px]">
                      Salvar automaticamente no banco de dados de clientes para futuros agendamentos
                    </span>
                  </label>
                )}
              </>
            )}
          </div>

          {/* Section: Service Details (if not personal commitment) */}
          {!isParticular && (
            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
              <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Detalhes do Atendimento
              </span>

              <div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Duração Estimada</label>
                  <select
                    id="select-duration"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={30}>30 minutos (Rápido)</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>1 hora (Padrão)</option>
                    <option value={90}>1 hora e 30 min (Sobrepor)</option>
                    <option value={120}>2 horas (Embutir)</option>
                    <option value={180}>3 horas (Instalação Complexa)</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 border-t border-zinc-850">
                <p className="text-[11px] text-zinc-500">Marca/modelo ficam para o cadastro de cada equipamento na conclusão. MA e OS são gerados automaticamente somente ao concluir o atendimento.</p>
              </div>
            </div>
          )}

          {/* Section: Date, Time and Reminder Alarm */}
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
            <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {isParticular ? 'Data e Período do Bloqueio' : 'Data, Horário e Despertador'}
            </span>

            {/* Option to block entire day */}
            {isParticular && (
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllDayBlocked}
                  onChange={(e) => handleToggleAllDay(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-purple-500 focus:ring-0 w-4 h-4"
                />
                <span className="text-purple-200 font-semibold text-xs">
                  Bloquear o dia inteiro (08:00 às 18:00) — Dia 100% Ocupado
                </span>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  Data *
                </label>
                <input
                  id="input-appt-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  Horário de Início *
                </label>
                <input
                  id="input-appt-time"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Custom duration if not full day */}
            {(!isParticular || !isAllDayBlocked) && isParticular && (
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Duração do Compromisso</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={60}>1 hora</option>
                  <option value={120}>2 horas</option>
                  <option value={180}>3 horas</option>
                  <option value={240}>4 horas (Meio período manhã/tarde)</option>
                  <option value={360}>6 horas</option>
                  <option value={600}>10 horas (Dia todo)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                {isParticular ? 'Observações / Detalhes Adicionais' : 'Descrição / Instruções do Serviço'}
              </label>
              <textarea
                id="input-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isParticular ? "Ex: Consulta Dr. Roberto às 14h, levar exames..." : "Ex: Porta de madeira 40mm, furação nova..."}
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Notification / Sound Alarm config */}
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-zinc-200 font-semibold text-xs">Alerta Sonoro / Despertador:</div>
                  <div className="text-[10px] text-zinc-400 font-mono">Toca alarme no aparelho</div>
                </div>
              </div>

              <select
                id="select-reminder-alert"
                value={reminderMinutesBefore}
                onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                className="p-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={0}>Exatamente no horário</option>
                <option value={15}>15 minutos antes</option>
                <option value={30}>30 minutos antes</option>
                <option value={60}>1 hora antes (Recomendado)</option>
                <option value={120}>2 horas antes</option>
                <option value={1440}>1 dia antes (24h)</option>
              </select>
            </div>
          </div>

          {/* Section: Status and Price (Only for technical service) */}
          {!isParticular && (
            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-3">
              <span className="font-mono font-bold text-zinc-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Status & Valor (Opcional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Status do Serviço</label>
                  <select
                    id="select-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="pendente">⏳ Agendado (Pendente)</option>
                    <option value="em_andamento">🚀 Em Andamento</option>
                    <option value="concluido">✅ Concluído</option>
                    <option value="cancelado">❌ Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Valor Cobrado (R$)</label>
                  <input
                    id="input-price"
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex: 250,00"
                    className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Forma de Pagamento</label>
                  <select
                    id="select-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as Appointment['paymentMethod'])}
                    className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="faturado">Faturado / Boleto</option>
                    <option value="a_combinar">A Combinar</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            <button
              id="btn-save-appointment"
              type="submit"
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all ${
                isParticular
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/60'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-950/40'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {initialAppointment 
                  ? 'Salvar Alterações' 
                  : isParticular 
                  ? 'Bloquear Dia como Ocupado' 
                  : 'Confirmar Agendamento'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
