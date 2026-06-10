import { goBack, navigate } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../services/pets.js';
import {
  cancelVetLiveBooking,
  claimVetLiveBooking,
  createVetLiveBooking,
  getVetLiveBooking,
  getVetLiveLookups,
  getVetLiveProfile,
  getVetLiveQuote,
  listVetLiveBookings,
  requestVetLiveJoin,
  saveVetLiveProfile,
  saveVetLiveNote,
  saveVetLiveSurvey,
  changeVetLivePassword
} from '../../services/vetLive.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(cents = 0, currency = 'TRY') {
  if (currency === 'credit') return t('vetLive.credit_price', { count: Number(cents || 0) });
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) return t('vetLive.not_scheduled');
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function defaultDateTimeLocal() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function statusLabel(status) {
  return t(`vetLive.status.${status || 'requested'}`);
}

function isCompletedBooking(booking) {
  return ['completed', 'cancelled', 'refunded'].includes(booking.status);
}

function isScheduledLater(booking) {
  if (isCompletedBooking(booking)) return false;
  if (!booking.scheduled_at) return false;
  return new Date(booking.scheduled_at).getTime() > Date.now() + 30 * 60 * 1000;
}

function splitVetBookings(bookings = []) {
  const active = [];
  const scheduled = [];
  const history = [];
  bookings.forEach((booking) => {
    if (isCompletedBooking(booking)) history.push(booking);
    else if (isScheduledLater(booking)) scheduled.push(booking);
    else active.push(booking);
  });
  return { active, scheduled, history };
}

function specialtiesText(value) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value || '');
}

function currentPet() {
  const state = getState();
  return getActivePet(state.activePetId) || { id: state.activePetId, name: t('vetLive.active_pet') };
}

function roomUrlWithToken(roomUrl, token) {
  if (!token || !roomUrl) return roomUrl;
  try {
    const url = new URL(roomUrl);
    url.searchParams.set('t', token);
    return url.toString();
  } catch {
    const separator = String(roomUrl).includes('?') ? '&' : '?';
    return `${roomUrl}${separator}t=${encodeURIComponent(token)}`;
  }
}

function vetSpecialties(vet) {
  return escapeHtml((vet.specialties || []).slice(0, 2).join(', ') || t('vetLive.general_consultation'));
}

function shell(inner) {
  return `
    <div class="screen vet-live-screen">
      <div class="header">
        <button class="header-back" id="btnBack" aria-label="${t('common.back')}">${window.__icons?.back}</button>
        <div class="header-title">${t('vetLive.title')}</div>
        <button class="header-icon" id="btnVetHome" aria-label="${t('tabs.home')}">${window.__icons?.home}</button>
      </div>
      ${inner}
      <div style="height: 32px;"></div>
    </div>
  `;
}

function renderHome() {
  const state = getState();
  const pet = currentPet();
  const isVet = state.user?.accountRole === 'vet_live';
  return shell(`
    <section class="vet-live-hero">
      <div class="premium-screen-kicker">${t('vetLive.kicker')}</div>
      <h1>${t('vetLive.home_title')}</h1>
      <p>${t('vetLive.home_desc', { name: escapeHtml(pet.name) })}</p>
      <div class="vet-live-actions">
        <button class="btn btn-primary btn-full" id="btnVetQuickFocus">${window.__icons?.video} ${t('vetLive.quick_start_cta')}</button>
        <button class="btn btn-secondary btn-full" id="btnVetBookings">${window.__icons?.calendar} ${t('vetLive.my_bookings')}</button>
      </div>
    </section>

    <section class="feature-form-card vet-live-quick-card" id="vetLiveQuickCard">
      <div class="section-header">
        <h3 class="section-title">${t('vetLive.quick_title')}</h3>
      </div>
      <p class="text-sm text-secondary">${t('vetLive.quick_desc')}</p>
      <div class="vet-live-quote" id="vetLiveQuickQuote">${t('common.loading')}</div>
      <div class="vet-live-vet-list" id="vetLiveQuickVets">
        <div class="free-record-panel">${t('common.loading')}</div>
      </div>
      <label class="feature-field">
        <span>${t('vetLive.case_summary_label')}</span>
        <textarea id="vetLiveQuickSummary" rows="3" placeholder="${t('vetLive.quick_summary_placeholder')}"></textarea>
      </label>
      <label class="auth-checkbox">
        <input id="vetLiveQuickConsent" type="checkbox" />
        <span>${t('vetLive.legal_consent_label')}</span>
      </label>
      <button class="btn btn-primary btn-full" id="btnVetQuickStart">${window.__icons?.video} ${t('vetLive.quick_start_cta')}</button>
      <button class="btn btn-secondary btn-full mt-2" id="btnVetBook">${t('vetLive.schedule_later_cta')}</button>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">${t('vetLive.recent_title')}</h3>
        ${isVet ? `<button class="btn btn-secondary btn-sm" id="btnVetPanel">${t('vetLive.vet_panel')}</button>` : ''}
      </div>
      <div id="vetLiveRecent" class="vet-live-list">
        <div class="free-record-panel">${t('common.loading')}</div>
      </div>
    </section>
  `);
}

function renderBookingForm() {
  const pet = currentPet();
  return shell(`
    <section class="feature-form-hero teal">
      <div>
        <div class="premium-screen-kicker">${t('vetLive.book_kicker')}</div>
        <h1>${t('vetLive.book_title')}</h1>
        <p>${t('vetLive.book_desc', { name: escapeHtml(pet.name) })}</p>
      </div>
    </section>

    <section class="feature-form-card">
      <div id="vetLiveLookupState" class="text-sm text-secondary">${t('common.loading')}</div>
      <label class="feature-field">
        <span>${t('vetLive.vet_label')}</span>
        <select id="vetLiveVetSelect" disabled></select>
      </label>
      <label class="feature-field">
        <span>${t('vetLive.schedule_label')}</span>
        <input type="datetime-local" id="vetLiveScheduledAt" value="${defaultDateTimeLocal()}" />
      </label>
      <label class="feature-field">
        <span>${t('vetLive.case_summary_label')}</span>
        <textarea id="vetLiveCaseSummary" rows="4" placeholder="${t('vetLive.case_summary_placeholder')}"></textarea>
      </label>
      <label class="feature-field">
        <span>${t('vetLive.red_flags_label')}</span>
        <textarea id="vetLiveRedFlags" rows="3" placeholder="${t('vetLive.red_flags_placeholder')}"></textarea>
      </label>
      <div class="vet-live-quote" id="vetLiveQuote">${t('common.loading')}</div>
      <p class="text-xs text-secondary mt-2">${t('vetLive.duration_warning')}</p>
      <label class="auth-checkbox">
        <input id="vetLiveLegalConsent" type="checkbox" />
        <span>${t('vetLive.legal_consent_label')}</span>
      </label>
      <button class="btn btn-primary btn-full" id="btnCreateVetBooking">${t('vetLive.create_booking')}</button>
      <p class="text-xs text-tertiary mt-3">${t('vetLive.disclaimer')}</p>
    </section>
  `);
}

function bookingCard(booking) {
  return `
    <button class="vet-live-booking-card" data-booking-id="${escapeHtml(booking.id)}">
      <div>
        <strong>${escapeHtml(booking.vet_name || t('vetLive.default_vet'))}</strong>
        <p>${formatDate(booking.scheduled_at)} · ${money(booking.price_cents, booking.currency)}</p>
      </div>
      <span class="plan-pill">${statusLabel(booking.status)}</span>
    </button>
  `;
}

function vetQueueCard(booking) {
  const canStart = !isCompletedBooking(booking);
  const hasNote = Array.isArray(booking.notes) && booking.notes.length > 0;
  return `
    <div class="vet-live-booking-card" data-vet-queue-card="${escapeHtml(booking.id)}">
      <div>
        <strong>${escapeHtml(booking.vet_name || t('vetLive.pool_request'))}</strong>
        <p>${formatDate(booking.scheduled_at)} · ${money(booking.price_cents, booking.currency)}</p>
        <p>${escapeHtml(booking.case_summary || t('vetLive.empty_case_summary'))}</p>
        <p class="text-xs text-tertiary">${booking.joined_owner_at ? t('vetLive.owner_joined') : t('vetLive.owner_waiting')} · ${booking.joined_vet_at ? t('vetLive.vet_joined') : t('vetLive.vet_waiting')}${hasNote ? ` · ${t('vetLive.note_added')}` : ''}</p>
      </div>
      <div class="vet-live-card-actions">
        <span class="plan-pill">${statusLabel(booking.status)}</span>
        ${booking.vet_id ? '' : `<button class="btn btn-secondary btn-sm" data-claim-booking-id="${escapeHtml(booking.id)}">${t('vetLive.claim_booking')}</button>`}
        ${canStart ? `<button class="btn btn-primary btn-sm" data-start-booking-id="${escapeHtml(booking.id)}">${t('vetLive.start_consultation')}</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-open-booking-id="${escapeHtml(booking.id)}">${t('vetLive.open_detail')}</button>
        <button class="btn btn-primary btn-sm" data-note-booking-id="${escapeHtml(booking.id)}">${t('vetLive.select_for_note')}</button>
      </div>
    </div>
  `;
}

function renderDetail() {
  return shell(`
    <section id="vetLiveDetail" class="vet-live-detail">
      <div class="free-record-panel">${t('common.loading')}</div>
    </section>
  `);
}

function detailHtml(booking) {
  const note = booking.notes?.[0];
  const state = getState();
  const surveyRole = state.user?.accountRole === 'vet_live' ? 'vet' : 'owner';
  const survey = (booking.surveys || []).find((item) => item.reviewer_role === surveyRole);
  const canCancel = !['completed', 'refunded', 'cancelled'].includes(booking.status) && !(booking.joined_owner_at && booking.joined_vet_at);
  return `
    <section class="feature-form-hero slate">
      <div>
        <div class="premium-screen-kicker">${statusLabel(booking.status)}</div>
        <h1>${escapeHtml(booking.vet_name || t('vetLive.default_vet'))}</h1>
        <p>${formatDate(booking.scheduled_at)} · ${money(booking.price_cents, booking.currency)}</p>
      </div>
    </section>
    <section class="feature-form-card">
      <h3>${t('vetLive.case_summary_label')}</h3>
      <p>${escapeHtml(booking.case_summary || t('vetLive.empty_case_summary'))}</p>
      ${booking.red_flags?.length ? `<p class="text-xs text-secondary mt-2">${t('vetLive.red_flags_label')}: ${booking.red_flags.map(escapeHtml).join(', ')}</p>` : ''}
      <p class="text-xs text-secondary mt-2">${t('vetLive.credit_hold_label')}: ${escapeHtml(t(`vetLive.hold_status.${booking.credit_hold_status || 'held'}`))}</p>
      <div class="vet-live-actions mt-4">
        ${canCancel ? `<button class="btn btn-secondary btn-full" id="btnVetCancel">${t('vetLive.cancel_booking')}</button>` : ''}
        <button class="btn btn-primary btn-full" id="btnVetJoin">${window.__icons?.video} ${t('vetLive.start_consultation')}</button>
      </div>
      <p class="text-xs text-tertiary mt-3">${t('vetLive.duration_warning')}</p>
    </section>
    <section class="feature-form-card">
      <h3>${t('vetLive.note_title')}</h3>
      ${note ? `
        <div class="vet-live-note">
          <strong>${statusLabel('completed')}</strong>
          <p>${escapeHtml(note.summary)}</p>
          <small>${escapeHtml(note.next_step || '')}</small>
        </div>
      ` : `<p class="text-sm text-secondary">${t('vetLive.no_note')}</p>`}
    </section>
    ${booking.status === 'completed' ? `
      <section class="feature-form-card">
        <h3>${surveyRole === 'vet' ? t('vetLive.vet_survey_title') : t('vetLive.owner_survey_title')}</h3>
        ${survey ? `<p class="text-sm text-secondary">${t('vetLive.survey_saved')} (${escapeHtml(survey.rating)}/5)</p>` : `
          <label class="feature-field">
            <span>${t('vetLive.survey_rating_label')}</span>
            <select id="vetLiveSurveyRating">
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </label>
          <label class="feature-field">
            <span>${surveyRole === 'vet' ? t('vetLive.vet_survey_feedback') : t('vetLive.owner_survey_feedback')}</span>
            <textarea id="vetLiveSurveyFeedback" rows="3"></textarea>
          </label>
          <button class="btn btn-primary btn-full" id="btnSaveVetSurvey">${t('vetLive.save_survey')}</button>
        `}
      </section>
    ` : ''}
  `;
}

function renderRoom() {
  return shell(`
    <section class="vet-live-room">
      <div class="premium-screen-kicker">${t('vetLive.room_kicker')}</div>
      <h1>${t('vetLive.room_title')}</h1>
      <p>${t('vetLive.room_desc')}</p>
      <div id="vetLiveRoomState" class="vet-live-room-state">${t('common.loading')}</div>
      <iframe id="vetLiveRoomFrame" class="vet-live-room-frame" title="${t('vetLive.room_title')}" allow="camera; microphone; fullscreen; speaker; display-capture"></iframe>
    </section>
  `);
}

function renderVetPanel() {
  const user = getState().user || {};
  return shell(`
    <section class="feature-form-hero gold">
      <div>
        <div class="premium-screen-kicker">${t('vetLive.vet_panel')}</div>
        <h1>${t('vetLive.vet_panel_title')}</h1>
        <p>${t('vetLive.vet_panel_desc')}</p>
      </div>
    </section>
    <section class="vet-live-vet-summary">
      <div><strong id="vetLiveActiveCount">0</strong><span>${t('vetLive.tab_active')}</span></div>
      <div><strong id="vetLiveScheduledCount">0</strong><span>${t('vetLive.tab_scheduled')}</span></div>
      <div><strong id="vetLiveHistoryCount">0</strong><span>${t('vetLive.tab_history')}</span></div>
    </section>
    <section class="vet-live-tabs" aria-label="${t('vetLive.vet_panel')}">
      <button class="active" data-vet-tab="active">${t('vetLive.tab_active')}</button>
      <button data-vet-tab="scheduled">${t('vetLive.tab_scheduled')}</button>
      <button data-vet-tab="history">${t('vetLive.tab_history')}</button>
      <button data-vet-tab="profile">${t('vetLive.tab_profile')}</button>
    </section>
    <section class="section">
      <div class="section-header">
        <h3 class="section-title" id="vetLivePanelTitle">${t('vetLive.active_requests_title')}</h3>
        <button class="btn btn-secondary btn-sm" id="btnVetRefresh">${t('vetLive.refresh')}</button>
      </div>
      <div class="vet-live-panel-section" data-vet-panel-section="active">
        <div id="vetLiveActiveList" class="vet-live-list">
          <div class="free-record-panel">${t('common.loading')}</div>
        </div>
      </div>
      <div class="vet-live-panel-section" data-vet-panel-section="scheduled" hidden>
        <div id="vetLiveScheduledList" class="vet-live-list">
          <div class="free-record-panel">${t('common.loading')}</div>
        </div>
      </div>
      <div class="vet-live-panel-section" data-vet-panel-section="history" hidden>
        <div id="vetLiveHistoryList" class="vet-live-list">
          <div class="free-record-panel">${t('common.loading')}</div>
        </div>
      </div>
    </section>
    <section class="vet-live-panel-section" data-vet-panel-section="profile" hidden>
      <section class="feature-form-card">
        <h3>${t('vetLive.profile_title')}</h3>
        <p class="text-sm text-secondary">${t('vetLive.profile_desc')}</p>
        <label class="feature-field">
          <span>${t('vetLive.display_name_label')}</span>
          <input id="vetLiveProfileName" value="${escapeHtml(user.name || '')}" />
        </label>
        <label class="feature-field">
          <span>${t('vetLive.license_no_label')}</span>
          <input id="vetLiveProfileLicense" />
        </label>
        <label class="feature-field">
          <span>${t('vetLive.specialties_label')}</span>
          <input id="vetLiveProfileSpecialties" placeholder="${t('vetLive.specialties_placeholder')}" />
        </label>
        <label class="feature-field">
          <span>${t('vetLive.bio_label')}</span>
          <textarea id="vetLiveProfileBio" rows="3"></textarea>
        </label>
        <label class="feature-field">
          <span>${t('vetLive.email_label')}</span>
          <input id="vetLiveProfileEmail" type="email" value="${escapeHtml(user.email || '')}" />
        </label>
        <label class="feature-field">
          <span>${t('vetLive.phone_label')}</span>
          <input id="vetLiveProfilePhone" inputmode="tel" value="${escapeHtml(user.phone || '')}" />
        </label>
        <label class="feature-field">
          <span>${t('vetLive.timezone_label')}</span>
          <input id="vetLiveProfileTimezone" value="${escapeHtml(user.timezone || 'Europe/Istanbul')}" />
        </label>
        <label class="auth-checkbox">
          <input id="vetLiveProfileActive" type="checkbox" checked />
          <span>${t('vetLive.available_label')}</span>
        </label>
        <button class="btn btn-primary btn-full" id="btnSaveVetProfile">${t('vetLive.save_profile')}</button>
      </section>
      <section class="feature-form-card">
        <h3>${t('vetLive.password_title')}</h3>
        <label class="feature-field">
          <span>${t('vetLive.current_password_label')}</span>
          <input id="vetLiveCurrentPassword" type="password" autocomplete="current-password" />
        </label>
        <label class="feature-field">
          <span>${t('vetLive.new_password_label')}</span>
          <input id="vetLiveNewPassword" type="password" autocomplete="new-password" />
        </label>
        <label class="feature-field">
          <span>${t('vetLive.confirm_password_label')}</span>
          <input id="vetLiveConfirmPassword" type="password" autocomplete="new-password" />
        </label>
        <button class="btn btn-secondary btn-full" id="btnChangeVetPassword">${t('vetLive.change_password')}</button>
      </section>
    </section>
    <section class="feature-form-card" id="vetLiveNotePanel">
      <h3>${t('vetLive.note_form_title')}</h3>
      <p class="text-sm text-secondary">${t('vetLive.note_form_desc')}</p>
      <label class="feature-field">
        <span>${t('vetLive.booking_id_label')}</span>
        <input id="vetLiveNoteBookingId" placeholder="${t('vetLive.booking_id_placeholder')}" />
      </label>
      <label class="feature-field">
        <span>${t('vetLive.note_summary_label')}</span>
        <textarea id="vetLiveNoteSummary" rows="4" placeholder="${t('vetLive.note_summary_placeholder')}"></textarea>
      </label>
      <label class="feature-field">
        <span>${t('vetLive.next_step_label')}</span>
        <input id="vetLiveNextStep" placeholder="${t('vetLive.next_step_placeholder')}" />
      </label>
      <label class="auth-checkbox">
        <input id="vetLiveClinicVisit" type="checkbox" />
        <span>${t('vetLive.clinic_visit_recommended')}</span>
      </label>
      <button class="btn btn-primary btn-full" id="btnSaveVetNote">${t('vetLive.save_note')}</button>
    </section>
  `);
}

export function render(params = {}) {
  const path = (window.location.hash || '#/vet-live').replace('#', '').split('?')[0];
  if (path === '/vet-live/book') return renderBookingForm();
  if (path.startsWith('/vet-live/bookings/')) return renderDetail(params);
  if (path.startsWith('/vet-live/room/')) return renderRoom(params);
  if (path === '/vet-live/vet') return renderVetPanel();
  return renderHome();
}

function bindShell() {
  const isVet = getState().user?.accountRole === 'vet_live';
  document.getElementById('btnBack')?.addEventListener('click', () => {
    if (!isVet) {
      goBack();
      return;
    }
    const path = (window.location.hash || '').replace('#', '').split('?')[0];
    if (path === '/vet-live/vet') return;
    navigate('/vet-live/vet');
  });
  document.getElementById('btnVetHome')?.addEventListener('click', () => navigate(isVet ? '/vet-live/vet' : '/home'));
}

async function hydrateHome() {
  const state = getState();
  const quickCard = document.getElementById('vetLiveQuickCard');
  const quickQuote = document.getElementById('vetLiveQuickQuote');
  const quickVets = document.getElementById('vetLiveQuickVets');
  document.getElementById('btnVetBook')?.addEventListener('click', () => navigate('/vet-live/book'));
  document.getElementById('btnVetQuickFocus')?.addEventListener('click', () => quickCard?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  document.getElementById('btnVetBookings')?.addEventListener('click', () => navigate('/vet-live'));
  document.getElementById('btnVetPanel')?.addEventListener('click', () => navigate('/vet-live/vet'));
  const target = document.getElementById('vetLiveRecent');
  let quote = { durationMinutes: 15, priceCents: 8, currency: 'credit' };
  let vets = [];
  const setQuickButtonsDisabled = (disabled) => {
    document.querySelectorAll('[data-quick-vet-id], #btnVetQuickStart').forEach((button) => {
      button.disabled = disabled;
    });
  };
  const quickCreate = async (vetId = '') => {
    const summary = document.getElementById('vetLiveQuickSummary')?.value.trim();
    if (!summary) {
      showToast(t('vetLive.summary_required'));
      return;
    }
    if (!document.getElementById('vetLiveQuickConsent')?.checked) {
      showToast(t('vetLive.legal_consent_required'));
      return;
    }
    setQuickButtonsDisabled(true);
    try {
      const booking = await createVetLiveBooking({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId,
        vetId,
        scheduledAt: new Date().toISOString(),
        durationMinutes: quote.durationMinutes,
        priceCents: quote.priceCents,
        currency: quote.currency,
        caseSummary: summary,
        redFlags: [],
        legalConsentAccepted: true
      });
      showToast(t('vetLive.booking_created'));
      navigate(booking.vet_id ? `/vet-live/room/${booking.id}` : `/vet-live/bookings/${booking.id}`);
    } catch (error) {
      showToast(String(error.message || '').includes('insufficient_credits') ? t('vetLive.insufficient_credits') : t('vetLive.booking_failed', { error: error.message || '' }));
    } finally {
      setQuickButtonsDisabled(false);
    }
  };
  document.getElementById('btnVetQuickStart')?.addEventListener('click', () => quickCreate(vets[0]?.id || ''));
  try {
    const [bookings, lookups, quoteResult] = await Promise.all([
      listVetLiveBookings({ userId: state.user?.id || 'user-1', petId: state.activePetId }),
      getVetLiveLookups(),
      getVetLiveQuote({ durationMinutes: 15 })
    ]);
    vets = lookups.vets || [];
    quote = quoteResult || quote;
    quickQuote.textContent = t('vetLive.quote_text', { price: money(quote.priceCents, quote.currency), duration: quote.durationMinutes });
    quickVets.innerHTML = vets.length
      ? vets.map((vet) => `
        <button class="vet-live-vet-option" data-quick-vet-id="${escapeHtml(vet.id)}">
          <span>
            <strong>${escapeHtml(vet.display_name)}</strong>
            <small>${vetSpecialties(vet)}</small>
          </span>
          <em>${t('vetLive.active_now')}</em>
        </button>
      `).join('')
      : `<div class="empty-state"><div class="empty-state-title">${t('vetLive.no_active_vets')}</div><div class="empty-state-desc">${t('vetLive.pool_request_desc')}</div></div>`;
    quickVets.querySelectorAll('[data-quick-vet-id]').forEach((button) => {
      button.addEventListener('click', () => quickCreate(button.dataset.quickVetId || ''));
    });
    target.innerHTML = bookings.length
      ? bookings.map(bookingCard).join('')
      : `<div class="empty-state"><div class="empty-state-title">${t('vetLive.no_bookings')}</div><div class="empty-state-desc">${t('vetLive.no_bookings_desc')}</div></div>`;
    target.querySelectorAll('[data-booking-id]').forEach((button) => {
      button.addEventListener('click', () => navigate(`/vet-live/bookings/${button.dataset.bookingId}`));
    });
  } catch {
    quickQuote.textContent = t('vetLive.quote_failed');
    quickVets.innerHTML = `<div class="free-record-panel">${t('vetLive.lookup_failed')}</div>`;
    target.innerHTML = `<div class="free-record-panel">${t('vetLive.load_failed')}</div>`;
  }
}

async function hydrateBookingForm() {
  const state = getState();
  const lookupState = document.getElementById('vetLiveLookupState');
  const vetSelect = document.getElementById('vetLiveVetSelect');
  const quoteTarget = document.getElementById('vetLiveQuote');
  try {
    const [lookups, quote] = await Promise.all([getVetLiveLookups(), getVetLiveQuote({ durationMinutes: 15 })]);
    const vets = lookups.vets || [];
    vetSelect.innerHTML = [
      `<option value="">${t('vetLive.first_available_vet')}</option>`,
      ...vets.map((vet) => `<option value="${escapeHtml(vet.id)}">${escapeHtml(vet.display_name)} - ${escapeHtml((vet.specialties || []).slice(0, 2).join(', '))}</option>`)
    ].join('');
    vetSelect.disabled = false;
    lookupState.textContent = vets.length ? t('vetLive.lookup_ready') : t('vetLive.no_active_vets');
    quoteTarget.textContent = t('vetLive.quote_text', { price: money(quote.priceCents, quote.currency), duration: quote.durationMinutes });
    document.getElementById('btnCreateVetBooking')?.addEventListener('click', async () => {
      const summary = document.getElementById('vetLiveCaseSummary')?.value.trim();
      if (!summary) {
        showToast(t('vetLive.summary_required'));
        return;
      }
      if (!document.getElementById('vetLiveLegalConsent')?.checked) {
        showToast(t('vetLive.legal_consent_required'));
        return;
      }
      const button = document.getElementById('btnCreateVetBooking');
      button.disabled = true;
      button.textContent = t('common.saving');
      try {
        const booking = await createVetLiveBooking({
          userId: state.user?.id || 'user-1',
          petId: state.activePetId,
          vetId: vetSelect.value,
          scheduledAt: document.getElementById('vetLiveScheduledAt')?.value,
          durationMinutes: quote.durationMinutes,
          priceCents: quote.priceCents,
          currency: quote.currency,
          caseSummary: summary,
          redFlags: String(document.getElementById('vetLiveRedFlags')?.value || '').split('\n').map((item) => item.trim()).filter(Boolean),
          legalConsentAccepted: true
        });
        showToast(t('vetLive.booking_created'));
        navigate(`/vet-live/bookings/${booking.id}`);
      } catch (error) {
        showToast(String(error.message || '').includes('insufficient_credits') ? t('vetLive.insufficient_credits') : t('vetLive.booking_failed', { error: error.message || '' }));
      } finally {
        button.disabled = false;
        button.textContent = t('vetLive.create_booking');
      }
    });
  } catch {
    lookupState.textContent = t('vetLive.lookup_failed');
    quoteTarget.textContent = t('vetLive.quote_failed');
  }
}

async function hydrateDetail(params) {
  const target = document.getElementById('vetLiveDetail');
  try {
    const booking = await getVetLiveBooking(params.bookingId);
    if (!booking) {
      target.innerHTML = `<div class="free-record-panel">${t('vetLive.booking_not_found')}</div>`;
      return;
    }
    target.innerHTML = detailHtml(booking);
    document.getElementById('btnVetCancel')?.addEventListener('click', async () => {
      try {
        await cancelVetLiveBooking(booking.id);
        showToast(t('vetLive.booking_cancelled'));
        navigate(`/vet-live/bookings/${booking.id}?ts=${Date.now()}`);
      } catch (error) {
        showToast(t('vetLive.cancel_failed', { error: error.message || '' }));
      }
    });
    document.getElementById('btnVetJoin')?.addEventListener('click', () => navigate(`/vet-live/room/${booking.id}`));
    document.getElementById('btnSaveVetSurvey')?.addEventListener('click', async () => {
      try {
        const state = getState();
        const role = state.user?.accountRole === 'vet_live' ? 'vet' : 'owner';
        await saveVetLiveSurvey(booking.id, {
          role,
          userId: state.user?.id || null,
          vetId: state.user?.vetProfileId || booking.vet_id || null,
          rating: document.getElementById('vetLiveSurveyRating')?.value,
          feedback: document.getElementById('vetLiveSurveyFeedback')?.value.trim()
        });
        showToast(t('vetLive.survey_saved'));
        navigate(`/vet-live/bookings/${booking.id}?ts=${Date.now()}`);
      } catch (error) {
        showToast(t('vetLive.survey_failed', { error: error.message || '' }));
      }
    });
  } catch {
    target.innerHTML = `<div class="free-record-panel">${t('vetLive.load_failed')}</div>`;
  }
}

async function hydrateRoom(params) {
  const stateTarget = document.getElementById('vetLiveRoomState');
  const frame = document.getElementById('vetLiveRoomFrame');
  try {
    let permission = 'unknown';
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((track) => track.stop());
        permission = 'granted';
      } catch {
        permission = 'denied';
      }
    }
    const state = getState();
    const role = state.user?.accountRole === 'vet_live' ? 'vet' : 'owner';
    const join = await requestVetLiveJoin(params.bookingId, role, { vetId: state.user?.vetProfileId });
    const meetingUrl = roomUrlWithToken(join.roomUrl, join.token);
    frame.src = meetingUrl;
    stateTarget.innerHTML = `
      <strong>${permission === 'denied' ? t('vetLive.permission_denied') : t('vetLive.room_ready')}</strong>
      <p>${join.provider === 'daily' ? t('vetLive.daily_ready') : t('vetLive.local_room_notice')}</p>
      <a class="btn btn-secondary btn-full mt-3" href="${escapeHtml(meetingUrl)}" target="_blank" rel="noreferrer">${t('vetLive.open_room')}</a>
    `;
  } catch {
    stateTarget.innerHTML = `<strong>${t('vetLive.room_failed')}</strong><p>${t('vetLive.retry_later')}</p>`;
  }
}

async function hydrateVetPanel() {
  const state = getState();
  const vetId = state.user?.vetProfileId;
  const userId = state.user?.id;
  const titles = {
    active: t('vetLive.active_requests_title'),
    scheduled: t('vetLive.scheduled_requests_title'),
    history: t('vetLive.history_title'),
    profile: t('vetLive.profile_title')
  };
  const setTab = (tab = 'active') => {
    document.querySelectorAll('[data-vet-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.vetTab === tab);
    });
    document.querySelectorAll('[data-vet-panel-section]').forEach((section) => {
      section.hidden = section.dataset.vetPanelSection !== tab;
    });
    const title = document.getElementById('vetLivePanelTitle');
    if (title) title.textContent = titles[tab] || titles.active;
    document.getElementById('vetLiveNotePanel')?.toggleAttribute('hidden', tab === 'profile');
  };
  const bindBookingActions = () => {
    document.querySelectorAll('[data-note-booking-id]').forEach((button) => {
      button.addEventListener('click', () => {
        document.getElementById('vetLiveNoteBookingId').value = button.dataset.noteBookingId;
        document.getElementById('vetLiveNoteSummary')?.focus();
        document.getElementById('vetLiveNoteBookingId')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    document.querySelectorAll('[data-start-booking-id]').forEach((button) => {
      button.addEventListener('click', () => navigate(`/vet-live/room/${button.dataset.startBookingId}`));
    });
    document.querySelectorAll('[data-open-booking-id]').forEach((button) => {
      button.addEventListener('click', () => navigate(`/vet-live/bookings/${button.dataset.openBookingId}`));
    });
    document.querySelectorAll('[data-claim-booking-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await claimVetLiveBooking(button.dataset.claimBookingId, { vetId });
          showToast(t('vetLive.claim_saved'));
          await loadBookings();
        } catch (error) {
          showToast(t('vetLive.claim_failed', { error: error.message || '' }));
        } finally {
          button.disabled = false;
        }
      });
    });
  };
  const empty = (title, desc) => `<div class="empty-state"><div class="empty-state-title">${title}</div><div class="empty-state-desc">${desc}</div></div>`;
  const renderList = (elementId, list, title, desc) => {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.innerHTML = list.length ? list.map(vetQueueCard).join('') : empty(title, desc);
  };
  async function loadBookings() {
    try {
      const bookings = await listVetLiveBookings({ vetId, includePool: '1', limit: 100 });
      const grouped = splitVetBookings(bookings);
      document.getElementById('vetLiveActiveCount').textContent = grouped.active.length;
      document.getElementById('vetLiveScheduledCount').textContent = grouped.scheduled.length;
      document.getElementById('vetLiveHistoryCount').textContent = grouped.history.length;
      renderList('vetLiveActiveList', grouped.active, t('vetLive.no_active_requests'), t('vetLive.no_active_requests_desc'));
      renderList('vetLiveScheduledList', grouped.scheduled, t('vetLive.no_scheduled_requests'), t('vetLive.no_scheduled_requests_desc'));
      renderList('vetLiveHistoryList', grouped.history, t('vetLive.no_history'), t('vetLive.no_history_desc'));
      bindBookingActions();
    } catch {
      ['vetLiveActiveList', 'vetLiveScheduledList', 'vetLiveHistoryList'].forEach((id) => {
        const target = document.getElementById(id);
        if (target) target.innerHTML = `<div class="free-record-panel">${t('vetLive.load_failed')}</div>`;
      });
    }
  }
  document.querySelectorAll('[data-vet-tab]').forEach((button) => {
    button.addEventListener('click', () => setTab(button.dataset.vetTab));
  });
  document.getElementById('btnVetRefresh')?.addEventListener('click', loadBookings);
  try {
    const profile = await getVetLiveProfile({ vetId, userId });
    document.getElementById('vetLiveProfileName').value = profile?.display_name || state.user?.name || '';
    document.getElementById('vetLiveProfileLicense').value = profile?.license_no || '';
    document.getElementById('vetLiveProfileSpecialties').value = specialtiesText(profile?.specialties);
    document.getElementById('vetLiveProfileBio').value = profile?.bio || '';
    document.getElementById('vetLiveProfileEmail').value = profile?.email || state.user?.email || '';
    document.getElementById('vetLiveProfilePhone').value = profile?.phone || state.user?.phone || '';
    document.getElementById('vetLiveProfileTimezone').value = profile?.timezone || state.user?.timezone || 'Europe/Istanbul';
    document.getElementById('vetLiveProfileActive').checked = profile?.is_active !== 0;
  } catch {}
  document.getElementById('btnSaveVetProfile')?.addEventListener('click', async () => {
    const button = document.getElementById('btnSaveVetProfile');
    button.disabled = true;
    try {
      await saveVetLiveProfile({
        vetId,
        userId,
        displayName: document.getElementById('vetLiveProfileName')?.value.trim(),
        licenseNo: document.getElementById('vetLiveProfileLicense')?.value.trim(),
        specialties: document.getElementById('vetLiveProfileSpecialties')?.value.trim(),
        bio: document.getElementById('vetLiveProfileBio')?.value.trim(),
        email: document.getElementById('vetLiveProfileEmail')?.value.trim(),
        phone: document.getElementById('vetLiveProfilePhone')?.value.trim(),
        timezone: document.getElementById('vetLiveProfileTimezone')?.value.trim(),
        isActive: document.getElementById('vetLiveProfileActive')?.checked
      });
      showToast(t('vetLive.profile_saved'));
    } catch (error) {
      showToast(t('vetLive.profile_failed', { error: error.message || '' }));
    } finally {
      button.disabled = false;
    }
  });
  document.getElementById('btnChangeVetPassword')?.addEventListener('click', async () => {
    const currentPassword = document.getElementById('vetLiveCurrentPassword')?.value || '';
    const newPassword = document.getElementById('vetLiveNewPassword')?.value || '';
    const confirmPassword = document.getElementById('vetLiveConfirmPassword')?.value || '';
    if (!currentPassword || !newPassword) {
      showToast(t('vetLive.password_required'));
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('vetLive.password_mismatch'));
      return;
    }
    try {
      await changeVetLivePassword({ vetId, userId, currentPassword, newPassword });
      document.getElementById('vetLiveCurrentPassword').value = '';
      document.getElementById('vetLiveNewPassword').value = '';
      document.getElementById('vetLiveConfirmPassword').value = '';
      showToast(t('vetLive.password_saved'));
    } catch (error) {
      showToast(t('vetLive.password_failed', { error: error.message || '' }));
    }
  });
  setTab('active');
  await loadBookings();
  document.getElementById('btnSaveVetNote')?.addEventListener('click', async () => {
    const bookingId = document.getElementById('vetLiveNoteBookingId')?.value.trim();
    const summary = document.getElementById('vetLiveNoteSummary')?.value.trim();
    if (!bookingId || !summary) {
      showToast(t('vetLive.note_required'));
      return;
    }
    try {
      await saveVetLiveNote(bookingId, {
        vetId: getState().user?.vetProfileId || null,
        summary,
        nextStep: document.getElementById('vetLiveNextStep')?.value.trim(),
        clinicVisitRecommended: document.getElementById('vetLiveClinicVisit')?.checked,
        urgencyLevel: 'routine'
      });
      showToast(t('vetLive.note_saved'));
      navigate(`/vet-live/bookings/${bookingId}`);
    } catch (error) {
      showToast(t('vetLive.note_failed', { error: error.message || '' }));
    }
  });
}

export function afterRender(params = {}) {
  bindShell();
  const path = (window.location.hash || '#/vet-live').replace('#', '').split('?')[0];
  if (path === '/vet-live/book') return hydrateBookingForm();
  if (path.startsWith('/vet-live/bookings/')) return hydrateDetail(params);
  if (path.startsWith('/vet-live/room/')) return hydrateRoom(params);
  if (path === '/vet-live/vet') return hydrateVetPanel();
  return hydrateHome();
}
