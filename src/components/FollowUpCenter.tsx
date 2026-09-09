import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, FileText, ShieldCheck, Users, BellRing } from 'lucide-react';
import { Appointment, Client, Quote, ViewTab } from '../types';
import { getTodayString } from '../utils/date';
import { FollowUpKind, getFollowUps } from '../utils/followUps';

interface FollowUpCenterProps {
  appointments: Appointment[];
  clients: Client[];
  quotes: Quote[];
  onSelectTab: (tab: ViewTab) => void;
  onOpenAgendaDate: (date: string) => void;
}

const labels: Record<'todos' | FollowUpKind, string> = {
  todos: 'Todos',
  atrasado: 'Atrasados',
  amanha: 'Amanhã',
  garantia: 'Garantias',
  orcamento: 'Orçamentos',
  pos_venda: 'Pós-venda',
};

export const FollowUpCenter: React.FC<FollowUpCenterProps> = ({ appointments, clients, quotes, onSelectTab, onOpenAgendaDate }) => {
  const [filter, setFilter] = useState<'todos' | FollowUpKind>('todos');
  const items = useMemo(() => getFollowUps(appointments, clients, quotes, getTodayString()), [appointments, clients, quotes]);
  const filtered = filter === 'todos' ? items : items.filter(i => i.kind === filter);
  const counts = useMemo(() => ({
    atrasado: items.filter(i => i.kind === 'atrasado').length,
    amanha: items.filter(i => i.kind === 'amanha').length,
    garantia: items.filter(i => i.kind === 'garantia').length,
    orcamento: items.filter(i => i.kind === 'orcamento').length,
    pos_venda: items.filter(i => i.kind === 'pos_venda').length,
  }), [items]);

  const openItem = (item: typeof items[number]) => {
    if ((item.kind === 'atrasado' || item.kind === 'amanha') && item.date) return onOpenAgendaDate(item.date);
    if (item.kind === 'orcamento') return onSelectTab('orcamentos');
    if (item.kind === 'garantia' || item.kind === 'pos_venda') return onSelectTab('posvenda');
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-cyan-400">Acompanhamento automático</p>
        <h1 className="text-2xl font-black text-white">Central de Lembretes</h1>
        <p className="text-xs text-zinc-500 mt-1">O sistema organiza o que merece sua atenção sem misturar dados do Cliente Teste.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Mini icon={<AlertTriangle/>} value={counts.atrasado} label="Atrasados" accent="text-rose-400" />
        <Mini icon={<CalendarClock/>} value={counts.amanha} label="Amanhã" accent="text-cyan-400" />
        <Mini icon={<ShieldCheck/>} value={counts.garantia} label="Garantias" accent="text-emerald-400" />
        <Mini icon={<FileText/>} value={counts.orcamento} label="Orçamentos" accent="text-amber-400" />
        <Mini icon={<Users/>} value={counts.pos_venda} label="Pós-venda" accent="text-violet-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(labels) as Array<'todos' | FollowUpKind>).map(key => (
          <button key={key} onClick={() => setFilter(key)} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-bold ${filter === key ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
            {labels[key]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <BellRing className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <div className="font-black text-white">Tudo em dia</div>
          <div className="text-xs text-zinc-500 mt-1">Nenhum acompanhamento pendente neste filtro.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(item => (
            <button key={item.id} onClick={() => openItem(item)} className="w-full flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 text-left hover:border-cyan-900 transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.priority === 'alta' ? 'bg-rose-500' : item.priority === 'media' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-zinc-100 truncate">{item.title}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{item.subtitle}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-3.5 py-3 text-[10px] leading-relaxed text-zinc-500">
        Regras v4.3: atendimento em aberto após a data, serviço de amanhã, garantia em até 30 dias, orçamento pendente há 3+ dias e cliente há 180+ dias sem serviço concluído.
      </div>
    </div>
  );
};

const Mini = ({ icon, value, label, accent }: { icon: React.ReactNode; value: number; label: string; accent: string }) => (
  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
    <div className={`[&>svg]:w-4 [&>svg]:h-4 ${accent}`}>{icon}</div>
    <div className="text-xl font-black text-white mt-2">{value}</div>
    <div className="text-[9px] text-zinc-500">{label}</div>
  </div>
);
