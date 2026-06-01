// Pati Sağlık — Add Measurement Screen
import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getActivePet } from '../../mock/pets.js';
import { saveMeasurement } from '../../services/measurements.js';

const MEASUREMENT_TYPES = [
  { id: 'weight', label: t('history.weight'), iconKey: 'weight', unit: 'kg', placeholder: '28.5', min: 0, max: 200, step: 0.1 },
  { id: 'temperature', label: t('history.temperature'), iconKey: 'thermometer', unit: '°C', placeholder: '38.5', min: 35, max: 42, step: 0.1 },
  { id: 'respiratory', label: t('history.respiratory'), iconKey: 'lungs', unit: '/dk', placeholder: '20', min: 0, max: 100, step: 1 },
  { id: 'heart_rate', label: 'Nabız', iconKey: 'heartPulse', unit: 'bpm', placeholder: '80', min: 0, max: 300, step: 1 },
  { id: 'urine_ph', label: 'İdrar pH', iconKey: 'activity', unit: 'pH', placeholder: '6.5', min: 0, max: 14, step: 0.1 },
  { id: 'other', label: t('history.other'), iconKey: 'measurement', unit: '', placeholder: '0', min: 0, max: 9999, step: 0.1 }
];

function measureIcon(iconKey) {
  return `<span class="modern-inline-icon">${window.__icons?.[iconKey] || window.__icons?.measurement || ''}</span>`;
}

export function render(params = {}, query = {}) {
  const state = getState();
  const pet = getActivePet(state.activePetId);
  const selectedType = query.type || 'weight';
  const typeInfo = MEASUREMENT_TYPES.find(t => t.id === selectedType) || MEASUREMENT_TYPES[0];

  const today = new Date().toISOString().split('T')[0];

  return `
    <div class="screen">
      <div class="header">
        <div class="header-left">
          <button class="header-back" id="backBtn">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('history.add_new')}</div>
        <div class="header-right"></div>
      </div>

      <div class="screen-padded">
        <!-- Pet Info -->
        <div class="flex items-center gap-3 mb-4" style="animation: slideUp 0.2s ease;">
          <div class="avatar-sm modern-pet-avatar">${window.__icons?.paw}</div>
          <div>
            <span class="font-semibold">${pet.name}</span>
            <span class="text-sm text-tertiary"> · ${pet.breed}</span>
          </div>
        </div>

        <!-- Type Selection -->
        <div class="section" style="animation: slideUp 0.3s ease;">
          <label>Ölçüm Türü</label>
          <div class="chip-group">
            ${MEASUREMENT_TYPES.map(type => `
              <button class="chip ${selectedType === type.id ? 'selected' : ''}" data-mtype="${type.id}">
                ${measureIcon(type.iconKey)} ${type.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Value Input -->
        <div class="card card-gradient text-center mb-4" style="animation: slideUp 0.4s ease; padding: var(--space-8) var(--space-4);">
          <div class="text-sm text-tertiary mb-3 modern-title-icon">${window.__icons?.[typeInfo.iconKey] || window.__icons?.measurement} ${typeInfo.label}</div>
          <div class="measurement-value-input" style="justify-content: center;">
            <input
              type="number"
              id="valueInput"
              placeholder="${typeInfo.placeholder}"
              min="${typeInfo.min}"
              max="${typeInfo.max}"
              step="${typeInfo.step}"
              style="font-size: var(--font-size-4xl); font-weight: 800; text-align: center; max-width: 160px; border: none; background: transparent; color: var(--primary); outline: none;"
              inputmode="decimal"
            />
            <span class="measurement-unit" style="font-size: var(--font-size-xl);">${typeInfo.unit}</span>
          </div>
          <div class="text-xs text-tertiary mt-2">
            Geçerli aralık: ${typeInfo.min} - ${typeInfo.max} ${typeInfo.unit}
          </div>
        </div>

        <!-- Date Field -->
        <div class="form-group" style="animation: slideUp 0.5s ease;">
          <label class="modern-title-icon">${window.__icons?.calendar} Ölçüm Tarihi</label>
          <input type="date" id="dateInput" value="${today}" />
        </div>

        <!-- Time Field -->
        <div class="form-group" style="animation: slideUp 0.55s ease;">
          <label class="modern-title-icon">${window.__icons?.clock} Saat</label>
          <input type="time" id="timeInput" value="${new Date().toTimeString().slice(0, 5)}" />
        </div>

        <!-- Note Field -->
        <div class="form-group" style="animation: slideUp 0.6s ease;">
          <label class="modern-title-icon">${window.__icons?.note} Not (Opsiyonel)</label>
          <textarea id="noteInput" placeholder="Bu ölçümle ilgili not ekleyebilirsiniz..." rows="3" style="min-height: 80px;"></textarea>
        </div>

        <!-- Info Box -->
        <div class="info-box info mb-4" style="animation: slideUp 0.65s ease;">
          <span class="info-box-icon">${window.__icons?.checkCircle}</span>
          <span>Ölçüm değerleri sağlık geçmişinize kaydedilir ve rapor oluşturulurken kullanılır.</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-3 mb-6" style="animation: slideUp 0.7s ease;">
          <button class="btn btn-primary btn-full btn-lg" id="saveBtn">
            ${window.__icons?.checkCircle} ${t('common.save')}
          </button>
          <button class="btn btn-ghost btn-full" id="cancelBtn">
            ${t('common.cancel')}
          </button>
        </div>
      </div>

      <div class="version-badge">${state.version}</div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const selectedType = query.type || 'weight';
  const typeInfo = MEASUREMENT_TYPES.find(t => t.id === selectedType) || MEASUREMENT_TYPES[0];

  function showMeasurementToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  document.getElementById('backBtn')?.addEventListener('click', () => {
    goBack();
  });

  // Type selection chips
  document.querySelectorAll('[data-mtype]').forEach(chip => {
    chip.addEventListener('click', () => {
      // Instead of pushing new history, use replaceState if we had it, or just navigate
      // But actually, just updating the DOM is better than navigating for simple tabs!
      navigate(`/history/measurements/new?type=${chip.dataset.mtype}`);
    });
  });

  // Focus value input on load
  setTimeout(() => {
    document.getElementById('valueInput')?.focus();
  }, 400);

  // Save button
  document.getElementById('saveBtn')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const value = document.getElementById('valueInput')?.value;
    const date = document.getElementById('dateInput')?.value;
    const time = document.getElementById('timeInput')?.value || '12:00';
    const note = document.getElementById('noteInput')?.value;

    if (!value || isNaN(parseFloat(value))) {
      showMeasurementToast(`${window.__icons?.alert || ''} Lütfen geçerli bir değer girin`);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    try {
      await saveMeasurement({
        userId: getState().user?.id || 'user-1',
        petId: getState().activePetId || 'pet-1',
        type: selectedType,
        value,
        unit: typeInfo.unit,
        measuredAt: new Date(`${date}T${time}:00`).toISOString(),
        note
      });

      showMeasurementToast('Ölçüm kaydedildi');
      setTimeout(() => {
        navigate(`/history/measurements?type=${selectedType}`);
      }, 900);
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `${window.__icons?.checkCircle} ${t('common.save')}`;
      showMeasurementToast(`${window.__icons?.alert || ''} Ölçüm kaydedilemedi: ${err.message}`);
    }
  });

  // Cancel button
  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    goBack();
  });
}
