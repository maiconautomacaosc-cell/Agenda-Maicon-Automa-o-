import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Wrench,
  Trash2
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
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressDayClick = useRef(false);

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

  const handleCalendarTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY };
    suppressDayClick.current = false;
  };

  const handleCalendarTouchEnd = (e: React.TouchEvent) => {
    if (!swipeStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeStart.current.x;
    const dy = t.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      suppressDayClick.current = true;
      dx < 0 ? handleNextMonth() : handlePrevMonth();
      window.setTimeout(() => { suppressDayClick.current = false; }, 250);
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
  const particularAppts = selectedDayActive.filter(a => a.serviceType === 'compromisso_particular').sort((a,b) => a.startTime.localeCompare(b.startTime));
  const particularAppt = particularAppts[0];
  const selectedTechnical = selectedDayActive.filter(a => a.serviceType !== 'compromisso_particular');
  const selectedDayIsMixed = Boolean(particularAppt && selectedTechnical.length > 0);

  // Count metrics for current month
  const monthAppointments = appointments.filter(a => {
    const [y, m] = a.date.split('-').map(Number);
    return y === currentYear && m === (currentMonth + 1) && a.status !== 'cancelado';
  });

  return (
    <div className="space-y-4">
      {newAppointmentSelectionMode && (
        <div className="fixed inset-0 z-[41] bg-black/80 backdrop-blur-[2px] pointer-events-none" aria-hidden="true" />
      )}
      {/* Calendar Header & Month Navigation */}
      <div onTouchStart={handleCalendarTouchStart} onTouchEnd={handleCalendarTouchEnd} className={`bg-zinc-900 border rounded-3xl p-4 shadow-xl touch-pan-y ${newAppointmentSelectionMode ? 'relative z-[42] border-cyan-500/70 shadow-cyan-950/50' : 'border-zinc-800'}`}>
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
          <div className="mx-1 mb-3 p-3 rounded-2xl bg-cyan-950/70 border border-cyan-500 text-cyan-100 shadow-lg shadow-cyan-950/60">
            <div className="text-sm font-black">Selecione o dia do novo agendamento</div>
            <div className="text-[11px] text-cyan-300 mt-0.5">A tela foi destacada para você. Toque no dia desejado para continuar.</div>
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

          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span><span>Serviço pendente</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span><span>Concluído</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span><span>Particular</span>
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
            const technicalAppointments = dayObj.appointments.filter(a => a.serviceType !== 'compromisso_particular' && a.status !== 'cancelado');
            const hasPendingTechnical = technicalAppointments.some(a => a.status !== 'concluido');
            const hasCompletedTechnical = technicalAppointments.some(a => a.status === 'concluido');

            return (
              <button
                key={dayObj.date}
                id={`calendar-day-${dayObj.date}`}
                onClick={() => {
                  if (suppressDayClick.current) return;
                  newAppointmentSelectionMode ? onSelectDateForNewAppointment?.(dayObj.date) : onSelectDate(dayObj.date);
                }}
                className={`relative min-h-[58px] sm:min-h-[70px] p-1.5 rounded-2xl flex flex-col justify-center items-center transition-all duration-150 ${
                  !dayObj.isCurrentMonth
                    ? 'opacity-25 bg-zinc-950/30 border border-transparent'
                    : isSelected
                    ? 'bg-cyan-950/70 border-2 border-cyan-400 ring-2 ring-cyan-400/20 text-white shadow-lg shadow-cyan-950/50'
                    : dayObj.isToday
                    ? 'bg-zinc-800 border border-cyan-500/60 text-white'
                    : 'bg-zinc-950/80 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300'
                } ${isFilteredOut ? 'opacity-20 ring-0' : ''} ${newAppointmentSelectionMode && dayObj.isCurrentMonth ? 'calendar-day-awaiting-selection z-10' : ''}`}
              >
                <span className={`text-sm font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  dayObj.isToday ? 'bg-cyan-500 text-black font-extrabold' : isSelected ? 'text-cyan-300 font-extrabold' : 'text-zinc-300'
                }`}>
                  {dayObj.dayNumber}
                </span>

                {(hasPendingTechnical || hasCompletedTechnical || hasParticular) && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1" aria-label="Indicadores do dia">
                    {hasPendingTechnical && <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" title="Serviço pendente" />}
                    {hasCompletedTechnical && <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title="Serviço concluído" />}
                    {hasParticular && <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" title="Compromisso particular" />}
                  </div>
                )}
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
                ? `🟣 ${particularAppts.length} compromisso${particularAppts.length !== 1 ? 's' : ''} particular${particularAppts.length !== 1 ? 'es' : ''}`
                : selectedDayActive.length === 0
                ? 'Nenhum serviço agendado (Dia 100% Livre)'
                : `${selectedDayActive.length} serviço(s) • ${selectedDayAppointments.reduce((acc, c) => acc + (c.durationMinutes || 0), 0)} min estimados`}
            </p>
          </div>

        </div>

        {/* If day is blocked with personal commitment, show prominent notification banner */}
        {particularAppts.map((particularItem) => (
          <React.Fragment key={particularItem.id}>
          <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-purple-200 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-purple-900/70 text-purple-300 border border-purple-700/80 shrink-0">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>{selectedDayIsMixed ? 'Compromisso Particular no Dia Misto' : 'Compromisso Particular'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900 text-purple-300 font-mono">
                    {particularItem.clientName}
                  </span>
                </div>
                <div className="text-purple-300/90 mt-0.5">
                  Horário: <span className="font-mono font-semibold">{particularItem.startTime}</span> às <span className="font-mono font-semibold">{particularItem.endTime || '18:00'}</span> ({particularItem.durationMinutes >= 480 ? 'Dia Todo' : `${particularItem.durationMinutes}m`})
                </div>
                {particularItem.description && (
                  <div className="text-purple-400/80 text-[11px] mt-0.5">{particularItem.description}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => onEditAppointment(particularItem)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar</span>
              </button>
              {particularItem.status !== 'concluido' ? (
                <button
                  onClick={() => {
                    if (window.confirm('Liberar este período e manter o compromisso particular no histórico como concluído?')) {
                      onStatusChange(particularItem.id, 'concluido');
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
              <button
                onClick={() => {
                  if (window.confirm(`Excluir somente este compromisso particular de ${formatDateBR(particularItem.date)}?${particularItem.recurrenceGroupId ? '\n\nAs outras ocorrências da recorrência serão mantidas.' : ''}`)) {
                    onDeleteAppointment(particularItem.id);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-colors"
                title="Excluir somente esta ocorrência"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
          </React.Fragment>
        ))}

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
              .filter((a) => a.serviceType !== 'compromisso_particular')
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
