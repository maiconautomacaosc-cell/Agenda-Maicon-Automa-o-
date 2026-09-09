import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, DollarSign, KeyRound,
  ShieldCheck, Users, Wrench, ArrowRight, CalendarClock, BookOpen, FileText, BellRing
} from 'lucide-react';
import { Appointment, Client, Quote, ViewTab, WarrantyPeriod } from '../types';
import { formatCurrencyBRL, getTodayString } from '../utils/date';
import { DAILY_BIBLE_INSPIRATIONS } from '../data/dailyBibleInspirations';
import { getFollowUps, filterVisibleFollowUps } from '../utils/followUps';

interface DashboardProps {
  appointments: Appointment[];
  clients: Client[];
  quotes: Quote[];
  onSelectTab: (tab: ViewTab) => void;
  onSelectDate: (date: string) => void;
  onOpenMaintenanceAgenda: () => void;
  onOpenFollowUps: () => void;
  sandboxActive?: boolean;
}

const warrantyMonths: Record<WarrantyPeriod, number> = {
  'Sem garantia': 0, '1 Mês': 1, '3 Meses': 3, '6 Meses': 6,
  '12 Meses': 12, '24 Meses': 24, '36 Meses': 36,
};


const getLocalDayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDailyBibleInspiration = (dayKey: string) => {
  const [year, month, day] = dayKey.split('-').map(Number);
  const current = new Date(year, month - 1, day);
  const start = new Date(year, 0, 1);
  const dayOfYear = Math.floor((current.getTime() - start.getTime()) / 86400000);
  return DAILY_BIBLE_INSPIRATIONS[dayOfYear % DAILY_BIBLE_INSPIRATIONS.length];
};

const addMonths = (date: string, months: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d;
};

export const Dashboard: React.FC<DashboardProps> = ({ appointments, clients, quotes, onSelectTab, onSelectDate, onOpenMaintenanceAgenda, onOpenFollowUps, sandboxActive = false }) => {
  const [dayKey, setDayKey] = useState(getLocalDayKey);
  const dailyVerse = useMemo(() => getDailyBibleInspiration(dayKey), [dayKey]);

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 50);
    const timer = window.setTimeout(() => setDayKey(getLocalDayKey()), nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [dayKey]);

  const metrics = useMemo(() => {
    const today = getTodayString();
    const now = new Date(`${today}T12:00:00`);
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now); weekStart.setDate(now.getDate() + mondayOffset); weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
    const monthPrefix = today.slice(0, 7);

    const testClientIds = new Set(clients.filter(c => c.isTestClient).map(c => c.id));
    const realClients = clients.filter(c => !c.isTestClient);
    const active = appointments.filter(a => a.status !== 'cancelado' && !a.isTestData && !testClientIds.has(a.clientId));
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
    realClients.forEach(c => {
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

    const weekCompletionPercent = weekServices.length > 0
      ? Math.round((weekDone.length / weekServices.length) * 100)
      : 0;

    const quotesWaiting = quotes.filter(q => q.status === 'pendente' && !q.isTestData && !(q.clientId && testClientIds.has(q.clientId))).length;
    const followUpsRaw = getFollowUps(appointments, clients, quotes, today, sandboxActive ? 'sandbox' : 'operacao');
    const followUps = filterVisibleFollowUps(followUpsRaw, today, sandboxActive);
    const followUpHigh = followUps.filter(i => i.priority === 'alta').length;

    return { today, todayServices, todayPrivate, todayPending, todayDone, weekServices, weekDone, weekCompletionPercent, monthRevenue, maintenanceOpen, equipment: serials.size, warrantySoon, quotesWaiting, followUpTotal: followUps.length, followUpHigh, realClientsCount: realClients.length };
  }, [appointments, clients, quotes, sandboxActive]);

  const goToday = () => { onSelectDate(metrics.today); onSelectTab('agenda'); };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-cyan-400">Visão geral</p>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <div className="mt-2 max-w-xl flex items-start gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-zinc-500">Inspiração bíblica do dia</p>
              <p className="text-sm text-zinc-100 font-semibold leading-snug mt-0.5">“{dailyVerse.text}”</p>
              <p className="text-[10px] text-cyan-500/80 mt-1">{dailyVerse.reference}</p>
            </div>
          </div>
        </div>
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
        <Card icon={<CalendarClock/>} title="Semana" value={`${metrics.weekDone.length} de ${metrics.weekServices.length}`} note={`concluídos • ${metrics.weekCompletionPercent}%`} onClick={() => onSelectTab('agenda')} />
        <Card icon={<DollarSign/>} title="Faturamento" value={formatCurrencyBRL(metrics.monthRevenue)} note="concluído neste mês" onClick={() => onSelectTab('financeiro')} valueSmall />
        <Card icon={<KeyRound/>} title="Equipamentos" value={String(metrics.equipment)} note="MA identificados" onClick={() => onSelectTab('clientes')} />
        <Card icon={<Users/>} title="Clientes" value={String(metrics.realClientsCount)} note="clientes reais" onClick={() => onSelectTab('clientes')} />
      </div>

      <button onClick={onOpenFollowUps} className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3 text-left hover:border-cyan-900 transition-colors">
        <BellRing className="w-5 h-5 text-cyan-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white">Acompanhamentos</div>
          <div className="text-[10px] text-zinc-500">{metrics.followUpTotal === 0 ? 'Tudo em dia' : `${metrics.followUpTotal} ${metrics.followUpTotal === 1 ? 'item' : 'itens'} pedem atenção${metrics.followUpHigh ? ` • ${metrics.followUpHigh} prioritários` : ''}`}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
      </button>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-cyan-400"/><h2 className="font-bold">Pós-venda</h2><button onClick={() => onSelectTab('posvenda')} className="ml-auto text-[9px] font-bold uppercase tracking-wider text-cyan-500">abrir central →</button></div>
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={onOpenMaintenanceAgenda} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 text-left hover:border-amber-800/70 transition-colors">
            <Wrench className="w-4 h-4 text-amber-400 mb-2"/><div className="text-xl font-black">{metrics.maintenanceOpen}</div><div className="text-[10px] text-zinc-500">manutenções abertas</div>
          </button>
          <button onClick={() => onSelectTab('posvenda')} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 text-left hover:border-zinc-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mb-2"/><div className="text-xl font-black">{metrics.warrantySoon}</div><div className="text-[10px] text-zinc-500">garantias em até 30 dias</div>
          </button>
          <button onClick={() => onSelectTab('orcamentos')} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 text-left hover:border-cyan-800/70 transition-colors">
            <FileText className="w-4 h-4 text-cyan-400 mb-2"/><div className="text-xl font-black">{metrics.quotesWaiting}</div><div className="text-[10px] text-zinc-500">orçamentos aguardando</div>
          </button>

        </div>
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
