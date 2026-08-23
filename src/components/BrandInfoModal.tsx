import React from 'react';
import { X, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface BrandInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayIntroAnimation?: () => void;
}

export const BrandInfoModal: React.FC<BrandInfoModalProps> = ({
  isOpen,
  onClose,
  onPlayIntroAnimation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 text-center space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Brand Emblem */}
        <div className="flex justify-center pt-2">
          <BrandLogo size="xl" />
        </div>

        <div>
          <h2 className="text-xl font-black text-white tracking-wider">MAICON AUTOMAÇÃO</h2>
          <p className="text-xs font-semibold text-cyan-400 mt-0.5 uppercase tracking-widest font-mono">
            Instalação e Manutenção de Fechaduras Eletrônicas
          </p>
          <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto">
            Sistema profissional de gestão de atendimentos, orçamentos e fechaduras inteligentes.
          </p>
        </div>

        <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 text-left space-y-2 text-xs text-zinc-300">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Identidade Visual com Logo Oficial</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Emblema 3D esférico em fundo preto absoluto, com a letra M prata e azul elétrico, ondas de transmissão Wi-Fi e grade de fechaduras inteligentes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {onPlayIntroAnimation && (
            <button
              onClick={onPlayIntroAnimation}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md shadow-cyan-950/50 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Ver Animação de Abertura</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
