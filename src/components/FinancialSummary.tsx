import React, { useMemo, useRef, useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  KeyRound,
  Database,
  WalletCards,
  BadgeDollarSign,
  CalendarDays,
} from 'lucide-react';
import { Appointment } from '../types';
import { loadCommercialClosings, closingTotal } from '../utils/commercialClosings';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import { exportBackupData, importBackupData } from '../utils/storage';

interface FinancialSummaryProps {
  appointments: Appointment[];
  onDataImported: () => void;
  sandboxActive?: boolean;
}

type PeriodFilter = 'mes' | '30dias' | 'todos';

type FinanceStatus = 'pago' | 'parcial' | 'receber';

const receivedFor = (a: Appointment) =>
  a.payments !== undefined
    ? a.payments.reduce((n, p) => n + Number(p.amount || 0), 0)
    : a.status === 'concluido'
      ? Number(a.price || 0)
      : 0;

const financeStatus = (a: Appointment): FinanceStatus => {
  const total = Number(a.price || 0);
  const received = receivedFor(a);
  if (total > 0 && received >= total - 0.005) return 'pago';
  if (received > 0) return 'parcial';
  return 'receber';
};

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  appointments,
  onDataImported,
  sandboxActive = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [period, setPeriod] = useState<PeriodFilter>('mes');
  const [showReceivables, setShowReceivables] = useState(true);

  const realAppointments = appointments.filter((a) => !a.isTestData && a.serviceType !== 'compromisso_particular');

  const filteredAppointments = useMemo(() => {
    if (period === 'todos') return realAppointments;
    const today = new Date();
    const start = new Date(today);
    if (period === 'mes') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(today.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }
    return realAppointments.filter((a) => {
      const date = new Date(`${a.date}T12:00:00`);
      return !Number.isNaN(date.getTime()) && date >= start && date <= today;
    });
  }, [realAppointments, period]);

  const completedAppts = filteredAppointments.filter((a) => a.status === 'concluido');
  const commercialClosings = loadCommercialClosings(sandboxActive);
  const groupedAppointmentIds = new Set(commercialClosings.flatMap(c => c.appointmentIds));
  const legacyFinancialAppointments = filteredAppointments.filter(a => !groupedAppointmentIds.has(a.id));
  const closingReceived = commercialClosings.reduce((sum,c)=>sum+c.payments.reduce((n,p)=>n+Number(p.amount||0),0),0);
  const closingSold = commercialClosings.reduce((sum,c)=>sum+closingTotal(c, realAppointments),0);
  const totalReceived = closingReceived + legacyFinancialAppointments.reduce((acc, a) => acc + receivedFor(a), 0);
  const totalSold = closingSold + legacyFinancialAppointments.reduce((acc, a) => acc + Number(a.price || 0), 0);
  const totalPending = Math.max(0, totalSold-totalReceived);
  const averageTicket = completedAppts.length > 0 ? totalSold / completedAppts.length : 0;

  const statusCounts = legacyFinancialAppointments.reduce(
    (acc, a) => {
      if (Number(a.price || 0) <= 0) return acc;
      acc[financeStatus(a)] += 1;
      return acc;
    },
    { pago: 0, parcial: 0, receber: 0 } as Record<FinanceStatus, number>,
  );

  const receivables = legacyFinancialAppointments
    .map((a) => ({ a, balance: Math.max(0, Number(a.price || 0) - receivedFor(a)), status: financeStatus(a) }))
    .filter((item) => item.balance > 0.005)
    .sort((x, y) => x.a.date.localeCompare(y.a.date));

  const serviceBreakdown: Record<string, { count: number; total: number }> = filteredAppointments.reduce(
    (acc: Record<string, { count: number; total: number }>, appt) => {
      const key = appt.serviceTypeName || 'Outros';
      if (!acc[key]) acc[key] = { count: 0, total: 0 };
      acc[key].count += 1;
      acc[key].total += Number(appt.price || 0);
      return acc;
    },
    {},
  );

  const periodLabel = period === 'mes' ? 'Mês atual' : period === '30dias' ? 'Últimos 30 dias' : 'Todo o histórico';

  const handleExport = () => {
    if (sandboxActive) {
      alert('Sandbox: backup oficial bloqueado para proteger a operação real.');
      return;
    }
    const dataStr = exportBackupData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_agenda_maicon_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (sandboxActive) {
      alert('Sandbox: restauração de backup oficial bloqueada.');
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      const success = importBackupData(content);
      if (success) {
        alert('Backup restaurado com sucesso!');
        onDataImported();
      } else {
        alert('Erro ao importar arquivo. Certifique-se de que é um arquivo JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-cyan-400" /> Período financeiro</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Indicadores dos serviços do período selecionado</div>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)} className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none">
          <option value="mes">Mês atual</option>
          <option value="30dias">Últimos 30 dias</option>
          <option value="todos">Todo histórico</option>
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Vendido</span><div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40"><BadgeDollarSign className="w-4 h-4" /></div></div>
          <div className="text-lg sm:text-xl font-mono font-bold text-white">{formatCurrencyBRL(totalSold)}</div>
          <div className="text-[10px] text-zinc-500 font-mono">{periodLabel}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Recebido</span><div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"><CheckCircle2 className="w-4 h-4" /></div></div>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400">{formatCurrencyBRL(totalReceived)}</div>
          <div className="text-[10px] text-zinc-500 font-mono">dinheiro já registrado</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">A receber</span><div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/40"><Clock className="w-4 h-4" /></div></div>
          <div className="text-lg sm:text-xl font-mono font-bold text-amber-300">{formatCurrencyBRL(totalPending)}</div>
          <div className="text-[10px] text-zinc-500 font-mono">saldo em aberto</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between"><span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Ticket médio</span><div className="p-1.5 rounded-lg bg-zinc-950 text-cyan-400 border border-zinc-800"><TrendingUp className="w-4 h-4" /></div></div>
          <div className="text-lg sm:text-xl font-mono font-bold text-white">{formatCurrencyBRL(averageTicket)}</div>
          <div className="text-[10px] text-zinc-500 font-mono">{completedAppts.length} concluídos</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-center"><div className="text-[10px] uppercase font-bold text-zinc-500">Pago</div><div className="text-xl font-black text-emerald-400 mt-1">{statusCounts.pago}</div></div>
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-center"><div className="text-[10px] uppercase font-bold text-zinc-500">Parcial</div><div className="text-xl font-black text-amber-300 mt-1">{statusCounts.parcial}</div></div>
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-center"><div className="text-[10px] uppercase font-bold text-zinc-500">A receber</div><div className="text-xl font-black text-cyan-400 mt-1">{statusCounts.receber}</div></div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <button onClick={() => setShowReceivables((v) => !v)} className="w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-2"><WalletCards className="w-4 h-4 text-amber-300" /><div><h3 className="text-sm font-bold text-white">Valores a receber</h3><p className="text-[10px] text-zinc-500">{receivables.length} atendimento(s) com saldo</p></div></div>
          <span className="text-xs font-black text-amber-300">{formatCurrencyBRL(totalPending)}</span>
        </button>
        {showReceivables && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            {receivables.length === 0 ? <div className="text-xs text-zinc-500 py-2 text-center">Nenhum saldo em aberto neste período.</div> : receivables.map(({ a, balance, status }) => (
              <div key={a.id} className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-xs font-bold text-zinc-200 truncate">{a.clientName}</div><div className="text-[10px] text-zinc-500 mt-0.5">{a.serviceOrder ? `OS ${a.serviceOrder} • ` : ''}{formatDateBR(a.date)} • {status === 'parcial' ? 'Parcial' : 'A receber'}</div></div>
                <div className="text-sm font-black text-amber-300 whitespace-nowrap">{formatCurrencyBRL(balance)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><KeyRound className="w-4 h-4 text-cyan-400" /><span>Vendido por categoria de serviço</span></h3>
        <div className="space-y-2">
          {Object.entries(serviceBreakdown).length === 0 ? <div className="text-xs text-zinc-500">Nenhum serviço no período.</div> : Object.entries(serviceBreakdown).map(([name, data]) => (
            <div key={name} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <div><span className="font-semibold text-zinc-200">{name}</span><span className="text-[10px] text-zinc-500 font-mono ml-2">({data.count})</span></div>
              <span className="font-mono font-bold text-emerald-400">{formatCurrencyBRL(data.total)}</span>
            </div>
          ))}
        </div>
      </div>

      {sandboxActive && <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 px-4 py-3 text-xs text-amber-300"><strong>Sandbox:</strong> relatórios usam somente os dados de teste. Importação/exportação do backup oficial fica bloqueada para proteger a produção.</div>}

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2"><Database className="w-5 h-5 text-cyan-400" /><div><h3 className="text-sm font-bold text-white">Segurança e Backup dos Dados</h3><p className="text-xs text-zinc-400">Seus dados podem ser exportados a qualquer momento.</p></div></div>
        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-zinc-800">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold"><Download className="w-4 h-4 text-cyan-400" /><span>Fazer Backup</span></button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold"><Upload className="w-4 h-4 text-emerald-400" /><span>Restaurar Backup</span></button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
        </div>
      </div>
    </div>
  );
};
