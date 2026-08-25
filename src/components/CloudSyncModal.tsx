import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Mail, 
  Lock, 
  AlertCircle, 
  X, 
  Sparkles,
  Calendar,
  BellRing,
  FileJson,
  Upload,
  Download,
  HardDrive,
  Check,
  History,
  Database,
  UserPlus
} from 'lucide-react';
import { User } from 'firebase/auth';
import { loginWithGoogle, loginWithEmail, logout, getCachedAccessToken, cloudSync } from '../lib/firebase';
import { Appointment, Client, Quote } from '../types';
import { AppSettings, exportBackupData, importBackupData } from '../utils/storage';
import { 
  saveDatabaseToGoogleDrive, 
  loadDatabaseFromGoogleDrive, 
  createDriveBackupSnapshot, 
  listDriveBackups, 
  DriveFileInfo,
  DatabasePayload 
} from '../lib/googleDrive';
import { syncAllToGoogleCalendar } from '../lib/googleCalendar';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  errorMessage?: string;
  onManualSync?: () => void;
  appointments: Appointment[];
  clients: Client[];
  quotes: Quote[];
  settings: AppSettings;
  onRestoreData: (data: { clients: Client[]; appointments: Appointment[]; quotes: Quote[]; settings?: AppSettings }) => void;
  onAppointmentsSynced?: (updatedAppts: Appointment[]) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  syncStatus,
  errorMessage,
  onManualSync,
  appointments = [],
  clients = [],
  quotes = [],
  settings,
  onRestoreData,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Email/Password form state
  const [emailInput, setEmailInput] = useState('maiconautomacaosc@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');

  // Drive state
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [lastDriveSyncTime, setLastDriveSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('maicon_last_drive_sync');
  });
  const [driveBackups, setDriveBackups] = useState<DriveFileInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'cloud' | 'drive' | 'local'>('cloud');

  const accessToken = getCachedAccessToken();

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveBackupList();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const loadDriveBackupList = async () => {
    if (!accessToken) return;
    try {
      const list = await listDriveBackups(accessToken);
      setDriveBackups(list);
    } catch {
      // Ignore
    }
  };

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const res = await loginWithGoogle();
      if (res?.user) {
        setSuccessMessage(`Conectado com sucesso como ${res.user.email}!`);
        
        // Initial cloud upload
        cloudSync.uploadLocalDataToCloud(clients, appointments, quotes, settings);

        if (res.accessToken) {
          const payload: DatabasePayload = {
            version: '2.0',
            updatedAt: new Date().toISOString(),
            clients,
            appointments,
            quotes,
            settings,
          };
          saveDatabaseToGoogleDrive(payload, res.accessToken).catch(() => {});
        }

        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      console.error('Google connect error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        setAuthError('A janela de login do Google foi bloqueada ou fechada. Abra o app em nova aba ou permita pop-ups no seu navegador.');
      } else {
        setAuthError(err.message || 'Não foi possível conectar com a Conta Google.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthError('Preencha seu e-mail e uma senha com no mínimo 6 caracteres.');
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setIsConnecting(true);
    setAuthError(null);
    try {
      const loggedUser = await loginWithEmail(emailInput, passwordInput);
      setSuccessMessage(`Conectado com sucesso como ${loggedUser.email}!`);
      
      // Sync local data to cloud
      cloudSync.uploadLocalDataToCloud(clients, appointments, quotes, settings);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Email login error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Senha incorreta para este e-mail. Verifique os dados digitados.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('A senha deve conter no mínimo 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Formato de e-mail inválido.');
      } else {
        setAuthError(err.message || 'Erro ao sincronizar. Tente novamente.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveToDriveNow = async () => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      await handleGoogleConnect();
      return;
    }

    setIsDriveSyncing(true);
    setAuthError(null);
    try {
      const payload: DatabasePayload = {
        version: '2.0',
        updatedAt: new Date().toISOString(),
        clients,
        appointments,
        quotes,
        settings,
      };

      await saveDatabaseToGoogleDrive(payload, token);
      const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastDriveSyncTime(nowStr);
      localStorage.setItem('maicon_last_drive_sync', nowStr);
      setSuccessMessage(`Dados salvos no seu Google Drive (agenda_maicon_database.json) às ${nowStr}!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setAuthError('Erro ao salvar no Google Drive: ' + (err.message || 'Tente reconectar sua conta Google'));
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleLoadFromDriveNow = async () => {
    let token = accessToken || getCachedAccessToken();
    if (!token) {
      await handleGoogleConnect();
      return;
    }

    if (!confirm('Deseja carregar os dados salvos no seu Google Drive? Isso atualizará os agendamentos, clientes e orçamentos deste aparelho com a versão da nuvem.')) {
      return;
    }

    setIsDriveSyncing(true);
    setAuthError(null);
    try {
      const { data } = await loadDatabaseFromGoogleDrive(token);
      if (!data) {
        setAuthError('Nenhum banco de dados anterior encontrado no seu Google Drive. Salve seus dados primeiro!');
        return;
      }

      onRestoreData({
        clients: data.clients || [],
        appointments: data.appointments || [],
        quotes: data.quotes || [],
        settings: data.settings,
      });

      const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setLastDriveSyncTime(nowStr);
      setSuccessMessage(`Banco de dados carregado com sucesso do Google Drive! (${data.appointments?.length || 0} agendamentos, ${data.clients?.length || 0} clientes)`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setAuthError('Erro ao carregar dados do Google Drive: ' + (err.message || 'Tente reconectar'));
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleCreateSnapshot = async () => {
    let token = accessToken || getCachedAccessToken();
    if (!token) return;

    setIsCreatingBackup(true);
    try {
      const payload: DatabasePayload = {
        version: '2.0',
        updatedAt: new Date().toISOString(),
        clients,
        appointments,
        quotes,
        settings,
      };

      const backup = await createDriveBackupSnapshot(payload, token);
      setSuccessMessage(`Cópia de segurança criada com sucesso no seu Drive: ${backup.name}`);
      await loadDriveBackupList();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setAuthError('Erro ao criar backup no Google Drive: ' + (err.message || 'Falha ao salvar'));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadLocalJson = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_agenda_maicon_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccessMessage('Arquivo de backup baixado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleUploadLocalJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        const ok = importBackupData(content);
        if (ok) {
          try {
            const parsed = JSON.parse(content);
            onRestoreData({
              clients: parsed.clients || [],
              appointments: parsed.appointments || [],
              quotes: parsed.quotes || [],
              settings: parsed.settings,
            });
            setSuccessMessage('Backup importado com sucesso!');
            setTimeout(() => setSuccessMessage(null), 3000);
          } catch {
            setAuthError('Erro ao processar arquivo.');
          }
        } else {
          setAuthError('Arquivo de backup inválido ou incompatível.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = async () => {
    setIsConnecting(true);
    try {
      await logout();
      setSuccessMessage('Conta desconectada.');
      setTimeout(() => setSuccessMessage(null), 1500);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const isConnected = !!user;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative px-5 sm:px-6 pt-5 pb-4 bg-gradient-to-b from-zinc-800/90 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Banco de Dados & Nuvem
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-extrabold uppercase tracking-wide">
                  100% Gratuito
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Sincronize clientes, agendamentos e orçamentos em todos os seus aparelhos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800 bg-zinc-950/40 text-xs">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'cloud'
                ? 'border-emerald-400 text-emerald-300 font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Sincronização em Nuvem (Direta)</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'drive'
                ? 'border-blue-400 text-blue-300 font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'local'
                ? 'border-cyan-400 text-cyan-300 font-extrabold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>Backup Local (.json)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Alert Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isConnected 
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' 
              : 'bg-zinc-950 border-zinc-800 text-zinc-300'
          }`}>
            <div className="flex items-center gap-3">
              {isConnected ? (
                syncStatus === 'syncing' ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )
              ) : (
                <CloudOff className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold">
                  {isConnected 
                    ? `Nuvem Ativa: ${user?.email}` 
                    : 'Nuvem Desconectada'}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {isConnected 
                    ? `Sincronizando em tempo real • ${clients.length} clientes, ${appointments.length} agendamentos`
                    : 'Conecte para salvar e sincronizar automaticamente entre celular e computador.'}
                </span>
              </div>
            </div>

            {isConnected && (
              <button
                onClick={() => {
                  cloudSync.uploadLocalDataToCloud(clients, appointments, quotes, settings);
                  setSuccessMessage('Dados sincronizados com a nuvem!');
                  setTimeout(() => setSuccessMessage(null), 2500);
                }}
                disabled={syncStatus === 'syncing'}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Sincronizar</span>
              </button>
            )}
          </div>

          {/* Success / Error Messages */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {authError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">{authError}</div>
            </div>
          )}

          {/* TAB 1: CLOUD SYNC (FIRESTORE) */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              {!isConnected ? (
                <div className="space-y-4">
                  {/* Google 1-Click Login */}
                  <div className="p-5 bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl space-y-3 text-center">
                    <h4 className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Opção 1: Entrar com 1-Clique na Conta Google</span>
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Entra direto com seu e-mail Google sem precisar digitar senha.
                    </p>

                    <button
                      onClick={handleGoogleConnect}
                      disabled={isConnecting}
                      className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-3 shadow-xl shadow-white/10 active:scale-98 transition-all cursor-pointer"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{isConnecting ? 'Conectando...' : 'Entrar com Conta Google'}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">ou com e-mail e senha</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  {/* Email & Password Form */}
                  <form onSubmit={handleEmailAuth} className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-cyan-400" />
                        <span>Opção 2: Entrar com E-mail e Senha</span>
                      </h4>
                      <span className="text-[10px] text-zinc-400">Cria ou entra automaticamente</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">E-mail</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="seuemail@gmail.com"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">Senha (mínimo 6 caracteres)</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isConnecting}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-98 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isConnecting ? 'Conectando...' : 'Entrar / Criar Conta'}</span>
                    </button>
                  </form>

                  {/* Free info badge */}
                  <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-zinc-200">100% Grátis:</strong> Esta nuvem utiliza o banco de dados oficial do Google Firebase no plano gratuito. Não há cobranças nem pedido de cartão de crédito.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Connected Info Card */}
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Sincronização em Nuvem Ativa</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Tempo Real
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Conta:</span>
                        <span className="font-mono text-white">{user?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Clientes Salvos:</span>
                        <span className="font-bold text-emerald-300">{clients.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Agendamentos:</span>
                        <span className="font-bold text-cyan-300">{appointments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Orçamentos:</span>
                        <span className="font-bold text-amber-300">{quotes.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Device Instruction */}
                  <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800 space-y-2">
                    <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Como sincronizar no Celular e no Computador:</span>
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      1. Abra o mesmo link no seu celular ou outro computador.<br />
                      2. Clique em <strong>Sincronizar Nuvem</strong> e faça login com a mesma conta (<code className="text-emerald-300">{user?.email}</code>).<br />
                      3. Pronto! Todas as fechaduras, agendamentos e clientes aparecem instantaneamente nos dois aparelhos.
                    </p>
                  </div>

                  {/* Disconnect */}
                  <button
                    onClick={handleLogout}
                    disabled={isConnecting}
                    className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Desconectar Conta</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Google Drive Backup</h4>
                    <p className="text-[11px] text-zinc-400">Salve uma cópia do banco no seu Google Drive</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleSaveToDriveNow}
                    disabled={isDriveSyncing}
                    className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 flex flex-col text-left gap-1.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Upload className="w-4 h-4" />
                      <span>Salvar no Drive</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      Exporta clientes e agendamentos para seu Drive
                    </span>
                  </button>

                  <button
                    onClick={handleLoadFromDriveNow}
                    disabled={isDriveSyncing}
                    className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 flex flex-col text-left gap-1.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Download className="w-4 h-4" />
                      <span>Restaurar do Drive</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      Importa a versão salva no seu Google Drive
                    </span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCreateSnapshot}
                    disabled={isCreatingBackup}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>{isCreatingBackup ? 'Criando cópia...' : 'Criar Cópia de Segurança Datada no Drive'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL BACKUP (.JSON) */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Backup em Arquivo (.json)</h4>
                    <p className="text-[11px] text-zinc-400">Baixe ou restaure um arquivo completo offline</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={handleDownloadLocalJson}
                    className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Baixar Arquivo .json</span>
                  </button>

                  <label className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer text-center">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Importar Arquivo .json</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadLocalJson}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Google Cloud & Firebase • 100% Gratuito (Plano Spark)</span>
          </div>
          <span>v2.2 Nuvem</span>
        </div>
      </div>
    </div>
  );
};
