import { navigate } from '../../router.js';
import { getState, resetSession } from '../../store.js';
import { questionSets, categoryLabels } from '../../mock/questions.js';
import { getActivePet } from '../../mock/pets.js';
import { showToast } from '../../ui/toast.js';
import { saveVetReadyReport } from '../../services/vetReadyReports.js';

function answerValues(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function answerRisk(value) {
  const text = String(value).toLocaleLowerCase('tr-TR');
  if (text === 'hayır' || text === 'hiç' || text === 'normal' || text === 'skipped') return 0;
  if (text.includes('emin değilim')) return 5;
  if (text.includes('sürekli') || text.includes('hiç') || text.includes('mor') || text.includes('mavi') || text.includes('soluk')) return 24;
  if (text.includes('kan') || text.includes('şiddetli') || text.includes('çok') || text.includes('4 veya')) return 18;
  if (text.includes('evet') || text.includes('art') || text.includes('zor') || text.includes('azaldı')) return 10;
  if (text.includes('2-3') || text.includes('1 haftadan uzun')) return 8;
  return 2;
}

function calculateAssessment(session) {
  let score = 0;
  let redFlagAnswerCount = 0;
  let uncertainCount = session.uncertainRedFlags?.length || 0;
  let skippedCount = session.skippedQuestionIds?.length || 0;

  const hasEmergency = Object.values(session.redFlagAnswers || {}).includes('yes');
  if (hasEmergency) score += 100;
  if (uncertainCount > 0) score += uncertainCount * 14;

  Object.entries(session.questionAnswers || {}).forEach(([qId, value]) => {
    const question = Object.values(questionSets).flatMap(set => set.questions).find(q => q.id === qId);
    answerValues(value).forEach(val => {
      if (val === 'skipped') {
        skippedCount++;
        return;
      }
      if (question?.red_flag_values?.includes(val)) {
        score += 34;
        redFlagAnswerCount++;
      } else {
        score += answerRisk(val);
      }
    });
  });

  const context = session.petRiskContext || {};
  const tags = context.riskTags || [];
  const categories = session.categories || [];
  if (tags.includes('newborn_risk') || tags.includes('senior_risk')) score += 8;
  if (tags.includes('brachycephalic_risk') && categories.includes('respiratory_cough')) score += 10;
  if (tags.includes('diabetes_risk') && categories.includes('appetite_digestive')) score += 8;
  if (tags.includes('kidney_risk') && (categories.includes('urine_stool') || categories.includes('appetite_digestive'))) score += 8;
  if (tags.includes('cardiac_risk') && categories.includes('respiratory_cough')) score += 10;

  const tasks = session.tasks || [];
  const requiredTasks = tasks.filter(t => t.priority === 'required');
  const missingRequired = requiredTasks.filter(t => t.status !== 'completed').length;
  const completedEvidence = tasks.filter(t => t.status === 'completed');
  const skippedEvidence = tasks.filter(t => t.status === 'skipped' || t.status === 'pending');
  const poorQualityEvidence = completedEvidence.filter(t => t.quality && t.quality !== 'yes').length;

  if (missingRequired > 0) score += missingRequired * 12;
  if (poorQualityEvidence > 0) score += poorQualityEvidence * 7;

  let level = 'low';
  if (hasEmergency || score >= 80) level = 'critical';
  else if (score >= 55) level = 'high';
  else if (score >= 28) level = 'medium';

  const classifierConfidence = Math.round((session.classifierConfidence || 0.55) * 100);
  let confidence = classifierConfidence;
  confidence -= uncertainCount * 10;
  confidence -= skippedCount * 4;
  confidence -= missingRequired * 18;
  confidence -= poorQualityEvidence * 14;
  if (tasks.length > 0 && completedEvidence.length === 0) confidence -= 18;
  confidence = Math.max(22, Math.min(92, confidence));

  return {
    level,
    score,
    confidence,
    hasEmergency,
    uncertainCount,
    skippedCount,
    missingRequired,
    completedEvidence,
    skippedEvidence,
    poorQualityEvidence,
    redFlagAnswerCount
  };
}

function categoryGuidance(categories = []) {
  const steps = [];
  const warnings = [];

  if (categories.includes('appetite_digestive')) {
    steps.push('Kusma/dışkı sayısını, saatini ve görünümünü kaydedin.', 'İştah ve su içme durumunu takip edin.');
    warnings.push('Kanlı kusma/dışkı görülürse', 'Sürekli kusma veya suyu tutamama olursa');
  }
  if (categories.includes('respiratory_cough')) {
    steps.push('Dinlenirken solunum sayısını ölçün.', 'Öksürük veya hırıltı sesini kaydedin.');
    warnings.push('Nefes darlığı, morarma veya bayılma olursa');
  }
  if (categories.includes('movement_gait')) {
    steps.push('Yürüyüş videosunu aynı açıdan tekrar edilebilir şekilde alın.', 'Aktiviteyi kısıtlayın ve zorlamayın.');
    warnings.push('Bacağını hiç basamaz hale gelirse', 'Şişlik veya ağrı hızla artarsa');
  }
  if (categories.includes('skin_fur')) {
    steps.push('Bölge fotoğrafını aynı ışık ve açıyla takip edin.', 'Yalama/kaşıma davranışını not edin.');
    warnings.push('Akıntı, kötü koku veya hızlı yayılma olursa');
  }
  if (categories.includes('eye')) {
    steps.push('Etkilenen gözü net ve yakın fotoğraflayın.', 'Gözünü ovmasını engellemeye çalışın.');
    warnings.push('Göz kapanır, şişer veya bulanıklık artarsa');
  }
  if (categories.includes('ear')) {
    steps.push('Kulak dışını ve görünür akıntıyı fotoğraflayın.', 'Baş sallama ve kaşıma sıklığını izleyin.');
    warnings.push('Denge kaybı veya baş eğik tutma olursa');
  }
  if (categories.includes('urine_stool')) {
    steps.push('İdrar/dışkı sıklığını ve görünümünü kaydedin.', 'Varsa renk fotoğrafı veya strip sonucunu ekleyin.');
    warnings.push('Hiç idrar yapamazsa', 'İdrarda kan veya belirgin ağrı olursa');
  }

  if (steps.length === 0) steps.push('Genel durum, iştah, su tüketimi ve aktivite değişimini not edin.');
  if (warnings.length === 0) warnings.push('Nefes darlığı, bayılma, kanama veya hızlı kötüleşme olursa');

  return { steps: [...new Set(steps)].slice(0, 4), warnings: [...new Set(warnings)].slice(0, 4) };
}

function urgencyMeta(level) {
  const map = {
    low: {
      label: 'Yeşil',
      title: 'Yeşil - Evde takip',
      action: 'Evde kontrollü izlem',
      desc: 'Acil belirti yoksa kayıt tutarak takip edilebilir.'
    },
    medium: {
      label: 'Sarı',
      title: 'Sarı - Veterinerle görüş',
      action: '24-48 saat içinde danış',
      desc: 'Belirti sürerse veya artarsa veterinerle görüşülmelidir.'
    },
    high: {
      label: 'Turuncu',
      title: 'Turuncu - Bugün randevu',
      action: 'Bugün veteriner randevusu al',
      desc: 'Evde beklemek yerine aynı gün klinik görüşü daha güvenlidir.'
    },
    critical: {
      label: 'Kırmızı',
      title: 'Kırmızı - Acil',
      action: 'Beklemeden acil klinik',
      desc: 'Acil veteriner değerlendirmesi geciktirilmemelidir.'
    }
  };
  return map[level] || map.low;
}

export function render() {
  const state = getState();
  const session = state.session || {};
  const pet = getActivePet(state.activePetId);
  const assessment = calculateAssessment(session);
  const guidance = categoryGuidance(session.categories || []);
  const urgency = urgencyMeta(assessment.level);
  const urgent = assessment.level === 'critical' || assessment.level === 'high';
  const categoryText = (session.categories || []).map(c => categoryLabels[c] || c).join(', ') || 'Genel durum';
  const completedEvidenceText = assessment.completedEvidence.length > 0
    ? `${assessment.completedEvidence.length} kanıt kaydı değerlendirildi.`
    : 'Medya/ölçüm kanıtı eklenmedi; değerlendirme beyanlara dayalıdır.';
  const contextWarnings = session.petRiskContext?.warnings || [];

  return `
    <div class="screen premium-result">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnHomeIcon">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Sonuç ve Takip</div>
        <div class="header-right">
          <button class="header-icon" id="btnPreviewReport">${window.__icons?.upload}</button>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="premium-risk-card ${assessment.level}">
          <div>
            <div class="premium-screen-kicker">Aciliyet Trafik Işığı</div>
            <h1>${urgency.title}</h1>
            <p>${urgency.desc}</p>
            <small>Risk skoru ${assessment.score} · Güven ${assessment.confidence}% · ${completedEvidenceText}</small>
          </div>
          <div class="premium-risk-icon">${urgent ? window.__icons?.alert : window.__icons?.checkCircle}</div>
        </div>

        <div class="traffic-light-card ${assessment.level}">
          ${['low', 'medium', 'high', 'critical'].map((level) => `
            <div class="traffic-light-step ${assessment.level === level ? 'active' : ''}">
              <span></span>
              <strong>${urgencyMeta(level).label}</strong>
              <small>${urgencyMeta(level).action}</small>
            </div>
          `).join('')}
        </div>

        ${assessment.confidence < 60 ? `
          <div class="premium-result-section danger">
            <div class="premium-icon-box">${window.__icons?.alert}</div>
            <div>
              <h3>Güven Düşük</h3>
              <p>Bu sonuç eksik veya belirsiz cevaplar nedeniyle temkinli yorumlanmalıdır. Eksik kanıtları tamamlamadan kesin çıkarım yapılmamalıdır.</p>
            </div>
          </div>
        ` : ''}

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.clipboard}</div>
          <div>
            <h3>Klinik Özet</h3>
            <p>${pet?.name || 'Petiniz'} için bildirilen şikayet: “${session.complaintText || 'Belirtilmedi'}”. Eşleşen alan: ${categoryText}.</p>
            <p>${completedEvidenceText} ${assessment.uncertainCount > 0 ? `${assessment.uncertainCount} acil belirti sorusunda kullanıcı emin değildi.` : ''}</p>
          </div>
        </div>

        ${contextWarnings.length ? `
          <div class="premium-result-section warning">
            <div class="premium-icon-box">${window.__icons?.shield}</div>
            <div>
              <h3>Profil Bağlamı</h3>
              <ul>${contextWarnings.slice(0, 4).map(item => `<li>${item}</li>`).join('')}</ul>
            </div>
          </div>
        ` : ''}

        <div class="premium-result-section danger">
          <div class="premium-icon-box">${window.__icons?.alert}</div>
          <div>
            <h3>Dikkat Edilmesi Gerekenler</h3>
            <ul>${guidance.warnings.map(item => `<li>${item}</li>`).join('')}</ul>
            <p class="danger-text">${urgent ? 'Bu risk seviyesinde evde izlem tek başına yeterli değildir.' : 'Bu belirtilerden biri gelişirse veteriner hekiminize başvurunuz.'}</p>
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.checkCircle}</div>
          <div>
            <h3>Güvenli Takip Adımları</h3>
            <ul>${guidance.steps.map(step => `<li>${step}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.xCircle}</div>
          <div>
            <h3>Yapılmaması Gerekenler</h3>
            <ul>
              <li>Veteriner önermedikçe insan ilacı, ağrı kesici veya antibiyotik vermeyin.</li>
              <li>Belirti kötüleşirse evde beklemeyin.</li>
              <li>Eksik kanıtla sonucu kesin teşhis gibi yorumlamayın.</li>
            </ul>
          </div>
        </div>

        <div class="premium-followup-plan">
          <div class="premium-icon-box">${window.__icons?.calendar}</div>
          <div>
            <h3>${urgent ? 'Sonraki Adım' : 'Takip Planı'}</h3>
            <div class="premium-plan-row"><span>Öneri</span><strong>${urgency.action}</strong></div>
            <div class="premium-plan-row"><span>Hatırlatma</span><strong>${urgent ? 'Klinik sonrası' : 'Açık'}</strong></div>
            <div class="premium-plan-row"><span>İzlem süresi</span><strong>${urgent ? 'Beklemeden' : assessment.level === 'medium' ? '24 saat' : '48 saat'}</strong></div>
          </div>
        </div>

        <button class="btn btn-primary btn-full btn-lg mt-4" id="btnCreateFollowup">
          ${window.__icons?.clipboard} ${urgent ? 'Veteriner İçin Özet Oluştur' : 'Takip Planı Oluştur'}
        </button>
        <button class="btn premium-gold-button btn-full btn-lg mt-3" id="btnPreviewReportBottom">
          ${window.__icons?.upload} Veteriner Linki Oluştur
        </button>
        <button class="btn btn-secondary btn-full mt-3" id="btnVetOutcome">
          ${window.__icons?.stethoscope} Veteriner Sonucunu Ekle
        </button>
        <button class="btn btn-ghost btn-full text-secondary mt-2" id="btnSaveHistoryOnly">Sadece Geçmişe Kaydet</button>

        <div class="premium-privacy-note">${window.__icons?.lock} Bu değerlendirme veteriner muayenesinin yerine geçmez.</div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnHomeIcon')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });
  document.getElementById('btnSaveHistoryOnly')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });
  document.getElementById('btnCreateFollowup')?.addEventListener('click', () => navigate('/followups/new'));
  document.getElementById('btnVetOutcome')?.addEventListener('click', () => navigate('/check/new/vet-outcome'));
  const createReportLink = async () => {
    const state = getState();
    const session = state.session || {};
    const pet = getActivePet(state.activePetId);
    const assessment = calculateAssessment(session);
    const guidance = categoryGuidance(session.categories || []);
    const urgency = urgencyMeta(assessment.level);
    const report = saveVetReadyReport({ session, pet, assessment, guidance, urgency });
    const url = `${window.location.origin}${window.location.pathname}#${report.publicPath}`;
    try {
      await navigator.clipboard?.writeText(url);
      showToast('Veteriner rapor linki kopyalandı.');
    } catch {
      showToast('Veteriner rapor linki hazır.');
    }
    navigate(report.publicPath);
  };
  document.getElementById('btnPreviewReport')?.addEventListener('click', createReportLink);
  document.getElementById('btnPreviewReportBottom')?.addEventListener('click', createReportLink);
}
