import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, FileText, ShieldCheck, Users, BellRing, X, Clock3, CheckCircle2, Archive, RotateCcw } from 'lucide-react';
import { Appointment, Client, Quote, ViewTab } from '../types';
import { getTodayString } from '../utils/date';
import {
  FollowUpItem, FollowUpKind, getFollowUps, filterVisibleFollowUps, getHiddenFollowUps,
  saveFollowUpAction, restoreFollowUpAction
} from '../utils/followUps';

interface FollowUpCenterProps {
  appointments: Appointment[];
  clients: Client[];
  quotes: Quote[];
  onSelectTab: (tab: ViewTab) => void;
  onOpenAgendaDate: (date: string) => void;
  sandboxActive?: boolean;
}

const labels: Record<'todos' | FollowUpKind, string> = {
  todos: 'Todos', atrasado: 'Atrasados', amanha: 'Amanhã', garantia: 'Garantias', orcamento: 'Orçamentos', pos_venda: 'Pós-venda',
};

const destinationLabel: Record<FollowUpKind, string> = {
  atrasado: 'Agenda', amanha: 'Agenda', garantia: 'Pós-venda', orcamento: 'Orçamentos', pos_venda: 'Pós-venda',
};

const addDaysString = (days: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const FollowUpCenter: React.FC<FollowUpCenterProps> = ({ appointments, clients, quotes, onSelectTab, onOpenAgendaDate, sandboxActive = false }) => {
  const [filter, setFilter] = useState<'todos' | FollowUpKind>('todos');
  const [selected, setSelected] = useState<FollowUpItem | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [revision, setRevision] = useState(0);
  const today = getTodayString();
  const rawItems = useMemo(() => getFollowUps(appointments, clients, quotes, today, sandboxActive ? 'sandbox' : 'operacao'), [appointments, clients, quotes, today, sandboxActive]);
  const items = useMemo(() => filterVisibleFollowUps(rawItems, today, sandboxActive), [rawItems, today, sandboxActive, revision]);
  const hidden = useMemo(() => getHiddenFollowUps(rawItems, today, sandboxActive), [rawItems, today, sandboxActive, revision]);
  const filtered = filter === 'todos' ? items : items.filter(i => i.kind === filter);
  const counts = useMemo(() => ({
    atrasado: items.filter(i => i.kind === 'atrasado').length,
    amanha: items.filter(i => i.kind === 'amanha').length,
    garantia: items.filter(i => i.kind === 'garantia').length,
    orcamento: items.filter(i => i.kind === 'orcamento').length,
    pos_venda: items.filter(i => i.kind === 'pos_venda').length,
  }), [items]);

  const navigate = (item: FollowUpItem) => {
    setSelected(null);
    if ((item.kind === 'atrasado' || item.kind === 'amanha') && item.date) return onOpenAgendaDate(item.date);
    if (item.kind === 'orcamento') return onSelectTab('orcamentos');
    return onSelectTab('posvenda');
  };

  const applyAction = (item: FollowUpItem, status: 'adiado' | 'resolvido' | 'dispensado', days?: number) => {
    saveFollowUpAction({
      id: item.id,
      status,
      until: status === 'adiado' && days ? addDaysString(days) : undefined,
      updatedAt: new Date().toISOString(),
    }, sandboxActive);
    setSelected(null);
    setRevision(v => v + 1);
  };

  const restore = (id: string) => {
    restoreFollowUpAction(id, sandboxActive);
    setRevision(v => v + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-[10px] uppercase tracking-[0.22em] font-bold ${sandboxActive ? 'text-amber-400' : 'text-cyan-400'}`}>Assistente operacional</p>
        <h1 className="text-2xl font-black text-white">Acompanhamentos</h1>
        <p className="text-xs text-zinc-500 mt-1">O sistema encontra o que precisa de atenção. Você decide quando agir.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Mini icon={<AlertTriangle/>} value={counts.atrasado} label="Atrasados" accent="text-rose-400" />
        <Mini icon={<CalendarClock/>} value={counts.amanha} label="Amanhã" accent="text-cyan-400" />
        <Mini icon={<ShieldCheck/>} value={counts.garantia} label="Garantias" accent="text-emerald-400" />
        <Mini icon={<FileText/>} value={counts.orcamento} label="Orçamentos" accent="text-amber-400" />
        <Mini icon={<Users/>} value={counts.pos_venda} label="Pós-venda" accent="text-violet-400" />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(Object.keys(labels) as Array<'todos' | FollowUpKind>).map(key => (
          <button key={key} onClick={() => { setFilter(key); setShowHidden(false); }} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-bold ${filter === key && !showHidden ? (sandboxActive ? 'bg-amber-400 text-black border-amber-300' : 'bg-cyan-500 text-black border-cyan-400') : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
            {labels[key]}
          </button>
        ))}
        {hidden.length > 0 && (
          <button onClick={() => setShowHidden(v => !v)} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-bold ${showHidden ? 'bg-zinc-200 text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>Pausados {hidden.length}</button>
        )}
      </div>

      {showHidden ? (
        <div className="space-y-2.5">
          {hidden.map(({ item, action }) => (
            <div key={item.id} className="w-full flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-zinc-200 truncate">{item.title}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{action.status === 'adiado' ? `Adiado até ${action.until?.split('-').reverse().slice(0,2).join('/')}` : action.status === 'resolvido' ? 'Marcado como resolvido' : 'Dispensado'}</div>
              </div>
              <button onClick={() => restore(item.id)} className="p-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-cyan-400" title="Restaurar"><RotateCcw className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <BellRing className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <div className="font-black text-white">Tudo em dia</div>
          <div className="text-xs text-zinc-500 mt-1">Nenhum acompanhamento pendente neste filtro.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(item => (
            <button key={item.id} onClick={() => setSelected(item)} className={`w-full flex items-center gap-3 rounded-2xl border bg-zinc-900 p-3.5 text-left transition-colors ${sandboxActive ? 'border-amber-900/60 hover:border-amber-700' : 'border-zinc-800 hover:border-cyan-900'}`}>
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
        Regras v4.4: atendimento atrasado, serviço de amanhã, garantia em até 30 dias, orçamento pendente há 3+ dias e pós-venda após 180 dias. Você pode abrir, adiar, resolver ou dispensar cada aviso.
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-[10px] uppercase tracking-[0.18em] font-black ${sandboxActive ? 'text-amber-400' : 'text-cyan-400'}`}>{labels[selected.kind]}</div>
                <h2 className="text-lg font-black text-white mt-1">{selected.title}</h2>
                <p className="text-xs text-zinc-500 mt-1">{selected.subtitle}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl bg-zinc-900 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <button onClick={() => navigate(selected)} className={`w-full mt-4 rounded-xl py-3 text-xs font-black flex items-center justify-center gap-2 ${sandboxActive ? 'bg-amber-400 text-black' : 'bg-cyan-500 text-black'}`}>
              Abrir {destinationLabel[selected.kind]} <ArrowRight className="w-4 h-4" />
            </button>

            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-2">Adiar lembrete</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => applyAction(selected, 'adiado', 1)} className="rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-[10px] font-bold text-zinc-300"><Clock3 className="w-3.5 h-3.5 mx-auto mb-1"/>1 dia</button>
                <button onClick={() => applyAction(selected, 'adiado', 3)} className="rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-[10px] font-bold text-zinc-300"><Clock3 className="w-3.5 h-3.5 mx-auto mb-1"/>3 dias</button>
                <button onClick={() => applyAction(selected, 'adiado', 7)} className="rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-[10px] font-bold text-zinc-300"><Clock3 className="w-3.5 h-3.5 mx-auto mb-1"/>7 dias</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => applyAction(selected, 'resolvido')} className="rounded-xl border border-emerald-900/70 bg-emerald-950/30 py-3 text-[10px] font-black text-emerald-300 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4"/>Resolvido</button>
              <button onClick={() => applyAction(selected, 'dispensado')} className="rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-[10px] font-black text-zinc-400 flex items-center justify-center gap-1.5"><Archive className="w-4 h-4"/>Dispensar</button>
            </div>
          </div>
        </div>
      )}
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
