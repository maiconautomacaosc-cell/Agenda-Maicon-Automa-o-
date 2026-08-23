import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Info,
  CalendarDays,
  Ban,
  Lock,
  Trash2,
  Edit3
} from 'lucide-react';
import { Appointment, DayInfo, DayOccupancyStatus } from '../types';
import { generateMonthDays, formatDateFriendly, formatDateBR, getTodayString } from '../utils/date';
import { AppointmentCard } from './AppointmentCard';

interface CalendarViewProps {
  appointments: Appointment[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNewAppointment: (date?: string) => void;
  onEditAppointment: (appt: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onStatusChange: (id: string, newStatus: Appointment['status']) => void;
  onOpenWhatsApp: (appt: Appointment) => void;
  onBlockDay?: (date: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  selectedDate,
  onSelectDate,
  onNewAppointment,
  onEditAppointment,
  onDeleteAppointment,
  onStatusChange,
  onOpenWhatsApp,
  onBlockDay,
}) => {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [filterOccupancy, setFilterOccupancy] = useState<DayOccupancyStatus | 'todos'>('todos');

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const daysGrid = generateMonthDays(currentYear, currentMonth, appointments);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    onSelectDate(getTodayString());
  };

  const selectedDayAppointments = appointments.filter(a => a.date === selectedDate);
  const selectedDayActive = selectedDayAppointments.filter(a => a.status !== 'cancelado');
  const particularAppt = selectedDayActive.find(a => a.serviceType === 'compromisso_particular');

  // Count metrics for current month
  const monthAppointments = appointments.filter(a => {
    const [y, m] = a.date.split('-').map(Number);
    return y === currentYear && m === (currentMonth + 1) && a.status !== 'cancelado';
  });

  return (
    <div className="space-y-4">
      {/* Calendar Header & Month Navigation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-cyan-400">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight capitalize">
                {monthNames[currentMonth]} <span className="text-cyan-400 font-mono">{currentYear}</span>
              </h2>
              <p className="text-xs text-zinc-400">
                {monthAppointments.length} serviço{monthAppointments.length !== 1 ? 's' : ''} agendado{monthAppointments.length !== 1 ? 's' : ''} no mês
              </p>
            </div>
          </div>

          {/* Month Steppers and Today button */}
          <div className="flex items-center gap-2">
            <button
              id="btn-today"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors"
            >
              Hoje
            </button>
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5">
              <button
                id="btn-prev-month"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-next-month"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              id="btn-quick-new-appt"
              onClick={() => onNewAppointment(selectedDate)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-md shadow-cyan-950/40 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">Agendar</span>
            </button>
          </div>
        </div>

        {/* Legend / Status Badges for Free / Busy / Partial */}
        <div className="grid grid-cols-3 gap-2 py-3 px-1 border-b border-zinc-800 text-xs">
          <button
            onClick={() => setFilterOccupancy(filterOccupancy === 'livre' ? 'todos' : 'livre')}
            className={`flex items-center justify-center gap-1.5 p-1.5 rounded-xl border text-[11px] font-medium transition-all ${
              filterOccupancy === 'livre'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
            <span className="font-semibold">Dia Livre</span>
          </button>

          <button
            onClick={() => setFilterOccupancy(filterOccupancy === 'parcial' ? 'todos' : 'parcial')}
            className={`flex items-center justify-center gap-1.5 p-1.5 rounded-xl border text-[11px] font-medium transition-all ${
              filterOccupancy === 'parcial'
                ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
            <span className="font-semibold">Parcial</span>
          </button>

          <button
            onClick={() => setFilterOccupancy(filterOccupancy === 'ocupado' ? 'todos' : 'ocupado')}
            className={`flex items-center justify-center gap-1.5 p-1.5 rounded-xl border text-[11px] font-medium transition-all ${
              filterOccupancy === 'ocupado'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
            <span className="font-semibold">Ocupado</span>
          </button>
        </div>

        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-1 pt-3 text-center">
          {weekDayLabels.map((day, idx) => (
            <div
              key={day}
              className={`text-[10px] font-mono font-bold uppercase tracking-wider py-1 ${
                idx === 0 || idx === 6 ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {daysGrid.map((dayObj) => {
            const isSelected = dayObj.date === selectedDate;
            const isFilteredOut = filterOccupancy !== 'todos' && dayObj.status !== filterOccupancy;
            const apptsCount = dayObj.appointments.filter(a => a.status !== 'cancelado').length;
            const hasParticular = dayObj.appointments.some(
              a => a.serviceType === 'compromisso_particular' && a.status !== 'cancelado'
            );

            return (
              <button
                key={dayObj.date}
                id={`calendar-day-${dayObj.date}`}
                onClick={() => onSelectDate(dayObj.date)}
                className={`relative min-h-[58px] sm:min-h-[70px] p-1.5 rounded-2xl flex flex-col justify-between items-center text-left transition-all duration-150 ${
                  !dayObj.isCurrentMonth
                    ? 'opacity-25 bg-zinc-950/30 border border-transparent'
                    : isSelected
                    ? hasParticular
                      ? 'bg-purple-950/80 border-2 border-purple-400 ring-2 ring-purple-400/20 text-white shadow-lg shadow-purple-950/50'
                      : 'bg-cyan-950/70 border-2 border-cyan-400 ring-2 ring-cyan-400/20 text-white shadow-lg shadow-cyan-950/50'
                    : dayObj.isToday
                    ? 'bg-zinc-800 border border-cyan-500/60 text-white'
                    : hasParticular
                    ? 'bg-purple-950/30 border border-purple-800/60 text-purple-200 hover:bg-purple-950/50'
                    : 'bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300'
                } ${isFilteredOut ? 'opacity-20 ring-0' : ''}`}
              >
                {/* Day Number and Today Indicator */}
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      dayObj.isToday
                        ? 'bg-cyan-500 text-black font-extrabold'
                        : isSelected
                        ? hasParticular ? 'text-purple-300 font-extrabold' : 'text-cyan-300 font-extrabold'
                        : 'text-zinc-300'
                    }`}
                  >
                    {dayObj.dayNumber}
                  </span>

                  {/* Dot status */}
                  {hasParticular ? (
                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" title="Compromisso particular (Dia Ocupado)" />
                  ) : dayObj.status === 'livre' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Dia livre" />
                  ) : dayObj.status === 'parcial' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Parcialmente ocupado" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Dia ocupado" />
                  )}
                </div>

                {/* Badge for Appointments count & time */}
                <div className="w-full mt-1 flex flex-col items-center">
                  {hasParticular ? (
                    <span className="w-full text-center text-[9px] font-bold py-0.5 px-0.5 rounded-md truncate bg-purple-600 text-white font-mono flex items-center justify-center gap-0.5">
                      <Ban className="w-2.5 h-2.5" />
                      <span>Ocupado</span>
                    </span>
                  ) : apptsCount > 0 ? (
                    <span
                      className={`w-full text-center text-[10px] font-bold py-0.5 px-1 rounded-md truncate ${
                        dayObj.status === 'ocupado'
                          ? 'bg-cyan-500 text-black font-extrabold'
                          : 'bg-amber-400 text-black font-extrabold'
                      }`}
                    >
                      {apptsCount} {apptsCount === 1 ? 'serv.' : 'serv.'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-400/70 font-mono hidden sm:inline">
                      Livre
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer / Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800 gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-cyan-400" />
              <span>Agenda do Dia: {formatDateFriendly(selectedDate)}</span>
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              {particularAppt
                ? '🚫 Dia Bloqueado para Compromisso Particular (Indisponível)'
                : selectedDayActive.length === 0
                ? 'Nenhum serviço agendado (Dia 100% Livre)'
                : `${selectedDayActive.length} serviço(s) • ${selectedDayAppointments.reduce((acc, c) => acc + (c.durationMinutes || 0), 0)} min estimados`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Button to Block Day / Compromisso Particular */}
            {!particularAppt && onBlockDay && (
              <button
                id="btn-quick-block-day"
                onClick={() => onBlockDay(selectedDate)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 border border-purple-700/60 text-xs font-semibold shadow-md transition-all active:scale-95"
                title="Marcar este dia como ocupado por compromisso particular"
              >
                <Ban className="w-3.5 h-3.5 text-purple-400" />
                <span>Marcar Dia Ocupado</span>
              </button>
            )}

            <button
              id="btn-add-appt-selected-date"
              onClick={() => onNewAppointment(selectedDate)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-md shadow-cyan-950/40 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* If day is blocked with personal commitment, show prominent notification banner */}
        {particularAppt && (
          <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-purple-200 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-purple-900/70 text-purple-300 border border-purple-700/80 shrink-0">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>Dia Marcado como Ocupado</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900 text-purple-300 font-mono">
                    {particularAppt.clientName}
                  </span>
                </div>
                <div className="text-purple-300/90 mt-0.5">
                  Horário: <span className="font-mono font-semibold">{particularAppt.startTime}</span> às <span className="font-mono font-semibold">{particularAppt.endTime || '18:00'}</span> ({particularAppt.durationMinutes >= 480 ? 'Dia Todo' : `${particularAppt.durationMinutes}m`})
                </div>
                {particularAppt.description && (
                  <div className="text-purple-400/80 text-[11px] mt-0.5">{particularAppt.description}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => onEditAppointment(particularAppt)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Deseja liberar este dia para agendamentos (remover compromisso particular)?')) {
                    onDeleteAppointment(particularAppt.id);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Liberar Dia</span>
              </button>
            </div>
          </div>
        )}

        {/* Appointments List for Selected Day */}
        {selectedDayAppointments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-950 border border-dashed border-zinc-800 space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Dia Livre para Novos Agendamentos</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Você não tem atendimentos marcados nesta data. Clique no botão abaixo para adicionar uma instalação ou marcar como dia ocupado.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              <button
                onClick={() => onNewAppointment(selectedDate)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agendar Serviço Técnico
              </button>
              {onBlockDay && (
                <button
                  onClick={() => onBlockDay(selectedDate)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 text-xs font-bold transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Marcar como Dia Ocupado
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayAppointments
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  onEdit={onEditAppointment}
                  onDelete={onDeleteAppointment}
                  onStatusChange={onStatusChange}
                  onOpenWhatsApp={onOpenWhatsApp}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
