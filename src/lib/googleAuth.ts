export interface GoogleUser {
  email: string;
  displayName?: string;
  photoURL?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

const TOKEN_KEY = 'maicon_google_access_token';
const TOKEN_EXPIRY_KEY = 'maicon_google_access_token_expires_at';
const USER_KEY = 'maicon_google_user';
const CLIENT_ID_KEY = 'maicon_google_client_id';
const DEFAULT_GOOGLE_CLIENT_ID = '945001637537-00ueavag5hv0ttt92f2pk8t9ligv4ddb.apps.googleusercontent.com';
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

let cachedAccessToken: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
})();

let cachedTokenExpiresAt = (() => {
  try { return Number(localStorage.getItem(TOKEN_EXPIRY_KEY) || 0); } catch { return 0; }
})();

let cachedUser: GoogleUser | null = (() => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
})();

const tokenListeners: Array<(token: string | null) => void> = [];
const userListeners: Array<(user: GoogleUser | null) => void> = [];
let renewalPromise: Promise<string | null> | null = null;

export function getGoogleClientId(): string {
  const envId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  if (envId) return envId;
  try { return localStorage.getItem(CLIENT_ID_KEY) || DEFAULT_GOOGLE_CLIENT_ID; } catch { return DEFAULT_GOOGLE_CLIENT_ID; }
}

export function setGoogleClientId(clientId: string) {
  try { localStorage.setItem(CLIENT_ID_KEY, clientId.trim()); } catch {}
}

export function getCachedAccessToken(): string | null { return cachedAccessToken; }
export function getCachedGoogleUser(): GoogleUser | null { return cachedUser; }
export function getCachedTokenExpiresAt(): number { return cachedTokenExpiresAt; }

export function subscribeGoogleToken(listener: (token: string | null) => void): () => void {
  tokenListeners.push(listener);
  listener(cachedAccessToken);
  return () => {
    const i = tokenListeners.indexOf(listener);
    if (i >= 0) tokenListeners.splice(i, 1);
  };
}

export function subscribeGoogleUser(listener: (user: GoogleUser | null) => void): () => void {
  userListeners.push(listener);
  listener(cachedUser);
  return () => {
    const i = userListeners.indexOf(listener);
    if (i >= 0) userListeners.splice(i, 1);
  };
}

function setToken(token: string | null, expiresInSeconds?: number) {
  cachedAccessToken = token;
  if (token && expiresInSeconds) {
    cachedTokenExpiresAt = Date.now() + Math.max(60, expiresInSeconds - 60) * 1000;
  } else if (!token) {
    cachedTokenExpiresAt = 0;
  }
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      if (cachedTokenExpiresAt) localStorage.setItem(TOKEN_EXPIRY_KEY, String(cachedTokenExpiresAt));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } catch {}
  tokenListeners.forEach(fn => fn(token));
}

function setUser(user: GoogleUser | null) {
  cachedUser = user;
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
  userListeners.forEach(fn => fn(user));
}

function waitForGoogleIdentity(): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > 10000) {
        clearInterval(timer);
        reject(new Error('Não foi possível carregar o login do Google. Verifique sua internet.'));
      }
    }, 100);
  });
}

async function fetchGoogleUser(token: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Não foi possível ler os dados da Conta Google.');
  const data = await res.json();
  return {
    email: data.email || '',
    displayName: data.name || data.email || 'Conta Google',
    photoURL: data.picture || undefined,
  };
}

async function requestToken(prompt: '' | 'consent' | 'select_account'): Promise<string> {
  await waitForGoogleIdentity();
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('Configure o ID do cliente OAuth do Google na tela de Nuvem.');

  return new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: any) => {
        if (response?.access_token) {
          setToken(response.access_token, Number(response.expires_in || 3600));
          resolve(response.access_token);
        } else {
          reject(new Error(response?.error_description || response?.error || 'Autorização Google não concluída.'));
        }
      },
      error_callback: (err: any) => reject(new Error(err?.message || err?.type || 'Falha ao abrir o login Google.')),
    });
    client.requestAccessToken({ prompt });
  });
}

export async function loginWithGoogle(): Promise<{ user: GoogleUser; accessToken: string }> {
  const token = await requestToken('consent');
  const user = await fetchGoogleUser(token);
  setUser(user);
  return { user, accessToken: token };
}

/**
 * Tenta manter a sessão ativa. Primeiro reutiliza o token enquanto válido;
 * perto do vencimento solicita um novo token sem forçar nova tela de consentimento.
 * Se o navegador/Google exigir interação, retorna null e a interface continua com os dados locais.
 */
export async function ensureValidAccessToken(forceRenew = false): Promise<string | null> {
  const stillValid = cachedAccessToken && cachedTokenExpiresAt > Date.now() + 2 * 60 * 1000;
  if (!forceRenew && stillValid) return cachedAccessToken;
  if (renewalPromise) return renewalPromise;

  renewalPromise = (async () => {
    try {
      const token = await requestToken('');
      try {
        const user = await fetchGoogleUser(token);
        setUser(user);
      } catch {}
      return token;
    } catch {
      // Não apaga o usuário salvo: evita parecer "deslogado" só porque o Google exigiu interação.
      if (cachedTokenExpiresAt && cachedTokenExpiresAt <= Date.now()) setToken(null);
      return null;
    } finally {
      renewalPromise = null;
    }
  })();

  return renewalPromise;
}

export async function logout(): Promise<void> {
  const token = cachedAccessToken;
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try { window.google.accounts.oauth2.revoke(token, () => {}); } catch {}
  }
  setToken(null);
  setUser(null);
}

export async function validateCachedToken(): Promise<boolean> {
  if (!cachedAccessToken) {
    const renewed = await ensureValidAccessToken(true);
    return Boolean(renewed);
  }
  try {
    const user = await fetchGoogleUser(cachedAccessToken);
    setUser(user);
    // Tokens antigos gravados antes desta atualização não têm expiração salva.
    // Considera uma janela curta e agenda renovação automática.
    if (!cachedTokenExpiresAt) {
      cachedTokenExpiresAt = Date.now() + 10 * 60 * 1000;
      try { localStorage.setItem(TOKEN_EXPIRY_KEY, String(cachedTokenExpiresAt)); } catch {}
    }
    return true;
  } catch {
    const renewed = await ensureValidAccessToken(true);
    return Boolean(renewed);
  }
}
