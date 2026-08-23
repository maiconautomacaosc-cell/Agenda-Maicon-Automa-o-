import React from 'react';
import { 
  X, 
  Printer, 
  MessageSquare, 
  CalendarPlus, 
  FileText, 
  User, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  XCircle,
  KeyRound
} from 'lucide-react';
import { Quote } from '../types';
import { formatDateBR, formatCurrencyBRL } from '../utils/date';
import { BrandLogo } from './BrandLogo';

interface QuoteDetailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenWhatsApp: (quote: Quote) => void;
  onConvertToAppointment: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
}

export const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  quote,
  isOpen,
  onClose,
  onOpenWhatsApp,
  onConvertToAppointment,
  onEditQuote,
}) => {
  if (!isOpen || !quote) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: Quote['status']) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            Aprovado
          </span>
        );
      case 'convertido':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
            <CalendarPlus className="w-3 h-3" />
            Convertido em Agendamento
          </span>
        );
      case 'recusado':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-rose-950 text-rose-400 border border-rose-800">
            <XCircle className="w-3 h-3" />
            Recusado
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-md bg-amber-950 text-amber-400 border border-amber-800">
            <AlertCircle className="w-3 h-3" />
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="quote-detail-dialog"
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Visualização do Orçamento
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Proposta #{quote.code} • {formatDateBR(quote.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center gap-1.5 text-xs font-mono"
              title="Imprimir Proposta"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Printable View */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-zinc-300 bg-zinc-950" id="printable-quote-area">
          {/* Top Brand Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <BrandLogo size="lg" />
              <div>
                <div className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  MAICON <span className="text-cyan-400">AUTOMAÇÃO</span>
                </div>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">
                  Instalação e Manutenção de Fechaduras Eletrônicas
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  WhatsApp: (11) 98765-4321 • São Paulo - SP
                </div>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="text-xs font-mono font-bold text-cyan-400">
                PROPOSTA TÉCNICA #{quote.code}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Data de Emissão: {formatDateBR(quote.date)}
              </div>
              <div>{getStatusBadge(quote.status)}</div>
            </div>
          </div>

          {/* Client & Technical Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="font-mono font-bold text-zinc-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Dados do Cliente
              </div>
              <div className="font-bold text-white text-sm">{quote.clientName}</div>
              <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-xs">
                <Phone className="w-3 h-3 text-zinc-500" />
                <span>{quote.clientPhone}</span>
              </div>
              {quote.address && (
                <div className="flex items-start gap-1.5 text-zinc-400 text-xs">
                  <MapPin className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                  <span>{quote.address}</span>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="font-mono font-bold text-zinc-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Especificação da Instalação
              </div>
              {quote.lockModel ? (
                <div>
                  <span className="text-[10px] text-zinc-500 block font-mono">EQUIPAMENTO / FECHADURA:</span>
                  <span className="font-bold text-white text-xs">{quote.lockModel}</span>
                </div>
              ) : (
                <div className="text-zinc-500 text-xs italic">Fechadura a definir</div>
              )}
              {quote.doorType && (
                <div>
                  <span className="text-[10px] text-zinc-500 block font-mono">TIPO DE PORTA:</span>
                  <span className="text-zinc-300 text-xs">{quote.doorType}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="font-mono font-bold text-zinc-300 text-xs uppercase tracking-wider">
              Serviços e Mão de Obra Especializada:
            </div>
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Item / Serviço</th>
                    <th className="p-3 text-center">Qtd</th>
                    <th className="p-3 text-right">Unitário</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {quote.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-zinc-800/40">
                      <td className="p-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold">{idx + 1}.</span>
                          <span>{item.description}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-zinc-300">{item.quantity}</td>
                      <td className="p-3 text-right font-mono text-zinc-400">{formatCurrencyBRL(item.unitPrice)}</td>
                      <td className="p-3 text-right font-mono font-semibold text-zinc-100">{formatCurrencyBRL(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Footer Totals */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-1.5 font-mono text-xs">
                {quote.discountAmount && quote.discountAmount > 0 ? (
                  <div className="flex justify-between text-rose-400">
                    <span>Desconto aplicado:</span>
                    <span>-{formatCurrencyBRL(quote.discountAmount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center text-sm font-black text-white pt-1 border-t border-zinc-800">
                  <span className="uppercase text-cyan-400">Total da Proposta:</span>
                  <span className="text-base sm:text-lg text-emerald-400">{formatCurrencyBRL(quote.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Warranty */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="font-mono text-[10px] text-zinc-500 uppercase block font-bold">Condições de Pagamento:</span>
                <span className="text-zinc-200 font-medium">{quote.paymentTerms}</span>
              </div>
              <div>
                <span className="font-mono text-[10px] text-zinc-500 uppercase block font-bold">Garantia Técnica:</span>
                <span className="text-zinc-200 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {quote.warrantyInfo}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Validade da Proposta: {quote.validityDays} dias a contar da emissão.
              </span>
            </div>

            {quote.notes && (
              <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                <span className="font-bold text-zinc-300">Observações: </span>
                {quote.notes}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <button
            onClick={() => onEditQuote(quote)}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            Editar Orçamento
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenWhatsApp(quote)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all"
            >
              <MessageSquare className="w-4 h-4 stroke-[2.5]" />
              <span>Enviar WhatsApp</span>
            </button>

            {quote.status !== 'convertido' && (
              <button
                onClick={() => onConvertToAppointment(quote)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-950/40 transition-all"
              >
                <CalendarPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Converter em Agendamento</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
