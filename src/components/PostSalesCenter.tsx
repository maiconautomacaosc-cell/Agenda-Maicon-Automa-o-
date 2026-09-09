import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Clock3,
  History, KeyRound, Search, ShieldCheck, UserRound, Wrench
} from 'lucide-react';
import { Appointment, Client, EquipmentRecord } from '../types';
import {
  getClientEquipmentRecords, getEquipmentHistory, getEquipmentWarrantySummary,
  WarrantyState
} from '../utils/warranty';

interface PostSalesCenterProps {
  clients: Client[];
  appointments: Appointment[];
  onScheduleMaintenance: (client: Client, equipment: EquipmentRecord) => void;
  onOpenAgendaDate: (date: string) => void;
}

type FilterMode = 'todos' | 'atencao' | 'manutencao';

type EquipmentRow = {
  client: Client;
  equipment: EquipmentRecord;
  history: Appointment[];
  warranty: ReturnType<typeof getEquipmentWarrantySummary>;
  lastService?: Appointment;
  openMaintenance?: Appointment;
};

const formatDate = (date?: string) => {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return y && m && d ? `${d}/${m}/${y}` : date;
};

const warrantyLabel: Record<WarrantyState, string> = {
  ativa: 'Garantia ativa',
  vencendo: 'Vencendo',
  vencida: 'Vencida',
  sem_garantia: 'Sem garantia',
};

const warrantyClass: Record<WarrantyState, string> = {
  ativa: 'text-emerald-400 bg-emerald-950/40 border-emerald-900',
  vencendo: 'text-amber-400 bg-amber-950/40 border-amber-900',
  vencida: 'text-red-400 bg-red-950/40 border-red-900',
  sem_garantia: 'text-zinc-400 bg-zinc-900 border-zinc-800',
};

export const PostSalesCenter: React.FC<PostSalesCenterProps> = ({ clients, appointments, onScheduleMaintenance, onOpenAgendaDate }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('todos');
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null);

  const rows = useMemo<EquipmentRow[]>(() => {
    const result: EquipmentRow[] = [];
    clients.forEach(client => {
      getClientEquipmentRecords(client, appointments).forEach(equipment => {
        const history = getEquipmentHistory(appointments, client.id, client.name, equipment.serialNumber);
        const warranty = getEquipmentWarrantySummary(equipment, history);
        const serviceHistory = history.filter(a => a.status !== 'cancelado' && a.serviceType !== 'compromisso_particular');
        const lastService = [...serviceHistory].sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`))[0];
        const openMaintenance = serviceHistory.find(a =>
          (a.serviceType === 'manutencao_preventiva' || a.serviceType === 'manutencao_corretiva') &&
          (a.status === 'pendente' || a.status === 'em_andamento')
        );
        result.push({ client, equipment, history: serviceHistory, warranty, lastService, openMaintenance });
      });
    });
    return result.sort((a, b) => a.equipment.serialNumber.localeCompare(b.equipment.serialNumber));
  }, [clients, appointments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      const matchesSearch = !q || [
        row.client.name, row.client.phone, row.client.address,
        row.equipment.serialNumber, row.equipment.brand, row.equipment.model,
        row.equipment.manufacturerSerialNumber, row.equipment.description,
      ].some(v => String(v || '').toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (filter === 'atencao') return row.warranty.overall === 'vencendo' || row.warranty.overall === 'vencida';
      if (filter === 'manutencao') return Boolean(row.openMaintenance);
      return true;
    });
  }, [rows, search, filter]);

  const metrics = useMemo(() => {
    const realRows = rows.filter(r => !r.client.isTestClient);
    return ({
    equipment: realRows.length,
    active: realRows.filter(r => r.warranty.overall === 'ativa').length,
    attention: realRows.filter(r => r.warranty.overall === 'vencendo' || r.warranty.overall === 'vencida').length,
    maintenance: realRows.filter(r => r.openMaintenance).length,
    });
  }, [rows]);

  const selected = rows.find(r => r.equipment.serialNumber === selectedSerial);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-cyan-400">Relacionamento e histórico</p>
        <h1 className="text-2xl font-black text-white">Central de Pós-venda</h1>
        <p className="text-xs text-zinc-500 mt-1">Equipamentos, garantias e manutenções ligados ao MA.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<KeyRound/>} value={metrics.equipment} label="Equipamentos" />
        <Metric icon={<ShieldCheck/>} value={metrics.active} label="Garantias ativas" accent="text-emerald-400" />
        <Metric icon={<AlertTriangle/>} value={metrics.attention} label="Atenção" accent="text-amber-400" />
        <Metric icon={<Wrench/>} value={metrics.maintenance} label="Manut. abertas" accent="text-cyan-400" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, MA, telefone, marca ou modelo"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-700"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterButton active={filter === 'todos'} onClick={() => setFilter('todos')}>Todos</FilterButton>
          <FilterButton active={filter === 'atencao'} onClick={() => setFilter('atencao')}>Garantias / atenção</FilterButton>
          <FilterButton active={filter === 'manutencao'} onClick={() => setFilter('manutencao')}>Manutenções abertas</FilterButton>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            Nenhum equipamento encontrado para este filtro.
          </div>
        )}
        {filtered.map(row => (
          <button
            key={`${row.client.id}-${row.equipment.serialNumber}`}
            onClick={() => setSelectedSerial(row.equipment.serialNumber)}
            className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-cyan-900 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-white">{row.equipment.serialNumber}</span>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${warrantyClass[row.warranty.overall]}`}>{warrantyLabel[row.warranty.overall]}</span>
                  {row.openMaintenance && <span className="text-[9px] font-bold px-2 py-1 rounded-full border border-cyan-900 bg-cyan-950/40 text-cyan-400">Manutenção aberta</span>}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-300 mt-1"><UserRound className="w-3.5 h-3.5 text-zinc-500" />{row.client.name}</div>
                <div className="text-[10px] text-zinc-500 mt-1 truncate">{[row.equipment.brand, row.equipment.model].filter(Boolean).join(' ') || row.equipment.description || 'Equipamento cadastrado'}</div>
                <div className="text-[10px] text-zinc-600 mt-1">Último atendimento: {row.lastService ? `${formatDate(row.lastService.date)} • ${row.lastService.serviceTypeName}` : 'sem histórico'}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 mt-1 shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setSelectedSerial(null)}>
          <div className="w-full sm:max-w-xl max-h-[88vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-cyan-400">Prontuário do equipamento</p>
                <h2 className="text-xl font-black">{selected.equipment.serialNumber}</h2>
                <p className="text-xs text-zinc-400">{selected.client.name}</p>
              </div>
              <button onClick={() => setSelectedSerial(null)} className="rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400">Fechar</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Info label="Local de instalação" value={selected.equipment.description || selected.client.address || 'Não informado'} />
              </div>
              <Info label="Equipamento" value={[selected.equipment.brand, selected.equipment.model].filter(Boolean).join(' ') || 'Não informado'} />
              <Info label="Nº fabricante" value={selected.equipment.manufacturerSerialNumber || 'Não informado'} />
              <Info label="Garantia instalação" value={`${warrantyLabel[selected.warranty.installation.state]}${selected.warranty.installation.endDate ? ` • até ${formatDate(selected.warranty.installation.endDate)}` : ''}`} />
              <Info label="Garantia produto" value={`${warrantyLabel[selected.warranty.product.state]}${selected.warranty.product.endDate ? ` • até ${formatDate(selected.warranty.product.endDate)}` : ''}`} />
            </div>

            {selected.openMaintenance && (
              <button onClick={() => { onOpenAgendaDate(selected.openMaintenance!.date); setSelectedSerial(null); }} className="w-full flex items-center gap-3 rounded-2xl border border-cyan-900 bg-cyan-950/30 p-3 text-left">
                <Wrench className="w-5 h-5 text-cyan-400" />
                <div className="flex-1"><div className="text-xs font-bold text-cyan-300">Manutenção em aberto</div><div className="text-[10px] text-zinc-400">{formatDate(selected.openMaintenance.date)} • {selected.openMaintenance.startTime} • {selected.openMaintenance.serviceTypeName}</div></div>
                <ChevronRight className="w-4 h-4 text-cyan-500" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2"><History className="w-4 h-4 text-zinc-400"/><h3 className="text-sm font-bold">Histórico de atendimentos</h3></div>
              <div className="space-y-2">
                {[...selected.history].reverse().map(appt => (
                  <button key={appt.id} onClick={() => { onOpenAgendaDate(appt.date); setSelectedSerial(null); }} className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-left flex gap-3">
                    <div className="pt-0.5">{appt.status === 'concluido' ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/> : <Clock3 className="w-4 h-4 text-amber-400"/>}</div>
                    <div className="min-w-0 flex-1"><div className="text-xs font-bold text-zinc-200">{appt.serviceTypeName}</div><div className="text-[10px] text-zinc-500">{formatDate(appt.date)} • {appt.startTime}{appt.serviceOrder ? ` • OS ${appt.serviceOrder}` : ''}</div></div>
                    <CalendarDays className="w-4 h-4 text-zinc-600" />
                  </button>
                ))}
                {selected.history.length === 0 && <div className="text-xs text-zinc-500 rounded-xl border border-zinc-800 p-3">Nenhum atendimento encontrado para este MA.</div>}
              </div>
            </div>

            <button onClick={() => { onScheduleMaintenance(selected.client, selected.equipment); setSelectedSerial(null); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 text-black font-black active:scale-[0.99]">
              <Wrench className="w-4 h-4" /> Agendar manutenção deste MA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({ icon, value, label, accent = 'text-white' }: { icon: React.ReactNode; value: number; label: string; accent?: string }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
    <div className="[&>svg]:w-4 [&>svg]:h-4 text-cyan-400 mb-2">{icon}</div>
    <div className={`text-2xl font-black ${accent}`}>{value}</div><div className="text-[9px] text-zinc-500 mt-1">{label}</div>
  </div>
);

const FilterButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={`whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-bold border transition-colors ${active ? 'bg-cyan-500 border-cyan-500 text-black' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>{children}</button>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><div className="text-[9px] uppercase tracking-wider font-bold text-zinc-600">{label}</div><div className="text-xs text-zinc-300 mt-1 leading-snug">{value}</div></div>
);
