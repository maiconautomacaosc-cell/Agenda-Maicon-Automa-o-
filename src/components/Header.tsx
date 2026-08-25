import React from 'react';
import { 
  Plus, 
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
import { User } from 'firebase/auth';
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
  user: User | null;
  googleConnected?: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  onOpenCloudSync: () => void;
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
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-3 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand identity with uploaded logo emblem */}
        <div className="flex items-center gap-2">
          <button
            id="btn-header-brand-logo"
            onClick={onPlayIntroAnimation || onOpenBrandInfo}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            title="Clique para ver a animação de abertura da logo"
          >
            <div className="relative transform group-hover:scale-105 transition-transform">
              <BrandLogo size="md" />
              <div className="absolute -inset-1 rounded-full bg-cyan-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  MAICON <span className="text-cyan-400">AUTOMAÇÃO</span>
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-medium tracking-tight truncate max-w-[140px] sm:max-w-none">
                Instalação de Fechaduras Eletrônicas
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-950/80 border border-zinc-800 p-1 rounded-xl">
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
          {/* Cloud Sync Status Button */}
          <button
            id="btn-header-cloud-sync"
            onClick={onOpenCloudSync}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              user || googleConnected
                ? syncStatus === 'syncing'
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
            title={user || googleConnected ? `Google Drive conectado (${user?.email || 'Nuvem'})` : 'Conectar Google Drive para sincronizar aparelhos'}
          >
            {user || googleConnected ? (
              syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              )
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline text-[11px] font-semibold">
              {user || googleConnected ? (syncStatus === 'syncing' ? 'Sincronizando Drive...' : 'Google Drive Conectado') : 'Google Drive (Grátis)'}
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

          <button
            id="btn-header-new-appointment"
            onClick={onNewAppointment}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-lg shadow-cyan-950/40 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Novo Agendamento</span>
          </button>
        </div>
      </div>
    </header>
  );
};

