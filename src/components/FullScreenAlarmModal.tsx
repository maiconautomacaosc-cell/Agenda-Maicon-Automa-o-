import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  BellRing, 
  VolumeX, 
  Clock, 
  MapPin, 
  Navigation, 
  MessageSquare, 
  KeyRound, 
  Phone, 
  AlertTriangle,
  Calendar,
  X
} from 'lucide-react';
import { Appointment } from '../types';
import { getGoogleCalendarUrl } from '../utils/calendarSync';
import { stopAlarmRingtoneLoop } from '../utils/audio';

interface FullScreenAlarmModalProps {
  appointment: Appointment | null;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onOpenWhatsApp: (appt: Appointment) => void;
}

export const FullScreenAlarmModal: React.FC<FullScreenAlarmModalProps> = ({
  appointment,
  onDismiss,
  onSnooze,
  onOpenWhatsApp,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live digital clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut (Escape or Space to dismiss alarm immediately)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopAlarmRingtoneLoop();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  if (!appointment) return null;

  const handleStopAlarm = () => {
    stopAlarmRingtoneLoop();
    onDismiss();
  };

  const mapSearchQuery = encodeURIComponent(`${appointment.address} ${appointment.neighborhood || ''}`);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapSearchQuery}`;
  const googleCalendarUrl = getGoogleCalendarUrl(appointment);

  const modalContent = (
    <div 
      id="fullscreen-native-alarm"
      style={{ zIndex: 999999 }}
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950/98 text-white select-none overflow-y-auto"
    >
      {/* Background glowing ambient pulses */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar with Close / Mute */}
      <div className="relative z-10 w-full max-w-lg flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold tracking-wider uppercase animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Alarme Ativo</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Hora Atual</div>
            <div className="text-base font-mono font-black text-amber-400">{currentTime}</div>
          </div>
          <button
            onClick={handleStopAlarm}
            className="p-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            title="Parar alarme agora"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Desligar</span>
          </button>
        </div>
      </div>

      {/* Center Alarm Body */}
      <div className="relative z-10 w-full max-w-lg my-auto py-4 text-center space-y-5">
        {/* Giant Ringing Bell Graphic */}
        <div className="relative inline-block mx-auto">
          <div className="absolute inset-0 -m-4 rounded-full bg-amber-500/20 animate-ping opacity-75" />
          <div className="absolute inset-0 -m-8 rounded-full bg-amber-500/10 animate-pulse" />
          
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-amber-500 to-rose-600 p-0.5 shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <BellRing className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Appointment Time Badge */}
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
            Horário Marcado
          </div>
          <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight flex items-center justify-center gap-2">
            <Clock className="w-8 h-8 text-cyan-400" />
            <span>{appointment.startTime}</span>
            {appointment.endTime && (
              <span className="text-2xl text-slate-400 font-normal">às {appointment.endTime}</span>
            )}
          </div>
        </div>

        {/* Client & Service Card Details */}
        <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-5 shadow-2xl space-y-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Cliente Agendado
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {appointment.clientName}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
              <Phone className="w-3.5 h-3.5" />
              <span>{appointment.clientPhone}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>{appointment.serviceTypeName}</span>
            </div>
            {appointment.lockModel && (
              <div className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium">
                🔑 {appointment.lockModel}
              </div>
            )}
          </div>

          {/* Address with direct click */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium line-clamp-2">{appointment.address}</span>
          </div>

          {appointment.notes && (
            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
              💡 Obs: {appointment.notes}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Controls (Giant Alarm Buttons) */}
      <div className="relative z-10 w-full max-w-lg space-y-3 pb-4">
        {/* BIG NATIVE STOP ALARM BUTTON */}
        <button
          id="btn-dismiss-native-alarm"
          onClick={handleStopAlarm}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-base sm:text-lg tracking-wider uppercase shadow-2xl shadow-red-950/90 ring-4 ring-rose-500/40 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <VolumeX className="w-6 h-6 stroke-[2.5]" />
          <span>DESLIGAR ALARME / PARAR SOM</span>
        </button>

        {/* Secondary Quick Field Actions (WhatsApp, GPS, Snooze) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Snooze 5 min */}
          <button
            id="btn-snooze-alarm"
            onClick={() => onSnooze(5)}
            className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Adiar 5 min</span>
          </button>

          {/* WhatsApp Client */}
          <button
            id="btn-alarm-whatsapp"
            onClick={() => {
              handleStopAlarm();
              onOpenWhatsApp(appointment);
            }}
            className="py-3 px-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Avisar a Caminho</span>
          </button>

          {/* Open GPS */}
          <a
            id="btn-alarm-gps"
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleStopAlarm}
            className="py-3 px-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>Abrir no GPS</span>
          </a>
        </div>

        {/* Native Google Calendar link option */}
        <div className="text-center pt-1">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-cyan-400 font-mono transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver ou abrir evento na Agenda Google / Celular</span>
          </a>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
