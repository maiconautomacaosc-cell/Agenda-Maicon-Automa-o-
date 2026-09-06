import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Navigation, 
  CheckCircle2, 
  PlayCircle, 
  AlertCircle, 
  XCircle, 
  Edit3, 
  Trash2, 
  KeyRound, 
  DollarSign, 
  Bell,
  Sparkles,
  Calendar,
  Download,
  ExternalLink,
  Ban,
  Lock,
  Tag,
  ClipboardList,
  Eye,
  X,
  User,
  Wrench,
  RefreshCw,
  FolderOpen,
  FileText,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '../types';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import { getGoogleCalendarUrl, downloadNativeCalendarIcs } from '../utils/calendarSync';
import { buildWarrantyUrl } from '../lib/serviceOrderPdf';
import confetti from 'canvas-confetti';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appt: Appointment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: AppointmentStatus) => void;
  onOpenWhatsApp: (appt: Appointment) => void;
  onRetryMainSheetSync?: (appt: Appointment) => void;
  onReserveMa?: (appt: Appointment) => void | Promise<void>;
  onTriggerAlarmTest?: (appt: Appointment) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenWhatsApp,
  onRetryMainSheetSync,
  onReserveMa,
}) => {
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [reservingMa, setReservingMa] = useState(false);

  const isParticular = appointment.serviceType === 'compromisso_particular';

  // Sempre usa o Web App oficial confirmado. Não confia em warrantyUrl antigo
  // salvo no atendimento, pois versões anteriores podem ter armazenado link inválido.
  const primaryWarrantySerial =
    appointment.equipment?.[0]?.serialNumber ||
    appointment.serialNumber ||
    appointment.reservedSerialNumbers?.[0];
  const canonicalWarrantyUrl = buildWarrantyUrl(primaryWarrantySerial);

  const getStatusBadge = (status: AppointmentStatus) => {
    if (isParticular) {
      return {
        label: 'Dia Ocupado',
        bg: 'bg-purple-950/90 text-purple-200 border-purple-600/70',
        icon: <Ban className="w-3.5 h-3.5 text-purple-400" />,
      };
    }

    switch (status) {
      case 'concluido':
        return {
          label: 'Concluído',
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'em_andamento':
        return {
          label: 'Em Andamento',
          bg: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 animate-pulse',
          icon: <PlayCircle className="w-3.5 h-3.5 text-cyan-400" />,
        };
      case 'cancelado':
        return {
          label: 'Cancelado',
          bg: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
        };
      case 'pendente':
      default:
        return {
          label: 'Agendado',
          bg: 'bg-zinc-800/90 text-zinc-300 border-zinc-700/80',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
        };
    }
  };

  const statusInfo = getStatusBadge(appointment.status);

  const handleFinishQuick = () => {
    if (isParticular) return;
    if (appointment.status !== 'concluido') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#06b6d4', '#10b981', '#ffffff', '#3b82f6'],
      });
      onStatusChange(appointment.id, 'concluido');
    } else {
      onStatusChange(appointment.id, 'pendente');
    }
  };

  // Maps / Navigation URL
  const mapSearchQuery = encodeURIComponent(`${appointment.address} ${appointment.city || ''}`);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapSearchQuery}`;

  return (
    <div
      id={`appointment-card-${appointment.id}`}
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isParticular
          ? 'bg-gradient-to-br from-purple-950/40 via-zinc-900 to-zinc-900 border-purple-800/60 border-l-4 border-l-purple-500 shadow-md shadow-purple-950/20'
          : appointment.status === 'concluido'
          ? 'bg-zinc-900/90 border-zinc-800 border-l-4 border-l-emerald-500 opacity-90'
          : appointment.status === 'em_andamento'
          ? 'bg-zinc-900 border-cyan-500/50 border-l-4 border-l-cyan-400 shadow-lg shadow-cyan-950/30'
          : appointment.status === 'cancelado'
          ? 'bg-zinc-950/80 border-zinc-800/60 border-l-4 border-l-rose-500 opacity-60'
          : 'bg-zinc-900 border-zinc-800 border-l-4 border-l-amber-400 hover:border-zinc-700'
      }`}
    >
      {/* Top Bar with Time and Status */}
      <div className={`flex items-center justify-between p-3 pb-2 border-b ${
        isParticular ? 'border-purple-800/40 bg-purple-950/20' : 'border-zinc-800/80'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-mono font-semibold ${
            isParticular 
              ? 'bg-purple-950/80 border-purple-700/60 text-purple-200' 
              : 'bg-zinc-950 border-zinc-800 text-zinc-200'
          }`}>
            {isParticular ? <Ban className="w-3.5 h-3.5 text-purple-400" /> : <Clock className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{appointment.startTime}</span>
            {appointment.endTime && (
              <span className={isParticular ? "text-purple-300/80 font-normal" : "text-zinc-500 font-normal"}>
                às {appointment.endTime}
              </span>
            )}
          </div>

          <span className={`text-[10px] font-mono font-medium ${isParticular ? 'text-purple-400' : 'text-zinc-500'}`}>
            {appointment.durationMinutes >= 480 ? '(Dia Todo)' : `(${appointment.durationMinutes}m)`}
          </span>
        </div>

        {/* Status Dropdown/Pill */}
        <div className="flex items-center gap-1.5">
          <button
            id={`status-toggle-${appointment.id}`}
            onClick={handleFinishQuick}
            title={isParticular ? 'Compromisso Particular (Dia Ocupado)' : 'Clique para alternar status rápido'}
            className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all ${statusInfo.bg}`}
          >
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3 space-y-2">
        {/* Client and Service title */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-white text-sm leading-snug flex items-center gap-1.5">
              {isParticular && <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
              {appointment.clientName}
            </h3>
            {!isParticular && appointment.price !== undefined && appointment.price > 0 && (
              <span className="shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                {formatCurrencyBRL(appointment.price)}
              </span>
            )}
          </div>

          {/* Service badge */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
              isParticular 
                ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                : 'bg-zinc-950 text-cyan-400 border-cyan-900/40'
            }`}>
              {isParticular ? <Ban className="w-3 h-3 text-purple-400" /> : <KeyRound className="w-3 h-3 text-cyan-400" />}
              {isParticular ? 'Compromisso Particular' : appointment.serviceTypeName}
            </span>
            {!isParticular && appointment.lockModel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                {appointment.lockModel}
              </span>
            )}
            {!isParticular && appointment.serialNumber && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-mono font-bold inline-flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-cyan-400" />
                <span>{appointment.serialNumber}</span>
              </span>
            )}
            {!isParticular && appointment.serviceOrder && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-700/60 font-mono font-bold inline-flex items-center gap-1">
                <ClipboardList className="w-2.5 h-2.5 text-amber-400" />
                <span>{appointment.serviceOrder}</span>
              </span>
            )}
          </div>
        </div>

        {/* Description if present */}
        {appointment.description && (
          <p className={`text-[11px] leading-relaxed p-2 rounded-lg border ${
            isParticular 
              ? 'text-purple-200/90 bg-purple-950/30 border-purple-800/40'
              : 'text-zinc-400 bg-zinc-950/70 border-zinc-800/80'
          }`}>
            {appointment.description}
          </p>
        )}

        {/* Address if not particular */}
        {!isParticular && appointment.address && appointment.address !== 'A combinar' && (
          <div className="flex items-start gap-1.5 text-xs text-zinc-300 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/70">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="line-clamp-2">{appointment.address}</span>
            </div>
          </div>
        )}

        {!isParticular && appointment.status !== 'concluido' && appointment.status !== 'cancelado' && onReserveMa && (
          <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-cyan-300">QR de garantia antes da visita</div>
                <div className="text-[10px] text-zinc-500">Reserva o MA oficial agora para você imprimir o adesivo antes de concluir o serviço.</div>
              </div>
              <button
                type="button"
                disabled={reservingMa}
                onClick={async () => {
                  const confirmed = window.confirm('Reservar o próximo MA oficial para este atendimento? Este número ficará consumido e não será reutilizado, mesmo se o atendimento for cancelado.');
                  if (!confirmed) return;
                  setReservingMa(true);
                  try { await onReserveMa(appointment); } finally { setReservingMa(false); }
                }}
                className="shrink-0 rounded-lg border border-cyan-700 bg-cyan-950/60 px-2.5 py-2 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900/60 disabled:opacity-50"
              >
                {reservingMa ? 'Reservando…' : (appointment.reservedSerialNumbers?.length ? 'Reservar outro MA' : 'Preparar QR')}
              </button>
            </div>

            {(appointment.reservedSerialNumbers?.length || 0) > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {appointment.reservedSerialNumbers!.map(serial => {
                  const warrantyUrl = buildWarrantyUrl(serial)!;
                  const qrUrl = `https://quickchart.io/qr?size=420&text=${encodeURIComponent(warrantyUrl)}`;
                  return (
                    <div key={serial} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
                      <img src={qrUrl} alt={`QR Code ${serial}`} className="w-20 h-20 rounded-lg bg-white p-1 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-cyan-300">{serial}</div>
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5">MA reservado</div>
                        <a href={qrUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-zinc-200 underline underline-offset-2">
                          <QrCode className="w-3 h-3" /> Abrir QR grande
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sync info bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
          {!isParticular && (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Phone className="w-3 h-3 text-zinc-500" />
              <span className="text-zinc-300">{appointment.clientPhone}</span>
            </div>
          )}

          {isParticular && (
            <div className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
              <span>🚫 Agenda Indisponível para Atendimento</span>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {appointment.googleEventId ? (
              <span 
                className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-950/70 px-2 py-0.5 rounded-lg border border-blue-800/60 font-mono font-semibold"
                title="Sincronizado automaticamente com o Google Agenda"
              >
                <Calendar className="w-3 h-3 text-blue-400" />
                <span>Google Agenda ✓</span>
              </span>
            ) : (
              <button
                onClick={() => setShowCalendarOptions(!showCalendarOptions)}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border transition-colors font-mono ${
                  isParticular
                    ? 'text-purple-300 hover:text-purple-200 bg-purple-950/60 hover:bg-purple-900/60 border-purple-800/60'
                    : 'text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-800/60'
                }`}
                title="Sincronizar com a agenda do seu celular"
              >
                <Calendar className="w-3 h-3" />
                <span>Agenda Celular</span>
              </button>
            )}

            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
              <Bell className="w-3 h-3 text-amber-400" />
              <span>{appointment.reminderMinutesBefore === 0 ? 'No horário' : `${appointment.reminderMinutesBefore}m`}</span>
            </div>
          </div>
        </div>

        {!isParticular && appointment.status === 'concluido' && appointment.mainSheetSyncStatus !== 'synced' && (appointment.serviceOrder || (appointment.equipment?.length || 0) > 0) && (
          <div className="rounded-xl border border-amber-700/60 bg-amber-950/35 p-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-amber-300">Planilha principal não atualizada</div>
                <div className="text-[10px] text-amber-100/80 break-words mt-0.5">
                  {appointment.mainSheetSyncError || 'Sincronização pendente.'}
                </div>
              </div>
            </div>
            {onRetryMainSheetSync && (
              <button
                onClick={() => onRetryMainSheetSync(appointment)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-amber-600/60 bg-amber-900/50 hover:bg-amber-800/60 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-amber-100 transition-colors active:scale-[0.99]"
                title="Reenvia os MA e a OS já existentes sem gerar nova numeração"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reenviar Planilha
              </button>
            )}
          </div>
        )}

        {/* Calendar Sync Options Drawer / Dropdown */}
        {showCalendarOptions && (
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-purple-700/50 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Adicionar à Agenda do Celular:
              </span>
              <button
                onClick={() => setShowCalendarOptions(false)}
                className="text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <a
                href={getGoogleCalendarUrl(appointment)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowCalendarOptions(false)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Google Agenda</span>
              </a>

              <button
                onClick={() => {
                  downloadNativeCalendarIcs(appointment);
                  setShowCalendarOptions(false);
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[10px] border border-zinc-700 transition-colors"
                title="Compatível com Samsung Calendar, iPhone (iOS) e Android Nativo"
              >
                <Download className="w-3 h-3 text-purple-400" />
                <span>Baixar (.ICS)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Field Action Buttons */}
      {isParticular ? (
        <div className="flex items-center justify-end gap-1.5 p-2 bg-zinc-950 border-t border-purple-900/30">
          <button
            id={`btn-edit-${appointment.id}`}
            onClick={() => onEdit(appointment)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors active:scale-95"
            title="Editar horário ou motivo"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Bloqueio</span>
          </button>
          <button
            id={`btn-delete-${appointment.id}`}
            onClick={() => {
              if (window.confirm(`Deseja remover o compromisso particular e liberar este dia para agendamentos?`)) {
                onDelete(appointment.id);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors active:scale-95"
            title="Liberar Dia / Excluir Bloqueio"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Liberar Dia</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-zinc-950 border-t border-zinc-800">
          {/* WhatsApp Button */}
          <button
            id={`btn-whatsapp-${appointment.id}`}
            onClick={() => onOpenWhatsApp(appointment)}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/50 transition-colors active:scale-95"
            title="Enviar WhatsApp / WhatsApp Business"
          >
            <MessageSquare className="w-3.5 h-3.5 mb-0.5 text-emerald-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">WhatsApp</span>
          </button>

          {/* GPS Navigation Button */}
          <a
            id={`btn-gps-${appointment.id}`}
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-400 border border-cyan-800/50 transition-colors active:scale-95"
            title="Abrir GPS / Google Maps"
          >
            <Navigation className="w-3.5 h-3.5 mb-0.5 text-cyan-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Rotas</span>
          </a>

          {/* Phone Call Button */}
          <a
            id={`btn-call-${appointment.id}`}
            href={`tel:${appointment.clientPhone.replace(/\D/g, '')}`}
            className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors active:scale-95"
            title="Fazer ligação"
          >
            <Phone className="w-3.5 h-3.5 mb-0.5 text-zinc-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Ligar</span>
          </a>

          {/* Visualizar, editar e excluir */}
          <div className="flex gap-1">
            <button
              id={`btn-view-${appointment.id}`}
              onClick={() => setShowDetails(true)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800/50 transition-colors active:scale-95"
              title="Visualizar informações do atendimento"
            >
              <Eye className="w-3 h-3 mb-0.5" />
              <span className="text-[8px] font-bold uppercase tracking-wider">Ver</span>
            </button>
            <button
              id={`btn-edit-${appointment.id}`}
              onClick={() => onEdit(appointment)}
              className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors active:scale-95"
              title="Editar agendamento"
            >
              <Edit3 className="w-3 h-3 mb-0.5" />
              <span className="text-[8px] font-bold uppercase tracking-wider">Editar</span>
            </button>
            <button
              id={`btn-delete-${appointment.id}`}
              onClick={() => {
                if (window.confirm(`Deseja realmente remover o agendamento de "${appointment.clientName}"?`)) {
                  onDelete(appointment.id);
                }
              }}
              className="flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 transition-colors active:scale-95"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showDetails && createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Detalhes do atendimento"
          >
            <div className="flex items-center justify-between gap-3 p-4 bg-zinc-950 border-b border-zinc-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Detalhes do atendimento</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{appointment.clientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" /> Cliente
                  </div>
                  <div className="font-bold text-white">{appointment.clientName}</div>
                  <div className="text-xs text-zinc-400 mt-1">{appointment.clientPhone}</div>
                  {appointment.address && <div className="text-xs text-zinc-400 mt-1">{appointment.address}{appointment.city ? ` • ${appointment.city}` : ''}</div>}
                </div>

                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Atendimento
                  </div>
                  <div className="text-white font-semibold">{formatDateBR(appointment.date)}</div>
                  <div className="text-xs text-zinc-400 mt-1">{appointment.startTime}{appointment.endTime ? ` às ${appointment.endTime}` : ''} • {appointment.durationMinutes} min</div>
                  <div className="text-xs text-zinc-400 mt-1">Status: <span className="text-zinc-200 font-semibold">{statusInfo.label}</span></div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400" /> Serviço
                </div>
                <div className="text-white font-semibold">{appointment.serviceTypeName}</div>
                {appointment.description && <div className="text-xs text-zinc-400 mt-2 whitespace-pre-wrap">{appointment.description}</div>}
                {appointment.notes && <div className="text-xs text-zinc-400 mt-2"><span className="text-zinc-300 font-semibold">Observações:</span> {appointment.notes}</div>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Identificação</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-zinc-500">OS</span><span className="text-amber-300 font-mono font-bold">{appointment.serviceOrder || 'Não gerada'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-zinc-500">Equipamentos</span><span className="text-zinc-200 font-bold">{appointment.equipment?.length || 0}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-zinc-500">Garantia instalação</span><span className="text-zinc-200 font-bold text-right">{appointment.installationWarranty || 'Não informada'}</span></div>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Financeiro</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-zinc-500">Valor</span><span className="text-emerald-300 font-mono font-bold">{appointment.price && appointment.price > 0 ? formatCurrencyBRL(appointment.price) : 'Não informado'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-zinc-500">Pagamento</span><span className="text-zinc-200 text-right">{appointment.paymentMethod ? appointment.paymentMethod.replaceAll('_', ' ') : 'Não informado'}</span></div>
                  </div>
                </div>
              </div>

              {(appointment.reservedSerialNumbers?.length || 0) > 0 && appointment.status !== 'concluido' && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">MA / QR reservado antes da visita</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {appointment.reservedSerialNumbers!.map(serial => {
                      const warrantyUrl = buildWarrantyUrl(serial)!;
                      const qrUrl = `https://quickchart.io/qr?size=420&text=${encodeURIComponent(warrantyUrl)}`;
                      return (
                        <div key={serial} className="rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-2.5 flex items-center gap-3">
                          <img src={qrUrl} alt={`QR Code ${serial}`} className="w-24 h-24 rounded-lg bg-white p-1 shrink-0" />
                          <div>
                            <div className="font-mono text-sm font-bold text-cyan-300">{serial}</div>
                            <div className="text-[10px] text-emerald-400 mt-1">Reservado e pronto para impressão.</div>
                            <a href={qrUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-zinc-200 underline underline-offset-2"><QrCode className="w-3.5 h-3.5" /> Abrir QR grande</a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {appointment.equipment && appointment.equipment.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Equipamentos cadastrados
                  </div>
                  {appointment.equipment.map((item, index) => (
                    <div key={item.id} className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-zinc-500">Equipamento {index + 1}</div>
                          <div className="text-white font-semibold mt-0.5">{item.serviceTypeName || 'Equipamento'}</div>
                        </div>
                        <span className="shrink-0 text-xs px-2 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold">{item.serialNumber}</span>
                      </div>
                      {item.brand && <div className="text-xs text-zinc-300 mt-2"><span className="text-zinc-500">Marca:</span> {item.brand}</div>}
                      {item.model && <div className="text-xs text-zinc-300 mt-1"><span className="text-zinc-500">Modelo:</span> {item.model}</div>}
                      {item.manufacturerSerialNumber && <div className="text-xs text-zinc-300 mt-1"><span className="text-zinc-500">Série original:</span> <span className="font-mono">{item.manufacturerSerialNumber}</span></div>}
                      {item.productSupplyType && <div className="text-xs text-zinc-300 mt-1"><span className="text-zinc-500">Fornecimento:</span> {item.productSupplyType}</div>}
                      {item.productWarranty && item.productSupplyType === 'Produto vendido' && <div className="text-xs text-zinc-300 mt-1"><span className="text-zinc-500">Garantia produto:</span> {item.productWarranty}</div>}
                      {item.supplier && <div className="text-xs text-zinc-300 mt-1"><span className="text-zinc-500">Fornecedor:</span> {item.supplier}</div>}
                      {item.invoiceProof && <div className="text-xs text-zinc-300 mt-1 break-all"><span className="text-zinc-500">NF / comprovante:</span> {item.invoiceProof}</div>}
                      {item.description && <div className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap">{item.description}</div>}
                    </div>
                  ))}
                </div>
              )}

              {(appointment.serviceOrderPdfUrl || canonicalWarrantyUrl || appointment.driveFolderUrl || (appointment.status === 'concluido' && (appointment.serviceOrder || (appointment.equipment?.length || 0) > 0))) && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Documentos do atendimento</div>
                  <div className="flex flex-wrap gap-2">
                    {appointment.serviceOrderPdfUrl && (
                      <a href={appointment.serviceOrderPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-cyan-800 bg-cyan-950/40 px-3 py-2 text-xs font-bold text-cyan-300 hover:border-cyan-600">
                        <FileText className="w-4 h-4" /> Abrir OS em PDF
                      </a>
                    )}
                    {canonicalWarrantyUrl && (
                      <a href={canonicalWarrantyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-300 hover:border-emerald-600">
                        <ShieldCheck className="w-4 h-4" /> Abrir garantia
                      </a>
                    )}
                    {canonicalWarrantyUrl && (
                      <a href={`https://quickchart.io/qr?size=420&text=${encodeURIComponent(canonicalWarrantyUrl)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-zinc-500">
                        <QrCode className="w-4 h-4" /> Ver QR Code
                      </a>
                    )}
                    {appointment.driveFolderUrl && (
                      <a href={appointment.driveFolderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-amber-300 hover:border-amber-700">
                        <FolderOpen className="w-4 h-4" /> Pasta do cliente
                      </a>
                    )}
                    {appointment.status === 'concluido' && onRetryMainSheetSync && (appointment.serviceOrder || (appointment.equipment?.length || 0) > 0) && (
                      <button
                        type="button"
                        onClick={() => onRetryMainSheetSync(appointment)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-800 bg-blue-950/40 px-3 py-2 text-xs font-bold text-blue-300 hover:border-blue-600 transition-colors"
                        title="Atualiza o MA/OS já existente na planilha sem gerar nova numeração"
                      >
                        <RefreshCw className="w-4 h-4" /> Sincronizar Planilha
                      </button>
                    )}
                  </div>
                  {appointment.mainSheetSyncStatus === 'synced' && appointment.mainSheetSyncedAt && (
                    <div className="text-[10px] text-emerald-400">Planilha sincronizada. O botão pode ser usado novamente para atualizar PDF/QR sem criar novo MA ou OS.</div>
                  )}
                  {appointment.serviceOrderPdfError && <div className="text-xs text-rose-300">OS PDF: {appointment.serviceOrderPdfError}</div>}
                </div>
              )}

              {appointment.photoUrls && appointment.photoUrls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Fotos do atendimento</div>
                  <div className="flex flex-wrap gap-2">
                    {appointment.photoUrls.map((url, index) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-cyan-300 hover:border-cyan-700">
                        <ExternalLink className="w-3.5 h-3.5" /> Foto {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold border border-zinc-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
