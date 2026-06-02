import { getPetById } from './mock/pets.js';
import { translateForLocale } from './i18n/tr.js';

function readUserProfile() {
  try {
    return JSON.parse(localStorage.getItem('pati_user_profile') || '{}');
  } catch {
    return {};
  }
}

function readFollowups() {
  try {
    return JSON.parse(localStorage.getItem('pati_followups') || '[]');
  } catch {
    return [];
  }
}

function persistFollowups() {
  try {
    localStorage.setItem('pati_followups', JSON.stringify((state.followups || []).slice(0, 50)));
  } catch {}
}

const storedUser = readUserProfile();

const state = {
  version: 'v3.0',
  user: {
    id: storedUser.id || 'user-1',
    name: storedUser.name || translateForLocale('tr', 'userDefaults.seed_name'),
    email: storedUser.email || 'ayse@email.com',
    phone: storedUser.phone || '',
    locale: storedUser.locale || 'tr',
    timezone: storedUser.timezone || 'Europe/Istanbul',
    location: storedUser.location || { country: translateForLocale('tr', 'userDefaults.country'), province: '', district: '', neighborhood: '' },
    notificationPreference: storedUser.notificationPreference || 'push',
    isLoggedIn: true
  },
  subscription: {
    tier: 'free', // 'free' | 'pro'
    maxPets: 1,   // free = 1, pro = 10
  },
  activePetId: localStorage.getItem('pati_active_pet') || null,
  deviceMode: localStorage.getItem('pati_device_mode') || 'phone_only', // phone_only | basic_kit
  currentSession: null,
  followups: readFollowups(),
  // Active session data
  session: {
    id: null,
    petId: null,
    complaintText: '',
    selectedChips: [],
    duration: null,
    severity: null,
    categories: [],
    secondaryCategories: [],
    redFlagAnswers: {},
    questionAnswers: {},
    tasks: [],
    measurements: [],
    media: [],
    riskLevel: null,
    riskScore: null,
    status: 'draft'
  }
};

const VERSION = 'v2.3'; // Logic engine and dynamic trigger version
const listeners = [];

export function getState() {
  return state;
}

export function setState(updater) {
  if (typeof updater === 'function') {
    updater(state);
  } else {
    Object.assign(state, updater);
  }
  persistFollowups();
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function resetSession() {
  state.session = {
    id: 'session-' + Date.now(),
    petId: state.activePetId,
    complaintText: '',
    selectedChips: [],
    duration: null,
    severity: null,
    categories: [],
    secondaryCategories: [],
    redFlagAnswers: {},
    questionAnswers: {},
    tasks: [],
    measurements: [],
    media: [],
    riskLevel: null,
    riskScore: null,
    status: 'active'
  };
}

export function getActivePet() {
  return getPetById(state.activePetId);
}

// Data Isolation Getters
export function getActivePetFollowups() {
  if (!state.activePetId) return [];
  return state.followups.filter(f => f.petId === state.activePetId);
}

export function setActivePet(petId) {
  state.activePetId = petId;
  localStorage.setItem('pati_active_pet', petId);
  resetSession(); // Ensure old data is wiped
  setState(state);
}

export function logoutPet() {
  state.activePetId = null;
  localStorage.removeItem('pati_active_pet');
  resetSession();
  setState(state);
}

