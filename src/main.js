// Pati Sağlık — Main Application Entry Point
import { registerRoute, initRouter, navigate, setBeforeNavigate } from './router.js';
import { getState } from './store.js';
import { startReminderScheduler } from './services/reminderScheduler.js';
import { cleanupSmokeTestArtifacts } from './services/devHygiene.js';

// SVG Icons for tab bar
const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  measurement: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>',
  kit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
  stethoscope: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-5"/></svg>',
  heartPulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.6Z"/><path d="M3 12h4l2-4 3 8 2-4h7"/></svg>',
  lungs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12V3"/><path d="M12 12c-2-3-4-5-6-5-2 0-3 3-3 7v5c0 1.4 1.1 2.5 2.5 2.5C9 21.5 10 17 10 14"/><path d="M12 12c2-3 4-5 6-5 2 0 3 3 3 7v5c0 1.4-1.1 2.5-2.5 2.5C15 21.5 14 17 14 14"/></svg>',
  thermometer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z"/><path d="M10 7v8"/></svg>',
  weight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 8 5 21h14L17.5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M12 12v3"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 12h8"/><path d="M8 16h6"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 8L9 4l-3 8H2"/></svg>',
  message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
  xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 9.7 8.1 4 10.5l5.7 2.4L12 19l2.3-6.1 5.7-2.4-5.7-2.4Z"/><path d="M19 16v4"/><path d="M21 18h-4"/></svg>',
  paw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11.3 14.4c-2.1.4-4 2.1-4 4.1 0 1.7 1.4 2.7 3 2.2 1.1-.4 2.2-.4 3.4 0 1.6.5 3-.5 3-2.2 0-2-1.9-3.7-4-4.1-.5-.1-.9-.1-1.4 0Z"/><path d="M7.3 9.2c.8 1.2.7 2.6-.2 3.2-.9.6-2.2.1-3-1.1-.8-1.2-.7-2.6.2-3.2.9-.6 2.2-.1 3 1.1Z"/><path d="M12 4c1.1 0 2 1.2 2 2.7s-.9 2.7-2 2.7-2-1.2-2-2.7S10.9 4 12 4Z"/><path d="M19.7 8.1c.9.6 1 2 .2 3.2-.8 1.2-2.1 1.7-3 1.1-.9-.6-1-2-.2-3.2.8-1.2 2.1-1.7 3-1.1Z"/></svg>'
};

// Export icons for use in screens
window.__icons = icons;

// Tab bar configuration
const tabRoutes = ['/home', '/check', '/history', '/reports', '/profile'];
const tabLabels = ['Ana Sayfa', 'Pati AI', 'Geçmiş', 'Raporlar', 'Profil'];
const tabIcons = ['home', 'spark', 'history', 'reports', 'profile'];

// Routes that show tab bar
const tabBarRoutes = ['/home', '/check', '/history', '/history/timeline', '/history/measurements',
  '/history/issues', '/history/expenses', '/history/reminders', '/history/health-records',
  '/reports', '/profile', '/pets/select', '/profile/devices', '/profile/privacy',
  '/profile/account', '/profile/notifications', '/profile/plan', '/profile/language', '/profile/passport', '/feature/photo-followup', '/feature/poop-score',
  '/feature/diet-log', '/feature/expense', '/feature/reminders', '/feature/clinic-export',
  '/feature/chronic', '/feature/postop', '/feature/reproduction', '/feature/senior', '/feature/qr', '/check/knowledge', '/check/package-risk', '/check/safety-radar',
  '/feature/sitter', '/feature/document-ai', '/feature/vet-prep', '/feature/toxic'];

// Check if current route should show tab bar
function shouldShowTabBar(hash) {
  const path = (hash || '').replace('#', '').split('?')[0];
  if (path.startsWith('/history/records/')) return true;
  return tabBarRoutes.some(r => path === r);
}

// Render tab bar
function renderTabBar(activeTab) {
  return `
    <nav class="tab-bar" id="tabBar">
      <div class="tab-bar-inner">
        ${tabRoutes.map((route, i) => `
          <button class="tab-item ${activeTab === route ? 'active' : ''}" data-route="${route}">
            ${icons[tabIcons[i]]}
            <span class="tab-item-label">${tabLabels[i]}</span>
          </button>
        `).join('')}
      </div>
    </nav>
  `;
}

// Render version badge
function renderVersionBadge() {
  const state = getState();
  return `<div class="version-badge">${state.version}</div>`;
}

// Main render function
function renderApp(screenHtml, showTab = true, activeTab = '/home') {
  const app = document.getElementById('app');
  const path = (window.location.hash || '').replace('#', '').split('?')[0];
  app.className = path.startsWith('/web') || path.startsWith('/admin') ? 'web-shell-root' : '';
  app.innerHTML = `
    ${renderVersionBadge()}
    <div class="app-layout">
      <div class="app-content ${showTab ? '' : 'no-tab'}" id="appContent">
        ${screenHtml}
      </div>
      ${showTab ? renderTabBar(activeTab) : ''}
    </div>
  `;

  requestAnimationFrame(() => {
    const content = document.getElementById('appContent');
    if (content) content.scrollTop = 0;
    window.scrollTo(0, 0);
  });

  // Tab bar click handlers
  if (showTab) {
    document.querySelectorAll('.tab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        navigate(route);
      });
    });
  }
}

// Determine active tab from route
function getActiveTab(path) {
  if (path.startsWith('/home')) return '/home';
  if (path.startsWith('/check')) return '/check';
  if (path.startsWith('/feature/document-ai') || path.startsWith('/feature/vet-prep') || path.startsWith('/feature/toxic')) return '/check';
  if (path.startsWith('/feature/qr') || path.startsWith('/feature/sitter')) return '/profile';
  if (path.startsWith('/feature/clinic-export')) return '/reports';
  if (path.startsWith('/feature')) return '/history';
  if (path.startsWith('/history')) return '/history';
  if (path.startsWith('/reports')) return '/reports';
  if (path.startsWith('/profile') || path.startsWith('/pets')) return '/profile';
  return '/home';
}

// Screen module loader cache
const screenModules = {};
const screenLoaders = import.meta.glob('./screens/**/*.js');

// Dynamic screen loader
async function loadScreen(modulePath, params = {}, query = {}) {
  try {
    if (!screenModules[modulePath]) {
      const loader = screenLoaders[modulePath];
      if (!loader) throw new Error(`Screen module not found: ${modulePath}`);
      screenModules[modulePath] = await loader();
    }
    const mod = screenModules[modulePath];
    const html = mod.render(params, query);
    const hash = window.location.hash || '';
    const path = hash.replace('#', '').split('?')[0];
    const showTab = shouldShowTabBar(hash);
    const activeTab = getActiveTab(path);

    renderApp(html, showTab, activeTab);

    // Call afterRender if it exists
    if (mod.afterRender) {
      mod.afterRender(params, query);
    }
  } catch (err) {
    console.error('Screen load error:', err);
    renderApp(`
      <div class="screen screen-padded" style="padding-top: 100px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3>Ekran yüklenemedi</h3>
        <p class="text-secondary mt-2">${err.message}</p>
        <button class="btn btn-primary mt-4" onclick="location.hash='#/home'">Ana Sayfaya Dön</button>
      </div>
    `, false);
  }
}

// Register all routes
function setupRoutes() {
  // Auth
  registerRoute('/auth/splash', (p, q) => loadScreen('./screens/auth/Splash.js', p, q));
  registerRoute('/auth/onboarding', (p, q) => loadScreen('./screens/auth/Onboarding.js', p, q));
  registerRoute('/auth/login', (p, q) => loadScreen('./screens/auth/Login.js', p, q));
  registerRoute('/auth/register', (p, q) => loadScreen('./screens/auth/Register.js', p, q));

  // Pets
  registerRoute('/pets/new', (p, q) => loadScreen('./screens/pets/PetAdd.js', p, q));
  registerRoute('/pets/select', (p, q) => loadScreen('./screens/profile/PetProfiles.js', p, q));
  registerRoute('/pets/device-mode', (p, q) => loadScreen('./screens/pets/DeviceMode.js', p, q));

  // Home
  registerRoute('/web', (p, q) => loadScreen('./screens/web/Landing.js', p, q));
  registerRoute('/admin', (p, q) => loadScreen('./screens/web/Admin.js', p, q));
  registerRoute('/home', (p, q) => loadScreen('./screens/home/Home.js', p, q));
  registerRoute('/feature/:featureId', (p, q) => loadScreen('./screens/features/FeatureForm.js', p, q));
  registerRoute('/public/pet/:token', (p, q) => loadScreen('./screens/public/PublicPetCard.js', p, q));
  registerRoute('/public/report/:reportId', (p, q) => loadScreen('./screens/public/PublicVetReport.js', p, q));
  registerRoute('/invite/sitter/:inviteId', (p, q) => loadScreen('./screens/public/SitterInvite.js', p, q));

  // Check
  registerRoute('/check', (p, q) => loadScreen('./screens/check/CheckCenter.js', p, q));
  registerRoute('/check/knowledge', (p, q) => loadScreen('./screens/check/KnowledgeBase.js', p, q));
  registerRoute('/check/knowledge/:topicId', (p, q) => loadScreen('./screens/check/KnowledgeBase.js', p, q));
  registerRoute('/check/package-risk', (p, q) => loadScreen('./screens/check/PackageRisk.js', p, q));
  registerRoute('/check/safety-radar', (p, q) => loadScreen('./screens/check/ProductSafetyRadar.js', p, q));
  registerRoute('/check/new/complaint', (p, q) => loadScreen('./screens/check/Complaint.js', p, q));
  registerRoute('/check/new/history', (p, q) => loadScreen('./screens/check/HistoryIntake.js', p, q));
  registerRoute('/check/new/red-flags', (p, q) => loadScreen('./screens/check/RedFlags.js', p, q));
  registerRoute('/check/new/emergency', (p, q) => loadScreen('./screens/check/Emergency.js', p, q));
  registerRoute('/check/new/questions', (p, q) => loadScreen('./screens/check/Questions.js', p, q));
  registerRoute('/check/new/task-plan', (p, q) => loadScreen('./screens/check/TaskPlan.js', p, q));

  // Task screens
  registerRoute('/check/new/photo/:taskId/guide', (p, q) => loadScreen('./screens/tasks/PhotoGuide.js', p, q));
  registerRoute('/check/new/photo/:taskId/capture', (p, q) => loadScreen('./screens/tasks/PhotoCapture.js', p, q));
  registerRoute('/check/new/photo/:taskId/preview', (p, q) => loadScreen('./screens/tasks/PhotoPreview.js', p, q));
  registerRoute('/check/new/video/:taskId/guide', (p, q) => loadScreen('./screens/tasks/VideoGuide.js', p, q));
  registerRoute('/check/new/video/:taskId/capture', (p, q) => loadScreen('./screens/tasks/VideoCapture.js', p, q));
  registerRoute('/check/new/video/:taskId/preview', (p, q) => loadScreen('./screens/tasks/VideoPreview.js', p, q));
  registerRoute('/check/new/audio/:taskId/guide', (p, q) => loadScreen('./screens/tasks/AudioGuide.js', p, q));
  registerRoute('/check/new/audio/:taskId/record', (p, q) => loadScreen('./screens/tasks/AudioRecord.js', p, q));
  registerRoute('/check/new/audio/:taskId/preview', (p, q) => loadScreen('./screens/tasks/AudioPreview.js', p, q));
  registerRoute('/check/new/measurement/:taskId', (p, q) => loadScreen('./screens/tasks/Measurement.js', p, q));
  registerRoute('/check/new/physical-exam/:taskId', (p, q) => loadScreen('./screens/tasks/PhysicalExam.js', p, q));
  registerRoute('/check/new/basic-kit/:taskId', (p, q) => loadScreen('./screens/tasks/BasicKit.js', p, q));

  // Results
  registerRoute('/check/new/summary', (p, q) => loadScreen('./screens/result/Summary.js', p, q));
  registerRoute('/check/new/processing', (p, q) => loadScreen('./screens/result/Processing.js', p, q));
  registerRoute('/check/new/result', (p, q) => loadScreen('./screens/result/Result.js', p, q));
  registerRoute('/check/new/vet-outcome', (p, q) => loadScreen('./screens/result/VetOutcome.js', p, q));

  // Followups
  registerRoute('/followups/new', (p, q) => loadScreen('./screens/followups/FollowupNew.js', p, q));
  registerRoute('/followups/:caseId', (p, q) => loadScreen('./screens/followups/FollowupDetail.js', p, q));
  registerRoute('/followups/:caseId/check', (p, q) => loadScreen('./screens/followups/FollowupCheck.js', p, q));
  registerRoute('/followups/:caseId/result', (p, q) => loadScreen('./screens/followups/FollowupResult.js', p, q));

  // History
  registerRoute('/history', (p, q) => loadScreen('./screens/history/History.js', p, q));
  registerRoute('/history/timeline', (p, q) => loadScreen('./screens/history/Timeline.js', p, q));
  registerRoute('/history/expenses', (p, q) => loadScreen('./screens/history/FreeRecordList.js', { ...p, type: 'expenses' }, q));
  registerRoute('/history/reminders', (p, q) => loadScreen('./screens/history/FreeRecordList.js', { ...p, type: 'reminders' }, q));
  registerRoute('/history/health-records', (p, q) => loadScreen('./screens/history/FreeRecordList.js', { ...p, type: 'health' }, q));
  registerRoute('/history/records/:type/:recordId', (p, q) => loadScreen('./screens/history/FreeRecordDetail.js', p, q));
  registerRoute('/history/session/:sessionId', (p, q) => loadScreen('./screens/history/SessionDetail.js', p, q));
  registerRoute('/history/measurements', (p, q) => loadScreen('./screens/history/Measurements.js', p, q));
  registerRoute('/history/measurements/new', (p, q) => loadScreen('./screens/history/MeasurementAdd.js', p, q));
  registerRoute('/history/issues', (p, q) => loadScreen('./screens/history/Issues.js', p, q));
  registerRoute('/history/issues/new', (p, q) => loadScreen('./screens/history/IssueAdd.js', p, q));
  registerRoute('/history/issues/:issueId', (p, q) => loadScreen('./screens/history/IssueDetail.js', p, q));

  // Reports
  registerRoute('/reports', (p, q) => loadScreen('./screens/reports/Reports.js', p, q));
  registerRoute('/reports/new', (p, q) => loadScreen('./screens/reports/ReportCreate.js', p, q));
  registerRoute('/reports/:reportId', (p, q) => loadScreen('./screens/reports/ReportDetail.js', p, q));

  // Profile
  registerRoute('/profile', (p, q) => loadScreen('./screens/profile/Profile.js', p, q));
  registerRoute('/profile/passport', (p, q) => loadScreen('./screens/profile/HealthPassport.js', p, q));
  registerRoute('/profile/account', (p, q) => loadScreen('./screens/profile/Account.js', p, q));
  registerRoute('/profile/devices', (p, q) => loadScreen('./screens/profile/Devices.js', p, q));
  registerRoute('/profile/privacy', (p, q) => loadScreen('./screens/profile/Privacy.js', p, q));
  registerRoute('/profile/settings', (p, q) => loadScreen('./screens/profile/Profile.js', p, q));
  registerRoute('/profile/notifications', (p, q) => loadScreen('./screens/profile/Notifications.js', p, q));
  registerRoute('/profile/plan', (p, q) => loadScreen('./screens/profile/Plan.js', p, q));
  registerRoute('/profile/volunteer-network', (p, q) => loadScreen('./screens/profile/VolunteerNetwork.js', p, q));
  registerRoute('/profile/language', (p, q) => loadScreen('./screens/profile/Profile.js', p, q));
}

// Initialize app
async function init() {
  await cleanupSmokeTestArtifacts();
  setupRoutes();
  
  setBeforeNavigate((path) => {
    const state = getState();
    // Allow auth routes and pet creation/selection
    if (path.startsWith('/auth') || path.startsWith('/public') || path.startsWith('/invite') || path.startsWith('/web') || path.startsWith('/admin') || path.startsWith('/pets/select') || path.startsWith('/pets/new')) {
      return true;
    }
    // If user is logged in but hasn't selected a pet
    if (state.user.isLoggedIn && !state.activePetId) {
      setTimeout(() => navigate('/pets/select'), 0);
      return false;
    }
    return true;
  });

  initRouter();
  startReminderScheduler();
}

// Start
document.addEventListener('DOMContentLoaded', init);
// Also try immediate init in case DOM is already ready
if (document.readyState !== 'loading') {
  init();
}
