import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Clock, 
  X, 
  Check, 
  Play, 
  Smartphone,
  Sparkles,
  Square,
  AlertCircle
} from 'lucide-react';
import { Appointment } from '../types';
import { 
  playAlarmSound, 
  startAlarmRingtoneLoop, 
  stopAlarmRingtoneLoop, 
  subscribeRingtoneState,
  AlarmMelody 
} from '../utils/audio';
import { getTodayString } from '../utils/date';
import { exportAllAppointmentsToIcs } from '../utils/calendarSync';
import { FullScreenAlarmModal } from './FullScreenAlarmModal';

interface AlarmNotifierProps {
  appointments: Appointment[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenWhatsApp: (appt: Appointment) => void;
  alarmMelody: AlarmMelody;
  onSelectMelody: (m: AlarmMelody) => void;
}

export const AlarmNotifier: React.FC<AlarmNotifierProps> = ({
  appointments,
  soundEnabled,
  onToggleSound,
  onOpenWhatsApp,
  alarmMelody,
  onSelectMelody,
}) => {
  const [activeAlarmAppt, setActiveAlarmAppt] = useState<Appointment | null>(null);
  const [dismissedApptIds, setDismissedApptIds] = useState<Set<string>>(new Set());
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(false);
  const [showSettingsPopover, setShowSettingsPopover] = useState<boolean>(false);
  const [isRingtoneActive, setIsRingtoneActive] = useState<boolean>(false);

  // Subscribe to global audio state
  useEffect(() => {
    const unsub = subscribeRingtoneState((playing) => {
      setIsRingtoneActive(playing);
    });
    return unsub;
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setHasNotificationPermission(perm === 'granted');
        if (perm === 'granted') {
          new Notification('Maicon Automação - Notificações Ativadas! 🔐', {
            body: 'Você receberá avisos em tela cheia e alarmes para seus serviços de fechaduras.',
            icon: '/favicon.ico',
          });
        }
      } catch (err) {
        console.warn('Request notification error:', err);
      }
    }
  };

  // Alarm Check Interval (Runs every 6 seconds)
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const todayStr = getTodayString();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMin = currentHours * 60 + currentMinutes;

      const todayAppts = appointments.filter(
        a => a.date === todayStr && a.status === 'pendente' && !dismissedApptIds.has(a.id)
      );

      for (const appt of todayAppts) {
        const [appH, appM] = appt.startTime.split(':').map(Number);
        const apptTotalMin = (appH || 0) * 60 + (appM || 0);
        const reminderMinutes = appt.reminderMinutesBefore ?? 60;
        const triggerTimeMin = apptTotalMin - reminderMinutes;

        // If current time is within trigger range
        if (currentTotalMin >= triggerTimeMin && currentTotalMin <= apptTotalMin + 20) {
          setActiveAlarmAppt(appt);

          if (soundEnabled) {
            // Start continuous ringing loop until stopped by user
            startAlarmRingtoneLoop(alarmMelody);
          }

          if (hasNotificationPermission) {
            try {
              new Notification(`⏰ ALARME: ${appt.clientName}`, {
                body: `Horário: ${appt.startTime} - ${appt.serviceTypeName}\nLocal: ${appt.address}`,
                tag: `alarm-${appt.id}`,
                requireInteraction: true,
              });
            } catch (err) {
              console.warn('Native notification failed:', err);
            }
          }
          break;
        }
      }
    };

    const interval = setInterval(checkAlarms, 6000);
    return () => clearInterval(interval);
  }, [appointments, dismissedApptIds, soundEnabled, alarmMelody, hasNotificationPermission]);

  const handleDismiss = (id?: string) => {
    stopAlarmRingtoneLoop();
    if (id) {
      setDismissedApptIds(prev => new Set(prev).add(id));
    }
    setActiveAlarmAppt(null);
  };

  const handleSnooze = (id: string, minutes: number = 5) => {
    stopAlarmRingtoneLoop();
    setActiveAlarmAppt(null);
    setTimeout(() => {
      const appt = appointments.find(a => a.id === id);
      if (appt) {
        setActiveAlarmAppt(appt);
        if (soundEnabled) {
          startAlarmRingtoneLoop(alarmMelody);
        }
      }
    }, minutes * 60 * 1000);
  };

  // Test simulation trigger
  const handleTriggerTestAlarm = () => {
    setShowSettingsPopover(false);
    const mockAppt: Appointment = {
      id: `mock-${Date.now()}`,
      clientId: 'cli-test',
      clientName: 'Cliente Teste (Demonstração)',
      clientPhone: '(47) 99999-8888',
      address: 'Rua das Palmeiras, 500, Centro - Balneário Camboriú / SC',
      date: getTodayString(),
      startTime: '14:30',
      endTime: '16:00',
      durationMinutes: 90,
      serviceType: 'instalacao_sobrepor',
      serviceTypeName: 'Instalação Fechadura Sobrepor',
      lockModel: 'Intelbras FR 101 Digital',
      description: 'Instalação de fechadura sobrepor com alarme sonoro ativo.',
      reminderMinutesBefore: 60,
      status: 'pendente',
      notes: 'Teste do alarme sonoro com botão de desligar nativo.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveAlarmAppt(mockAppt);
    startAlarmRingtoneLoop(alarmMelody);
  };

  return (
    <>
      {/* Quick Settings Icon Button in Header / Emergency Stop */}
      <div className="relative flex items-center gap-1.5">
        {isRingtoneActive ? (
          <button
            id="btn-emergency-stop-ringing"
            onClick={() => handleDismiss(activeAlarmAppt?.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white animate-bounce shadow-lg shadow-rose-950 border border-rose-400 cursor-pointer"
            title="Clique para silenciar o alarme agora!"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>PARAR SOM</span>
          </button>
        ) : (
          <button
            id="btn-alarm-settings-toggle"
            onClick={() => setShowSettingsPopover(!showSettingsPopover)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-950/50 border-amber-800/60 text-amber-300 hover:bg-amber-900/60 shadow-lg shadow-amber-950/40'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Configurações de Alarme & Agenda do Celular"
          >
            {soundEnabled ? (
              <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
            <span className="hidden sm:inline">
              {soundEnabled ? 'Alarme em Tela' : 'Som Mudo'}
            </span>
          </button>
        )}

        {/* Settings Popover */}
        {showSettingsPopover && (
          <div className="absolute right-0 mt-2 top-full w-80 p-4 bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl z-50 text-xs space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <span className="font-bold text-white flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4 text-amber-400" />
                Alarme & Agenda Nativa
              </span>
              <button
                onClick={() => setShowSettingsPopover(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div>
                <div className="text-zinc-200 font-bold text-xs">Alarme Sonoro Contínuo</div>
                <div className="text-[10px] text-zinc-400">Toca até você clicar em Desligar</div>
              </div>
              <button
                onClick={onToggleSound}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-950'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {soundEnabled ? 'Ativado 🔊' : 'Desativado 🔇'}
              </button>
            </div>

            {/* Melody selection & test */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-[11px] font-semibold">Toque do Despertador:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'urgent_beep', label: 'Bip Despertador' },
                    { id: 'modern_chime', label: 'Tech Chime' },
                    { id: 'radar_alert', label: 'Radar Sonar' },
                    { id: 'success_bell', label: 'Sucesso Bell' },
                  ] as const
                ).map(m => (
                  <div key={m.id} className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectMelody(m.id)}
                      className={`flex-1 text-left p-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                        alarmMelody === m.id
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {m.label}
                    </button>
                    <button
                      onClick={() => playAlarmSound(m.id)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl cursor-pointer"
                      title="Ouvir amostra"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Test full screen alarm button */}
            <button
              onClick={handleTriggerTestAlarm}
              className="w-full py-2.5 px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Testar Alarme em Tela Cheia Agora</span>
            </button>

            {/* Phone native calendar integration section */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                <Smartphone className="w-4 h-4" />
                <span>Integração com Agenda do Celular:</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Você pode adicionar qualquer atendimento diretamente na <strong>Agenda Nativa do seu Celular</strong> (Google Calendar, Samsung ou iPhone) com alarmes no bloqueio de tela.
              </p>

              <button
                onClick={() => {
                  exportAllAppointmentsToIcs(appointments);
                  setShowSettingsPopover(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exportar Todos para Agenda (.ICS)</span>
              </button>
            </div>

            {/* Browser notification permission */}
            <div className="pt-2 border-t border-zinc-800">
              {!hasNotificationPermission ? (
                <button
                  onClick={requestNotificationPermission}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Permitir Notificações no Navegador
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>Notificações push ativas no navegador</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING EMERGENCY STOP BAR (Visible whenever sound is ringing) */}
      {isRingtoneActive && (
        <div 
          style={{ zIndex: 9999999 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md p-3 bg-red-950/95 border-2 border-red-500 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-white animate-bounce"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-300 animate-spin" />
            <div>
              <div className="font-black text-xs uppercase tracking-wide text-white">Alarme Tocando</div>
              <div className="text-[10px] text-red-200">Toque o botão para desligar o som</div>
            </div>
          </div>
          <button
            onClick={() => handleDismiss(activeAlarmAppt?.id)}
            className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
          >
            DESLIGAR SOM
          </button>
        </div>
      )}

      {/* FULL SCREEN NATIVE ALARM MODAL OVERLAY */}
      {activeAlarmAppt && (
        <FullScreenAlarmModal
          appointment={activeAlarmAppt}
          onDismiss={() => handleDismiss(activeAlarmAppt.id)}
          onSnooze={(mins) => handleSnooze(activeAlarmAppt.id, mins)}
          onOpenWhatsApp={onOpenWhatsApp}
        />
      )}
    </>
  );
};
