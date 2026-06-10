import { getApiJson, postApiJson } from './apiClient.js';
import { saveLocalUserProfile } from './users.js';
import { translateForLocale } from '../i18n/tr.js';

const STORAGE_BOOKINGS = 'pati_vet_live_bookings';
const STORAGE_NOTES = 'pati_vet_live_notes';
const STORAGE_SURVEYS = 'pati_vet_live_surveys';
const STORAGE_PROFILES = 'pati_vet_live_profiles';
const LOCAL_WALLET_KEY = 'pati_credit_wallets';

const demoVet = {
  id: 'vet-demo-1',
  display_name: 'Dr. Deniz Kara',
  license_no: 'VET-TEST-001',
  specialties: ['genel danisma', 'acil on degerlendirme', 'kedi/kopek'],
  bio: 'Canli gorusme pilot akislari icin test veterineri.',
  status: 'approved',
  rating_avg: 4.8
};
const demoVet2 = {
  id: 'vet-demo-2',
  display_name: 'Dr. Ece Arslan',
  license_no: 'VET-TEST-002',
  specialties: ['beslenme', 'davranis', 'genel danisma'],
  bio: 'Canli gorusme pilot akislari icin ikinci test veterineri.',
  status: 'approved',
  rating_avg: 4.7
};

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeList(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function localWalletBalance(userId = 'user-1') {
  const wallets = JSON.parse(localStorage.getItem(LOCAL_WALLET_KEY) || '{}');
  if (typeof wallets[userId] !== 'number') {
    wallets[userId] = 1;
    localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(wallets));
  }
  return wallets[userId];
}

function setLocalWalletBalance(userId = 'user-1', balance = 0) {
  const wallets = JSON.parse(localStorage.getItem(LOCAL_WALLET_KEY) || '{}');
  wallets[userId] = Math.max(0, Number(balance || 0));
  localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(wallets));
  return wallets[userId];
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseDate(value) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : nowIso();
}

function attachNotes(booking) {
  const notes = readList(STORAGE_NOTES).filter((note) => note.booking_id === booking.id);
  const surveys = readList(STORAGE_SURVEYS).filter((survey) => survey.booking_id === booking.id);
  return { ...booking, notes, surveys };
}

function localBookings(filter = {}) {
  return readList(STORAGE_BOOKINGS)
    .filter((booking) => !filter.userId || booking.user_id === filter.userId)
    .filter((booking) => !filter.petId || booking.pet_id === filter.petId)
    .filter((booking) => !filter.vetId || booking.vet_id === filter.vetId || (filter.includePool && !booking.vet_id))
    .sort((a, b) => String(b.scheduled_at || b.created_at).localeCompare(String(a.scheduled_at || a.created_at)))
    .map(attachNotes);
}

function localVetProfile(input = {}) {
  const profiles = readList(STORAGE_PROFILES);
  const profile = profiles.find((item) => item.id === input.vetId || item.user_id === input.userId);
  const fallback = input.vetId === demoVet2.id || input.userId === 'user-vet-2' ? demoVet2 : demoVet;
  return profile || {
    ...fallback,
    user_id: input.userId || (fallback.id === demoVet2.id ? 'user-vet-2' : 'user-vet-1'),
    email: fallback.id === demoVet2.id ? 'vet2@vet.com' : 'vet1@vet.com',
    phone: '',
    timezone: 'Europe/Istanbul',
    is_active: 1
  };
}

function saveLocalVetProfile(input = {}) {
  const current = localVetProfile(input);
  const next = {
    ...current,
    display_name: input.displayName || input.display_name || current.display_name,
    license_no: input.licenseNo || input.license_no || current.license_no || '',
    specialties: Array.isArray(input.specialties)
      ? input.specialties
      : String(input.specialties || current.specialties?.join?.(', ') || '').split(',').map((item) => item.trim()).filter(Boolean),
    bio: input.bio ?? current.bio ?? '',
    is_active: input.isActive === false || input.isActive === 0 ? 0 : 1,
    email: input.email ?? current.email ?? '',
    phone: input.phone ?? current.phone ?? '',
    timezone: input.timezone || current.timezone || 'Europe/Istanbul',
    updated_at: nowIso()
  };
  const profiles = readList(STORAGE_PROFILES).filter((item) => item.id !== next.id && item.user_id !== next.user_id);
  writeList(STORAGE_PROFILES, [next, ...profiles]);
  saveLocalUserProfile({
    id: next.user_id,
    name: next.display_name,
    email: next.email,
    phone: next.phone,
    accountRole: 'vet_live',
    vetProfileId: next.id,
    timezone: next.timezone
  });
  return next;
}

function saveLocalBooking(booking) {
  const list = readList(STORAGE_BOOKINGS);
  const next = list.filter((item) => item.id !== booking.id);
  next.unshift(booking);
  writeList(STORAGE_BOOKINGS, next);
  return attachNotes(booking);
}

function appendHealthRecordFromNote({ booking, note }) {
  const records = readList('pati_form_submissions');
  records.unshift({
    id: note.id,
    user_id: booking.user_id,
    pet_id: booking.pet_id,
    feature_code: 'vet_consultation',
    locale: 'tr',
    status: 'saved',
    payload: {
      [translateForLocale('tr', 'formLabels.followup_subject')]: translateForLocale('tr', 'vetLive.health_record_title'),
      [translateForLocale('tr', 'freeRecords.note')]: note.summary,
      __vet_live_booking_id: booking.id,
      __urgency_level: note.urgency_level,
      __next_step: note.next_step
    },
    created_at: note.created_at,
    updated_at: note.updated_at
  });
  writeList('pati_form_submissions', records);
}

export async function getVetLiveLookups() {
  try {
    const result = await getApiJson('/api/vet-live/vets');
    return result.data;
  } catch {
    return {
      vets: [demoVet, demoVet2],
      availability: [1, 2, 3, 4, 5].flatMap((weekday) => [{
        id: `local-vet-slot-${weekday}`,
        vet_id: demoVet.id,
        weekday,
        starts_at: '10:00',
        ends_at: '18:00',
        timezone: 'Europe/Istanbul',
        is_active: 1
      }, {
        id: `local-vet-slot-2-${weekday}`,
        vet_id: demoVet2.id,
        weekday,
        starts_at: '12:00',
        ends_at: '20:00',
        timezone: 'Europe/Istanbul',
        is_active: 1
      }])
    };
  }
}

export async function getVetLiveQuote(input = {}) {
  try {
    const result = await postApiJson('/api/vet-live/quote', input);
    return result.data;
  } catch {
    return {
      durationMinutes: Number(input.durationMinutes || 15),
      priceCents: 8,
      currency: 'credit',
      provider: 'local_fallback'
    };
  }
}

export async function getVetLiveProfile(input = {}) {
  try {
    const query = new URLSearchParams();
    if (input.vetId) query.set('vetId', input.vetId);
    if (input.userId) query.set('userId', input.userId);
    const result = await getApiJson(`/api/vet-live/profile?${query.toString()}`);
    return result.data?.profile || null;
  } catch {
    return localVetProfile(input);
  }
}

export async function saveVetLiveProfile(input = {}) {
  try {
    const result = await postApiJson('/api/vet-live/profile', input);
    const profile = result.data?.profile;
    if (profile) {
      saveLocalUserProfile({
        id: profile.user_id || input.userId,
        name: profile.display_name,
        email: profile.email,
        phone: profile.phone,
        accountRole: 'vet_live',
        vetProfileId: profile.id,
        timezone: profile.timezone
      });
    }
    return profile;
  } catch (error) {
    if (error.message !== 'network_error') throw error;
    return saveLocalVetProfile(input);
  }
}

export async function changeVetLivePassword(input = {}) {
  try {
    const result = await postApiJson('/api/vet-live/profile/password', input);
    return result.data || { ok: true };
  } catch (error) {
    if (error.message !== 'network_error') throw error;
    if (!String(input.newPassword || '').trim()) throw new Error('password_required');
    return { ok: true, provider: 'local_fallback' };
  }
}

export async function listVetLiveBookings(filter = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const result = await getApiJson(`/api/vet-live/bookings?${query.toString()}`);
    return result.data?.bookings || [];
  } catch {
    return localBookings(filter);
  }
}

export async function getVetLiveBooking(bookingId) {
  try {
    const result = await getApiJson(`/api/vet-live/bookings/${encodeURIComponent(bookingId)}`);
    return result.data?.booking || null;
  } catch {
    return localBookings().find((booking) => booking.id === bookingId) || null;
  }
}

export async function createVetLiveBooking(input) {
  try {
    const result = await postApiJson('/api/vet-live/bookings', input);
    return result.data?.booking;
  } catch {
    if (!input.legalConsentAccepted) throw new Error('legal_consent_required');
    const quote = await getVetLiveQuote(input);
    const cost = Math.max(1, Number(quote.priceCents || 8));
    const balance = localWalletBalance(input.userId);
    if (balance < cost) throw new Error('insufficient_credits');
    setLocalWalletBalance(input.userId, balance - cost);
    const selectedVet = input.vetId === demoVet2.id ? demoVet2 : input.vetId ? demoVet : null;
    return saveLocalBooking({
      id: id('vet-booking'),
      user_id: input.userId,
      pet_id: input.petId,
      vet_id: selectedVet?.id || null,
      vet_name: selectedVet?.display_name || '',
      status: selectedVet ? 'credit_held' : 'requested',
      scheduled_at: parseDate(input.scheduledAt),
      duration_minutes: quote.durationMinutes,
      price_cents: quote.priceCents,
      currency: quote.currency,
      payment_id: null,
      credit_hold_id: id('vet-hold'),
      credit_hold_status: 'held',
      credit_hold_amount: cost,
      daily_room_name: null,
      daily_room_url: null,
      joined_owner_at: null,
      joined_vet_at: null,
      case_summary: input.caseSummary || '',
      red_flags: Array.isArray(input.redFlags) ? input.redFlags : [],
      metadata: {
        source: 'local_fallback',
        paymentMode: 'credit_hold',
        legalConsentAccepted: true,
        legalConsentAcceptedAt: nowIso()
      },
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
}

export async function claimVetLiveBooking(bookingId, input = {}) {
  if (!input.vetId) throw new Error('vet_required');
  try {
    const result = await postApiJson(`/api/vet-live/bookings/${encodeURIComponent(bookingId)}/claim`, input);
    return result.data?.booking;
  } catch (error) {
    if (error.message !== 'network_error') throw error;
    const booking = await getVetLiveBooking(bookingId);
    if (!booking) throw new Error('vet_booking_not_found');
    if (['completed', 'cancelled', 'refunded'].includes(booking.status)) throw new Error('booking_not_claimable');
    if (booking.vet_id && booking.vet_id !== input.vetId) throw new Error('booking_already_assigned');
    const selectedVet = input.vetId === demoVet2.id ? demoVet2 : demoVet;
    return saveLocalBooking({
      ...booking,
      vet_id: booking.vet_id || input.vetId || selectedVet.id,
      vet_name: booking.vet_name || selectedVet.display_name,
      status: booking.status === 'requested' ? 'credit_held' : booking.status,
      updated_at: nowIso()
    });
  }
}

export async function markVetLivePaid(bookingId) {
  try {
    const result = await postApiJson(`/api/vet-live/bookings/${encodeURIComponent(bookingId)}/pay`, {});
    return result.data?.booking;
  } catch {
    throw new Error('payment_replaced_by_credit_hold');
  }
}

export async function cancelVetLiveBooking(bookingId) {
  try {
    const result = await postApiJson(`/api/vet-live/bookings/${encodeURIComponent(bookingId)}/cancel`, {});
    return result.data?.booking;
  } catch {
    const booking = await getVetLiveBooking(bookingId);
    if (!booking) throw new Error('vet_booking_not_found');
    if (booking.status === 'completed' || (booking.joined_owner_at && booking.joined_vet_at)) throw new Error('booking_already_started');
    if (booking.credit_hold_status === 'held') {
      const balance = localWalletBalance(booking.user_id);
      setLocalWalletBalance(booking.user_id, balance + Math.max(1, Number(booking.credit_hold_amount || booking.price_cents || 8)));
    }
    return saveLocalBooking({ ...booking, status: 'refunded', credit_hold_status: 'released', updated_at: nowIso() });
  }
}

export async function requestVetLiveJoin(bookingId, role = 'owner', options = {}) {
  try {
    const result = await postApiJson(`/api/vet-live/bookings/${encodeURIComponent(bookingId)}/join-token`, { role, vetId: options.vetId || null });
    return result.data;
  } catch {
    const booking = await getVetLiveBooking(bookingId);
    if (!booking) throw new Error('vet_booking_not_found');
    const roomName = booking.daily_room_name || `pethelp-${booking.id}`;
    const roomUrl = booking.daily_room_url || `https://pethelp.daily.co/${roomName}`;
    const joinedOwnerAt = role === 'owner' && !booking.joined_owner_at ? nowIso() : booking.joined_owner_at;
    const joinedVetAt = role === 'vet' && !booking.joined_vet_at ? nowIso() : booking.joined_vet_at;
    const bothJoined = Boolean(joinedOwnerAt && joinedVetAt);
    saveLocalBooking({
      ...booking,
      status: booking.status === 'completed' ? booking.status : 'live',
      daily_room_name: roomName,
      daily_room_url: roomUrl,
      joined_owner_at: joinedOwnerAt,
      joined_vet_at: joinedVetAt,
      credit_hold_status: bothJoined && booking.credit_hold_status === 'held' ? 'captured' : booking.credit_hold_status,
      updated_at: nowIso()
    });
    return { roomName, roomUrl, token: `local-${booking.id}-${role}`, provider: 'local_fallback' };
  }
}

export async function saveVetLiveNote(bookingId, input) {
  try {
    const result = await postApiJson(`/api/vet-live/bookings/${encodeURIComponent(bookingId)}/notes`, input);
    return result.data?.booking;
  } catch {
    const booking = await getVetLiveBooking(bookingId);
    if (!booking) throw new Error('vet_booking_not_found');
    const note = {
      id: id('vet-note'),
      booking_id: bookingId,
      vet_id: input.vetId || booking.vet_id || demoVet.id,
      summary: input.summary,
      urgency_level: input.urgencyLevel || 'routine',
      next_step: input.nextStep || '',
      followup_at: input.followupAt || null,
      clinic_visit_recommended: Boolean(input.clinicVisitRecommended),
      created_at: nowIso(),
      updated_at: nowIso()
    };
    writeList(STORAGE_NOTES, [note, ...readList(STORAGE_NOTES)]);
    const completed = saveLocalBooking({ ...booking, status: 'completed', credit_hold_status: 'captured', updated_at: nowIso() });
    appendHealthRecordFromNote({ booking: completed, note });
    return attachNotes(completed);
  }
}

export async function saveVetLiveSurvey(bookingId, input = {}) {
  try {
    const result = await postApiJson(`/api/vet-live/bookings/${encodeURIComponent(bookingId)}/survey`, input);
    return result.data?.booking;
  } catch {
    const booking = await getVetLiveBooking(bookingId);
    if (!booking) throw new Error('vet_booking_not_found');
    if (booking.status !== 'completed') throw new Error('booking_not_completed');
    const role = input.role === 'vet' ? 'vet' : 'owner';
    const rating = Math.max(1, Math.min(5, Math.trunc(Number(input.rating || 0))));
    if (!rating) throw new Error('rating_required');
    const existing = readList(STORAGE_SURVEYS).filter((survey) => !(survey.booking_id === bookingId && survey.reviewer_role === role));
    const survey = {
      id: id('vet-survey'),
      booking_id: bookingId,
      reviewer_role: role,
      reviewer_user_id: role === 'owner' ? booking.user_id : input.userId || null,
      reviewed_user_id: role === 'vet' ? booking.user_id : null,
      vet_id: booking.vet_id || input.vetId || null,
      rating,
      feedback: input.feedback || '',
      tags: Array.isArray(input.tags) ? input.tags : [],
      metadata: { source: 'local_fallback' },
      created_at: nowIso(),
      updated_at: nowIso()
    };
    writeList(STORAGE_SURVEYS, [survey, ...existing]);
    return attachNotes(booking);
  }
}
