/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Appointment, 
  Client, 
  Quote, 
  QuoteStatus, 
  ViewTab, 
  AppointmentStatus 
} from './types';
import { 
  loadClients, 
  saveClients, 
  loadAppointments, 
  saveAppointments, 
  loadQuotes, 
  saveQuotes, 
  loadSettings, 
  saveSettings, 
  AppSettings 
} from './utils/storage';
import { getTodayString } from './utils/date';
import { AlarmMelody } from './utils/audio';
import { GoogleUser, ensureValidAccessToken, getCachedAccessToken, getCachedGoogleUser, subscribeGoogleToken, subscribeGoogleUser, validateCachedToken } from './lib/googleAuth';
import { saveDatabaseToGoogleDrive } from './lib/googleDrive';
import { getSpreadsheetId, loadDatabaseFromGoogleSheets, saveDatabaseToGoogleSheets } from './lib/googleSheets';
import { updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from './lib/googleCalendar';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { CalendarView } from './components/CalendarView';
import { DayScheduleView } from './components/DayScheduleView';
import { QuotesManager } from './components/QuotesManager';
import { QuoteEditorModal } from './components/QuoteEditorModal';
import { QuoteWhatsAppModal } from './components/QuoteWhatsAppModal';
import { QuoteDetailModal } from './components/QuoteDetailModal';
import { ClientsManager } from './components/ClientsManager';
import { FinancialSummary } from './components/FinancialSummary';
import { TechConsultingModal } from './components/TechConsultingModal';
import { AppointmentModal } from './components/AppointmentModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { BrandInfoModal } from './components/BrandInfoModal';
import { AppSplashScreen } from './components/AppSplashScreen';
import { CloudSyncModal } from './components/CloudSyncModal';
import { CompletionOptions, ServiceCompletionModal } from './components/ServiceCompletionModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('agenda');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayString());
  const [clients, setClients] = useState<Client[]>(() => loadClients());
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadAppointments());
  const [quotes, setQuotes] = useState<Quote[]>(() => loadQuotes());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Cloud Sync & Auth State
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(() => getCachedGoogleUser());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | undefined>();
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => getCachedAccessToken());
  const [googleToast, setGoogleToast] = useState<{ show: boolean; text: string } | null>(null);
  const [cloudReady, setCloudReady] = useState(false);

  const showGoogleNotification = (text: string) => {
    setGoogleToast({ show: true, text });
    setTimeout(() => {
      setGoogleToast(null);
    }, 4000);
  };

  // Splash Screen Intro Animation
  const [isSplashScreenOpen, setIsSplashScreenOpen] = useState(true);

  // Appointment Modals state
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>(getTodayString());

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppAppointment, setWhatsAppAppointment] = useState<Appointment | null>(null);

  // Quote Modals state
  const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteDefaultClient, setQuoteDefaultClient] = useState<Client | null>(null);

  const [isQuoteWhatsAppOpen, setIsQuoteWhatsAppOpen] = useState(false);
  const [whatsAppQuote, setWhatsAppQuote] = useState<Quote | null>(null);

  const [isQuoteDetailOpen, setIsQuoteDetailOpen] = useState(false);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);

  const [isBrandInfoOpen, setIsBrandInfoOpen] = useState(false);

  // Fluxo oficial: OS por atendimento; MA somente para equipamentos identificados.
  const [completionAppointment, setCompletionAppointment] = useState<Appointment | null>(null);
  const [completionSaveClient, setCompletionSaveClient] = useState(true);

  const extractSequence = (value?: string) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  };

  const getNextNumbers = () => {
    const maValues: number[] = [];
    const osValues: number[] = [];
    clients.forEach(c => {
      maValues.push(extractSequence(c.serialNumber));
      osValues.push(extractSequence(c.serviceOrder));
      (c.equipment || []).forEach(eq => maValues.push(extractSequence(eq.serialNumber)));
    });
    appointments.forEach(a => {
      maValues.push(extractSequence(a.serialNumber));
      osValues.push(extractSequence(a.serviceOrder));
      (a.equipment || []).forEach(eq => maValues.push(extractSequence(eq.serialNumber)));
    });
    return {
      // Também considera o maior número já consumido salvo nas configurações.
      // Assim, apagar/cancelar um atendimento nunca libera MA ou OS para reutilização.
      nextMA: Math.max(0, ...maValues, settings.lastSerialSequence || 0) + 1,
      nextOS: Math.max(0, ...osValues, settings.lastServiceOrderSequence || 0) + 1,
    };
  };

  // Google account state (sem Firebase)
  useEffect(() => {
    const unsubToken = subscribeGoogleToken(setGoogleAccessToken);
    const unsubUser = subscribeGoogleUser(setCurrentUser);
    validateCachedToken().catch(() => {});
    return () => { unsubToken(); unsubUser(); };
  }, []);

  // Renova a autorização Google antes de expirar e também quando o app volta ao primeiro plano.
  useEffect(() => {
    const renew = () => ensureValidAccessToken().catch(() => null);
    const interval = setInterval(renew, 10 * 60 * 1000);
    const onVisibility = () => { if (document.visibilityState === 'visible') renew(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const lastCloudUpdatedAtRef = useRef<string>('');
  const initialCloudLoadDoneRef = useRef(false);

  // Sync to localStorage
  useEffect(() => {
    saveClients(clients);
  }, [clients]);

  useEffect(() => {
    saveAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    saveQuotes(quotes);
  }, [quotes]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Auto-sync para a mesma Planilha Google + backup no Drive
  useEffect(() => {
    const spreadsheetId = getSpreadsheetId();
    if (!googleAccessToken || !spreadsheetId || !cloudReady) return;

    const timer = setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        setSyncErrorMessage(undefined);
        const updatedAt = new Date().toISOString();
        const payload = { version: '3.4', updatedAt, clients, appointments, quotes, settings };
        await saveDatabaseToGoogleSheets(payload, googleAccessToken, spreadsheetId);
        await saveDatabaseToGoogleDrive(payload, googleAccessToken).catch(() => null);
        lastCloudUpdatedAtRef.current = updatedAt;
        localStorage.setItem('maicon_last_drive_sync', new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setSyncStatus('synced');
      } catch (err: any) {
        console.warn('Auto sync Google error:', err);
        setSyncStatus('error');
        setSyncErrorMessage(err?.message || 'Falha ao salvar na Planilha Google');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [clients, appointments, quotes, settings, googleAccessToken, cloudReady]);

  // Ao conectar em outro aparelho, carrega a versão mais recente da planilha.
  useEffect(() => {
    const spreadsheetId = getSpreadsheetId();
    if (!googleAccessToken || !spreadsheetId || initialCloudLoadDoneRef.current) return;
    initialCloudLoadDoneRef.current = true;
    loadDatabaseFromGoogleSheets(googleAccessToken, spreadsheetId)
      .then((data) => {
        if (!data) { setCloudReady(true); return; }
        lastCloudUpdatedAtRef.current = data.updatedAt || '';
        setClients(data.clients || []);
        setAppointments(data.appointments || []);
        setQuotes(data.quotes || []);
        if (data.settings) setSettings(data.settings);
        setSyncStatus('synced');
        setCloudReady(true);
      })
      .catch((err) => {
        console.warn('Initial Google Sheets load:', err);
        setCloudReady(true);
      });
  }, [googleAccessToken]);

  // Mantém aparelhos abertos sincronizados sem precisar apertar botão.
  useEffect(() => {
    const spreadsheetId = getSpreadsheetId();
    if (!googleAccessToken || !spreadsheetId || !cloudReady) return;
    const interval = setInterval(async () => {
      try {
        const data = await loadDatabaseFromGoogleSheets(googleAccessToken, spreadsheetId);
        if (!data?.updatedAt || data.updatedAt <= lastCloudUpdatedAtRef.current) return;
        lastCloudUpdatedAtRef.current = data.updatedAt;
        setClients(data.clients || []);
        setAppointments(data.appointments || []);
        setQuotes(data.quotes || []);
        if (data.settings) setSettings(data.settings);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [googleAccessToken, cloudReady]);

  const handleRestoreData = (data: { clients: Client[]; appointments: Appointment[]; quotes: Quote[]; settings?: AppSettings }) => {
    setClients(data.clients);
    saveClients(data.clients);
    setAppointments(data.appointments);
    saveAppointments(data.appointments);
    setQuotes(data.quotes);
    saveQuotes(data.quotes);
    if (data.settings) {
      setSettings(data.settings);
      saveSettings(data.settings);
    }
  };

  // Appointment Actions
  const handleOpenNewAppointment = (date?: string) => {
    setEditingAppointment(null);
    setModalInitialDate(date || selectedDate || getTodayString());
    setIsAppointmentModalOpen(true);
  };

  const handleOpenEditAppointment = (appt: Appointment) => {
    setEditingAppointment(appt);
    setModalInitialDate(appt.date);
    setIsAppointmentModalOpen(true);
  };

  const handleBlockDay = (date?: string) => {
    const targetDate = date || selectedDate || getTodayString();
    const dummyBlock: Appointment = {
      id: `bloq-${Date.now()}`,
      clientId: `cli-part-${Date.now()}`,
      clientName: 'Compromisso Particular',
      clientPhone: '(00) 00000-0000',
      serviceType: 'compromisso_particular',
      serviceTypeName: 'Compromisso Particular',
      date: targetDate,
      startTime: '08:00',
      endTime: '18:00',
      durationMinutes: 600,
      status: 'pendente',
      address: 'Indisponível para Atendimento',
      description: 'Dia reservado para compromissos particulares.',
      reminderMinutesBefore: 30,
      price: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingAppointment(dummyBlock);
    setModalInitialDate(targetDate);
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (appt: Appointment, saveClientToDb: boolean) => {
    const previous = appointments.find(a => a.id === appt.id);
    const justCompleted = appt.serviceType !== 'compromisso_particular' && appt.status === 'concluido' && previous?.status !== 'concluido';

    // Ao marcar como concluído, primeiro salva as demais alterações e abre as duas perguntas MA/OS.
    if (justCompleted) {
      const pendingVersion: Appointment = { ...appt, status: previous?.status || 'pendente' };
      setAppointments(prev => {
        const exists = prev.some(a => a.id === pendingVersion.id);
        return exists ? prev.map(a => a.id === pendingVersion.id ? pendingVersion : a) : [pendingVersion, ...prev];
      });
      setCompletionAppointment(pendingVersion);
      setCompletionSaveClient(saveClientToDb);
      return;
    }

    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === appt.id);
      if (exists) {
        return prev.map((a) => (a.id === appt.id ? appt : a));
      }
      return [appt, ...prev];
    });

    // Automatic Google Calendar Sync
    const tokenToUse = googleAccessToken || getCachedAccessToken();
    if (tokenToUse) {
      updateGoogleCalendarEvent(appt, tokenToUse)
        .then(({ eventId }) => {
          if (eventId) {
            const syncedAppt: Appointment = {
              ...appt,
              googleEventId: eventId,
              googleSyncedAt: new Date().toISOString(),
            };
            setAppointments((prev) => {
              const updated = prev.map((a) => (a.id === appt.id ? syncedAppt : a));
              saveAppointments(updated);
              return updated;
            });
          }
          showGoogleNotification(`📅 Agendamento de ${appt.clientName} sincronizado com seu Google Agenda!`);
        })
        .catch((err) => {
          console.warn('Erro ao sincronizar com Google Agenda:', err);
        });
    }

    // Auto-create / update client if requested
    if (saveClientToDb && appt.clientName) {
      setClients((prev) => {
        const existingIndex = prev.findIndex(
          (c) => (appt.clientId && c.id === appt.clientId) || c.name.toLowerCase() === appt.clientName.toLowerCase() || c.phone === appt.clientPhone
        );
        if (existingIndex >= 0) {
          const updatedClient: Client = {
            ...prev[existingIndex],
            serialNumber: appt.serialNumber || prev[existingIndex].serialNumber,
            serviceOrder: appt.serviceOrder || prev[existingIndex].serviceOrder,
            address: appt.address || prev[existingIndex].address,
            neighborhood: appt.neighborhood || prev[existingIndex].neighborhood,
          };
          const updatedList = [...prev];
          updatedList[existingIndex] = updatedClient;
          saveClients(updatedList);
          return updatedList;
        }

        const newClient: Client = {
          id: appt.clientId || `cli-${Date.now()}`,
          name: appt.clientName,
          phone: appt.clientPhone,
          address: appt.address,
          neighborhood: appt.neighborhood,
          city: appt.city || 'Joinville',
          serialNumber: appt.serialNumber,
          serviceOrder: appt.serviceOrder,
          notes: `Fechadura: ${appt.lockModel || 'Digital'}. Criado via agendamento.`,
          createdAt: new Date().toISOString(),
        };
        const updatedList = [newClient, ...prev];
        saveClients(updatedList);
        return updatedList;
      });
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const target = appointments.find((a) => a.id === id);
    const tokenToUse = googleAccessToken || getCachedAccessToken();
    
    if (target?.googleEventId && tokenToUse) {
      try {
        await deleteGoogleCalendarEvent(target.googleEventId, tokenToUse);
        showGoogleNotification(`🗑️ Evento de ${target.clientName} removido do seu Google Agenda.`);
      } catch (err) {
        console.warn('Erro ao excluir no Google Agenda:', err);
      }
    }

    setAppointments((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveAppointments(updated);
      return updated;
    });
  };

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    const target = appointments.find(a => a.id === id);
    if (target && newStatus === 'concluido' && target.status !== 'concluido' && target.serviceType !== 'compromisso_particular') {
      setCompletionAppointment(target);
      setCompletionSaveClient(true);
      return;
    }

    const tokenToUse = googleAccessToken || getCachedAccessToken();
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated = { ...a, status: newStatus, updatedAt: new Date().toISOString() };
          if (tokenToUse) updateGoogleCalendarEvent(updated, tokenToUse).catch(console.warn);
          return updated;
        }
        return a;
      })
    );
  };

  const handleConfirmCompletion = (options: CompletionOptions) => {
    if (!completionAppointment) return;
    const now = new Date().toISOString();
    // Recalcula no instante da confirmação para não depender de número digitado ou preview antigo.
    const { nextMA, nextOS } = getNextNumbers();
    const equipment = options.equipment.map((eq, index) => ({
      id: `eq-${Date.now()}-${index}`,
      serialNumber: `MA-${String(nextMA + index).padStart(6, '0')}`,
      serviceType: eq.serviceType,
      serviceTypeName: eq.serviceTypeName,
      model: eq.model?.trim() || undefined,
      description: eq.description?.trim() || undefined,
      createdAt: now,
    }));
    const serviceOrder = options.generateServiceOrder
      ? `OS-${String(nextOS).padStart(6, '0')}`
      : completionAppointment.serviceOrder;
    const updated: Appointment = {
      ...completionAppointment,
      status: 'concluido',
      equipment: [...(completionAppointment.equipment || []), ...equipment],
      serialNumber: completionAppointment.serialNumber || equipment[0]?.serialNumber,
      serviceOrder,
      updatedAt: now,
    };

    setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));

    if (completionSaveClient && updated.clientName) {
      setClients(prev => {
        const idx = prev.findIndex(c => c.id === updated.clientId || c.phone === updated.clientPhone || c.name.toLowerCase() === updated.clientName.toLowerCase());
        if (idx < 0) {
          const created: Client = {
            id: updated.clientId || `cli-${Date.now()}`,
            name: updated.clientName,
            phone: updated.clientPhone,
            address: updated.address,
            neighborhood: updated.neighborhood,
            city: updated.city || 'Joinville',
            equipment,
            serialNumber: equipment[0]?.serialNumber,
            serviceOrder,
            notes: `Criado na conclusão do atendimento: ${updated.serviceTypeName}.`,
            createdAt: now,
          };
          return [created, ...prev];
        }
        const existing = prev[idx];
        const merged = {
          ...existing,
          equipment: [...(existing.equipment || []), ...equipment],
          serialNumber: equipment[0]?.serialNumber || existing.serialNumber,
          serviceOrder: serviceOrder || existing.serviceOrder,
        };
        const list = [...prev];
        list[idx] = merged;
        return list;
      });
    }

    // Consome definitivamente as sequências geradas. Mesmo que o atendimento seja apagado depois,
    // estes números continuam reservados e nunca serão usados novamente.
    if (equipment.length || options.generateServiceOrder) {
      setSettings(prev => ({
        ...prev,
        lastSerialSequence: equipment.length
          ? Math.max(prev.lastSerialSequence || 0, nextMA + equipment.length - 1)
          : (prev.lastSerialSequence || 0),
        lastServiceOrderSequence: options.generateServiceOrder
          ? Math.max(prev.lastServiceOrderSequence || 0, nextOS)
          : (prev.lastServiceOrderSequence || 0),
      }));
    }

    const tokenToUse = googleAccessToken || getCachedAccessToken();
    if (tokenToUse) updateGoogleCalendarEvent(updated, tokenToUse).catch(console.warn);
    setCompletionAppointment(null);
    showGoogleNotification(equipment.length || options.generateServiceOrder
      ? `✅ Serviço concluído${equipment.length ? ` • ${equipment.length} MA gerado(s)` : ''}${options.generateServiceOrder ? ` • ${serviceOrder}` : ''}`
      : '✅ Serviço simples concluído sem MA e sem OS.');
  };

  // Quote Actions
  const handleOpenNewQuote = (client?: Client) => {
    setEditingQuote(null);
    setQuoteDefaultClient(client || null);
    setIsQuoteEditorOpen(true);
  };

  const handleOpenEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setQuoteDefaultClient(null);
    setIsQuoteDetailOpen(false);
    setIsQuoteEditorOpen(true);
  };

  const handleSaveQuote = (quote: Quote, saveClientToDb: boolean, sendImmediately: boolean = false) => {
    setQuotes((prev) => {
      const exists = prev.some((q) => q.id === quote.id);
      if (exists) {
        return prev.map((q) => (q.id === quote.id ? quote : q));
      }
      return [quote, ...prev];
    });

    // Auto-create client if requested
    if (saveClientToDb && quote.clientName) {
      setClients((prev) => {
        const existing = prev.find(
          (c) => c.name.toLowerCase() === quote.clientName.toLowerCase() || c.phone === quote.clientPhone
        );
        if (!existing) {
          const newClient: Client = {
            id: quote.clientId || `cli-${Date.now()}`,
            name: quote.clientName,
            phone: quote.clientPhone,
            address: quote.address || '',
            neighborhood: quote.neighborhood || '',
            city: quote.city || 'Joinville',
            notes: `Fechadura: ${quote.lockModel || 'Digital'}. Criado via orçamento #${quote.code}.`,
            createdAt: new Date().toISOString(),
          };
            return [newClient, ...prev];
        }
        return prev;
      });
    }

    setIsQuoteEditorOpen(false);

    if (sendImmediately) {
      setWhatsAppQuote(quote);
      setIsQuoteWhatsAppOpen(true);
    }
  };

  const handleDeleteQuote = (id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  };

  const handleQuoteStatusChange = (id: string, status: QuoteStatus) => {
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const updated = { ...q, status, updatedAt: new Date().toISOString() };
          return updated;
        }
        return q;
      })
    );
  };

  const handleOpenQuoteWhatsApp = (quote: Quote) => {
    setWhatsAppQuote(quote);
    setIsQuoteWhatsAppOpen(true);
  };

  const handleViewQuoteDetail = (quote: Quote) => {
    setDetailQuote(quote);
    setIsQuoteDetailOpen(true);
  };

  const handleConvertToAppointment = (quote: Quote) => {
    // Mark quote as converted
    handleQuoteStatusChange(quote.id, 'convertido');

    // Build items summary for appointment description
    const itemsDescription = quote.items.map((it) => it.description).join(', ');
    const defaultDate = selectedDate || getTodayString();

    const newAppt: Appointment = {
      id: `appt-${Date.now()}`,
      clientId: quote.clientId || `cli-${Date.now()}`,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      address: quote.address || '',
      neighborhood: quote.neighborhood || '',
      city: quote.city || 'Joinville',
      date: defaultDate,
      startTime: '09:00',
      endTime: '11:00',
      durationMinutes: 120,
      serviceType: 'instalacao_sobrepor',
      serviceTypeName: 'Instalação / Execução de Orçamento',
      description: `Execução do Orçamento #${quote.code}: ${itemsDescription}`,
      lockModel: quote.lockModel || '',
      price: quote.totalAmount,
      paymentMethod: 'pix',
      status: 'pendente',
      reminderMinutesBefore: 60,
      notes: `Convertido a partir do Orçamento #${quote.code}. Condições: ${quote.paymentTerms}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingAppointment(newAppt);
    setModalInitialDate(defaultDate);
    setIsQuoteDetailOpen(false);
    setIsAppointmentModalOpen(true);
  };

  // Client Actions
  const handleSaveClient = (client: Client) => {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === client.id);
      if (exists) {
        return prev.map((c) => (c.id === client.id ? client : c));
      }
      return [client, ...prev];
    });
  };

  const handleDeleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const handleScheduleForClient = (client: Client) => {
    const defaultDate = selectedDate || getTodayString();
    setEditingAppointment({
      id: `appt-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      address: client.address,
      neighborhood: client.neighborhood,
      city: client.city || 'Joinville',
      date: defaultDate,
      startTime: '10:00',
      endTime: '11:30',
      durationMinutes: 90,
      serviceType: 'instalacao_sobrepor',
      serviceTypeName: 'Instalação Fechadura Sobrepor',
      description: 'Instalação de fechadura eletrônica',
      lockModel: '',
      price: 250,
      paymentMethod: 'pix',
      status: 'pendente',
      reminderMinutesBefore: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setModalInitialDate(defaultDate);
    setIsAppointmentModalOpen(true);
  };

  // WhatsApp Actions
  const handleOpenWhatsApp = (appt: Appointment) => {
    setWhatsAppAppointment(appt);
    setIsWhatsAppModalOpen(true);
  };

  // Sound Settings
  const handleToggleSound = () => {
    setSettings((prev) => {
      const updated = { ...prev, alarmSoundEnabled: !prev.alarmSoundEnabled };
      return updated;
    });
  };

  const handleSelectMelody = (melody: AlarmMelody) => {
    setSettings((prev) => {
      const updated = { ...prev, alarmMelody: melody };
      return updated;
    });
  };

  // Backup restore
  const handleDataImported = () => {
    const c = loadClients();
    const a = loadAppointments();
    const q = loadQuotes();
    const s = loadSettings();
    setClients(c);
    setAppointments(a);
    setQuotes(q);
    setSettings(s);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black pb-20 md:pb-8">
      {/* Top Brand Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onNewAppointment={() => handleOpenNewAppointment()}
        appointments={appointments}
        soundEnabled={settings.alarmSoundEnabled}
        onToggleSound={handleToggleSound}
        alarmMelody={settings.alarmMelody}
        onSelectMelody={handleSelectMelody}
        onOpenWhatsApp={handleOpenWhatsApp}
        onOpenBrandInfo={() => setIsBrandInfoOpen(true)}
        onPlayIntroAnimation={() => setIsSplashScreenOpen(true)}
        user={currentUser}
        googleConnected={!!currentUser || !!googleAccessToken}
        syncStatus={syncStatus}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
      />

      {/* Main Responsive Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {currentTab === 'agenda' && (
          <CalendarView
            appointments={appointments}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onNewAppointment={handleOpenNewAppointment}
            onEditAppointment={handleOpenEditAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onStatusChange={handleStatusChange}
            onOpenWhatsApp={handleOpenWhatsApp}
            onBlockDay={handleBlockDay}
          />
        )}

        {currentTab === 'diario' && (
          <DayScheduleView
            appointments={appointments}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onNewAppointment={handleOpenNewAppointment}
            onEditAppointment={handleOpenEditAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onStatusChange={handleStatusChange}
            onOpenWhatsApp={handleOpenWhatsApp}
          />
        )}

        {currentTab === 'orcamentos' && (
          <QuotesManager
            quotes={quotes}
            clients={clients}
            onNewQuote={() => handleOpenNewQuote()}
            onEditQuote={handleOpenEditQuote}
            onDeleteQuote={handleDeleteQuote}
            onStatusChange={handleQuoteStatusChange}
            onOpenWhatsApp={handleOpenQuoteWhatsApp}
            onViewDetail={handleViewQuoteDetail}
            onConvertToAppointment={handleConvertToAppointment}
          />
        )}

        {currentTab === 'clientes' && (
          <ClientsManager
            clients={clients}
            appointments={appointments}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onScheduleForClient={handleScheduleForClient}
            onOpenWhatsAppForAppt={handleOpenWhatsApp}
            onQuoteForClient={handleOpenNewQuote}
          />
        )}

        {currentTab === 'financeiro' && (
          <FinancialSummary
            appointments={appointments}
            onDataImported={handleDataImported}
          />
        )}

        {currentTab === 'consultoria' && <TechConsultingModal />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onNewAppointment={() => handleOpenNewAppointment()}
      />

      {/* Modal: Cloud Sync & Account Login */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        user={currentUser}
        syncStatus={syncStatus}
        errorMessage={syncErrorMessage}
        appointments={appointments}
        clients={clients}
        quotes={quotes}
        settings={settings}
        onRestoreData={handleRestoreData}
        onConnected={(u, token) => { setCurrentUser(u); setGoogleAccessToken(token); initialCloudLoadDoneRef.current = false; setCloudReady(false); }}
      />

      {/* Modal: conclusão oficial do atendimento (MA e OS opcionais) */}
      <ServiceCompletionModal
        isOpen={Boolean(completionAppointment)}
        appointment={completionAppointment}
        nextSerialStart={getNextNumbers().nextMA}
        nextServiceOrder={getNextNumbers().nextOS}
        onClose={() => setCompletionAppointment(null)}
        onConfirm={handleConfirmCompletion}
      />

      {/* Modal: New / Edit Appointment */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        onSaveAppointment={handleSaveAppointment}
        clients={clients}
        initialAppointment={editingAppointment}
        initialDate={modalInitialDate}
      />

      {/* Modal: Quote Editor */}
      <QuoteEditorModal
        isOpen={isQuoteEditorOpen}
        onClose={() => setIsQuoteEditorOpen(false)}
        onSaveQuote={handleSaveQuote}
        clients={clients}
        initialQuote={editingQuote}
        defaultClient={quoteDefaultClient}
      />

      {/* Modal: Quote WhatsApp 1-Click Dispatch */}
      <QuoteWhatsAppModal
        quote={whatsAppQuote}
        isOpen={isQuoteWhatsAppOpen}
        onClose={() => setIsQuoteWhatsAppOpen(false)}
      />

      {/* Modal: Quote Printable Detail / Digital Proposal */}
      <QuoteDetailModal
        quote={detailQuote}
        isOpen={isQuoteDetailOpen}
        onClose={() => setIsQuoteDetailOpen(false)}
        onOpenWhatsApp={handleOpenQuoteWhatsApp}
        onConvertToAppointment={handleConvertToAppointment}
        onEditQuote={handleOpenEditQuote}
      />

      {/* Modal: WhatsApp & WhatsApp Business 1-Click Dispatch for Appointments */}
      <WhatsAppModal
        appointment={whatsAppAppointment}
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />

      {/* Modal: Brand Emblem & Visual Identity */}
      <BrandInfoModal
        isOpen={isBrandInfoOpen}
        onClose={() => setIsBrandInfoOpen(false)}
        onPlayIntroAnimation={() => {
          setIsBrandInfoOpen(false);
          setIsSplashScreenOpen(true);
        }}
      />

      {/* Opening Screen Animation with Centered Animated Logo */}
      <AppSplashScreen
        isOpen={isSplashScreenOpen}
        onFinish={() => setIsSplashScreenOpen(false)}
      />

      {/* Google Calendar Automatic Sync Toast */}
      {googleToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] bg-blue-950/95 border border-blue-600/60 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
            </svg>
          </div>
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {googleToast.text}
          </div>
          <button 
            onClick={() => setGoogleToast(null)}
            className="text-zinc-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}


