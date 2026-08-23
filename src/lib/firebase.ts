import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { Appointment, Client, Quote } from '../types';
import { AppSettings } from '../utils/storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Use custom Firestore database ID if provided
const configWithDb = firebaseConfigData as { firestoreDatabaseId?: string };
const firestoreDbId = configWithDb.firestoreDatabaseId && configWithDb.firestoreDatabaseId !== '(default)'
  ? configWithDb.firestoreDatabaseId
  : undefined;

export const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: 'Maiconautomacaosc@gmail.com',
});
SCOPES.forEach(scope => {
  googleProvider.addScope(scope);
});

const TOKEN_STORAGE_KEY = 'maicon_google_cal_access_token';

// In-memory access token cache for Google Workspace APIs
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();
const tokenListeners: Array<(token: string | null) => void> = [];

export function subscribeGoogleToken(listener: (token: string | null) => void): () => void {
  tokenListeners.push(listener);
  listener(cachedAccessToken);
  return () => {
    const idx = tokenListeners.indexOf(listener);
    if (idx !== -1) tokenListeners.splice(idx, 1);
  };
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Could not save google token:', err);
  }
  tokenListeners.forEach(fn => {
    try {
      fn(token);
    } catch (e) {
      console.warn('Error in token listener:', e);
    }
  });
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

// Authentication helpers
export async function loginWithGoogle(): Promise<{ user: User; accessToken?: string } | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedAccessToken(credential.accessToken);
    }
    return { user: result.user, accessToken: credential?.accessToken };
  } catch (error: any) {
    console.warn('Popup login failed, attempting redirect fallback:', error);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr) {
        console.error('Redirect login failed:', redirectErr);
        throw redirectErr;
      }
    }
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return res.user;
  } catch (err: any) {
    if (
      err.code === 'auth/user-not-found' || 
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-login-credentials'
    ) {
      // Auto-register if new account for this email
      try {
        const reg = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        return reg.user;
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error('Senha incorreta para esta conta. Verifique sua senha.');
        }
        throw createErr;
      }
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  setCachedAccessToken(null);
  await signOut(auth);
}

// Check redirect result on load
export async function checkRedirectAuth(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
      }
      return result.user;
    }
    return null;
  } catch {
    return null;
  }
}

// Firestore Database Sync Service
export interface FirestoreSyncCallbacks {
  onAppointmentsUpdate: (appointments: Appointment[]) => void;
  onClientsUpdate: (clients: Client[]) => void;
  onQuotesUpdate: (quotes: Quote[]) => void;
  onSettingsUpdate: (settings: AppSettings) => void;
  onSyncStatusChange: (status: 'synced' | 'syncing' | 'offline' | 'error', errorMsg?: string) => void;
}

export class CloudSyncManager {
  private user: User | null = null;
  private unsubscribers: Unsubscribe[] = [];
  private callbacks: FirestoreSyncCallbacks | null = null;

  public init(callbacks: FirestoreSyncCallbacks) {
    this.callbacks = callbacks;
    
    // Listen for auth state
    onAuthStateChanged(auth, async (currentUser) => {
      this.user = currentUser;
      this.clearListeners();

      if (currentUser) {
        this.callbacks?.onSyncStatusChange('syncing');
        await this.setupRealtimeListeners(currentUser.uid);
      } else {
        this.callbacks?.onSyncStatusChange('offline');
      }
    });
  }

  private clearListeners() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  private async setupRealtimeListeners(userId: string) {
    try {
      // 1. Appointments listener
      const apptsCol = collection(db, 'appointments');
      const qAppts = query(apptsCol, where('userId', '==', userId));
      
      const unsubAppts = onSnapshot(qAppts, (snapshot) => {
        const appts: Appointment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Appointment;
          appts.push({ ...data, id: doc.id });
        });
        
        // Sort by date & time descending
        appts.sort((a, b) => {
          const dateComp = (b.date || '').localeCompare(a.date || '');
          if (dateComp !== 0) return dateComp;
          return (b.startTime || '').localeCompare(a.startTime || '');
        });

        this.callbacks?.onAppointmentsUpdate(appts);
        this.callbacks?.onSyncStatusChange('synced');
      }, (err) => {
        console.error('Error in appointments snapshot:', err);
        this.callbacks?.onSyncStatusChange('error', 'Falha ao sincronizar agendamentos');
      });
      this.unsubscribers.push(unsubAppts);

      // 2. Clients listener
      const clientsCol = collection(db, 'clients');
      const qClients = query(clientsCol, where('userId', '==', userId));
      
      const unsubClients = onSnapshot(qClients, (snapshot) => {
        const clients: Client[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Client;
          clients.push({ ...data, id: doc.id });
        });
        clients.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        this.callbacks?.onClientsUpdate(clients);
      }, (err) => {
        console.error('Error in clients snapshot:', err);
      });
      this.unsubscribers.push(unsubClients);

      // 3. Quotes listener
      const quotesCol = collection(db, 'quotes');
      const qQuotes = query(quotesCol, where('userId', '==', userId));
      
      const unsubQuotes = onSnapshot(qQuotes, (snapshot) => {
        const quotes: Quote[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as Quote;
          quotes.push({ ...data, id: doc.id });
        });
        quotes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        this.callbacks?.onQuotesUpdate(quotes);
      }, (err) => {
        console.error('Error in quotes snapshot:', err);
      });
      this.unsubscribers.push(unsubQuotes);

      // 4. Settings listener
      const settingsDocRef = doc(db, 'settings', userId);
      const unsubSettings = onSnapshot(settingsDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as AppSettings;
          this.callbacks?.onSettingsUpdate(data);
        }
      }, (err) => {
        console.error('Error in settings snapshot:', err);
      });
      this.unsubscribers.push(unsubSettings);

      // Update user doc
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        email: this.user?.email || '',
        displayName: this.user?.displayName || 'Maicon Automação',
        photoURL: this.user?.photoURL || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (err) {
      console.error('Error setting up cloud listeners:', err);
      this.callbacks?.onSyncStatusChange('error', 'Erro de conexão na nuvem');
    }
  }

  // Cloud Write Methods
  public async saveAppointmentCloud(appt: Appointment): Promise<void> {
    if (!this.user) return;
    try {
      const docRef = doc(db, 'appointments', appt.id);
      await setDoc(docRef, {
        ...appt,
        userId: this.user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Error saving appointment to Firestore:', err);
    }
  }

  public async deleteAppointmentCloud(apptId: string): Promise<void> {
    if (!this.user) return;
    try {
      const docRef = doc(db, 'appointments', apptId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting appointment from Firestore:', err);
    }
  }

  public async saveClientCloud(client: Client): Promise<void> {
    if (!this.user) return;
    try {
      const docRef = doc(db, 'clients', client.id);
      await setDoc(docRef, {
        ...client,
        userId: this.user.uid,
      }, { merge: true });
    } catch (err) {
      console.error('Error saving client to Firestore:', err);
    }
  }

  public async deleteClientCloud(clientId: string): Promise<void> {
    if (!this.user) return;
    try {
      const docRef = doc(db, 'clients', clientId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting client from Firestore:', err);
    }
  }

  public async saveQuoteCloud(quote: Quote): Promise<void> {
    if (!this.user) return;
    try {
      const docRef = doc(db, 'quotes', quote.id);
      await setDoc(docRef, {
        ...quote,
        userId: this.user.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Error saving quote to Firestore:', err);
    }
  }

  public async deleteQuoteCloud(quoteId: string): Promise<void> {
    if (!this.user) return;
    try {
      const docRef = doc(db, 'quotes', quoteId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting quote from Firestore:', err);
    }
  }

  public async saveSettingsCloud(settings: AppSettings): Promise<void> {
    if (!this.user) return;
    try {
      const docRef = doc(db, 'settings', this.user.uid);
      await setDoc(docRef, {
        ...settings,
        userId: this.user.uid,
      }, { merge: true });
    } catch (err) {
      console.error('Error saving settings to Firestore:', err);
    }
  }

  // Initial Sync from LocalStorage to Cloud when User logs in
  public async uploadLocalDataToCloud(
    localClients: Client[], 
    localAppts: Appointment[], 
    localQuotes: Quote[], 
    localSettings: AppSettings
  ): Promise<void> {
    if (!this.user) return;
    try {
      const userId = this.user.uid;
      const batch = writeBatch(db);

      // Check if user already has data in cloud
      const qAppts = query(collection(db, 'appointments'), where('userId', '==', userId));
      const existingAppts = await getDocs(qAppts);

      if (existingAppts.empty && localAppts.length > 0) {
        // Upload initial appointments
        localAppts.forEach((appt) => {
          const ref = doc(db, 'appointments', appt.id);
          batch.set(ref, { ...appt, userId }, { merge: true });
        });

        // Upload initial clients
        localClients.forEach((cli) => {
          const ref = doc(db, 'clients', cli.id);
          batch.set(ref, { ...cli, userId }, { merge: true });
        });

        // Upload initial quotes
        localQuotes.forEach((qt) => {
          const ref = doc(db, 'quotes', qt.id);
          batch.set(ref, { ...qt, userId }, { merge: true });
        });

        // Upload settings
        const setRef = doc(db, 'settings', userId);
        batch.set(setRef, { ...localSettings, userId }, { merge: true });

        await batch.commit();
        console.log('Local data successfully migrated to Cloud Firestore');
      }
    } catch (err) {
      console.error('Error migrating local data to cloud:', err);
    }
  }
}

export const cloudSync = new CloudSyncManager();
