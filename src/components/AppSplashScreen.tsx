import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, KeyRound, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface AppSplashScreenProps {
  isOpen: boolean;
  onFinish: () => void;
  autoCloseDelayMs?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  isOpen,
  onFinish,
  autoCloseDelayMs = 4500,
}) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Iniciando sistema...');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsClosing(false);
      return;
    }

    setProgress(12);
    setStatusText('Iniciando sistema Maicon Automação...');

    const t1 = setTimeout(() => {
      setProgress(38);
      setStatusText('Carregando catálogo de fechaduras digitais...');
    }, 1000);

    const t2 = setTimeout(() => {
      setProgress(68);
      setStatusText('Sincronizando agenda e ordens de serviço...');
    }, 2200);

    const t3 = setTimeout(() => {
      setProgress(92);
      setStatusText('Fechaduras Inteligentes conectadas com sucesso...');
    }, 3300);

    const t4 = setTimeout(() => {
      setProgress(100);
      setStatusText('Acesso Liberado! Bem-vindo(a)');
    }, 4000);

    const tClose = setTimeout(() => {
      handleClose();
    }, autoCloseDelayMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tClose);
    };
  }, [isOpen, autoCloseDelayMs]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onFinish();
      setIsClosing(false);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      id="app-splash-screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05070a] text-white select-none transition-all duration-400 ${
        isClosing ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Animated Tech Rings & Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Deep radial ambient glow */}
        <div className="w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />
        <div className="w-[300px] h-[300px] rounded-full bg-blue-600/15 blur-[90px] absolute" />

        {/* Orbiting cyber rings */}
        <div className="absolute w-72 h-72 rounded-full border border-cyan-500/20 animate-[spin_12s_linear_infinite]" />
        <div className="absolute w-88 h-88 rounded-full border border-blue-500/15 border-dashed animate-[spin_18s_linear_infinite_reverse]" />
        <div className="absolute w-[420px] h-[420px] rounded-full border border-zinc-800/40" />

        {/* Diagonal Tech Scan Line */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-32 w-full animate-[bounce_4s_infinite] opacity-60" />
      </div>

      {/* Center Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-sm w-full space-y-6">
        {/* Animated Badge Container with Glow & Scale */}
        <div className="relative group cursor-pointer" onClick={handleClose}>
          {/* Pulsing ring aura */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-cyan-500/30 via-blue-600/30 to-cyan-500/30 blur-md animate-pulse" />
          
          {/* Center Logo with 3D Float entrance */}
          <div className="relative transform transition-transform duration-500 hover:scale-105 active:scale-95 animate-in zoom-in-75 duration-700">
            <BrandLogo size="xl" className="filter drop-shadow-[0_15px_30px_rgba(0,140,255,0.35)]" />
          </div>
        </div>

        {/* Main Title & Subtitles */}
        <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-200">
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white flex items-center justify-center gap-2">
            MAICON <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AUTOMAÇÃO</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-cyan-300/90 uppercase font-mono">
            Instalação de Fechaduras Eletrônicas
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 pt-1 font-mono">
            <span className="flex items-center gap-1">
              <KeyRound className="w-3 h-3 text-cyan-400" />
              Smart Locks
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" />
              Automação
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Segurança
            </span>
          </div>
        </div>

        {/* High-Tech Loading Progress Bar */}
        <div className="w-full space-y-2 pt-2 animate-in fade-in duration-700 delay-300">
          <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 px-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Sparkles className="w-3 h-3 animate-spin" />
              {statusText}
            </span>
            <span className="font-bold text-zinc-300">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Skip / Enter Action Button */}
        <button
          id="btn-splash-enter-app"
          onClick={handleClose}
          className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900/90 hover:bg-cyan-500 text-zinc-300 hover:text-black font-mono text-xs font-bold border border-zinc-800 hover:border-cyan-400 transition-all shadow-lg active:scale-95 group"
        >
          <span>Acessar Painel</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-4 text-[10px] font-mono text-zinc-600">
        MAICON AUTOMAÇÃO © {new Date().getFullYear()} • SISTEMA PROFISSIONAL
      </div>
    </div>
  );
};
