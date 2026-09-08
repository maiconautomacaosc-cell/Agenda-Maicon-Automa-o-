import React, { useMemo } from 'react';
import {
  CalendarDays, CheckCircle2, Clock3, DollarSign, KeyRound, Plus,
  ShieldCheck, UserRound, Users, Wrench, ArrowRight, CalendarClock
} from 'lucide-react';
import { Appointment, Client, ViewTab, WarrantyPeriod } from '../types';
import { formatCurrencyBRL, getTodayString } from '../utils/date';

interface DashboardProps {
  appointments: Appointment[];
  clients: Client[];
  onSelectTab: (tab: ViewTab) => void;
  onNewAppointment: () => void;
  onSelectDate: (date: string) => void;
  onOpenMaintenanceAgenda: () => void;
}

const warrantyMonths: Record<WarrantyPeriod, number> = {
  'Sem garantia': 0, '1 Mês': 1, '3 Meses': 3, '6 Meses': 6,
  '12 Meses': 12, '24 Meses': 24, '36 Meses': 36,
};

const addMonths = (date: string, months: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d;
};

export const Dashboard: React.FC<DashboardProps> = ({ appointments, clients, onSelectTab, onNewAppointment, onSelectDate, onOpenMaintenanceAgenda }) => {
  const metrics = useMemo(() => {
    const today = getTodayString();
    const now = new Date(`${today}T12:00:00`);
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now); weekStart.setDate(now.getDate() + mondayOffset); weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
    const monthPrefix = today.slice(0, 7);

    const active = appointments.filter(a => a.status !== 'cancelado');
    const todayItems = active.filter(a => a.date === today);
    const todayServices = todayItems.filter(a => a.serviceType !== 'compromisso_particular');
    const todayPrivate = todayItems.filter(a => a.serviceType === 'compromisso_particular');
    const todayPending = todayItems.filter(a => a.status === 'pendente' || a.status === 'em_andamento');
    const todayDone = todayItems.filter(a => a.status === 'concluido');

    const weekItems = active.filter(a => {
      const d = new Date(`${a.date}T12:00:00`);
      return d >= weekStart && d <= weekEnd;
    });
    const weekServices = weekItems.filter(a => a.serviceType !== 'compromisso_particular');
    const weekDone = weekServices.filter(a => a.status === 'concluido');

    const monthRevenue = active
      .filter(a => a.serviceType !== 'compromisso_particular' && a.status === 'concluido' && a.date.startsWith(monthPrefix))
      .reduce((sum, a) => sum + (a.price || 0), 0);

    const maintenanceOpen = active.filter(a =>
      (a.serviceType === 'manutencao_preventiva' || a.serviceType === 'manutencao_corretiva') &&
      (a.status === 'pendente' || a.status === 'em_andamento')
    ).length;

    const serials = new Set<string>();
    clients.forEach(c => {
      if (c.serialNumber) serials.add(c.serialNumber);
      (c.equipment || []).forEach(eq => eq.serialNumber && serials.add(eq.serialNumber));
    });
    active.forEach(a => {
      if (a.serialNumber) serials.add(a.serialNumber);
      (a.equipment || []).forEach(eq => eq.serialNumber && serials.add(eq.serialNumber));
    });

    const warrantySoon = active.filter(a => {
      if (a.serviceType === 'compromisso_particular' || a.status !== 'concluido' || !a.installationWarranty) return false;
      const months = warrantyMonths[a.installationWarranty];
      if (!months) return false;
      const expires = addMonths(a.date, months);
      const days = Math.ceil((expires.getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 30;
    }).length;

    return { today, todayServices, todayPrivate, todayPending, todayDone, weekServices, weekDone, monthRevenue, maintenanceOpen, equipment: serials.size, warrantySoon };
  }, [appointments, clients]);

  const goToday = () => { onSelectDate(metrics.today); onSelectTab('agenda'); };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-cyan-400">Visão geral</p>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-xs text-zinc-500 mt-1">Operação da Maicon Automação em um só lugar.</p>
        </div>
        <button onClick={onNewAppointment} className="shrink-0 flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-black text-black active:scale-95 transition-transform">
          <Plus className="w-4 h-4" /> Novo
        </button>
      </div>

      <button onClick={goToday} className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-3xl p-4 hover:border-cyan-800 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-cyan-400"/><span className="font-bold">Hoje</span></div>
          <ArrowRight className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Mini value={metrics.todayServices.length} label="Serviços" />
          <Mini value={metrics.todayPrivate.length} label="Particular" />
          <Mini value={metrics.todayPending.length} label="Pendentes" accent="text-amber-400" />
          <Mini value={metrics.todayDone.length} label="Concluídos" accent="text-emerald-400" />
        </div>
      </button>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={<CalendarClock/>} title="Semana" value={`${metrics.weekDone.length}/${metrics.weekServices.length}`} note="serviços concluídos" onClick={() => onSelectTab('agenda')} />
        <Card icon={<DollarSign/>} title="Faturamento" value={formatCurrencyBRL(metrics.monthRevenue)} note="concluído neste mês" onClick={() => onSelectTab('financeiro')} valueSmall />
        <Card icon={<KeyRound/>} title="Equipamentos" value={String(metrics.equipment)} note="MA identificados" onClick={() => onSelectTab('clientes')} />
        <Card icon={<Users/>} title="Clientes" value={String(clients.length)} note="na base atual" onClick={() => onSelectTab('clientes')} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-cyan-400"/><h2 className="font-bold">Pós-venda</h2><button onClick={() => onSelectTab('posvenda')} className="ml-auto text-[9px] font-bold uppercase tracking-wider text-cyan-500">abrir central →</button></div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onOpenMaintenanceAgenda} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 text-left hover:border-amber-800/70 transition-colors">
            <Wrench className="w-4 h-4 text-amber-400 mb-2"/><div className="text-xl font-black">{metrics.maintenanceOpen}</div><div className="text-[10px] text-zinc-500">manutenções abertas</div>
          </button>
          <button onClick={() => onSelectTab('posvenda')} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 text-left hover:border-zinc-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mb-2"/><div className="text-xl font-black">{metrics.warrantySoon}</div><div className="text-[10px] text-zinc-500">garantias em até 30 dias</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Quick icon={<Plus/>} label="Agendar" onClick={onNewAppointment}/>
        <Quick icon={<CalendarDays/>} label="Agenda" onClick={() => onSelectTab('agenda')}/>
        <Quick icon={<UserRound/>} label="Clientes" onClick={() => onSelectTab('clientes')}/>
        <Quick icon={<Clock3/>} label="Dia a Dia" onClick={() => onSelectTab('diario')}/>
      </div>
    </div>
  );
};

const Mini = ({ value, label, accent = 'text-white' }: { value: number; label: string; accent?: string }) => (
  <div className="text-center"><div className={`text-xl font-black ${accent}`}>{value}</div><div className="text-[9px] text-zinc-500 leading-tight">{label}</div></div>
);

const Card = ({ icon, title, value, note, onClick, valueSmall }: { icon: React.ReactNode; title: string; value: string; note: string; onClick: () => void; valueSmall?: boolean }) => (
  <button onClick={onClick} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-left hover:border-cyan-900 transition-colors">
    <div className="flex items-center justify-between text-zinc-500 mb-2"><span className="text-[10px] uppercase tracking-wider font-bold">{title}</span><span className="[&>svg]:w-4 [&>svg]:h-4 text-cyan-400">{icon}</span></div>
    <div className={`${valueSmall ? 'text-base' : 'text-2xl'} font-black text-white truncate`}>{value}</div><div className="text-[9px] text-zinc-500 mt-1">{note}</div>
  </button>
);

const Quick = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl py-3 text-xs font-bold text-zinc-300 hover:text-cyan-400 hover:border-cyan-900">
    <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>{label}
  </button>
);
