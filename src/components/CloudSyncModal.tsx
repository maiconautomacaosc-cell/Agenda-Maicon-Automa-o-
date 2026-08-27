import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Cloud, Database, Download, FileJson, HardDrive, LogIn, LogOut, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';
import { Appointment, Client, Quote } from '../types';
import { AppSettings, exportBackupData, importBackupData } from '../utils/storage';
import { GoogleUser, getCachedAccessToken, getGoogleClientId, loginWithGoogle, logout, setGoogleClientId } from '../lib/googleAuth';
import { getSpreadsheetId, loadDatabaseFromGoogleSheets, saveDatabaseToGoogleSheets, setSpreadsheetId } from '../lib/googleSheets';
import { DatabasePayload, loadDatabaseFromGoogleDrive, saveDatabaseToGoogleDrive } from '../lib/googleDrive';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GoogleUser | null;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  errorMessage?: string;
  appointments: Appointment[];
  clients: Client[];
  quotes: Quote[];
  settings: AppSettings;
  onRestoreData: (data: { clients: Client[]; appointments: Appointment[]; quotes: Quote[]; settings?: AppSettings }) => void;
  onConnected?: (user: GoogleUser, token: string) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen, onClose, user, syncStatus, errorMessage, appointments, clients, quotes, settings, onRestoreData, onConnected
}) => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(getGoogleClientId());
  const [sheetId, setSheetId] = useState(getSpreadsheetId());
  const [activeTab, setActiveTab] = useState<'cloud' | 'drive' | 'local'>('cloud');

  useEffect(() => {
    if (isOpen) {
      setClientId(getGoogleClientId());
      setSheetId(getSpreadsheetId());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const payload = (): DatabasePayload => ({
    version: '3.1', updatedAt: new Date().toISOString(), clients, appointments, quotes, settings
  });

  const saveConfig = () => {
    setGoogleClientId(clientId);
    setSpreadsheetId(sheetId);
  };

  const connect = async () => {
    setBusy(true); setError(null); setMessage(null);
    try {
      saveConfig();
      const res = await loginWithGoogle();
      setMessage(`Conectado como ${res.user.email}.`);
      onConnected?.(res.user, res.accessToken);
    } catch (e:any) { setError(e.message || 'Falha no login Google.'); }
    finally { setBusy(false); }
  };

  const saveNow = async () => {
    const token = getCachedAccessToken();
    if (!token) return connect();
    setBusy(true); setError(null);
    try {
      saveConfig();
      const p = payload();
      await saveDatabaseToGoogleSheets(p, token, getSpreadsheetId());
      await saveDatabaseToGoogleDrive(p, token).catch(() => null);
      setMessage('Agenda salva na sua Planilha Google e backup atualizado no Drive.');
    } catch(e:any) { setError(e.message || 'Erro ao salvar.'); }
    finally { setBusy(false); }
  };

  const loadNow = async () => {
    const token = getCachedAccessToken();
    if (!token) return connect();
    setBusy(true); setError(null);
    try {
      saveConfig();
      const data = await loadDatabaseFromGoogleSheets(token, getSpreadsheetId());
      if (!data) { setError('A planilha ainda não possui dados do aplicativo. Use “Salvar agora” primeiro.'); return; }
      onRestoreData(data);
      setMessage(`Carregado: ${data.appointments.length} agendamentos e ${data.clients.length} clientes.`);
    } catch(e:any) { setError(e.message || 'Erro ao carregar a planilha.'); }
    finally { setBusy(false); }
  };

  const loadDrive = async () => {
    const token = getCachedAccessToken(); if (!token) return connect();
    setBusy(true); setError(null);
    try {
      const { data } = await loadDatabaseFromGoogleDrive(token);
      if (!data) { setError('Nenhum backup encontrado no Google Drive.'); return; }
      onRestoreData(data);
      setMessage('Backup do Google Drive restaurado.');
    } catch(e:any) { setError(e.message || 'Erro ao restaurar Drive.'); }
    finally { setBusy(false); }
  };

  const downloadJson = () => {
    const blob = new Blob([exportBackupData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `backup_agenda_maicon_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const uploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = String(ev.target?.result || '');
      if (!importBackupData(text)) { setError('Arquivo de backup inválido.'); return; }
      try {
        const d = JSON.parse(text);
        onRestoreData({ clients:d.clients||[], appointments:d.appointments||[], quotes:d.quotes||[], settings:d.settings });
        setMessage('Backup local restaurado.');
      } catch { setError('Arquivo inválido.'); }
    };
    reader.readAsText(file); e.target.value='';
  };

  const disconnect = async () => { await logout(); setMessage('Conta Google desconectada.'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3"><Database className="w-6 h-6 text-cyan-400"/><div><h3 className="font-bold text-white">Nuvem Google</h3><p className="text-xs text-zinc-400">Planilha + Agenda + Drive • sem Firebase</p></div></div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex px-5 pt-3 border-b border-zinc-800 text-xs gap-2">
          {(['cloud','drive','local'] as const).map(tab => <button key={tab} onClick={()=>setActiveTab(tab)} className={`px-3 pb-2 border-b-2 font-bold ${activeTab===tab?'border-cyan-400 text-cyan-300':'border-transparent text-zinc-500'}`}>{tab==='cloud'?'Planilha Google':tab==='drive'?'Google Drive':'Backup Local'}</button>)}
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${user?'bg-emerald-950/30 border-emerald-800 text-emerald-300':'bg-zinc-950 border-zinc-800 text-zinc-300'}`}>
            {user?<CheckCircle2 className="w-4 h-4"/>:<Cloud className="w-4 h-4"/>}
            <span>{user ? `${user.email} • ${syncStatus==='syncing'?'sincronizando...':'conectado'}` : 'Conta Google desconectada'}</span>
          </div>

          {(error || errorMessage) && <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0"/>{error || errorMessage}</div>}
          {message && <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0"/>{message}</div>}

          {activeTab==='cloud' && <div className="space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
              <label className="block text-[11px] text-zinc-400">ID do Cliente OAuth Google</label>
              <input value={clientId} onChange={e=>setClientId(e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white"/>
              <label className="block text-[11px] text-zinc-400">Link ou ID da sua Planilha Maicon Automação</label>
              <input value={sheetId} onChange={e=>setSheetId(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white"/>
              <p className="text-[10px] text-zinc-500">O app cria abas APP_AGENDA, APP_CLIENTES, APP_ORCAMENTOS e APP_CONFIG sem mexer nas abas do seu sistema atual.</p>
            </div>

            {!user ? <button disabled={busy} onClick={connect} className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2"><LogIn className="w-4 h-4"/>{busy?'Conectando...':'Entrar com Conta Google'}</button> : <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={saveNow} className="py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2"><Upload className="w-4 h-4"/>Salvar agora</button>
              <button disabled={busy} onClick={loadNow} className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4"/>Carregar planilha</button>
              <button onClick={disconnect} className="col-span-2 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2"><LogOut className="w-4 h-4"/>Desconectar</button>
            </div>}

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 flex gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0"/>Google Sheets, Calendar e Drive usam sua própria Conta Google. Não é necessário Firebase nem plano Blaze.</div>
          </div>}

          {activeTab==='drive' && <div className="space-y-3"><div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl"><div className="flex items-center gap-2 text-sm font-bold text-white"><HardDrive className="w-4 h-4 text-blue-400"/>Backup Google Drive</div><p className="text-xs text-zinc-400 mt-1">Uma cópia JSON adicional fica no seu Drive.</p></div><button onClick={saveNow} disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2"><RefreshCw className={`w-4 h-4 ${busy?'animate-spin':''}`}/>Atualizar backup</button><button onClick={loadDrive} disabled={busy} className="w-full py-3 rounded-xl bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4"/>Restaurar do Drive</button></div>}

          {activeTab==='local' && <div className="grid grid-cols-2 gap-2"><button onClick={downloadJson} className="py-3 rounded-xl bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2"><FileJson className="w-4 h-4"/>Baixar .json</button><label className="py-3 rounded-xl bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"><Upload className="w-4 h-4"/>Importar .json<input type="file" accept=".json" className="hidden" onChange={uploadJson}/></label></div>}
        </div>
      </div>
    </div>
  );
};
