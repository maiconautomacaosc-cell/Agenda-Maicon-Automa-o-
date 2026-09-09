import React, { useEffect, useMemo, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Info,
  CalendarDays,
  Ban,
  Lock,
  Edit3,
  Filter,
  Wrench
} from 'lucide-react';
import { Appointment, DayInfo, DayOccupancyStatus } from '../types';
import { generateMonthDays, formatDateFriendly, formatDateBR, getTodayString } from '../utils/date';
import { AppointmentCard } from './AppointmentCard';

interface CalendarViewProps {
  appointments: Appointment[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onEditAppointment: (appt: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onStatusChange: (id: string, newStatus: Appointment['status']) => void;
  onOpenWhatsApp: (appt: Appointment) => void;
  onRetryMainSheetSync?: (appt: Appointment) => void;
  onRetryCalendarSync?: (appt: Appointment) => void | Promise<void>;
  onReserveMa?: (appt: Appointment) => void | Promise<void>;
  focusFilter?: 'manutencoes_abertas' | null;
  onClearFocusFilter?: () => void;
  newAppointmentSelectionMode?: boolean;
  onSelectDateForNewAppointment?: (date: string) => void;
  sandboxActive?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  selectedDate,
  onSelectDate,
  onEditAppointment,
  onDeleteAppointment,
  onStatusChange,
  onOpenWhatsApp,
  onRetryMainSheetSync,
  onRetryCalendarSync,
  onReserveMa,
  focusFilter,
  onClearFocusFilter,
  newAppointmentSelectionMode = false,
  onSelectDateForNewAppointment,
  sandboxActive = false,
}) => {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  type CalendarFilter = DayOccupancyStatus | 'todos' | 'manutencoes_abertas';
  const [filterOccupancy, setFilterOccupancy] = useState<CalendarFilter>('todos');

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const daysGrid = generateMonthDays(currentYear, currentMonth, appointments);

  const openMaintenances = useMemo(() => appointments
    .filter(a =>
      a.status !== 'cancelado' &&
      (a.status === 'pendente' || a.status === 'em_andamento') &&
      (a.serviceType === 'manutencao_preventiva' || a.serviceType === 'manutencao_corretiva')
    )
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)), [appointments]);

  const maintenanceDays = useMemo(() => {
    const byDate = new Map<string, number>();
    openMaintenances.forEach(a => byDate.set(a.date, (byDate.get(a.date) || 0) + 1));
    return Array.from(byDate.entries()).map(([date, count]) => ({ date, count }));
  }, [openMaintenances]);

  useEffect(() => {
    if (focusFilter === 'manutencoes_abertas') {
      setFilterOccupancy('manutencoes_abertas');
      const target = maintenanceDays[0]?.date;
      if (target) {
        const [year, month] = target.split('-').map(Number);
        setCurrentYear(year);
        setCurrentMonth(month - 1);
        onSelectDate(target);
      }
    }
  }, [focusFilter]);

  const selectMaintenanceDate = (date: string) => {
    const [year, month] = date.split('-').map(Number);
    setCurrentYear(year);
    setCurrentMonth(month - 1);
    onSelectDate(date);
  };

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
  const selectedTechnical = selectedDayActive.filter(a => a.serviceType !== 'compromisso_particular');
  const selectedDayIsMixed = Boolean(particularAppt && selectedTechnical.length > 0);

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

          </div>
        </div>

        {newAppointmentSelectionMode && (
          <div className="mx-1 mb-3 p-3 rounded-2xl bg-cyan-950/50 border border-cyan-700 text-cyan-100">
            <div className="text-sm font-black">Selecione o dia do novo agendamento</div>
            <div className="text-[11px] text-cyan-300 mt-0.5">Toque diretamente no dia desejado no calendário.</div>
          </div>
        )}

        {/* Legenda visual + filtro separado das cores */}
        <div className="py-3 px-1 border-b border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
              <CalendarIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Legenda da agenda</span>
            </div>

            <label className="relative flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <select
                aria-label="Filtrar dias da agenda"
                value={filterOccupancy}
                onChange={(e) => {
                  const value = e.target.value as CalendarFilter;
                  setFilterOccupancy(value);
                  if (value !== 'manutencoes_abertas') onClearFocusFilter?.();
                }}
                className="appearance-none bg-zinc-950 border border-zinc-700 rounded-xl pl-2.5 pr-7 py-1.5 text-[11px] font-semibold text-zinc-200 outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="todos">Todos os dias</option>
                <option value="livre">Livres</option>
                <option value="parcial">Clientes pendentes</option>
                <option value="concluido">Concluídos</option>
                <option value="ocupado">Particulares</option>
                <option value="misto">Mistos ativos</option>
                <option value="misto_concluido">Mistos concluídos</option>
                <option value="manutencoes_abertas">Manutenções abertas</option>
              </select>
              <ChevronRight className="w-3 h-3 rotate-90 text-zinc-500 absolute right-2 pointer-events-none" />
            </label>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px]">
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-white"></span><span>Livre</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Pendente</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Concluído</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span><span>Particular</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300 col-span-2 sm:col-span-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span><span>Misto</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-950/30 border border-orange-900/50 text-orange-300 col-span-2 sm:col-span-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span><span>Misto concluído</span>
            </div>
          </div>
        </div>

        {filterOccupancy === 'manutencoes_abertas' && (
          <div className="mt-3 bg-zinc-950/70 border border-amber-900/50 rounded-2xl p-3">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-zinc-100">Manutenções abertas</div>
                  <div className="text-[10px] text-zinc-500">{openMaintenances.length} atendimento{openMaintenances.length !== 1 ? 's' : ''} em {maintenanceDays.length} dia{maintenanceDays.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <button
                onClick={() => { setFilterOccupancy('todos'); onClearFocusFilter?.(); }}
                className="text-[10px] font-bold text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded-lg border border-zinc-800"
              >
                Ver todos
              </button>
            </div>
            {maintenanceDays.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {maintenanceDays.map(({ date, count }) => (
                  <button
                    key={date}
                    onClick={() => selectMaintenanceDate(date)}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${selectedDate === date ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-900'}`}
                  >
                    <div className="text-[11px] font-black">{formatDateBR(date)}</div>
                    <div className="text-[9px] opacity-70">{count} manutenção{count !== 1 ? 'ões' : ''}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-2">Nenhuma manutenção aberta no momento.</div>
            )}
          </div>
        )}

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
            const hasOpenMaintenance = dayObj.appointments.some(a =>
              a.status !== 'cancelado' &&
              (a.status === 'pendente' || a.status === 'em_andamento') &&
              (a.serviceType === 'manutencao_preventiva' || a.serviceType === 'manutencao_corretiva')
            );
            const isFilteredOut = filterOccupancy === 'manutencoes_abertas'
              ? !hasOpenMaintenance
              : filterOccupancy !== 'todos' && dayObj.status !== filterOccupancy;
            const apptsCount = dayObj.appointments.filter(a => a.status !== 'cancelado').length;
            const hasParticular = dayObj.appointments.some(
              a => a.serviceType === 'compromisso_particular' && a.status !== 'cancelado'
            );
            const technicalCount = dayObj.appointments.filter(
              a => a.serviceType !== 'compromisso_particular' && a.status !== 'cancelado'
            ).length;
            const isMixedDay = hasParticular && technicalCount > 0;
            const isMixedCompletedDay = dayObj.status === 'misto_concluido';

            return (
              <button
                key={dayObj.date}
                id={`calendar-day-${dayObj.date}`}
                onClick={() => newAppointmentSelectionMode ? onSelectDateForNewAppointment?.(dayObj.date) : onSelectDate(dayObj.date)}
                className={`relative min-h-[58px] sm:min-h-[70px] p-1.5 rounded-2xl flex flex-col justify-between items-center text-left transition-all duration-150 ${
                  !dayObj.isCurrentMonth
                    ? 'opacity-25 bg-zinc-950/30 border border-transparent'
                    : isSelected
                    ? isMixedCompletedDay
                      ? 'bg-orange-950/80 border-2 border-orange-500 ring-2 ring-orange-500/20 text-white shadow-lg shadow-orange-950/50'
                      : isMixedDay
                      ? 'bg-red-950/80 border-2 border-red-500 ring-2 ring-red-500/20 text-white shadow-lg shadow-red-950/50'
                      : hasParticular
                      ? 'bg-purple-950/80 border-2 border-purple-400 ring-2 ring-purple-400/20 text-white shadow-lg shadow-purple-950/50'
                      : 'bg-cyan-950/70 border-2 border-cyan-400 ring-2 ring-cyan-400/20 text-white shadow-lg shadow-cyan-950/50'
                    : dayObj.isToday
                    ? isMixedCompletedDay
                      ? 'bg-orange-950/50 border border-orange-500/80 text-white'
                      : isMixedDay
                      ? 'bg-red-950/50 border border-red-500/80 text-white'
                      : 'bg-zinc-800 border border-cyan-500/60 text-white'
                    : isMixedCompletedDay
                    ? 'bg-orange-950/35 border border-orange-800/70 text-orange-200 hover:bg-orange-950/55'
                    : isMixedDay
                    ? 'bg-red-950/35 border border-red-800/70 text-red-200 hover:bg-red-950/55'
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
                        ? isMixedCompletedDay ? 'text-orange-300 font-extrabold' : isMixedDay ? 'text-red-300 font-extrabold' : hasParticular ? 'text-purple-300 font-extrabold' : 'text-cyan-300 font-extrabold'
                        : 'text-zinc-300'
                    }`}
                  >
                    {dayObj.dayNumber}
                  </span>

                  {/* Dot status */}
                  {isMixedCompletedDay ? (
                    <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" title="Dia misto concluído: cliente + compromisso particular finalizados" />
                  ) : isMixedDay ? (
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" title="Dia misto: cliente + compromisso particular" />
                  ) : hasParticular ? (
                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" title="Compromisso particular" />
                  ) : dayObj.status === 'livre' ? (
                    <span className="w-2 h-2 rounded-full bg-white shadow-sm shadow-white/40" title="Dia livre" />
                  ) : dayObj.status === 'concluido' ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title="Todos os serviços concluídos" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" title="Há agendamento pendente" />
                  )}
                </div>

                {/* Badge for Appointments count & time */}
                <div className="w-full mt-1 flex flex-col items-center">
                  {isMixedCompletedDay ? (
                    <span className="w-full text-center text-[9px] font-bold py-0.5 px-0.5 rounded-md truncate bg-orange-500 text-black font-extrabold font-mono flex items-center justify-center gap-0.5" title={`${technicalCount} atendimento(s) + compromisso particular concluídos`}>
                      <span>Misto concluído</span>
                    </span>
                  ) : isMixedDay ? (
                    <span className="w-full text-center text-[9px] font-bold py-0.5 px-0.5 rounded-md truncate bg-red-600 text-white font-mono flex items-center justify-center gap-0.5" title={`${technicalCount} atendimento(s) + compromisso particular`}>
                      <span>Misto • {technicalCount} cli.</span>
                    </span>
                  ) : hasParticular ? (
                    <span className="w-full text-center text-[9px] font-bold py-0.5 px-0.5 rounded-md truncate bg-purple-600 text-white font-mono flex items-center justify-center gap-0.5">
                      <Ban className="w-2.5 h-2.5" />
                      <span>Particular</span>
                    </span>
                  ) : apptsCount > 0 ? (
                    <span
                      className={`w-full text-center text-[10px] font-bold py-0.5 px-1 rounded-md truncate ${
                        dayObj.status === 'concluido'
                          ? 'bg-emerald-500 text-black font-extrabold'
                          : 'bg-amber-400 text-black font-extrabold'
                      }`}
                    >
                      {apptsCount} {apptsCount === 1 ? 'serv.' : 'serv.'}
                    </span>
                  ) : (
                    <span className="text-[9px] text-white/75 font-mono hidden sm:inline">
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
              {selectedDayIsMixed
                ? (selectedDayActive.every(a => a.status === 'concluido')
                    ? `🟠 Dia misto concluído • ${selectedTechnical.length} cliente(s) + compromisso particular`
                    : `🔴 Dia misto • ${selectedTechnical.length} cliente(s) + compromisso particular`)
                : particularAppt
                ? `🟣 Compromisso particular • ${particularAppt.startTime} às ${particularAppt.endTime || '18:00'}`
                : selectedDayActive.length === 0
                ? 'Nenhum serviço agendado (Dia 100% Livre)'
                : `${selectedDayActive.length} serviço(s) • ${selectedDayAppointments.reduce((acc, c) => acc + (c.durationMinutes || 0), 0)} min estimados`}
            </p>
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
                  <span>{selectedDayIsMixed ? 'Compromisso Particular no Dia Misto' : 'Compromisso Particular'}</span>
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
              {particularAppt.status !== 'concluido' ? (
                <button
                  onClick={() => {
                    if (window.confirm('Liberar este período e manter o compromisso particular no histórico como concluído?')) {
                      onStatusChange(particularAppt.id, 'concluido');
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-950/60 hover:bg-orange-900/80 text-orange-300 border border-orange-800/60 text-xs font-semibold transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Liberar dia</span>
                </button>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 text-xs font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Particular concluído</span>
                </span>
              )}
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
              Você não tem atendimentos marcados nesta data. Para criar um novo registro, use o botão azul + no rodapé e selecione o dia diretamente no calendário.
            </p>
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
                  onRetryMainSheetSync={onRetryMainSheetSync}
                  onRetryCalendarSync={onRetryCalendarSync}
                  onReserveMa={onReserveMa}
                  sandboxActive={sandboxActive}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
