import React, { useRef } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Download, 
  Upload, 
  KeyRound, 
  ShieldCheck, 
  Sparkles,
  Database
} from 'lucide-react';
import { Appointment } from '../types';
import { formatCurrencyBRL, formatDateBR } from '../utils/date';
import { exportBackupData, importBackupData } from '../utils/storage';

interface FinancialSummaryProps {
  appointments: Appointment[];
  onDataImported: () => void;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  appointments,
  onDataImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completedAppts = appointments.filter(a => a.status === 'concluido');
  const pendingAppts = appointments.filter(a => a.status === 'pendente' || a.status === 'em_andamento');
  
  const totalEarned = completedAppts.reduce((acc, c) => acc + (c.price || 0), 0);
  const totalPending = pendingAppts.reduce((acc, c) => acc + (c.price || 0), 0);
  const averageTicket = completedAppts.length > 0 ? totalEarned / completedAppts.length : 0;

  // Breakdown by Service Type
  const serviceBreakdown: Record<string, { count: number; total: number }> = appointments.reduce(
    (acc: Record<string, { count: number; total: number }>, appt) => {
      const key = appt.serviceTypeName || 'Outros';
      if (!acc[key]) {
        acc[key] = { count: 0, total: 0 };
      }
      acc[key].count += 1;
      acc[key].total += appt.price || 0;
      return acc;
    },
    {}
  );

  const handleExport = () => {
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
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = importBackupData(content);
        if (success) {
          alert('Backup restaurado com sucesso!');
          onDataImported();
        } else {
          alert('Erro ao importar arquivo. Certifique-se de que é um arquivo JSON válido.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Earned */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Total Recebido</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400">
            {formatCurrencyBRL(totalEarned)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {completedAppts.length} serviços concluídos
          </div>
        </div>

        {/* Expected / Pending */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">A Receber</span>
            <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-cyan-400">
            {formatCurrencyBRL(totalPending)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            {pendingAppts.length} serviços agendados
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Ticket Médio</span>
            <div className="p-1.5 rounded-lg bg-zinc-950 text-cyan-400 border border-zinc-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-white">
            {formatCurrencyBRL(averageTicket)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Por atendimento
          </div>
        </div>

        {/* Total Appointments */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Atendimentos</span>
            <div className="p-1.5 rounded-lg bg-zinc-950 text-zinc-300 border border-zinc-800">
              <KeyRound className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-white">
            {appointments.length}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Base de dados
          </div>
        </div>
      </div>

      {/* Breakdown by Service Type Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-cyan-400" />
          <span>Faturamento por Categoria de Serviço</span>
        </h3>

        <div className="space-y-2">
          {Object.entries(serviceBreakdown).map(([name, data]) => (
            <div
              key={name}
              className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
            >
              <div>
                <span className="font-semibold text-zinc-200">{name}</span>
                <span className="text-[10px] text-zinc-500 font-mono ml-2">({data.count} atendimentos)</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrencyBRL(data.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup and Database Sync Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Segurança e Backup dos Dados</h3>
              <p className="text-xs text-zinc-400">
                Seus agendamentos e clientes estão salvos localmente e podem ser exportados a qualquer momento.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-zinc-800">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Fazer Backup (Exportar JSON)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Restaurar Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
