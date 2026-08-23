import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Copy, 
  Check, 
  Briefcase, 
  Smartphone, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Appointment } from '../types';
import { 
  WHATSAPP_TEMPLATES, 
  buildMessageFromTemplate, 
  openWhatsApp, 
  cleanPhoneNumber 
} from '../utils/whatsapp';

interface WhatsAppModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  appointment,
  isOpen,
  onClose,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('confirmacao');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (appointment) {
      const defaultTemplate = WHATSAPP_TEMPLATES.find(t => t.id === selectedTemplateId) || WHATSAPP_TEMPLATES[0];
      const built = buildMessageFromTemplate(defaultTemplate.template, appointment);
      setCustomMessage(built);
    }
  }, [appointment, selectedTemplateId]);

  if (!isOpen || !appointment) return null;

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = WHATSAPP_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setCustomMessage(buildMessageFromTemplate(tmpl.template, appointment));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendStandard = () => {
    openWhatsApp(appointment.clientPhone, customMessage, 'standard');
    onClose();
  };

  const handleSendBusiness = () => {
    openWhatsApp(appointment.clientPhone, customMessage, 'business');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="whatsapp-modal-container"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Enviar Notificação WhatsApp</h2>
              <p className="text-xs text-zinc-400 font-mono">
                Cliente: <span className="text-white font-semibold">{appointment.clientName}</span> ({appointment.clientPhone})
              </p>
            </div>
          </div>
          <button
            id="close-whatsapp-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Template Selector Pills */}
          <div>
            <label className="block text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Escolha o Tipo de Mensagem:
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {WHATSAPP_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  id={`btn-tmpl-${tmpl.id}`}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-sm'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-semibold text-[11px] truncate text-white">{tmpl.name}</div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">{tmpl.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Message Text Editor / Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Mensagem Formatada:
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700 font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <textarea
              id="whatsapp-message-textarea"
              rows={9}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed resize-none"
              placeholder="Digite a mensagem..."
            />
          </div>

          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
            <span className="font-bold text-cyan-400 font-mono">DICA:</span> Escolha abaixo se quer abrir no WhatsApp Comum ou no WhatsApp Business em 1 clique!
          </div>
        </div>

        {/* Modal Actions Footer: 1-Click WhatsApp vs 1-Click WhatsApp Business */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row gap-2.5">
          <button
            id="btn-open-whatsapp-standard"
            onClick={handleSendStandard}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition-all"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>Abrir no WhatsApp</span>
          </button>

          <button
            id="btn-open-whatsapp-business"
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
