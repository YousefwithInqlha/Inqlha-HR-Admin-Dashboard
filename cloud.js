/* =====================================================================
   INQLHA – server mode (Supabase)
   When config.js has a Supabase URL + key, the system:
   - asks for email + password before showing anything
   - only lets in emails listed in the "admins" table (checked on the server)
   - loads and saves all data on the server instead of this browser
   - refuses to overwrite a newer save from another device (version check)
   - keeps the last 300 saves on the server, restorable from Settings
   ===================================================================== */
const CFG = window.INQLHA_CONFIG || {};
const CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
const SB = CLOUD && window.supabase ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const SYNC = { ready: false, version: 0, timer: null, busy: false, pending: false, retry: 0, user: null, state: '' };

/* ---------------- gate (login / loading / errors) ---------------- */
function showGate(mode, info = '') {
  let g = document.getElementById('gate');
  if (!g) { g = document.createElement('div'); g.id = 'gate'; document.body.appendChild(g); }
  document.body.classList.add('gated');
  const logo = '<img class="gate-logo" src="logo-wide.jpg" alt="إنقلها INQLHA">';
  const box = inner => { g.innerHTML = `<div class="gate-card">${logo}${inner}</div>`; };
  if (mode === 'loading') return box(`<div class="gate-load"><i class="ti ti-loader-2 spin"></i><span>${esc(info || 'بيحمّل البيانات...')}</span></div>`);
  if (mode === 'offline') return box(`<h1>مش قادر يوصل للسيرفر</h1><p>اتأكد إن النت شغال وجرّب تاني.</p>${info ? `<p class="gate-err">${esc(info)}</p>` : ''}<button class="btn primary block" onclick="location.reload()"><i class="ti ti-refresh"></i>جرّب تاني</button>`);
  if (mode === 'denied') return box(`<h1>الحساب ده مش مسموحله</h1><p>الإيميل <b class="ltr">${esc(info)}</b> مش متسجل كـ admin في السيستم.</p><button class="btn block" id="g-out"><i class="ti ti-logout"></i>خروج</button>`) || bindOut();
  if (mode === 'newpass') {
    box(`<h1>كلمة سر جديدة</h1><p>اختار كلمة سر قوية، 10 حروف على الأقل.</p>
      <form id="g-form" autocomplete="on"><label for="g-p1">كلمة السر الجديدة</label><input class="input ltr" id="g-p1" type="password" autocomplete="new-password" required minlength="10">
      <label for="g-p2">اكتبها تاني</label><input class="input ltr" id="g-p2" type="password" autocomplete="new-password" required minlength="10">
      <p class="gate-err" id="g-err" hidden></p><button class="btn primary block" id="g-go"><i class="ti ti-lock"></i>حفظ كلمة السر</button></form>`);
    $('#g-form').onsubmit = async e => {
      e.preventDefault();
      const p1 = $('#g-p1').value, p2 = $('#g-p2').value;
      if (p1.length < 10) return gateErr('كلمة السر لازم تكون 10 حروف على الأقل');
      if (p1 !== p2) return gateErr('الكلمتين مش زي بعض');
      busyBtn(true);
      const { error } = await SB.auth.updateUser({ password: p1 });
      busyBtn(false);
      if (error) return gateErr(authMsg(error));
      const { data: { session } } = await SB.auth.getSession();
      history.replaceState(null, '', location.pathname);
      session ? enterApp(session) : showGate('login');
    };
    return;
  }
  // login
  box(`<h1>تسجيل الدخول</h1><p>لوحة إدارة إنقلها</p>
    <form id="g-form" autocomplete="on"><label for="g-email">الإيميل</label><input class="input ltr" id="g-email" type="email" autocomplete="username" required value="${esc(localStorage.getItem('inqlha-last-email') || '')}">
    <label for="g-pass">كلمة السر</label><input class="input ltr" id="g-pass" type="password" autocomplete="current-password" required>
    <p class="gate-err" id="g-err" ${info ? '' : 'hidden'}>${esc(info)}</p>
    <button class="btn primary block" id="g-go"><i class="ti ti-login"></i>دخول</button>
    <button type="button" class="gate-link" id="g-forgot">نسيت كلمة السر؟</button></form>`);
  setTimeout(() => ($('#g-email').value ? $('#g-pass') : $('#g-email')).focus(), 50);
  $('#g-form').onsubmit = async e => {
    e.preventDefault();
    const email = $('#g-email').value.trim().toLowerCase(), password = $('#g-pass').value;
    busyBtn(true);
    const { data, error } = await SB.auth.signInWithPassword({ email, password });
    busyBtn(false);
    if (error) return gateErr(authMsg(error));
    localStorage.setItem('inqlha-last-email', email);
    enterApp(data.session);
  };
  $('#g-forgot').onclick = async () => {
    const email = $('#g-email').value.trim().toLowerCase();
    if (!email) { gateErr('اكتب إيميلك الأول'); return $('#g-email').focus(); }
    const { error } = await SB.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) return gateErr(authMsg(error));
    gateErr('لو الإيميل متسجل، هيوصلك لينك تغيير كلمة السر.', true);
  };
}
function bindOut() { const b = $('#g-out'); if (b) b.onclick = () => cloudSignOut(); }
function gateErr(msg, ok = false) { const p = $('#g-err'); if (!p) return; p.hidden = false; p.textContent = msg; p.classList.toggle('ok', ok); }
function busyBtn(on) { const b = $('#g-go'); if (!b) return; b.disabled = on; b.classList.toggle('loading', on); }
function hideGate() { const g = document.getElementById('gate'); if (g) g.remove(); document.body.classList.remove('gated'); }
function authMsg(err) {
  const m = String(err && err.message || err || '');
  if (/invalid login credentials/i.test(m)) return 'الإيميل أو كلمة السر غلط';
  if (/email not confirmed/i.test(m)) return 'الإيميل لسه متأكدش. افتح Supabase وأكّده من Authentication ← Users';
  if (/rate limit|too many/i.test(m)) return 'محاولات كتير. استنى دقيقة وجرّب تاني';
  if (/should be different/i.test(m)) return 'اختار كلمة سر مختلفة عن القديمة';
  if (/password/i.test(m) && /least|short|weak/i.test(m)) return 'كلمة السر ضعيفة. اختار كلمة أطول';
  if (/fetch|network/i.test(m)) return 'مش قادر يوصل للسيرفر. اتأكد من النت';
  return m;
}

/* ---------------- boot ---------------- */
async function cloudBoot() {
  if (!SB) return showGate('offline', 'مكتبة Supabase متحملتش');
  showGate('loading', 'بيفتح...');
  SB.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') { SYNC.recovery = true; showGate('newpass'); }
    if (event === 'SIGNED_OUT') { SYNC.ready = false; DB = emptyDB(); showGate('login'); }
  });
  const { data: { session } } = await SB.auth.getSession();
  if (SYNC.recovery || /type=recovery/.test(location.hash)) return showGate('newpass');
  if (!session) return showGate('login');
  enterApp(session);
}
async function enterApp(session) {
  SYNC.user = session.user;
  showGate('loading');
  try {
    const { data: ok, error: e1 } = await SB.rpc('is_admin');
    if (e1) throw e1;
    if (!ok) return showGate('denied', session.user.email);
    let { data: row, error } = await SB.from('app_state').select('data,version').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (!row) {
      const ins = await SB.from('app_state').insert({ id: 'main', data: emptyDB(), version: 1 }).select('data,version').single();
      if (ins.error) throw ins.error;
      row = ins.data;
    }
    DB = normalize(row.data && row.data.employees ? row.data : emptyDB());
    SYNC.version = row.version; SYNC.ready = true;
  } catch (err) { return showGate('offline', authMsg(err)); }
  hideGate();
  if (location.hash.includes('access_token') || location.hash.includes('type=')) history.replaceState(null, '', location.pathname);
  parseHash(); render(); paintUser(); setSync('saved');
  offerLocalImport();
}
function paintUser() {
  const u = SYNC.user; if (!u) return;
  const side = $('.side-user');
  if (side) side.innerHTML = `<span class="avatar">${esc((u.email || '?')[0].toUpperCase())}</span><div class="ltr-txt">${esc(u.email)}<small>Admin</small></div><button class="icon-btn" id="out-btn" title="خروج" aria-label="خروج"><i class="ti ti-logout"></i></button>`;
  $('#out-btn').onclick = () => { if (confirm('تخرج من السيستم؟')) cloudSignOut(); };
}
async function cloudSignOut() {
  if (SYNC.pending || SYNC.busy) await cloudFlush(true);
  SYNC.ready = false;
  await SB.auth.signOut();
  DB = emptyDB(); $('#page').innerHTML = ''; showGate('login');
}

/* data typed in the old browser-only version: offer to move it to the server once */
function localData() { try { const s = JSON.parse(localStorage.getItem(STORE)); return s && s.employees ? s : null; } catch (e) { return null; } }
const countRecords = d => Object.keys(ENTITIES).reduce((n, k) => n + ((d[k] || []).length), 0);
function offerLocalImport() {
  const old = localData(); if (!old || !countRecords(old)) return;
  if (countRecords(DB)) return;
  if (!confirm(`لقيت ${countRecords(old)} سجل متسجلين في المتصفح ده من النسخة القديمة. تنقلهم للسيرفر؟`)) return;
  importLocal(old);
}
function importLocal(old) {
  DB = normalize(old); save(); render();
  cloudFlush(true).then(ok => { if (ok) { localStorage.removeItem(STORE); toast('اتنقلت البيانات للسيرفر'); } });
}

/* ---------------- saving ---------------- */
function cloudQueueSave() {
  if (!SYNC.ready) return;
  SYNC.pending = true; setSync('saving');
  clearTimeout(SYNC.timer); SYNC.timer = setTimeout(() => cloudFlush(), 600);
}
async function cloudFlush(force) {
  clearTimeout(SYNC.timer);
  if (SYNC.busy) { SYNC.again = true; return SYNC.busyP; }
  if (!SYNC.pending && !force) return true;
  SYNC.busy = true; SYNC.pending = false; setSync('saving');
  SYNC.busyP = (async () => {
    const snapshot = JSON.parse(JSON.stringify(DB));
    const { data, error } = await SB.from('app_state').update({ data: snapshot, version: SYNC.version + 1 }).eq('id', 'main').eq('version', SYNC.version).select('version');
    SYNC.busy = false;
    if (error) {
      SYNC.pending = true; setSync('error');
      SYNC.retry = Math.min((SYNC.retry || 2) * 2, 60);
      SYNC.timer = setTimeout(() => cloudFlush(), SYNC.retry * 1000);
      return false;
    }
    SYNC.retry = 0;
    if (!data || !data.length) { await cloudConflict(); return false; }
    SYNC.version = data[0].version;
    if (SYNC.pending || SYNC.again) { SYNC.again = false; return cloudFlush(); }
    setSync('saved');
    return true;
  })();
  return SYNC.busyP;
}
/* someone saved from another device since we loaded: never overwrite it silently */
async function cloudConflict() {
  setSync('error');
  alert('البيانات اتعدلت من جهاز تاني بعد ما فتحت هنا. هحمّل آخر نسخة من السيرفر، وآخر تعديل عملته هنا محتاج تعمله تاني.');
  await cloudPull(true);
}
async function cloudPull(forceRender) {
  const { data, error } = await SB.from('app_state').select('data,version').eq('id', 'main').maybeSingle();
  if (error || !data) return false;
  if (data.version === SYNC.version && !forceRender) return false;
  DB = normalize(data.data); SYNC.version = data.version; SYNC.pending = false;
  closeLayer(); render(); setSync('saved');
  return true;
}
/* coming back to the tab: pick up changes made on another device */
document.addEventListener('visibilitychange', async () => {
  if (!CLOUD || !SYNC.ready || document.hidden || SYNC.pending || SYNC.busy || $('#panel')) return;
  const { data } = await SB.from('app_state').select('version').eq('id', 'main').maybeSingle();
  if (data && data.version !== SYNC.version && await cloudPull()) toast('اتحدثت البيانات من جهاز تاني');
});
addEventListener('beforeunload', e => { if (CLOUD && (SYNC.pending || SYNC.busy)) { cloudFlush(); e.preventDefault(); e.returnValue = ''; } });

function setSync(state) {
  SYNC.state = state;
  let el = document.getElementById('sync');
  if (!el) { const tb = $('#topbar .top-spacer'); if (!tb) return; el = document.createElement('span'); el.id = 'sync'; el.className = 'sync'; tb.after(el); }
  const map = { saved: ['cloud-check', 'اتحفظ', 'ok'], saving: ['loader-2 spin', 'بيتحفظ...', ''], error: ['cloud-off', 'مش متحفظ · بيحاول تاني', 'bad'] };
  const [ic, txt, cls] = map[state] || map.saved;
  el.className = `sync ${cls}`; el.title = txt;
  el.innerHTML = `<i class="ti ti-${ic}"></i><span>${txt}</span>`;
}

/* ---------------- history (Settings) ---------------- */
async function cloudHistory(el) {
  el.innerHTML = `<p class="muted">${icon('loader-2 spin')} بيحمّل...</p>`;
  const { data, error } = await SB.from('app_state_history').select('id,version,saved_at,saved_by').order('id', { ascending: false }).limit(20);
  if (error) { el.innerHTML = `<p class="gate-err">${esc(authMsg(error))}</p>`; return; }
  if (!data.length) { el.innerHTML = '<p class="muted">لسه مفيش نسخ قديمة. كل حفظ بيعمل نسخة هنا.</p>'; return; }
  el.innerHTML = `<div class="rel">${data.map(h => { const d = new Date(h.saved_at); return `<div class="rel-item" style="cursor:default"><span class="avatar sq">${icon('history')}</span><div class="txt"><b>${fmtDate(iso(d))} · <span class="num">${d.toTimeString().slice(0, 5)}</span></b><small class="ltr-txt">${esc(h.saved_by || '')} · v${h.version}</small></div><button class="btn sm" data-hist="${h.id}">${icon('arrow-back-up')}رجّع دي</button></div>`; }).join('')}</div>`;
  $$('[data-hist]', el).forEach(b => b.onclick = async () => {
    if (!confirm('هترجّع كل البيانات للنسخة دي. النسخة الحالية هتتحفظ في السجل برده، فتقدر ترجعلها. تمام؟')) return;
    const { data: h, error: e2 } = await SB.from('app_state_history').select('data').eq('id', +b.dataset.hist).single();
    if (e2) return alert(authMsg(e2));
    DB = normalize(h.data); save(); render(); toast('رجعت النسخة');
  });
}
