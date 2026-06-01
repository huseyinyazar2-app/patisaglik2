import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getMeasurements } from '../../services/measurements.js';

const MEASUREMENT_TABS = [
  { id: 'weight', label: t('history.weight'), iconKey: 'weight', unit: 'kg' },
  { id: 'temperature', label: t('history.temperature'), iconKey: 'thermometer', unit: '°C' },
  { id: 'respiratory', label: t('history.respiratory'), iconKey: 'lungs', unit: '/dk' },
  { id: 'heart_rate', label: 'Nabız', iconKey: 'heartPulse', unit: 'bpm' },
  { id: 'urine_ph', label: t('history.urine'), iconKey: 'activity', unit: 'pH' },
  { id: 'other', label: t('history.other'), iconKey: 'measurement', unit: '' }
];

const TIME_RANGES = [
  { id: '7d', label: '7 gün' },
  { id: '30d', label: '30 gün' },
  { id: '90d', label: '90 gün' },
  { id: '1y', label: '1 yıl' }
];

function formatMeasurementDate(date) {
  if (!date) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function measureIcon(iconKey) {
  return `<span class="modern-inline-icon">${window.__icons?.[iconKey] || window.__icons?.measurement || ''}</span>`;
}

function filterByRange(records = [], activeRange = '90d') {
  const rangeDays = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const cutoff = Date.now() - (rangeDays[activeRange] || 90) * 24 * 60 * 60 * 1000;
  return records.filter((item) => new Date(item.measured_at || item.created_at).getTime() >= cutoff);
}

function renderLiveMeasurements(records = null, activeTabInfo = MEASUREMENT_TABS[0]) {
  if (!records) {
    return `
      <div class="record-summary-panel">
        <div class="record-summary-grid">
          <div><span>Kayıt</span><strong>Yükleniyor</strong><small>Ölçümler getiriliyor</small></div>
          <div><span>Tür</span><strong>${activeTabInfo.label}</strong><small>${activeTabInfo.unit || 'Özel ölçüm'}</small></div>
        </div>
      </div>
    `;
  }

  if (!records.length) {
    return `
      <div class="record-summary-panel">
        <div class="record-summary-grid">
          <div><span>Kayıt</span><strong>0</strong><small>Bu türde ölçüm yok</small></div>
          <div><span>Tür</span><strong>${activeTabInfo.label}</strong><small>Yeni ölçüm ekleyebilirsin</small></div>
        </div>
      </div>
    `;
  }

  const latest = records[0];
  const values = records.map((item) => Number(item.value || 0));
  const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;

  return `
    <div class="record-summary-panel">
      <div class="record-summary-grid">
        <div><span>Son ölçüm</span><strong>${latest.value} ${latest.unit || ''}</strong><small>${formatMeasurementDate(latest.measured_at)}</small></div>
        <div><span>Ortalama</span><strong>${avg} ${latest.unit || activeTabInfo.unit}</strong><small>${records.length} ölçüm kaydı</small></div>
      </div>
    </div>
  `;
}

function renderMeasurementBody(records = null, activeTabInfo = MEASUREMENT_TABS[0], activeRange = '90d') {
  if (!records) {
    return `<div class="free-record-panel"><p>Ölçüm kayıtları yükleniyor...</p></div>`;
  }

  const filtered = filterByRange(records, activeRange);
  if (!filtered.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${measureIcon(activeTabInfo.iconKey)}</div>
        <div class="empty-state-title">${activeTabInfo.label} verisi yok</div>
        <div class="empty-state-desc">Henüz ${activeTabInfo.label.toLowerCase()} ölçümü kaydedilmemiş.</div>
        <button class="btn btn-primary" id="emptyAddBtn">${window.__icons?.plus} ${t('history.add_new')}</button>
      </div>
      <button class="btn btn-primary btn-full btn-lg mb-4" id="addMeasurementBtn">
        ${window.__icons?.plus} ${t('history.add_new')}
      </button>
    `;
  }

  const values = filtered.map((item) => Number(item.value || 0));
  const latest = filtered[0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  const chartRange = max - min || 1;
  const barHeights = filtered.slice(0, 8).reverse().map((item) => {
    const pct = ((Number(item.value || 0) - min) / chartRange) * 100;
    return Math.max(20, Math.min(pct, 100));
  });

  return `
    <div class="card card-gradient text-center mb-4" style="animation: slideUp 0.3s ease;">
      <div class="text-xs text-tertiary mb-1">Son Ölçüm</div>
      <div style="font-size: var(--font-size-4xl); font-weight: 800; color: var(--primary);">${latest.value}</div>
      <div class="measurement-unit" style="font-size: var(--font-size-lg);">${latest.unit || activeTabInfo.unit}</div>
      <div class="text-xs text-tertiary mt-2">${measureIcon('calendar')} ${formatMeasurementDate(latest.measured_at)}</div>
    </div>

    <div class="card card-bordered mb-4" style="animation: slideUp 0.4s ease;">
      <div class="text-xs font-semibold text-tertiary mb-3 modern-title-icon" style="text-transform: uppercase; letter-spacing: 0.05em;">${window.__icons?.activity} Kayıt Trendi</div>
      <div class="chart-placeholder">
        ${barHeights.map((h, i) => `
          <div class="chart-bar" style="height: ${h}%; animation: slideUp ${0.3 + i * 0.1}s ease; opacity: ${i === barHeights.length - 1 ? 1 : 0.7};"></div>
        `).join('')}
      </div>
      <div class="flex justify-center gap-2 mt-3">
        ${TIME_RANGES.map((range) => `
          <button class="chip ${activeRange === range.id ? 'selected' : ''} chip-sm" data-range="${range.id}">
            ${range.label}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="card card-bordered mb-4" style="animation: slideUp 0.5s ease;">
      <div class="text-xs font-semibold text-tertiary mb-3 modern-title-icon" style="text-transform: uppercase; letter-spacing: 0.05em;">${window.__icons?.measurement} İstatistikler</div>
      <div class="flex justify-between">
        <div class="text-center" style="flex: 1;">
          <div class="text-xs text-tertiary">Min</div>
          <div class="font-bold" style="font-size: var(--font-size-lg); color: var(--risk-low);">${min}</div>
          <div class="text-xs text-tertiary">${activeTabInfo.unit}</div>
        </div>
        <div style="width: 1px; background: var(--border-color);"></div>
        <div class="text-center" style="flex: 1;">
          <div class="text-xs text-tertiary">Ort</div>
          <div class="font-bold" style="font-size: var(--font-size-lg); color: var(--primary);">${avg}</div>
          <div class="text-xs text-tertiary">${activeTabInfo.unit}</div>
        </div>
        <div style="width: 1px; background: var(--border-color);"></div>
        <div class="text-center" style="flex: 1;">
          <div class="text-xs text-tertiary">Max</div>
          <div class="font-bold" style="font-size: var(--font-size-lg); color: var(--risk-high);">${max}</div>
          <div class="text-xs text-tertiary">${activeTabInfo.unit}</div>
        </div>
      </div>
    </div>

    <div class="section" style="animation: slideUp 0.6s ease;">
      <div class="section-header">
        <div class="section-title">Geçmiş Ölçümler</div>
        <span class="text-xs text-tertiary">${filtered.length} kayıt</span>
      </div>
      <div class="card card-bordered" style="padding: 0; overflow: hidden;">
        ${filtered.map((item, i) => `
          <div class="list-item" style="animation: slideUp ${0.3 + i * 0.05}s ease;">
            <div class="list-item-icon" style="background: var(--primary-50); border-radius: var(--radius-md);">
              ${window.__icons?.[activeTabInfo.iconKey] || window.__icons?.measurement}
            </div>
            <div class="list-item-content">
              <div class="list-item-title">${item.value} ${item.unit || activeTabInfo.unit}</div>
              <div class="list-item-desc">${formatMeasurementDate(item.measured_at)}</div>
            </div>
            ${item.note ? `<span class="modern-note-icon">${window.__icons?.note}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>

    <button class="btn btn-primary btn-full btn-lg mb-4" id="addMeasurementBtn">
      ${window.__icons?.plus} ${t('history.add_new')}
    </button>
  `;
}

export function render(params = {}, query = {}) {
  const state = getState();
  const activeTab = query.type || 'weight';
  const activeRange = query.range || '90d';
  const activeTabInfo = MEASUREMENT_TABS.find((tab) => tab.id === activeTab) || MEASUREMENT_TABS[0];

  return `
    <div class="screen">
      <div class="header">
        <div class="header-left">
          <button class="header-back" id="backBtn">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('history.measurements')}</div>
        <div class="header-right"></div>
      </div>

      <div style="padding: var(--space-3) var(--space-4);">
        <div class="filter-tabs">
          ${MEASUREMENT_TABS.map((tab) => `
            <button class="filter-tab ${activeTab === tab.id ? 'active' : ''}" data-type="${tab.id}">
              ${measureIcon(tab.iconKey)} <span>${tab.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="section pt-0" id="liveMeasurements">
        ${renderLiveMeasurements(null, activeTabInfo)}
      </div>

      <div class="screen-padded" style="padding-top: 0;">
        <div id="measurementLiveBody">${renderMeasurementBody(null, activeTabInfo, activeRange)}</div>
      </div>

      <div class="version-badge">${state.version}</div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const activeTab = query.type || 'weight';
  const activeRange = query.range || '90d';
  const state = getState();
  const activeTabInfo = MEASUREMENT_TABS.find((tab) => tab.id === activeTab) || MEASUREMENT_TABS[0];

  document.getElementById('backBtn')?.addEventListener('click', () => goBack());

  document.querySelectorAll('[data-type]').forEach((tab) => {
    tab.addEventListener('click', () => {
      navigate(`/history/measurements?type=${tab.dataset.type}&range=${activeRange}`);
    });
  });

  function bindDynamicActions() {
    document.querySelectorAll('[data-range]').forEach((chip) => {
      chip.addEventListener('click', () => {
        navigate(`/history/measurements?type=${activeTab}&range=${chip.dataset.range}`);
      });
    });
    const addHandler = () => navigate(`/history/measurements/new?type=${activeTab}`);
    document.getElementById('addMeasurementBtn')?.addEventListener('click', addHandler);
    document.getElementById('emptyAddBtn')?.addEventListener('click', addHandler);
  }

  getMeasurements({ petId: state.activePetId, type: activeTab, limit: 30 }).then((records) => {
    const summary = document.getElementById('liveMeasurements');
    if (summary) summary.innerHTML = renderLiveMeasurements(records, activeTabInfo);
    const body = document.getElementById('measurementLiveBody');
    if (body) body.innerHTML = renderMeasurementBody(records, activeTabInfo, activeRange);
    bindDynamicActions();
  }).catch(() => {
    bindDynamicActions();
  });
}
