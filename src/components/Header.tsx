import React from 'react';
import { 
  LayoutDashboard,
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  HelpCircle, 
  FileText,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  User as UserIcon
} from 'lucide-react';
import { GoogleUser } from '../lib/googleAuth';
import { BrandLogo } from './BrandLogo';
import { AlarmNotifier } from './AlarmNotifier';
import { Appointment, ViewTab } from '../types';
import { AlarmMelody } from '../utils/audio';

interface HeaderProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onNewAppointment: () => void;
  appointments: Appointment[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  alarmMelody: AlarmMelody;
  onSelectMelody: (m: AlarmMelody) => void;
  onOpenWhatsApp: (appt: Appointment) => void;
  onOpenBrandInfo: () => void;
  onPlayIntroAnimation?: () => void;
  user: GoogleUser | null;
  googleConnected?: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  onOpenCloudSync: () => void;
  isSandbox?: boolean;
  onRequestSandbox?: () => void;
  onRequestSandboxReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onNewAppointment,
  appointments,
  soundEnabled,
  onToggleSound,
  alarmMelody,
  onSelectMelody,
  onOpenWhatsApp,
  onOpenBrandInfo,
  onPlayIntroAnimation,
  user,
  googleConnected,
  syncStatus,
  onOpenCloudSync,
  isSandbox = false,
  onRequestSandbox,
  onRequestSandboxReset,
}) => {
  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-3 sm:px-6 py-2.5 transition-colors ${isSandbox ? 'bg-amber-400/95 border-amber-300 text-black' : 'bg-zinc-900/95 border-zinc-800'}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand identity with uploaded logo emblem */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            id="btn-header-brand-logo"
            onClick={onPlayIntroAnimation || onOpenBrandInfo}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer min-w-0 max-w-[245px] sm:max-w-[330px]"
            title="Clique para ver a animação de abertura da logo"
          >
            <div className="relative transform group-hover:scale-105 transition-transform">
              <BrandLogo size="md" />
              <div className="absolute -inset-1 rounded-full bg-cyan-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={`text-[15px] sm:text-base font-black tracking-tight transition-colors whitespace-nowrap ${isSandbox ? 'text-black' : 'text-white group-hover:text-cyan-400'}`}>
                  MAICON <span className={isSandbox ? "text-black" : "text-cyan-400"}>AUTOMAÇÃO</span>
                </span>
              </div>
              <span className={`text-[10px] sm:text-[11px] font-medium tracking-tight whitespace-nowrap ${isSandbox ? 'text-amber-950' : 'text-zinc-400'}`}>{isSandbox ? 'AMBIENTE DE TESTES • integrações bloqueadas' : 'Instalação de Fechaduras Eletrônicas'}</span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-950/80 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'dashboard'
                ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectTab('agenda')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'agenda'
                ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendário</span>
          </button>

          <button
            onClick={() => onSelectTab('diario')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'diario'
                ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Dia a Dia</span>
          </button>

          <button
            onClick={() => onSelectTab('orcamentos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'orcamentos'
                ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Orçamentos</span>
          </button>

          <button
            onClick={() => onSelectTab('clientes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'clientes'
                ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clientes</span>
          </button>

          <button
            onClick={() => onSelectTab('financeiro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'financeiro'
                ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Relatórios</span>
          </button>

          <button
            onClick={() => onSelectTab('consultoria')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentTab === 'consultoria'
                ? 'bg-cyan-500 text-black shadow-sm font-extrabold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Dúvidas Técnicas</span>
          </button>
        </nav>

        {/* Right Actions: Cloud Sync, Alarm Notifier & New Appointment Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={onRequestSandbox} className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black tracking-wide transition-all ${isSandbox ? 'bg-black text-amber-300 border-black' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-amber-300'}`} title={isSandbox ? 'Voltar para Operação' : 'Entrar no ambiente de testes'}>{isSandbox ? 'TESTE' : <><span className="hidden sm:inline">OPERAÇÃO</span><span className="sm:hidden">TESTE</span></>}</button>
          {isSandbox && <button onClick={onRequestSandboxReset} className="inline-flex px-2 py-1.5 rounded-xl border border-amber-900/30 text-[9px] font-bold text-amber-950 hover:bg-amber-300" title="Redefinir somente o Sandbox"><span className="hidden sm:inline">Reset</span><span className="sm:hidden">↻</span></button>}

          {/* Cloud Sync Status Button */}
          <button
            id="btn-header-cloud-sync"
            onClick={onOpenCloudSync}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              isSandbox
                ? 'bg-amber-300 border-amber-700 text-black cursor-not-allowed'
                : user || googleConnected
                ? syncStatus === 'syncing'
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
            title={user || googleConnected ? `Google Drive conectado (${user?.email || 'Nuvem'})` : 'Conectar Google Drive para sincronizar aparelhos'}
          >
            {isSandbox ? (<CloudOff className="w-3.5 h-3.5 text-black" />) : user || googleConnected ? (
              syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              )
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline text-[11px] font-semibold">
              {isSandbox ? 'Sandbox isolado' : user || googleConnected ? (syncStatus === 'syncing' ? 'Sincronizando Drive...' : 'Google Drive Conectado') : 'Google Drive (Grátis)'}
            </span>
          </button>

          <AlarmNotifier
            appointments={appointments}
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            onOpenWhatsApp={onOpenWhatsApp}
            alarmMelody={alarmMelody}
            onSelectMelody={onSelectMelody}
          />

        </div>
      </div>
    </header>
  );
};

