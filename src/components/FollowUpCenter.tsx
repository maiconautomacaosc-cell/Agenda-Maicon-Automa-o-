import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, FileText, ShieldCheck, Users, BellRing, FlaskConical, X } from 'lucide-react';
import { Appointment, Client, Quote, ViewTab } from '../types';
import { getTodayString } from '../utils/date';
import { FollowUpItem, FollowUpKind, FollowUpMode, getFollowUps } from '../utils/followUps';

interface FollowUpCenterProps {
  appointments: Appointment[];
  clients: Client[];
  quotes: Quote[];
  onSelectTab: (tab: ViewTab) => void;
  onOpenAgendaDate: (date: string) => void;
  sandboxActive?: boolean;
}

const labels: Record<'todos' | FollowUpKind, string> = {
  todos: 'Todos',
  atrasado: 'Atrasados',
  amanha: 'Amanhã',
  garantia: 'Garantias',
  orcamento: 'Orçamentos',
  pos_venda: 'Pós-venda',
};

const destinationLabel: Record<FollowUpKind, string> = {
  atrasado: 'Agenda',
  amanha: 'Agenda',
  garantia: 'Pós-venda',
  orcamento: 'Orçamentos',
  pos_venda: 'Pós-venda',
};

export const FollowUpCenter: React.FC<FollowUpCenterProps> = ({ appointments, clients, quotes, onSelectTab, onOpenAgendaDate, sandboxActive = false }) => {
  const [filter, setFilter] = useState<'todos' | FollowUpKind>('todos');
  const [mode, setMode] = useState<FollowUpMode>('operacao');
  const effectiveMode: FollowUpMode = sandboxActive ? 'operacao' : mode;
  const [testItem, setTestItem] = useState<FollowUpItem | null>(null);
  const items = useMemo(() => getFollowUps(appointments, clients, quotes, getTodayString(), effectiveMode), [appointments, clients, quotes, effectiveMode]);
  const filtered = filter === 'todos' ? items : items.filter(i => i.kind === filter);
  const counts = useMemo(() => ({
    atrasado: items.filter(i => i.kind === 'atrasado').length,
    amanha: items.filter(i => i.kind === 'amanha').length,
    garantia: items.filter(i => i.kind === 'garantia').length,
    orcamento: items.filter(i => i.kind === 'orcamento').length,
    pos_venda: items.filter(i => i.kind === 'pos_venda').length,
  }), [items]);

  const changeMode = (next: FollowUpMode) => {
    setMode(next);
    setFilter('todos');
    setTestItem(null);
  };

  const openItem = (item: FollowUpItem) => {
    // Em modo teste nenhuma ação abre telas operacionais ou altera dados reais.
    if (mode === 'teste') {
      setTestItem(item);
      return;
    }
    if ((item.kind === 'atrasado' || item.kind === 'amanha') && item.date) return onOpenAgendaDate(item.date);
    if (item.kind === 'orcamento') return onSelectTab('orcamentos');
    if (item.kind === 'garantia' || item.kind === 'pos_venda') return onSelectTab('posvenda');
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-cyan-400">Acompanhamento automático</p>
        <h1 className="text-2xl font-black text-white">Central de Lembretes</h1>
        <p className="text-xs text-zinc-500 mt-1">{sandboxActive ? 'Lembretes calculados com os dados persistentes do Sandbox.' : 'Operação real separada de um ambiente seguro para validar todas as regras.'}</p>
      </div>

      {false && <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-1 flex gap-1">
        <button
          onClick={() => changeMode('operacao')}
          className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${mode === 'operacao' ? 'bg-cyan-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          Operação
        </button>
        <button
          onClick={() => changeMode('teste')}
          className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black transition-colors flex items-center justify-center gap-1.5 ${mode === 'teste' ? 'bg-violet-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <FlaskConical className="w-3.5 h-3.5" /> Teste
        </button>
      </div>}

      {false && mode === 'teste' && (
        <div className="rounded-2xl border border-violet-800/70 bg-violet-950/30 px-3.5 py-3">
          <div className="flex items-center gap-2 text-violet-300 font-black text-[10px] uppercase tracking-[0.16em]"><FlaskConical className="w-3.5 h-3.5" /> Ambiente de testes</div>
          <p className="text-[11px] text-violet-200/70 mt-1 leading-relaxed">Considera somente o CLIENTE TESTE — MAICON AUTOMAÇÃO. Cenários ausentes são simulados na tela para que as 5 regras possam ser validadas sem criar, editar ou excluir dados reais.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Mini icon={<AlertTriangle/>} value={counts.atrasado} label="Atrasados" accent="text-rose-400" />
        <Mini icon={<CalendarClock/>} value={counts.amanha} label="Amanhã" accent="text-cyan-400" />
        <Mini icon={<ShieldCheck/>} value={counts.garantia} label="Garantias" accent="text-emerald-400" />
        <Mini icon={<FileText/>} value={counts.orcamento} label="Orçamentos" accent="text-amber-400" />
        <Mini icon={<Users/>} value={counts.pos_venda} label="Pós-venda" accent="text-violet-400" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(labels) as Array<'todos' | FollowUpKind>).map(key => (
          <button key={key} onClick={() => setFilter(key)} className={`shrink-0 px-3 py-2 rounded-xl border text-[10px] font-bold ${filter === key ? (mode === 'teste' ? 'bg-violet-500 text-white border-violet-400' : 'bg-cyan-500 text-black border-cyan-400') : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
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
            <button key={item.id} onClick={() => openItem(item)} className={`w-full flex items-center gap-3 rounded-2xl border bg-zinc-900 p-3.5 text-left transition-colors ${mode === 'teste' ? 'border-violet-900/70 hover:border-violet-700' : 'border-zinc-800 hover:border-cyan-900'}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.priority === 'alta' ? 'bg-rose-500' : item.priority === 'media' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-bold text-zinc-100 truncate">{item.title}</div>
                  {item.simulated && <span className="shrink-0 rounded-md border border-violet-800 bg-violet-950/60 px-1.5 py-0.5 text-[8px] font-black text-violet-300">SIMULADO</span>}
                </div>
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

      {testItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-violet-800/70 bg-zinc-950 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] font-black text-violet-300">Validação segura</div>
                <h2 className="text-lg font-black text-white mt-1">{labels[testItem.kind]}</h2>
              </div>
              <button onClick={() => setTestItem(null)} className="p-2 rounded-xl bg-zinc-900 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5 mt-4">
              <div className="text-sm font-bold text-white">{testItem.title}</div>
              <div className="text-xs text-zinc-500 mt-1">{testItem.subtitle}</div>
            </div>
            <div className="mt-4 text-xs leading-relaxed text-zinc-400">
              Em operação, este alerta direcionaria para <strong className="text-zinc-200">{destinationLabel[testItem.kind]}</strong>. No Ambiente de Testes o redirecionamento fica bloqueado para impedir alterações acidentais em dados reais.
            </div>
            <div className="mt-3 rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-3 py-2.5 text-[10px] text-emerald-300">✓ Nenhum agendamento, cliente, orçamento, planilha ou arquivo do Drive foi alterado.</div>
            <button onClick={() => setTestItem(null)} className="w-full mt-4 rounded-xl bg-violet-500 py-3 text-xs font-black text-white">Validação concluída</button>
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
