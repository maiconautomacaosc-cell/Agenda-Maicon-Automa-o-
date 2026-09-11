import React, { useMemo } from 'react';
import { X, WalletCards, CheckCircle2, Clock3, ReceiptText, ChevronRight, Layers3 } from 'lucide-react';
import { Appointment, Client, CommercialClosing } from '../types';
import { closingTotal, closingUndefinedAppointmentIds } from '../utils/commercialClosings';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';

interface Props {
  client: Client;
  appointments: Appointment[];
  closings: CommercialClosing[];
  onClose: () => void;
  onOpenClosing: (closing: CommercialClosing) => void;
  onOpenAppointment: (appointment: Appointment) => void;
}

type Row =
  | { type: 'closing'; key: string; date: string; closing: CommercialClosing; total: number; received: number; balance: number; undefinedCount: number }
  | { type: 'appointment'; key: string; date: string; appointment: Appointment; total: number; received: number; balance: number; undefinedCount: number };

const receivedForAppointment = (a: Appointment) =>
  a.payments !== undefined
    ? a.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : a.status === 'concluido'
      ? Number(a.price || 0)
      : 0;

export const ClientFinancialDashboard: React.FC<Props> = ({ client, appointments, closings, onClose, onOpenClosing, onOpenAppointment }) => {
  const data = useMemo(() => {
    const name = client.name.toLowerCase();
    const clientAppointments = appointments.filter(a =>
      a.serviceType !== 'compromisso_particular' &&
      (a.clientId === client.id || a.clientName.toLowerCase() === name)
    );
    const clientAppointmentIds = new Set(clientAppointments.map(a => a.id));
    const clientClosings = closings.filter(c => c.clientId === client.id || c.appointmentIds.some(id => clientAppointmentIds.has(id)));
    const groupedIds = new Set(clientClosings.flatMap(c => c.appointmentIds));

    const closingRows: Row[] = clientClosings.map(c => {
      const total = closingTotal(c, appointments);
      const received = c.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const undefinedCount = closingUndefinedAppointmentIds(c, appointments).length;
      const balance = Math.max(0, total - received);
      const related = appointments.filter(a => c.appointmentIds.includes(a.id));
      const date = related.map(a => a.date).sort().reverse()[0] || c.createdAt.slice(0, 10);
      return { type: 'closing', key: c.id, date, closing: c, total, received, balance, undefinedCount };
    });

    const legacyRows: Row[] = clientAppointments.filter(a => !groupedIds.has(a.id)).map(a => {
      const total = Number(a.price || 0);
      const received = receivedForAppointment(a);
      return {
        type: 'appointment',
        key: a.id,
        date: a.date,
        appointment: a,
        total,
        received,
        balance: Math.max(0, total - received),
        undefinedCount: a.price == null ? 1 : 0,
      };
    });

    const rows = [...closingRows, ...legacyRows].sort((a, b) => b.date.localeCompare(a.date));
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const received = rows.reduce((sum, row) => sum + row.received, 0);
    const balance = rows.reduce((sum, row) => sum + row.balance, 0);
    const undefinedCount = rows.reduce((sum, row) => sum + row.undefinedCount, 0);
    return { rows, total, received, balance, undefinedCount, services: clientAppointments.length };
  }, [client, appointments, closings]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800 text-amber-300"><WalletCards className="w-5 h-5" /></div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-black">Financeiro do cliente</div>
              <h3 className="text-base font-black text-white truncate">{client.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${data.balance > 0 ? 'bg-amber-950/20 border-amber-800/60' : 'bg-emerald-950/20 border-emerald-800/60'}`}>
            {data.balance > 0 ? <Clock3 className="w-5 h-5 text-amber-300 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            <div>
              <div className={`font-black ${data.balance > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{data.balance > 0 ? 'Possui saldo em aberto' : 'Cliente em dia'}</div>
              <div className="text-[11px] text-zinc-400">Visão consolidada de OS, fechamentos e pagamentos deste cliente.</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800"><div className="text-[10px] uppercase text-zinc-500 font-bold">Total em serviços</div><div className="text-lg font-black text-white mt-1">{formatCurrencyBRL(data.total)}</div></div>
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800"><div className="text-[10px] uppercase text-zinc-500 font-bold">Recebido</div><div className="text-lg font-black text-emerald-400 mt-1">{formatCurrencyBRL(data.received)}</div></div>
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800"><div className="text-[10px] uppercase text-zinc-500 font-bold">Falta pagar</div><div className="text-lg font-black text-amber-300 mt-1">{formatCurrencyBRL(data.balance)}</div></div>
            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800"><div className="text-[10px] uppercase text-zinc-500 font-bold">Atendimentos</div><div className="text-lg font-black text-cyan-300 mt-1">{data.services}</div></div>
          </div>

          {data.undefinedCount > 0 && <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/60 text-amber-200 text-xs"><b>{data.undefinedCount} item(ns) ainda em composição.</b> O total em serviços pode aumentar quando os valores forem definidos.</div>}

          <div>
            <div className="flex items-center gap-2 mb-2"><Layers3 className="w-4 h-4 text-cyan-400"/><div className="text-white font-black">Histórico financeiro e de serviços</div></div>
            {data.rows.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-zinc-800 text-zinc-500">Ainda não há movimentação financeira para este cliente.</div>
            ) : data.rows.map(row => {
              const isClosing = row.type === 'closing';
              const title = isClosing ? row.closing.id : (row.appointment.serviceOrder || 'Atendimento sem OS');
              const subtitle = isClosing
                ? `${row.closing.appointmentIds.length} OS vinculada${row.closing.appointmentIds.length !== 1 ? 's' : ''}`
                : row.appointment.serviceTypeName;
              const statusLabel = row.undefinedCount > 0 ? 'Em composição' : row.balance > 0.005 ? (row.received > 0 ? 'Parcial' : 'A receber') : 'Pago';
              const statusClass = row.undefinedCount > 0 ? 'text-amber-300 bg-amber-950/40 border-amber-800' : row.balance > 0.005 ? 'text-amber-300 bg-amber-950/40 border-amber-800' : 'text-emerald-300 bg-emerald-950/40 border-emerald-800';
              return (
                <button key={row.key} onClick={() => isClosing ? onOpenClosing(row.closing) : onOpenAppointment(row.appointment)} className="w-full text-left p-3 mb-2 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-cyan-800 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className={`font-mono font-black ${isClosing ? 'text-cyan-300' : 'text-amber-300'}`}>{title}</span><span className={`px-2 py-0.5 rounded-full border text-[9px] font-black ${statusClass}`}>{statusLabel}</span></div>
                      <div className="text-zinc-300 text-xs mt-1">{subtitle}</div>
                      <div className="text-zinc-500 text-[11px] mt-0.5">{formatDateBR(row.date)} • Recebido {formatCurrencyBRL(row.received)}{row.balance > 0.005 ? ` • Falta ${formatCurrencyBRL(row.balance)}` : ''}</div>
                    </div>
                    <div className="text-right shrink-0"><div className="text-white font-black">{row.undefinedCount > 0 ? 'Em composição' : formatCurrencyBRL(row.total)}</div><div className="text-[10px] text-cyan-400 mt-1 inline-flex items-center gap-1">Ver detalhes <ChevronRight className="w-3 h-3"/></div></div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex gap-2"><ReceiptText className="w-4 h-4 text-zinc-500 shrink-0"/><span>Ao abrir um item você vai direto ao fechamento/OS correspondente para consultar pagamentos, recibos, valores e serviços vinculados.</span></div>
        </div>
      </div>
    </div>
  );
};
