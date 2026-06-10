import { goBack, navigate } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../services/pets.js';
import {
  cancelVetLiveBooking,
  claimVetLiveBooking,
  createVetLiveBooking,
  getVetLiveBooking,
  getVetLiveLookups,
  getVetLiveQuote,
  listVetLiveBookings,
  requestVetLiveJoin,
  saveVetLiveNote,
  saveVetLiveSurvey
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

function currentPet() {
  const state = getState();
  return getActivePet(state.activePetId) || { id: state.activePetId, name: t('vetLive.active_pet') };
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
        <button class="btn btn-primary btn-full" id="btnVetBook">${window.__icons?.video} ${t('vetLive.book_cta')}</button>
        <button class="btn btn-secondary btn-full" id="btnVetBookings">${window.__icons?.calendar} ${t('vetLive.my_bookings')}</button>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h3 class="section-title">${t('vetLive.flow_title')}</h3>
      </div>
      <div class="vet-live-step-grid">
        ${['flow_ai', 'flow_booking', 'flow_room', 'flow_note'].map((key, index) => `
          <article class="vet-live-step">
            <span>${index + 1}</span>
            <strong>${t(`vetLive.${key}.title`)}</strong>
            <p>${t(`vetLive.${key}.desc`)}</p>
          </article>
        `).join('')}
      </div>
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
  return `
    <div class="vet-live-booking-card" data-vet-queue-card="${escapeHtml(booking.id)}">
      <div>
        <strong>${escapeHtml(booking.vet_name || t('vetLive.pool_request'))}</strong>
        <p>${formatDate(booking.scheduled_at)} · ${money(booking.price_cents, booking.currency)}</p>
        <p>${escapeHtml(booking.case_summary || t('vetLive.empty_case_summary'))}</p>
      </div>
      <div class="vet-live-card-actions">
        <span class="plan-pill">${statusLabel(booking.status)}</span>
        ${booking.vet_id ? '' : `<button class="btn btn-secondary btn-sm" data-claim-booking-id="${escapeHtml(booking.id)}">${t('vetLive.claim_booking')}</button>`}
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
        <button class="btn btn-primary btn-full" id="btnVetJoin">${window.__icons?.video} ${t('vetLive.join_room')}</button>
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
  return shell(`
    <section class="feature-form-hero gold">
      <div>
        <div class="premium-screen-kicker">${t('vetLive.vet_panel')}</div>
        <h1>${t('vetLive.vet_panel_title')}</h1>
        <p>${t('vetLive.vet_panel_desc')}</p>
      </div>
    </section>
    <section class="section">
      <div id="vetLiveVetQueue" class="vet-live-list">
        <div class="free-record-panel">${t('common.loading')}</div>
      </div>
    </section>
    <section class="feature-form-card">
      <h3>${t('vetLive.note_form_title')}</h3>
      <label class="feature-field">
        <span>${t('vetLive.booking_id_label')}</span>
        <input id="vetLiveNoteBookingId" placeholder="${t('vetLive.booking_id_placeholder')}" />
      </label>
      <label class="feature-field">
        <span>${t('vetLive.note_summary_label')}</span>
        <textarea id="vetLiveNoteSummary" rows="4"></textarea>
      </label>
      <label class="feature-field">
        <span>${t('vetLive.next_step_label')}</span>
        <input id="vetLiveNextStep" />
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
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnVetHome')?.addEventListener('click', () => navigate('/home'));
}

async function hydrateHome() {
  const state = getState();
  document.getElementById('btnVetBook')?.addEventListener('click', () => navigate('/vet-live/book'));
  document.getElementById('btnVetBookings')?.addEventListener('click', () => navigate('/vet-live'));
  document.getElementById('btnVetPanel')?.addEventListener('click', () => navigate('/vet-live/vet'));
  const target = document.getElementById('vetLiveRecent');
  try {
    const bookings = await listVetLiveBookings({ userId: state.user?.id || 'user-1', petId: state.activePetId });
    target.innerHTML = bookings.length
      ? bookings.map(bookingCard).join('')
      : `<div class="empty-state"><div class="empty-state-title">${t('vetLive.no_bookings')}</div><div class="empty-state-desc">${t('vetLive.no_bookings_desc')}</div></div>`;
    target.querySelectorAll('[data-booking-id]').forEach((button) => {
      button.addEventListener('click', () => navigate(`/vet-live/bookings/${button.dataset.bookingId}`));
    });
  } catch {
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
    frame.src = join.roomUrl;
    stateTarget.innerHTML = `
      <strong>${permission === 'denied' ? t('vetLive.permission_denied') : t('vetLive.room_ready')}</strong>
      <p>${join.provider === 'daily' ? t('vetLive.daily_ready') : t('vetLive.local_room_notice')}</p>
      <a class="btn btn-secondary btn-full mt-3" href="${escapeHtml(join.roomUrl)}" target="_blank" rel="noreferrer">${t('vetLive.open_room')}</a>
    `;
  } catch {
    stateTarget.innerHTML = `<strong>${t('vetLive.room_failed')}</strong><p>${t('vetLive.retry_later')}</p>`;
  }
}

async function hydrateVetPanel() {
  const queue = document.getElementById('vetLiveVetQueue');
  try {
    const vetId = getState().user?.vetProfileId;
    const bookings = await listVetLiveBookings({ vetId, includePool: '1', limit: 50 });
    queue.innerHTML = bookings.length
      ? bookings.map(vetQueueCard).join('')
      : `<div class="empty-state"><div class="empty-state-title">${t('vetLive.no_queue')}</div><div class="empty-state-desc">${t('vetLive.no_queue_desc')}</div></div>`;
    queue.querySelectorAll('[data-note-booking-id]').forEach((button) => {
      button.addEventListener('click', () => {
        document.getElementById('vetLiveNoteBookingId').value = button.dataset.noteBookingId;
      });
    });
    queue.querySelectorAll('[data-open-booking-id]').forEach((button) => {
      button.addEventListener('click', () => navigate(`/vet-live/bookings/${button.dataset.openBookingId}`));
    });
    queue.querySelectorAll('[data-claim-booking-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const vetId = getState().user?.vetProfileId;
          await claimVetLiveBooking(button.dataset.claimBookingId, { vetId });
          showToast(t('vetLive.claim_saved'));
          return hydrateVetPanel();
        } catch (error) {
          showToast(t('vetLive.claim_failed', { error: error.message || '' }));
        } finally {
          button.disabled = false;
        }
      });
    });
  } catch {
    queue.innerHTML = `<div class="free-record-panel">${t('vetLive.load_failed')}</div>`;
  }
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
