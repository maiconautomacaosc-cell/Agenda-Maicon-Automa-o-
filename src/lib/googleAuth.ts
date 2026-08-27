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
const USER_KEY = 'maicon_google_user';
const CLIENT_ID_KEY = 'maicon_google_client_id';
const DEFAULT_GOOGLE_CLIENT_ID = '945001637537-00ueavag5hv0ttt92f2pk8t9ligv4ddb.apps.googleusercontent.com';

let cachedAccessToken: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
})();

let cachedUser: GoogleUser | null = (() => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
})();

const tokenListeners: Array<(token: string | null) => void> = [];
const userListeners: Array<(user: GoogleUser | null) => void> = [];

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

function setToken(token: string | null) {
  cachedAccessToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
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

export async function loginWithGoogle(): Promise<{ user: GoogleUser; accessToken: string }> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Configure o ID do cliente OAuth do Google na tela de Nuvem.');
  }

  await waitForGoogleIdentity();

  const token = await new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets',
      ].join(' '),
      callback: (response: any) => {
        if (response?.access_token) resolve(response.access_token);
        else reject(new Error(response?.error_description || 'Login Google cancelado ou não autorizado.'));
      },
      error_callback: (err: any) => reject(new Error(err?.message || 'Falha ao abrir o login Google.')),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });

  setToken(token);
  const user = await fetchGoogleUser(token);
  setUser(user);
  return { user, accessToken: token };
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
  if (!cachedAccessToken) return false;
  try {
    const user = await fetchGoogleUser(cachedAccessToken);
    setUser(user);
    return true;
  } catch {
    setToken(null);
    setUser(null);
    return false;
  }
}
