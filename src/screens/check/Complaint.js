import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getActivePet } from '../../services/pets.js';
import {
  getSymptomChips,
  classifyComplaint,
  getCompatibleComplaintLabels,
  getComplaintTypeByLabel,
  getIncompatibleComplaintLabels
} from '../../data/questions.js';
import { showToast } from '../../ui/toast.js';

let activeRecognition = null;

function secondaryChipsHtml(primaryComplaintLabel, selected = []) {
  if (!primaryComplaintLabel) return '';
  const compatibleLabels = getCompatibleComplaintLabels(primaryComplaintLabel);
  return compatibleLabels
    .filter(label => label !== primaryComplaintLabel)
    .map(chip => {
      const isSelected = selected.includes(chip);
      return `<button class="chip ${isSelected ? 'selected' : ''}" type="button" data-secondary-complaint="${chip}">${chip}</button>`;
    }).join('');
}

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId) || { name: 'pet' };
  const session = state.session || {};
  const symptomChips = getSymptomChips();
  const primaryComplaintLabel = session.primaryComplaintLabel || session.selectedChips?.[0] || '';

  const primaryChipsHtml = symptomChips.map(chip => {
    const isSelected = primaryComplaintLabel === chip;
    return `<button class="chip ${isSelected ? 'selected' : ''}" type="button" data-primary-complaint="${chip}">${chip}</button>`;
  }).join('');

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('check.title')}</div>
        <div class="header-right"></div>
      </div>

      <div class="section pt-4" style="padding-bottom: 120px;">
        <div class="premium-screen-kicker mb-2">${t('complaintScreen.kicker')}</div>
        <h2 class="text-xl font-bold mb-2">${t('check.whats_wrong').replace('{name}', pet.name)}</h2>
        <p class="text-sm text-secondary mb-4">${t('complaintScreen.desc')}</p>

        <div class="card mb-4">
          <div class="form-group" style="margin-bottom: 0;">
            <textarea id="complaintInput" class="complaint-textarea" placeholder="${t('check.placeholder')}" style="background: rgba(255, 255, 255, 0.35); border: 1.5px solid rgba(226, 232, 240, 0.5);">${session.complaintText || ''}</textarea>
            <div class="mt-2 flex" style="justify-content: flex-end;">
              <button class="voice-btn" id="btnVoice" style="border-radius: var(--radius-full); display: flex; align-items: center; gap: 6px; padding: 6px 14px; font-weight: 600;">
                <span style="width: 16px; height: 16px; display: inline-flex; align-items: center;">${window.__icons?.mic}</span> ${t('check.voice')}
              </button>
            </div>
          </div>
        </div>

        <div class="divider" style="margin: 24px 0 16px 0;">
          <span class="divider-text" style="font-weight: 600; color: var(--text-tertiary);">${t('complaintScreen.primary')}</span>
        </div>

        <div class="card mb-4" style="padding: 16px;">
          <div class="chip-group" id="chipGroup">
            ${primaryChipsHtml}
          </div>
        </div>

        <div class="card mb-4 ${primaryComplaintLabel ? '' : 'hidden'}" style="padding: 16px;" id="secondaryComplaintCard">
          <div class="text-xs font-bold text-tertiary mb-3" style="text-transform: uppercase; letter-spacing: .05em;">${t('complaintScreen.related')}</div>
          <div class="chip-group" id="secondaryChipGroup">
            ${secondaryChipsHtml(primaryComplaintLabel, session.selectedChips || [])}
          </div>
          <div class="text-xs text-tertiary mt-3">${t('complaintScreen.related_limit')}</div>
        </div>

        <div class="info-box info" style="background: var(--primary-50); border-color: var(--primary-100);">
          <span class="info-box-icon" style="width: 18px; display: inline-flex;">${window.__icons?.shield}</span>
          <span>${t('complaintScreen.info')}</span>
        </div>
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.86); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full mb-3" id="btnContinue" style="padding: 14px; font-size: var(--font-size-md); border-radius: var(--radius-lg);">${t('check.continue')}</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnCancel">${t('check.cancel')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  const pet = getActivePet(state.activePetId) || { name: 'pet' };

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnCancel')?.addEventListener('click', () => goBack());

  function bindSecondaryChips() {
    document.querySelectorAll('[data-secondary-complaint]').forEach(chip => {
      chip.addEventListener('click', e => {
        const value = e.currentTarget.dataset.secondaryComplaint;
        const primary = getState().session.primaryComplaintLabel;
        const incompatible = getIncompatibleComplaintLabels(primary);
        if (incompatible.includes(value)) {
          showToast(t('complaintScreen.incompatible'));
          return;
        }
        const selected = Array.from(document.querySelectorAll('#secondaryChipGroup .chip.selected')).map(c => c.dataset.secondaryComplaint);
        if (!e.currentTarget.classList.contains('selected') && selected.length >= 3) {
          showToast(t('complaintScreen.max_related'));
          return;
        }
        e.currentTarget.classList.toggle('selected');
      });
    });
  }

  document.querySelectorAll('[data-primary-complaint]').forEach(chip => {
    chip.addEventListener('click', e => {
      const value = e.currentTarget.dataset.primaryComplaint;
      setState(current => {
        current.session.primaryComplaintLabel = value;
        current.session.primaryComplaintId = getComplaintTypeByLabel(value)?.id || null;
        current.session.selectedChips = [value];
      });
      document.querySelectorAll('[data-primary-complaint]').forEach(item => item.classList.toggle('selected', item === e.currentTarget));
      const secondaryCard = document.getElementById('secondaryComplaintCard');
      const secondaryGroup = document.getElementById('secondaryChipGroup');
      if (secondaryCard) secondaryCard.classList.remove('hidden');
      if (secondaryGroup) {
        secondaryGroup.innerHTML = secondaryChipsHtml(value, [value]);
        bindSecondaryChips();
      }
    });
  });

  bindSecondaryChips();

  document.getElementById('btnVoice')?.addEventListener('click', () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const textarea = document.getElementById('complaintInput');
    const button = document.getElementById('btnVoice');
    if (!SpeechRecognition || !textarea) {
      showToast(t('complaintScreen.voice_not_ready'));
      return;
    }

    if (activeRecognition) {
      activeRecognition.stop();
      activeRecognition = null;
      return;
    }

    const recognition = new SpeechRecognition();
    const initialText = textarea.value.trim();
    activeRecognition = recognition;
    recognition.lang = 'tr-TR';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => {
      button?.classList.add('listening');
      showToast(t('complaintScreen.listening'));
    };
    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript || '')
        .join(' ')
        .trim();
      textarea.value = [initialText, transcript].filter(Boolean).join(initialText && transcript ? ' ' : '');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };
    recognition.onerror = () => showToast(t('complaintScreen.voice_error'));
    recognition.onend = () => {
      activeRecognition = null;
      button?.classList.remove('listening');
    };
    recognition.start();
  });

  document.getElementById('btnContinue')?.addEventListener('click', () => {
    const complaintText = document.getElementById('complaintInput').value.trim();
    const primaryComplaint = document.querySelector('[data-primary-complaint].selected')?.dataset.primaryComplaint || '';
    const secondaryChips = Array.from(document.querySelectorAll('#secondaryChipGroup .chip.selected')).map(c => c.dataset.secondaryComplaint);
    const selectedChips = [primaryComplaint, ...secondaryChips].filter(Boolean);

    if (!complaintText && selectedChips.length === 0) {
      showToast(t('complaintScreen.required'));
      return;
    }

    if (secondaryChips.length > 3) {
      showToast(t('complaintScreen.max_related'));
      return;
    }

    const classification = classifyComplaint(selectedChips, complaintText, state.deviceMode, pet);

    setState(current => {
      current.session.complaintText = complaintText;
      current.session.selectedChips = selectedChips;
      current.session.primaryComplaintId = classification.primaryComplaintId || getComplaintTypeByLabel(primaryComplaint)?.id || null;
      current.session.primaryComplaintLabel = classification.primaryComplaintLabel || primaryComplaint;
      current.session.duration = null;
      current.session.severity = null;
      current.session.primaryCategories = classification.primaryCategories || [];
      current.session.secondaryCategories = classification.secondaryCategories || [];
      current.session.categories = [...(classification.primaryCategories || []), ...(classification.secondaryCategories || [])];
      current.session.questionSetIds = classification.questionSetIds || [];
      current.session.initialQuestionSetIds = classification.questionSetIds || [];
      current.session.tasks = classification.suggestedTasks || [];
      current.session.redFlagGroups = classification.redFlagGroups || ['general'];
      current.session.triageWarnings = classification.triageWarnings || [];
      current.session.petRiskContext = classification.petRiskContext || null;
      current.session.matchedComplaintIds = classification.matchedComplaintIds || [];
      current.session.classifierConfidence = classification.confidence;
      current.session.classifierReasons = classification.classifierReasons || {};
    });

    navigate('/check/new/history');
  });
}
