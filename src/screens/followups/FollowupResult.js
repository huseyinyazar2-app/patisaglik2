import { navigate } from '../../router.js';
import { getState, setState, resetSession } from '../../store.js';
import { showToast } from '../../ui/toast.js';

function riskForCheck(check = {}) {
  const sideEffects = check.sideEffects || [];
  const findings = check.findings || [];
  if (check.status === 'worse') return 'critical';
  if (sideEffects.some(item => ['Nefes sorunu', 'Yüz/boğaz şişliği', 'Kanlı kusma/dışkı'].includes(item))) return 'critical';
  if (findings.some(item => ['Şişlik/akıntı', 'Ağrı belirtisi'].includes(item))) return 'high';
  if (check.medStatus === 'Atlandı' || check.medStatus === 'Kustu / çıkarıldı') return 'medium';
  if (check.status === 'improved') return 'low';
  return 'medium';
}

function resultMeta(level) {
  const map = {
    low: {
      title: 'İyileşme takibi olumlu',
      desc: 'Belirgin kötüleşme veya ciddi yan etki bildirilmedi. Planlanan kontrolleri sürdür.',
      icon: 'checkCircle',
      cls: 'low',
      nextHours: 24
    },
    medium: {
      title: 'Yakın takip gerekli',
      desc: 'İlaç uyumu veya belirtiler için bir sonraki kontrolü kısa tutmak güvenli olur.',
      icon: 'clock',
      cls: 'medium',
      nextHours: 12
    },
    high: {
      title: 'Bugün veterinerle görüş',
      desc: 'Ağrı, akıntı, şişlik veya tedaviye rağmen devam eden bulgular klinik görüş gerektirebilir.',
      icon: 'alert',
      cls: 'high',
      nextHours: 6
    },
    critical: {
      title: 'Acil değerlendirme gerekebilir',
      desc: 'Kötüleşme veya ciddi yan etki şüphesinde beklemeden veteriner/acil klinik ile görüş.',
      icon: 'alert',
      cls: 'critical',
      nextHours: 3
    }
  };
  return map[level] || map.medium;
}

export function render(params = {}) {
  const check = getState().session?.followupCheck || { status: 'same' };
  const level = riskForCheck(check);
  const meta = resultMeta(level);

  return `
    <div class="screen premium-result">
      <div class="header premium-soft-header">
        <div class="header-left"></div>
        <div class="header-title">Takip Sonucu</div>
        <div class="header-right"></div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="premium-risk-card ${meta.cls}">
          <div>
            <div class="premium-screen-kicker">Tedavi sonrası kontrol</div>
            <h1>${meta.title}</h1>
            <p>${meta.desc}</p>
            <small>Bu takip yeni ilaç/doz önermez; veteriner planına uyumu izler.</small>
          </div>
          <div class="premium-risk-icon">${window.__icons?.[meta.icon] || ''}</div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.clipboard || ''}</div>
          <div>
            <h3>Bugünkü kayıt</h3>
            <p><strong>İlaç / uygulama:</strong> ${check.medStatus || 'Belirtilmedi'}</p>
            <p><strong>Bulgular:</strong> ${(check.findings || []).join(', ') || 'Ek bulgu yok'}</p>
            <p><strong>Yan etki:</strong> ${(check.sideEffects || []).join(', ') || 'Bildirilmedi'}</p>
            ${check.notes ? `<p><strong>Not:</strong> ${check.notes}</p>` : ''}
            ${check.photo ? `<p><strong>Foto:</strong> ${check.photo.name}</p>` : ''}
          </div>
        </div>

        <div class="premium-result-section danger">
          <div class="premium-icon-box">${window.__icons?.xCircle || ''}</div>
          <div>
            <h3>Güvenli sınırlar</h3>
            <ul>
              <li>Veterinerin önermediği ilaç, doz değişikliği veya ev müdahalesi yapma.</li>
              <li>Nefes sorunu, yüz/boğaz şişliği, kanlı kusma/dışkı veya hızlı kötüleşmede bekleme.</li>
              <li>İlaç kustuysa veya doz atlandıysa kendi başına tekrar doz verme; veterinerine danış.</li>
            </ul>
          </div>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnBackToDetail" data-case="${params.caseId}">Takip Dosyasına Dön</button>
          ${level === 'high' || level === 'critical' ? '<button class="btn btn-secondary btn-full" id="btnFindVet">Klinik Bul</button>' : ''}
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBackToDetail')?.addEventListener('click', () => {
    const caseId = params.caseId;
    const check = getState().session?.followupCheck || { status: 'same', timestamp: new Date().toISOString() };
    const level = riskForCheck(check);
    const meta = resultMeta(level);

    setState(state => {
      const followup = state.followups?.find(item => item.id === caseId);
      if (followup) {
        followup.history = followup.history || [];
        followup.history.unshift(check);
        followup.lastRiskLevel = level;
        followup.nextCheck = new Date(Date.now() + meta.nextHours * 60 * 60 * 1000).toISOString();
      }
    });

    resetSession();
    navigate(`/followups/${caseId}`);
  });

  document.getElementById('btnFindVet')?.addEventListener('click', () => {
    showToast('Yakındaki klinikler için harita araması açılıyor.');
    window.open('https://www.google.com/maps/search/veteriner+kliniği', '_blank', 'noopener,noreferrer');
  });
}
