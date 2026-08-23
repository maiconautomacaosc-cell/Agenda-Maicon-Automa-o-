import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Check, 
  Smartphone, 
  Briefcase, 
  Sparkles, 
  FileText 
} from 'lucide-react';
import { Quote } from '../types';
import { formatQuoteForWhatsApp, openWhatsApp } from '../utils/whatsapp';

interface QuoteWhatsAppModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteWhatsAppModal: React.FC<QuoteWhatsAppModalProps> = ({
  quote,
  isOpen,
  onClose,
}) => {
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (quote) {
      setCustomMessage(formatQuoteForWhatsApp(quote));
      setCopied(false);
    }
  }, [quote, isOpen]);

  if (!isOpen || !quote) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendStandard = () => {
    openWhatsApp(quote.clientPhone, customMessage, 'standard');
  };

  const handleSendBusiness = () => {
    openWhatsApp(quote.clientPhone, customMessage, 'business');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="quote-whatsapp-modal"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Enviar Orçamento via WhatsApp
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Proposta <span className="text-cyan-400">#{quote.code}</span> para <span className="text-white font-semibold">{quote.clientName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Mensagem Formatada (Pode editar antes de enviar):
            </label>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg border border-zinc-700 font-mono transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          <textarea
            rows={12}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full p-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed resize-none"
            placeholder="Digite a mensagem do orçamento..."
          />

          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
            <span className="font-bold text-cyan-400 font-mono">DICA:</span> O cliente receberá todos os serviços detalhados, valor total, chave Pix/condições e validade da proposta de forma profissional.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row gap-2.5">
          <button
            id="btn-quote-send-standard-whatsapp"
            onClick={handleSendStandard}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition-all"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>Abrir no WhatsApp</span>
          </button>

          <button
            id="btn-quote-send-business-whatsapp"
            onClick={handleSendBusiness}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs shadow-lg shadow-cyan-950/40 active:scale-[0.98] transition-all border border-cyan-400/30"
          >
            <Briefcase className="w-4 h-4 stroke-[2.5]" />
            <span>Abrir no WhatsApp Business</span>
          </button>
        </div>
      </div>
    </div>
  );
};
