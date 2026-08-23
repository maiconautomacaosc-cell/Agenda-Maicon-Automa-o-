import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  CalendarPlus, 
  MessageSquare, 
  Printer, 
  Edit3, 
  Trash2, 
  DollarSign, 
  User, 
  Phone, 
  MapPin, 
  KeyRound, 
  ArrowUpDown,
  Filter,
  Sparkles,
  Layers
} from 'lucide-react';
import { Client, Quote, QuoteStatus } from '../types';
import { formatDateBR, formatCurrencyBRL } from '../utils/date';

interface QuotesManagerProps {
  quotes: Quote[];
  clients: Client[];
  onNewQuote: () => void;
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onStatusChange: (id: string, status: QuoteStatus) => void;
  onOpenWhatsApp: (quote: Quote) => void;
  onViewDetail: (quote: Quote) => void;
  onConvertToAppointment: (quote: Quote) => void;
}

export const QuotesManager: React.FC<QuotesManagerProps> = ({
  quotes,
  clients,
  onNewQuote,
  onEditQuote,
  onDeleteQuote,
  onStatusChange,
  onOpenWhatsApp,
  onViewDetail,
  onConvertToAppointment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'todos'>('todos');

  // Filter quotes
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.clientPhone.includes(searchTerm) ||
      q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.lockModel && q.lockModel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.address && q.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'todos' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate high-level stats
  const totalCount = quotes.length;
  const pendingQuotes = quotes.filter((q) => q.status === 'pendente');
  const approvedQuotes = quotes.filter((q) => q.status === 'aprovado' || q.status === 'convertido');
  const totalPendingValue = pendingQuotes.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalApprovedValue = approvedQuotes.reduce((acc, curr) => acc + curr.totalAmount, 0);

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/80">
            <CheckCircle2 className="w-3 h-3" />
            Aprovado
          </span>
        );
      case 'convertido':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/80">
            <CalendarPlus className="w-3 h-3" />
            Convertido
          </span>
        );
      case 'recusado':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800/80">
            <XCircle className="w-3 h-3" />
            Recusado
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800/80">
            <AlertCircle className="w-3 h-3" />
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* High Density Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Total Propostas</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white mt-2">
            {totalCount}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Histórico completo
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-400">Em Aberto</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-2">
            {formatCurrencyBRL(totalPendingValue)}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            {pendingQuotes.length} orçamentos aguardando
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">Aprovados / Ganhos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-2">
            {formatCurrencyBRL(totalApprovedValue)}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            {approvedQuotes.length} propostas convertidas
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">Taxa Conversão</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-2">
            {totalCount > 0 ? Math.round((approvedQuotes.length / totalCount) * 100) : 0}%
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
            Sucesso em fechamento
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & New Quote Trigger */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-quotes"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, telefone, código #ORC ou fechadura..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['todos', 'pendente', 'aprovado', 'convertido', 'recusado'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 uppercase ${
                statusFilter === status
                  ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {status === 'todos' ? 'Todos' : status}
            </button>
          ))}
        </div>

        {/* New Quote Button */}
        <button
          id="btn-new-quote-primary"
          onClick={onNewQuote}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-cyan-950/40 active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Criar Orçamento Rápido</span>
        </button>
      </div>

      {/* Quotes Cards Grid */}
      {filteredQuotes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-white">Nenhum orçamento encontrado</div>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros ou termos da busca.'
              : 'Gere propostas técnicas rápidas com cálculo automático e envio direto pelo WhatsApp.'}
          </p>
          <button
            onClick={onNewQuote}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Criar Primeiro Orçamento</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="p-4 rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between gap-3 shadow-lg group"
            >
              {/* Card Header: Code, Date & Status */}
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-lg border border-cyan-800/60">
                    #{quote.code}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {formatDateBR(quote.date)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status switcher select */}
                  <select
                    value={quote.status}
                    onChange={(e) => onStatusChange(quote.id, e.target.value as QuoteStatus)}
                    className="text-[10px] font-mono font-bold bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="pendente">⏳ Pendente</option>
                    <option value="aprovado">✅ Aprovado</option>
                    <option value="convertido">🚀 Convertido</option>
                    <option value="recusado">❌ Recusado</option>
                  </select>
                  {getStatusBadge(quote.status)}
                </div>
              </div>

              {/* Client Info & Lock specs */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                      {quote.clientName}
                    </h3>
                    <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        {quote.clientPhone}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase block">VALOR TOTAL</span>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      {formatCurrencyBRL(quote.totalAmount)}
                    </span>
                  </div>
                </div>

                {quote.address && (
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">{quote.address}</span>
                  </div>
                )}

                {/* Equipment & Door tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {quote.lockModel && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 text-cyan-300 border border-zinc-800 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-cyan-400" />
                      {quote.lockModel}
                    </span>
                  )}
                  {quote.doorType && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800">
                      🚪 {quote.doorType}
                    </span>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-500 border border-zinc-800">
                    ⏱️ Validade: {quote.validityDays} dias
                  </span>
                </div>

                {/* Services items preview */}
                <div className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <div className="text-[10px] text-zinc-400 font-mono uppercase font-bold flex items-center justify-between">
                    <span>Serviços Incluídos ({quote.items.length}):</span>
                    {quote.discountAmount && quote.discountAmount > 0 ? (
                      <span className="text-rose-400">Desc: -{formatCurrencyBRL(quote.discountAmount)}</span>
                    ) : null}
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {quote.items.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between text-[11px] text-zinc-300">
                        <span className="truncate pr-2">
                          <span className="font-mono text-cyan-400 mr-1">{idx + 1}.</span>
                          {item.description}
                          {item.quantity > 1 && ` (${item.quantity}x)`}
                        </span>
                        <span className="font-mono font-semibold text-zinc-200 shrink-0">
                          {formatCurrencyBRL(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onViewDetail(quote)}
                    className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors"
                    title="Ver Proposta Completa / Imprimir"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onEditQuote(quote)}
                    className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors"
                    title="Editar Orçamento"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir o orçamento #${quote.code}?`)) {
                        onDeleteQuote(quote.id);
                      }
                    }}
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs transition-colors"
                    title="Excluir Orçamento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {quote.status !== 'convertido' && (
                    <button
                      onClick={() => onConvertToAppointment(quote)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 font-mono text-[11px] font-bold transition-colors"
                      title="Transformar este orçamento em um agendamento na agenda"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-cyan-400 stroke-[2.5]" />
                      <span className="hidden sm:inline">Agendar</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenWhatsApp(quote)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 active:scale-95 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
