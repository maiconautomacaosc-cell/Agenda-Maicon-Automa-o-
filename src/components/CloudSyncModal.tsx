import React, { useState } from 'react';
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
  BellRing
} from 'lucide-react';
import { User } from 'firebase/auth';
import { loginWithGoogle, loginWithEmail, logout, getCachedAccessToken } from '../lib/firebase';
import { BrandLogo } from './BrandLogo';
import { Appointment } from '../types';
import { syncAllToGoogleCalendar } from '../lib/googleCalendar';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  errorMessage?: string;
  onManualSync?: () => void;
  appointments?: Appointment[];
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
  onAppointmentsSynced,
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'options' | 'email'>('options');
  const [emailInput, setEmailInput] = useState('Maiconautomacaosc@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  if (!isOpen) return null;

  const googleToken = getCachedAccessToken();

  const handleOpenInNewTab = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch {
      // Fallback
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    setIsPopupBlocked(false);
    try {
      const res = await loginWithGoogle();
      if (res?.accessToken && appointments.length > 0) {
        setSuccessMessage('Conectado ao Google com Maiconautomacaosc@gmail.com! Sincronizando agendamentos...');
        try {
          await syncAllToGoogleCalendar(appointments, res.accessToken);
          setSuccessMessage('Conta Google conectada e Google Agenda sincronizado!');
        } catch {
          setSuccessMessage('Conta Google conectada com sucesso!');
        }
      } else {
        setSuccessMessage('Conectado com sucesso à nuvem Google!');
      }
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('Login error:', err);
      const isBlocked = 
        err.code === 'auth/popup-blocked' || 
        err.code === 'auth/popup-closed-by-user' ||
        err.message?.toLowerCase().includes('popup') ||
        err.message?.toLowerCase().includes('blocked');
      
      setIsPopupBlocked(isBlocked);
      
      if (isBlocked) {
        setAuthError(
          'O navegador ou a prévia bloqueou a janela pop-up do Google. Clique no botão abaixo para abrir em Nova Aba ou acesse diretamente com E-mail e Senha.'
        );
      } else {
        setAuthError(
          err.message || 'Não foi possível conectar com o Google. Verifique sua conexão ou utilize o login por e-mail.'
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSyncGoogleCalendarNow = async () => {
    let token = googleToken || getCachedAccessToken();
    if (!token) {
      // Prompt Google Login to get token
      try {
        const res = await loginWithGoogle();
        if (res?.accessToken) {
          token = res.accessToken;
        }
      } catch (err: any) {
        setAuthError('Conecte sua conta Google para autorizar o Google Agenda.');
        return;
      }
    }
    
    if (!token) return;

    setIsSyncingCalendar(true);
    try {
      const { syncedCount, errors } = await syncAllToGoogleCalendar(appointments, token);
      if (errors > 0) {
        setSuccessMessage(`${syncedCount} agendamentos sincronizados com Google Agenda (${errors} pendentes).`);
      } else {
        setSuccessMessage(`Todos os ${syncedCount} agendamentos foram sincronizados com sucesso no seu Google Agenda!`);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setAuthError('Erro ao sincronizar com Google Agenda: ' + (err.message || 'Tente reconectar sua conta Google'));
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthError('Preencha seu e-mail e senha.');
      return;
    }
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await loginWithEmail(emailInput, passwordInput);
      setSuccessMessage('Login efetuado com sucesso!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Email login error:', err);
      if (err.code === 'auth/wrong-password') {
        setAuthError('Senha incorreta.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('E-mail inválido.');
      } else {
        setAuthError('Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingIn(true);
    try {
      await logout();
      setSuccessMessage('Desconectado com sucesso.');
      setTimeout(() => setSuccessMessage(null), 1500);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-zinc-800/80 to-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Sincronização em Nuvem
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 uppercase font-extrabold tracking-wider">
                  Firebase Cloud
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Acesse e sincronize seus agendamentos e orçamentos em múltiplos aparelhos
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

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            user 
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' 
              : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
          }`}>
            <div className="flex items-center gap-3">
              {user ? (
                syncStatus === 'syncing' ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )
              ) : (
                <CloudOff className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold">
                  {user 
                    ? `Nuvem Conectada: ${user.email || 'Conta Ativa'}` 
                    : 'Modo Offline / Apenas Este Dispositivo'}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {user 
                    ? 'Todos os seus dados estão salvos e sincronizando em tempo real com o Google Cloud.' 
                    : 'Faça login com seu e-mail para acessar os mesmos dados no celular e computador.'}
                </span>
              </div>
            </div>

            {user && onManualSync && (
              <button
                onClick={onManualSync}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                title="Forçar sincronização agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            )}
          </div>

          {/* Messages */}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {authError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs font-medium space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">{authError}</div>
              </div>

              {isPopupBlocked && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={handleOpenInNewTab}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <span>Abrir em Nova Aba (Permitir Google)</span>
                  </button>
                  <button
                    onClick={() => {
                      setLoginMode('email');
                      setAuthError(null);
                    }}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold text-xs border border-zinc-700 transition-colors cursor-pointer"
                  >
                    <span>Usar E-mail / Senha</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User Logged In View */}
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 space-y-3">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full border-2 border-cyan-500/40"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-lg border border-cyan-500/30">
                      {user.email?.charAt(0).toUpperCase() || 'M'}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">
                      {user.displayName || 'Maicon Automação'}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {user.email}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sincronização em Tempo Real Ativa
                    </span>
                  </div>
                </div>
              </div>

              {/* Google Calendar Automatic Sync Card */}
              <div className="p-4 bg-gradient-to-br from-blue-950/40 via-zinc-950 to-zinc-950 rounded-2xl border border-blue-800/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        Google Agenda Integrado
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold uppercase">
                          Auto-Sync
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Alarmes e pop-ups com tela bloqueada acionados pelo Google Agenda oficial.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <BellRing className="w-3.5 h-3.5 text-amber-400" />
                    <span>Como funciona a notificação com tela bloqueada:</span>
                  </div>
                  <p>
                    Ao salvar qualquer agendamento, ele vai <strong>direto para o Google Agenda do seu celular</strong> com alertas pop-up programados (60min e 15min antes).
                  </p>
                </div>

                <button
                  onClick={handleSyncGoogleCalendarNow}
                  disabled={isSyncingCalendar}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/60 active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingCalendar 
                      ? 'Sincronizando com Google Agenda...' 
                      : `Sincronizar Todos (${appointments.length}) com Google Agenda`}
                  </span>
                </button>
              </div>

              {/* Multi-device Explanatory Card */}
              <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-800/60 space-y-2">
                <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Como acessar de outro celular ou computador:</span>
                </h4>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li>Abra o link do aplicativo no navegador do outro aparelho.</li>
                  <li>Clique no ícone de <strong>Nuvem</strong> no topo.</li>
                  <li>Faça login com a mesma conta (<code className="text-cyan-300 font-mono">{user.email}</code>).</li>
                  <li>Pronto! Todos os seus agendamentos, clientes e orçamentos carregarão na hora.</li>
                </ul>
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleLogout}
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Desconectar desta Conta</span>
              </button>
            </div>
          ) : (
            /* User NOT Logged In View */
            <div className="space-y-4">
              <div className="text-center py-2 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-[11px] font-mono font-bold">
                  <Mail className="w-3 h-3 text-cyan-400" />
                  <span>Conta Principal: Maiconautomacaosc@gmail.com</span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  Conecte sua conta para sincronizar
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Seus agendamentos e orçamentos ficarão salvos no banco de dados seguro e disponíveis em qualquer celular ou computador.
                </p>
              </div>

              {loginMode === 'options' ? (
                <div className="space-y-3">
                  {/* Google Login 1-Click Button */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-white/10 active:scale-98 transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isLoggingIn ? 'Conectando...' : 'Entrar com Conta Google'}</span>
                  </button>

                  <div className="flex items-center gap-2 text-zinc-500 text-xs my-2">
                    <div className="h-px bg-zinc-800 flex-1" />
                    <span>ou</span>
                    <div className="h-px bg-zinc-800 flex-1" />
                  </div>

                  {/* Email/Password Button Option */}
                  <button
                    onClick={() => setLoginMode('email')}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span>Entrar com E-mail e Senha</span>
                  </button>
                </div>
              ) : (
                /* Email form */
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      E-mail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="seu-email@gmail.com"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setLoginMode('options')}
                      className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-lg shadow-cyan-950/50 transition-colors"
                    >
                      {isLoggingIn ? 'Verificando...' : 'Entrar / Criar Conta'}
                    </button>
                  </div>
                </form>
              )}

              {/* Brave / Privacy Browser Notice */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1.5 text-left">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Dica para Navegador Brave ou bloqueadores:</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  O Brave bloqueia conexões do Google por padrão através do <strong>Brave Shields</strong> (ícone de leão ao lado da barra de endereço).
                </p>
                <p className="text-[11px] text-zinc-400">
                  👉 Para sincronizar no Brave: clique no <strong>Leãozinho do Brave</strong> e <strong>desative a proteção para esta página</strong>, ou utilize a opção <strong>"Entrar com E-mail e Senha"</strong> logo abaixo.
                </p>
              </div>

              {/* Multi-device Benefit badges */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-200">No Celular</span>
                    <span className="text-[10px] text-zinc-400">Atendimento em campo</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-200">No Computador</span>
                    <span className="text-[10px] text-zinc-400">Emissão de orçamentos</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Banco de dados criptografado Google Firestore</span>
          </div>
          <span>v2.0 Nuvem</span>
        </div>
      </div>
    </div>
  );
};
