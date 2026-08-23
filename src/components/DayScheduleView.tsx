import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  ArrowRight,
  Download
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '../types';
import { formatDateFriendly, formatDateBR, getTodayString, parseMinutes, formatMinutesToTime } from '../utils/date';
import { exportAllAppointmentsToIcs } from '../utils/calendarSync';
import { AppointmentCard } from './AppointmentCard';

interface DayScheduleViewProps {
  appointments: Appointment[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNewAppointment: (date?: string) => void;
  onEditAppointment: (appt: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onStatusChange: (id: string, newStatus: AppointmentStatus) => void;
  onOpenWhatsApp: (appt: Appointment) => void;
}

export const DayScheduleView: React.FC<DayScheduleViewProps> = ({
  appointments,
  selectedDate,
  onSelectDate,
  onNewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onStatusChange,
  onOpenWhatsApp,
}) => {
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Date shifting
  const changeDateByDays = (days: number) => {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    const newStr = d.toISOString().split('T')[0];
    onSelectDate(newStr);
  };

  const dayAppointments = appointments
    .filter(a => a.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const filteredAppts = dayAppointments.filter(a => {
    const matchesStatus = statusFilter === 'todos' || a.status === statusFilter;
    const matchesSearch = 
      !searchTerm ||
      a.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serviceTypeName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeAppts = dayAppointments.filter(a => a.status !== 'cancelado');
  const totalRevenueDay = dayAppointments
    .filter(a => a.status === 'concluido' && a.price)
    .reduce((acc, c) => acc + (c.price || 0), 0);

  const pendingRevenueDay = dayAppointments
    .filter(a => a.status !== 'cancelado' && a.price)
    .reduce((acc, c) => acc + (c.price || 0), 0);

  // Calculate gaps between jobs
  interface TimelineItem {
    type: 'appointment' | 'free_gap';
    appointment?: Appointment;
    startTime?: string;
    endTime?: string;
    gapMinutes?: number;
  }

  const timelineItems: TimelineItem[] = [];
  let lastEndMinutes = 8 * 60; // Start of typical workday: 08:00 AM

  activeAppts.forEach((appt) => {
    const apptStartMin = parseMinutes(appt.startTime);
    const apptDuration = appt.durationMinutes || 90;
    const apptEndMin = apptStartMin + apptDuration;

    // Check if there is a gap > 30 minutes before this appointment
    if (apptStartMin > lastEndMinutes + 30) {
      timelineItems.push({
        type: 'free_gap',
        startTime: formatMinutesToTime(lastEndMinutes),
        endTime: formatMinutesToTime(apptStartMin),
        gapMinutes: apptStartMin - lastEndMinutes,
      });
    }

    timelineItems.push({
      type: 'appointment',
      appointment: appt,
    });

    lastEndMinutes = Math.max(lastEndMinutes, apptEndMin);
  });

  // End of workday gap if finished before 18:00
  if (lastEndMinutes < 18 * 60 && activeAppts.length > 0) {
    timelineItems.push({
      type: 'free_gap',
      startTime: formatMinutesToTime(lastEndMinutes),
      endTime: '18:00',
      gapMinutes: 18 * 60 - lastEndMinutes,
    });
  }

  return (
    <div className="space-y-4">
      {/* Daily Header with Date Selector */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Date Shift Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {formatDateFriendly(selectedDate)}
                </span>
                {selectedDate === getTodayString() && (
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700/60 uppercase tracking-widest">
                    HOJE
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {activeAppts.length} compromisso{activeAppts.length !== 1 ? 's' : ''} no cronograma
              </p>
            </div>

            <button
              onClick={() => changeDateByDays(1)}
              className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Shortcuts & Add Button */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => onSelectDate(getTodayString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                selectedDate === getTodayString()
                  ? 'bg-cyan-500 border-cyan-400 text-black font-bold'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              Hoje
            </button>

            <button
              onClick={() => {
                const tom = new Date();
                tom.setDate(tom.getDate() + 1);
                onSelectDate(tom.toISOString().split('T')[0]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            >
              Amanhã
            </button>

            <button
              onClick={() => onNewAppointment(selectedDate)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-md shadow-cyan-950/40 transition-all active:scale-95 ml-auto"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo</span>
            </button>

            {dayAppointments.length > 0 && (
              <button
                onClick={() => exportAllAppointmentsToIcs(dayAppointments)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-cyan-400 text-xs font-semibold transition-colors"
                title="Adicionar todos os atendimentos deste dia na agenda do celular (.ICS)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Sincronizar Dia</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, endereço ou serviço no dia..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {(['todos', 'pendente', 'em_andamento', 'concluido'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'todos' ? 'Todos' : st === 'pendente' ? 'Pendentes' : st === 'em_andamento' ? 'Em Andamento' : 'Concluídos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Timeline List */}
      <div className="space-y-3">
        {filteredAppts.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-zinc-900 border border-dashed border-zinc-800 space-y-3">
            <div className="w-14 h-14 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Nenhum agendamento encontrado</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Não há atendimentos com os filtros aplicados para este dia.
            </p>
            <button
              onClick={() => onNewAppointment(selectedDate)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-lg shadow-cyan-950/40 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Adicionar Novo Serviço
            </button>
          </div>
        ) : (
          filteredAppts.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onEdit={onEditAppointment}
              onDelete={onDeleteAppointment}
              onStatusChange={onStatusChange}
              onOpenWhatsApp={onOpenWhatsApp}
            />
          ))
        )}
      </div>

      {/* Free Slots Encaixe Helper */}
      {activeAppts.length > 0 && timelineItems.some(t => t.type === 'free_gap') && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Horários Livres para Encaixe no Dia:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {timelineItems
              .filter(t => t.type === 'free_gap')
              .map((gap, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-emerald-800/40 text-xs"
                >
                  <div className="flex items-center gap-1.5 text-zinc-300 font-mono">
                    <span className="font-semibold text-white">{gap.startTime}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-500" />
                    <span className="font-semibold text-white">{gap.endTime}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/50">
                    {gap.gapMinutes ? `${Math.floor(gap.gapMinutes / 60)}h ${gap.gapMinutes % 60}m livre` : 'Livre'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
