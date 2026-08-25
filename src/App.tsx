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
import { User } from 'firebase/auth';
import { auth, cloudSync, checkRedirectAuth, subscribeGoogleToken, getCachedAccessToken } from './lib/firebase';
import { saveDatabaseToGoogleDrive, loadDatabaseFromGoogleDrive } from './lib/googleDrive';
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

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>('agenda');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayString());
  const [clients, setClients] = useState<Client[]>(() => loadClients());
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadAppointments());
  const [quotes, setQuotes] = useState<Quote[]>(() => loadQuotes());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  // Cloud Sync & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | undefined>();
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => getCachedAccessToken());
  const [googleToast, setGoogleToast] = useState<{ show: boolean; text: string } | null>(null);

  // Subscribe to Google OAuth Token
  useEffect(() => {
    const unsub = subscribeGoogleToken((token) => {
      setGoogleAccessToken(token);
    });
    return unsub;
  }, []);

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

  // Refs for tracking local vs cloud sync
  const isCloudUpdateRef = useRef(false);

  // Initialize Firebase Cloud Sync
  useEffect(() => {
    checkRedirectAuth();

    cloudSync.init({
      onAppointmentsUpdate: (cloudAppts) => {
        if (cloudAppts && cloudAppts.length > 0) {
          isCloudUpdateRef.current = true;
          setAppointments(cloudAppts);
          saveAppointments(cloudAppts);
        }
      },
      onClientsUpdate: (cloudClients) => {
        if (cloudClients && cloudClients.length > 0) {
          isCloudUpdateRef.current = true;
          setClients(cloudClients);
          saveClients(cloudClients);
        }
      },
      onQuotesUpdate: (cloudQuotes) => {
        if (cloudQuotes && cloudQuotes.length > 0) {
          isCloudUpdateRef.current = true;
          setQuotes(cloudQuotes);
          saveQuotes(cloudQuotes);
        }
      },
      onSettingsUpdate: (cloudSettings) => {
        if (cloudSettings) {
          isCloudUpdateRef.current = true;
          setSettings(cloudSettings);
          saveSettings(cloudSettings);
        }
      },
      onSyncStatusChange: (status, errMsg) => {
        setSyncStatus(status);
        setSyncErrorMessage(errMsg);
      },
    });

    const unsubAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        // Upload initial local data to cloud if new account
        cloudSync.uploadLocalDataToCloud(
          loadClients(),
          loadAppointments(),
          loadQuotes(),
          loadSettings()
        );
      }
    });

    return () => unsubAuth();
  }, []);

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

  // Auto-sync database directly to Google Drive when connected
  useEffect(() => {
    if (!googleAccessToken) return;

    const timer = setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        await saveDatabaseToGoogleDrive(
          {
            version: '2.0',
            updatedAt: new Date().toISOString(),
            clients,
            appointments,
            quotes,
            settings,
          },
          googleAccessToken
        );
        const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        localStorage.setItem('maicon_last_drive_sync', nowStr);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('Auto sync to Google Drive error:', err);
        setSyncStatus('error');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [clients, appointments, quotes, settings, googleAccessToken]);

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
    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === appt.id);
      if (exists) {
        return prev.map((a) => (a.id === appt.id ? appt : a));
      }
      return [appt, ...prev];
    });

    // Save to Cloud Firestore
    cloudSync.saveAppointmentCloud(appt);

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
            cloudSync.saveAppointmentCloud(syncedAppt);
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
          cloudSync.saveClientCloud(updatedClient);
          saveClients(updatedList);
          return updatedList;
        }

        const newClient: Client = {
          id: appt.clientId || `cli-${Date.now()}`,
          name: appt.clientName,
          phone: appt.clientPhone,
          address: appt.address,
          neighborhood: appt.neighborhood,
          city: appt.city || 'São Paulo',
          serialNumber: appt.serialNumber,
          serviceOrder: appt.serviceOrder,
          notes: `Fechadura: ${appt.lockModel || 'Digital'}. Criado via agendamento.`,
          createdAt: new Date().toISOString(),
        };
        cloudSync.saveClientCloud(newClient);
        const updatedList = [newClient, ...prev];
        saveClients(updatedList);
        return updatedList;
      });
    }
  };

  const handleDeleteAppointment = (id: string) => {
    const target = appointments.find((a) => a.id === id);
    const tokenToUse = googleAccessToken || getCachedAccessToken();
    
    if (target?.googleEventId && tokenToUse) {
      deleteGoogleCalendarEvent(target.googleEventId, tokenToUse)
        .then(() => {
          showGoogleNotification(`🗑️ Evento de ${target.clientName} removido do seu Google Agenda.`);
        })
        .catch((err) => {
          console.warn('Erro ao excluir no Google Agenda:', err);
        });
    }

    setAppointments((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveAppointments(updated);
      return updated;
    });
    cloudSync.deleteAppointmentCloud(id);
  };

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    const tokenToUse = googleAccessToken || getCachedAccessToken();
    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updated = { ...a, status: newStatus, updatedAt: new Date().toISOString() };
          cloudSync.saveAppointmentCloud(updated);
          if (tokenToUse) {
            updateGoogleCalendarEvent(updated, tokenToUse).catch(console.warn);
          }
          return updated;
        }
        return a;
      })
    );
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

    // Save to Cloud Firestore
    cloudSync.saveQuoteCloud(quote);

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
            city: quote.city || 'São Paulo',
            notes: `Fechadura: ${quote.lockModel || 'Digital'}. Criado via orçamento #${quote.code}.`,
            createdAt: new Date().toISOString(),
          };
          cloudSync.saveClientCloud(newClient);
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
    cloudSync.deleteQuoteCloud(id);
  };

  const handleQuoteStatusChange = (id: string, status: QuoteStatus) => {
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const updated = { ...q, status, updatedAt: new Date().toISOString() };
          cloudSync.saveQuoteCloud(updated);
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
      city: quote.city || 'São Paulo',
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
    cloudSync.saveClientCloud(client);
  };

  const handleDeleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    cloudSync.deleteClientCloud(id);
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
      city: client.city,
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
      cloudSync.saveSettingsCloud(updated);
      return updated;
    });
  };

  const handleSelectMelody = (melody: AlarmMelody) => {
    setSettings((prev) => {
      const updated = { ...prev, alarmMelody: melody };
      cloudSync.saveSettingsCloud(updated);
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
    if (currentUser) {
      cloudSync.uploadLocalDataToCloud(c, a, q, s);
    }
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
        onManualSync={() => {
          if (currentUser) {
            cloudSync.uploadLocalDataToCloud(clients, appointments, quotes, settings);
          }
        }}
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


