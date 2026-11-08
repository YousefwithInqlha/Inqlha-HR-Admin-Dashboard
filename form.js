/* =====================================================================
   INQLHA – employee self-service form  (form.html#<link token>)
   The employee opens the link HR sent, fills a short step-by-step form on
   their phone, and the answers wait in the dashboard for HR to approve.
   On the server: two locked functions (supabase/form.sql). Without a server
   (local testing): the link and the answers live in this browser.
   ===================================================================== */
const CFG = window.INQLHA_CONFIG || {};
const CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
const SB = CLOUD && window.supabase ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }) : null;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const fmtD = s => { const [y, m, d] = String(s).split('-').map(Number); return y && m && d ? `${d} ${MONTHS_AR[m - 1]} ${y}` : s; };
const icon = n => `<i class="ti ti-${n}" aria-hidden="true"></i>`;

/* ---------- where links and answers live ---------- */
const LOCAL_KEY = 'inqlha-form-local';
const localStore = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || { invites: [], submissions: [] }; } catch (e) { return { invites: [], submissions: [] }; } };
const API = {
  async info(token) {
    if (CLOUD) { const { data, error } = await SB.rpc('form_invite_info', { p_token: token }); if (error) throw error; return data; }
    const inv = localStore().invites.find(x => x.token === token);
    return inv ? { label: inv.label, kind: inv.kind, country: inv.country, used: !!inv.used_at, expired: new Date(inv.expires_at) < new Date() } : null;
  },
  async submit(token, data) {
    if (CLOUD) { const { error } = await SB.rpc('form_submit', { p_token: token, p_data: data }); if (error) throw error; return; }
    const st = localStore(); const inv = st.invites.find(x => x.token === token);
    if (!inv) throw new Error('invalid'); if (inv.used_at) throw new Error('used');
    inv.used_at = new Date().toISOString();
    st.submissions.push({ id: Date.now(), token, emp_code: inv.emp_code || null, data, status: 'new', created_at: new Date().toISOString() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(st));
  },
};

/* ---------- the questions ---------- */
const S = { token: '', info: null, step: 0, d: {}, files: {}, sending: false };
const isSA = () => S.d._country !== 'مصر';
const isSaudi = () => /سعود/.test(S.d.nationality || '');
const isDriver = () => S.d._kind === 'سواق';
const hasLicense = () => isDriver() || S.d.hasLicense === 'أيوه';
const listFor = (name, country) => {
  const all = DEFAULT_LISTS[name] || [];
  if (name === 'cities') return country === 'مصر' ? all.filter(c => ['القاهرة', 'الإسكندرية'].includes(c)) : all.filter(c => !['القاهرة', 'الإسكندرية'].includes(c));
  const EG_BANKS = ['البنك الأهلي المصري', 'بنك مصر', 'البنك التجاري الدولي'];
  if (name === 'banks') return country === 'مصر' ? all.filter(b => EG_BANKS.includes(b)) : all.filter(b => !EG_BANKS.includes(b));
  return all;
};
const F = {
  nameAr: { l: 'اسمك بالعربي', hint: 'الاسم الرباعي زي ما هو مكتوب في الهوية أو الإقامة', req: 1, ac: 'name', ph: 'مثال: أحمد سامي عبدالله محمد' },
  nameEn: { l: 'اسمك بالإنجليزي', hint: 'زي ما هو مكتوب في الجواز', req: 1, dir: 'ltr', ac: 'name', ph: 'Ahmed Samy Abdallah', up: 1 },
  nationality: { l: 'الجنسية', t: 'choice', o: () => ['سعودي', 'مصري'], other: 1, req: 1 },
  dob: { l: 'تاريخ الميلاد', t: 'date', req: 1, max: () => iso(new Date(new Date().getFullYear() - 16, 11, 31)) },
  marital: { l: 'الحالة الاجتماعية', t: 'choice', o: () => STATIC.marital, req: 1 },
  dependents: { l: 'عدد التابعين', hint: 'الزوجة والأولاد اللي على كفالتك', t: 'number', show: () => S.d.marital && S.d.marital !== 'أعزب', ph: '0' },
  bloodType: { l: 'فصيلة الدم', t: 'choice', o: () => STATIC.bloodType, cols: 4 },
  photo: { l: 'صورتك الشخصية', hint: 'صورة واضحة لوشك على خلفية سادة، زي صورة الجواز', t: 'photo', req: 1 },
  idNumber: { l: () => isSA() ? (isSaudi() ? 'رقم الهوية الوطنية' : 'رقم الإقامة') : 'الرقم القومي', hint: () => isSA() ? '10 أرقام' : '14 رقم', t: 'digits', req: 1, v: 'id' },
  iqamaExpiry: { l: 'تاريخ انتهاء الإقامة', t: 'date', req: 1, show: () => isSA() && !isSaudi() },
  iqamaImg: { l: () => isSA() ? (isSaudi() ? 'صورة الهوية' : 'صورة الإقامة') : 'صورة البطاقة', hint: 'سكرين شوت من أبشر أو صورة للكارت على خلفية سادة', t: 'card', kind: 'iqama' },
  passportNo: { l: 'رقم الجواز', dir: 'ltr', up: 1, req: () => isSA() && !isSaudi() },
  passportExpiry: { l: 'تاريخ انتهاء الجواز', t: 'date', show: () => !!S.d.passportNo },
  hasLicense: { l: 'معاك رخصة قيادة؟', t: 'choice', o: () => ['أيوه', 'لأ'], show: () => !isDriver() },
  licenseNo: { l: 'رقم رخصة القيادة', hint: 'في السعودية غالباً نفس رقم الهوية', t: 'digits', req: () => isDriver(), show: hasLicense },
  licenseType: { l: 'نوع الرخصة', t: 'choice', o: () => STATIC.licenseType, req: () => isDriver(), show: hasLicense },
  licenseExpiry: { l: 'تاريخ انتهاء الرخصة', t: 'date', req: () => isDriver(), show: hasLicense },
  licenseIssue: { l: 'تاريخ إصدار الرخصة', t: 'date', show: hasLicense },
  licenseImg: { l: 'صورة الرخصة', hint: 'سكرين شوت من أبشر أو صورة للكارت', t: 'card', kind: 'license', show: hasLicense },
  phone: { l: 'رقم موبايلك', t: 'tel', req: 1, v: 'phone', ph: () => isSA() ? '05xxxxxxxx' : '01xxxxxxxxx', ac: 'tel' },
  personalEmail: { l: 'إيميلك', t: 'email', req: 1, v: 'email', dir: 'ltr', ac: 'email', ph: 'name@gmail.com' },
  city: { l: 'المدينة اللي ساكن فيها', t: 'choice', o: () => listFor('cities', S.d._country), other: 1, req: 1 },
  emergencyName: { l: 'اسم شخص للطوارئ', hint: 'حد نكلمه لو حصل حاجة، ويفضّل ميكونش ساكن معاك', req: 1 },
  emergencyRelation: { l: 'صلة القرابة', t: 'choice', o: () => ['أب', 'أم', 'أخ', 'أخت', 'زوج / زوجة', 'ابن / ابنة'], other: 1, req: 1 },
  emergencyPhone: { l: 'موبايل شخص الطوارئ', t: 'tel', req: 1, v: 'phone' },
  bank: { l: 'البنك', t: 'select', o: () => listFor('banks', S.d._country), other: 1, req: 1 },
  iban: { l: 'رقم الـ IBAN', hint: () => isSA() ? 'هتلاقيه في تطبيق البنك: SA وبعدها 22 رقم' : 'هتلاقيه في تطبيق البنك: EG وبعدها 27 رقم', req: 1, v: 'iban', dir: 'ltr', up: 1, ph: () => isSA() ? 'SA00 0000 0000 0000 0000 0000' : 'EG00 0000 ...' },
  _holder: { l: 'اسم صاحب الحساب', hint: 'لازم يكون الحساب باسمك أنت', req: 1 },
};
const STEPS = [
  { id: 'start', t: 'أهلاً بيك', ic: 'hand-stop' },
  { id: 'personal', t: 'بياناتك الشخصية', ic: 'user', f: ['nameAr', 'nameEn', 'nationality', 'dob', 'marital', 'dependents', 'bloodType', 'photo'] },
  { id: 'docs', t: 'الهوية والرخصة', ic: 'id', f: ['idNumber', 'iqamaExpiry', 'iqamaImg', 'passportNo', 'passportExpiry', 'hasLicense', 'licenseNo', 'licenseType', 'licenseExpiry', 'licenseIssue', 'licenseImg'] },
  { id: 'contact', t: 'التواصل والطوارئ', ic: 'phone', f: ['phone', 'personalEmail', 'city', 'emergencyName', 'emergencyRelation', 'emergencyPhone'] },
  { id: 'bank', t: 'حساب الراتب', ic: 'building-bank', f: ['bank', 'iban', '_holder'] },
  { id: 'review', t: 'راجع وابعت', ic: 'checks' },
];
const val = x => typeof x === 'function' ? x() : x;
const shown = k => !F[k].show || F[k].show();
const required = k => !!val(F[k].req);

/* ---------- checks ---------- */
const digitsOnly = s => String(s || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
function check(k) {
  const f = F[k], v = f.t === 'photo' || f.t === 'card' ? S.files[k] : S.d[k];
  if (!shown(k)) return '';
  if (!v) return required(k) ? (f.t === 'photo' || f.t === 'card' ? 'ارفع الصورة' : f.t === 'choice' || f.t === 'select' ? 'اختار واحدة' : 'الخانة دي مطلوبة') : '';
  if (f.v === 'id') { const n = isSA() ? 10 : 14; if (!new RegExp(`^\\d{${n}}$`).test(v)) return `لازم يكون ${n} ${n === 10 ? 'أرقام' : 'رقم'} بالظبط`; }
  if (f.v === 'phone' && !/^\+?\d{9,15}$/.test(v)) return 'اكتب رقم موبايل صح، أرقام بس';
  if (f.v === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'الإيميل مكتوب غلط';
  if (f.v === 'iban') { const re = isSA() ? /^SA\d{22}$/ : /^EG\d{27}$/; if (!re.test(v)) return isSA() ? 'الـ IBAN السعودي: SA وبعدها 22 رقم' : 'الـ IBAN المصري: EG وبعدها 27 رقم'; }
  if (k === 'dob') { const age = (Date.now() - new Date(v)) / 31557600000; if (age < 16 || age > 80) return 'اتأكد من تاريخ الميلاد'; }
  if (/Expiry$/.test(k) && v < iso(new Date(Date.now() - 365 * 864e5))) return 'التاريخ ده قديم أوي، اتأكد منه';
  if (k === 'emergencyPhone' && v === S.d.phone) return 'لازم يكون رقم حد تاني غيرك';
  return '';
}
const holderWarn = () => {
  const n = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const h = n(S.d._holder); if (!h) return '';
  const first = s => n(s).split(' ')[0];
  return [S.d.nameAr, S.d.nameEn].some(x => x && (n(x).includes(h) || h.includes(first(x)))) ? '' : 'اسم صاحب الحساب مختلف عن اسمك. الراتب لازم يتحول على حساب باسمك.';
};

/* ---------- draft (so a closed tab doesn't lose anything) ---------- */
const draftKey = () => 'inqlha-form-draft-' + S.token;
const saveDraft = () => { try { localStorage.setItem(draftKey(), JSON.stringify({ d: S.d, files: S.files, step: S.step })); } catch (e) { try { localStorage.setItem(draftKey(), JSON.stringify({ d: S.d, step: S.step })); } catch (e2) { /* storage full or blocked */ } } };
const loadDraft = () => { try { const x = JSON.parse(localStorage.getItem(draftKey())); if (x) { S.d = x.d || {}; S.files = x.files || {}; S.step = x.step || 0; } } catch (e) { /* none */ } };

/* ---------- drawing ---------- */
function fieldHTML(k) {
  const f = F[k]; if (!shown(k)) return '';
  const v = S.d[k] || '', label = val(f.l), hint = val(f.hint), req = required(k);
  const head = `<label class="fl" for="i-${k}">${esc(label)}${req ? '' : ' <span class="opt">(اختياري)</span>'}</label>${hint ? `<p class="fh">${esc(hint)}</p>` : ''}`;
  let body = '';
  if (f.t === 'choice') {
    const opts = val(f.o); const isOther = v && !opts.includes(v);
    body = `<div class="choices ${f.cols === 4 ? 'c4' : ''}" role="radiogroup" aria-label="${esc(label)}">${opts.map(o => `<button type="button" class="ch ${v === o ? 'on' : ''}" dir="auto" data-k="${k}" data-v="${esc(o)}" role="radio" aria-checked="${v === o}">${esc(o)}</button>`).join('')}${f.other ? `<button type="button" class="ch ${isOther ? 'on' : ''}" data-k="${k}" data-other="1">أخرى</button>` : ''}</div>
      ${f.other && (isOther || S.d['_o_' + k]) ? `<input class="in" id="i-${k}" data-k="${k}" value="${esc(isOther ? v : '')}" placeholder="اكتب هنا" autocomplete="off">` : ''}`;
  } else if (f.t === 'select') {
    const opts = val(f.o); const isOther = v && !opts.includes(v);
    body = `<select class="in" id="i-${k}" data-sel="${k}"><option value="">اختار...</option>${opts.map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}${f.other ? `<option value="__other" ${isOther || S.d['_o_' + k] ? 'selected' : ''}>بنك تاني</option>` : ''}</select>
      ${f.other && (isOther || S.d['_o_' + k]) ? `<input class="in mt" id="i-${k}-o" data-k="${k}" value="${esc(isOther ? v : '')}" placeholder="اكتب اسم البنك">` : ''}`;
  } else if (f.t === 'photo') {
    const src = S.files[k];
    body = `<label class="up face ${src ? 'has' : ''}">${src ? `<img src="${src}" alt="">` : `${icon('camera')}<b>صوّر أو اختار صورة</b>`}<input type="file" accept="image/*" data-file="${k}" hidden></label>${src ? `<button type="button" class="lnk" data-clear="${k}">${icon('replace')}غيّر الصورة</button>` : ''}`;
  } else if (f.t === 'card') {
    const src = S.files[k];
    body = src ? `<div class="cardprev"><img src="${src}" alt=""></div><div class="cardtools"><button type="button" class="lnk" data-rot="${k}:-1">${icon('rotate-2')}لف</button><button type="button" class="lnk" data-clear="${k}">${icon('replace')}صورة تانية</button><button type="button" class="lnk danger" data-del="${k}">${icon('trash')}شيل</button></div>`
      : `<label class="up">${icon('id')}<b>ارفع الصورة</b><small>هنعدّلها ونشيل الخلفية لوحدنا</small><input type="file" accept="image/*" data-file="${k}" hidden></label>`;
  } else {
    const type = { date: 'date', email: 'email', tel: 'tel', number: 'number' }[f.t] || 'text';
    const mode = f.t === 'digits' || f.t === 'tel' || f.t === 'number' ? (f.t === 'tel' ? 'tel' : 'numeric') : '';
    body = `<input class="in ${f.dir === 'ltr' ? 'ltr' : ''}" id="i-${k}" data-k="${k}" type="${type}" ${mode ? `inputmode="${mode}"` : ''} value="${esc(v)}" ${f.ac ? `autocomplete="${f.ac}"` : 'autocomplete="off"'} ${f.ph ? `placeholder="${esc(val(f.ph))}"` : ''} ${f.max ? `max="${val(f.max)}"` : ''} ${f.t === 'number' ? 'min="0"' : ''}>`;
  }
  return `<div class="fld" data-f="${k}">${head}${body}<p class="err" id="e-${k}"></p>${k === '_holder' ? `<p class="warn" id="w-holder">${esc(holderWarn())}</p>` : ''}</div>`;
}

function render() {
  const st = STEPS[S.step], app = $('#app');
  const n = STEPS.length - 1;
  $('#prog').hidden = S.step === 0;
  $('#prog-fill').style.width = `${S.step / n * 100}%`;
  $('#prog-txt').innerHTML = `<span>خطوة ${S.step} من ${n}</span><b>${esc(st.t)}</b>`;
  $('#nav').hidden = false;
  $('#back').hidden = S.step === 0;
  $('#next').innerHTML = S.step === 0 ? `يلا نبدأ${icon('arrow-left')}` : S.step === n ? `${icon('send')}ابعت البيانات` : `التالي${icon('arrow-left')}`;
  $('#next').classList.toggle('send', S.step === n);
  if (st.id === 'start') {
    const name = S.info.label ? ` يا ${esc(S.info.label.split(' ')[0])}` : '';
    app.innerHTML = `<section class="card hello">
      <div class="wave">${icon('confetti')}</div>
      <h1>أهلاً بيك${name} في إنقلها</h1>
      <p>محتاجين بياناتك عشان نسجلك في أنظمة الشركة ونصرف راتبك صح. هتاخد حوالي <b>5 دقايق</b>.</p>
      <ul class="need"><li>${icon('id')}الهوية أو الإقامة (أو سكرين شوت من أبشر)</li><li>${icon('building-bank')}رقم الـ IBAN بتاع حسابك</li><li>${icon('camera')}صورة شخصية واضحة</li>${isDriver() ? `<li>${icon('license')}رخصة القيادة</li>` : ''}</ul>
      ${S.info.country ? '' : `<div class="fld"><p class="fl">شغلك هيكون فين؟</p><div class="choices"><button type="button" class="ch ${S.d._country === 'السعودية' ? 'on' : ''}" data-k="_country" data-v="السعودية">${icon('map-pin')}السعودية</button><button type="button" class="ch ${S.d._country === 'مصر' ? 'on' : ''}" data-k="_country" data-v="مصر">${icon('map-pin')}مصر</button></div><p class="err" id="e-_country"></p></div>`}
      ${S.info.kind ? '' : `<div class="fld"><p class="fl">إنت موظف ولا سواق؟</p><div class="choices"><button type="button" class="ch ${S.d._kind === 'موظف' ? 'on' : ''}" data-k="_kind" data-v="موظف">${icon('briefcase')}موظف</button><button type="button" class="ch ${S.d._kind === 'سواق' ? 'on' : ''}" data-k="_kind" data-v="سواق">${icon('steering-wheel')}سواق</button></div><p class="err" id="e-_kind"></p></div>`}
      <p class="lock">${icon('lock')}بياناتك سرية ومش هيشوفها غير الموارد البشرية. لو قفلت الصفحة، اللي كتبته بيتحفظ لحد ما ترجع.</p>
    </section>`;
  } else if (st.id === 'review') {
    const rows = STEPS.slice(1, -1).map((s, i) => {
      const items = s.f.filter(k => shown(k)).map(k => {
        const f = F[k];
        const v = f.t === 'photo' || f.t === 'card' ? (S.files[k] ? `<img class="mini" src="${S.files[k]}" alt="">` : '<span class="muted">—</span>') : (S.d[k] ? esc(f.t === 'date' ? fmtD(S.d[k]) : S.d[k]) : '<span class="muted">—</span>');
        return `<div class="rv"><span>${esc(val(f.l))}</span><b dir="auto" class="${f.dir === 'ltr' ? 'ltr' : ''}">${v}</b></div>`;
      }).join('');
      return `<section class="card rsec"><header><h3>${icon(s.ic)}${esc(s.t)}</h3><button type="button" class="lnk" data-goto="${i + 1}">${icon('pencil')}عدّل</button></header>${items}</section>`;
    }).join('');
    app.innerHTML = `${rows}<section class="card"><label class="agree"><input type="checkbox" id="agree" ${S.d._agree ? 'checked' : ''}><span>أقر إن كل البيانات اللي كتبتها صحيحة</span></label><p class="err" id="e-agree"></p></section>`;
  } else {
    app.innerHTML = `<section class="card"><h2 class="st">${icon(st.ic)}${esc(st.t)}</h2>${st.f.map(fieldHTML).join('')}</section>`;
  }
  bind();
}

function bind() {
  const app = $('#app');
  $$('.ch', app).forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (b.dataset.other) { S.d['_o_' + k] = 1; S.d[k] = ''; }
    else { S.d[k] = b.dataset.v; delete S.d['_o_' + k]; }
    if (k === 'nationality' || k === 'marital' || k === 'hasLicense' || k === '_country' || k === '_kind' || b.dataset.other) { saveDraft(); render(); const el = $(`#i-${k}`); if (el && b.dataset.other) el.focus(); return; }
    $$(`.ch[data-k="${k}"]`, app).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
    clearErr(k); saveDraft();
  });
  $$('[data-sel]', app).forEach(s => s.onchange = () => {
    const k = s.dataset.sel;
    if (s.value === '__other') { S.d['_o_' + k] = 1; S.d[k] = ''; saveDraft(); render(); $(`#i-${k}-o`)?.focus(); return; }
    delete S.d['_o_' + k]; S.d[k] = s.value; clearErr(k); saveDraft(); render();
  });
  $$('input[data-k]', app).forEach(el => {
    el.oninput = () => {
      const k = el.dataset.k, f = F[k];
      let v = el.value;
      if (f && (f.t === 'digits' || f.t === 'tel' || f.v === 'iban')) v = digitsOnly(v);
      if (f && f.v === 'iban') v = v.replace(/\s+/g, '').toUpperCase();
      if (f && (f.t === 'digits')) v = v.replace(/\D/g, '');
      if (f && f.t === 'tel') v = v.replace(/[^\d+]/g, '');
      if (f && f.up && f.v !== 'iban') v = v.toUpperCase();
      if (v !== el.value && f && f.v !== 'iban') el.value = v;
      S.d[k] = v.trim ? v.trim() : v; clearErr(k);
      if (k === '_holder' || k === 'nameAr' || k === 'nameEn') { const w = $('#w-holder'); if (w) w.textContent = holderWarn(); }
      saveDraft();
    };
    el.onblur = () => { const k = el.dataset.k; if (S.d[k]) showErr(k, check(k)); };
  });
  $$('input[data-file]', app).forEach(inp => inp.onchange = () => takeFile(inp.dataset.file, inp.files[0]));
  $$('[data-clear]', app).forEach(b => b.onclick = () => { const k = b.dataset.clear; const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = () => takeFile(k, inp.files[0]); inp.click(); });
  $$('[data-del]', app).forEach(b => b.onclick = () => { delete S.files[b.dataset.del]; saveDraft(); render(); });
  $$('[data-rot]', app).forEach(b => b.onclick = async () => { const [k] = b.dataset.rot.split(':'); const img = await loadImg(S.files[k]); S.files[k] = drawCard(img, null, 1).toDataURL('image/jpeg', 0.86); saveDraft(); render(); });
  $$('[data-goto]', app).forEach(b => b.onclick = () => { S.step = +b.dataset.goto; saveDraft(); render(); scrollTo(0, 0); });
  const ag = $('#agree'); if (ag) ag.onchange = () => { S.d._agree = ag.checked; clearErr('agree'); saveDraft(); };
}
const showErr = (k, m) => { const e = $(`#e-${k}`); if (e) e.textContent = m || ''; const w = $(`[data-f="${k}"]`); if (w) w.classList.toggle('bad', !!m); };
const clearErr = k => showErr(k, '');

async function takeFile(k, file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('اختار ملف صورة');
  const w = $(`[data-f="${k}"]`); if (w) w.classList.add('busy');
  try {
    const img = await loadImg(URL.createObjectURL(file));
    if (F[k].t === 'photo') {
      const side = Math.min(img.width, img.height), sz = Math.min(480, side);
      const c = document.createElement('canvas'); c.width = sz; c.height = Math.round(sz * 1.2);
      const sw = Math.min(img.width, img.height / 1.2), sh = sw * 1.2;
      c.getContext('2d').drawImage(img, (img.width - sw) / 2, Math.max(0, (img.height - sh) / 3), sw, sh, 0, 0, c.width, c.height);
      S.files[k] = c.toDataURL('image/jpeg', 0.85);
    } else {
      const box = findCard(img);
      const bw = box ? box.w : img.width, bh = box ? box.h : img.height;
      S.files[k] = drawCard(img, box, bh > bw * 1.05 ? -1 : 0).toDataURL('image/jpeg', 0.86);
    }
    saveDraft(); render();
  } catch (e) { alert('مقدرتش أقرا الصورة دي، جرّب صورة تانية'); if (w) w.classList.remove('busy'); }
}

function validateStep() {
  const st = STEPS[S.step];
  let first = null;
  if (st.id === 'start') {
    ['_country', '_kind'].forEach(k => { if ($(`#e-${k}`) && !S.d[k]) { showErr(k, 'اختار واحدة'); first = first || k; } });
  } else if (st.id === 'review') {
    if (!S.d._agree) { showErr('agree', 'لازم توافق على الإقرار عشان تبعت'); first = 'agree'; }
  } else st.f.forEach(k => { const m = check(k); showErr(k, m); if (m && !first) first = k; });
  if (first) { const el = $(`[data-f="${first}"]`) || $(`#e-${first}`); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  return !first;
}

async function send() {
  if (S.sending) return;
  S.sending = true;
  const btn = $('#next'); btn.disabled = true; btn.innerHTML = `${icon('loader-2 spin')}بيبعت...`;
  const data = {};
  STEPS.forEach(s => (s.f || []).forEach(k => { if (!shown(k)) return; if (F[k].t === 'photo' || F[k].t === 'card') { if (S.files[k]) data['_' + k] = S.files[k]; } else if (S.d[k]) data[k] = S.d[k]; }));
  data.kind = S.d._kind; data.country = S.d._country; data.accountHolder = data._holder; delete data._holder; delete data.hasLicense;
  data._submittedAt = new Date().toISOString();
  try {
    await API.submit(S.token, data);
    try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ }
    done('sent');
  } catch (e) {
    const m = String((e && (e.message || e.details)) || '');
    S.sending = false; btn.disabled = false; btn.innerHTML = `${icon('send')}ابعت البيانات`;
    if (/used/.test(m)) return done('used');
    if (/expired/.test(m)) return done('expired');
    if (/invalid/.test(m)) return done('invalid');
    if (/too_big/.test(m)) return alert('الصور كبيرة أوي. غيّر صورة منهم وجرّب تاني.');
    alert('مقدرتش أبعت البيانات. اتأكد إن النت شغال وجرّب تاني. بياناتك محفوظة.');
  }
}

function done(kind) {
  $('#nav').hidden = true; $('#prog').hidden = true;
  const M = {
    sent: ['circle-check', 'ok', 'شكراً، وصلتنا بياناتك', 'الموارد البشرية هتراجعها وتكمّل تسجيلك. تقدر تقفل الصفحة دي.'],
    used: ['circle-check', 'ok', 'اللينك ده اتستخدم قبل كده', 'بياناتك وصلت قبل كده. لو محتاج تعدّل حاجة، كلّم الموارد البشرية يبعتولك لينك جديد.'],
    expired: ['clock-x', 'warn', 'اللينك ده خلص', 'كلّم الموارد البشرية يبعتولك لينك جديد.'],
    invalid: ['link-off', 'warn', 'اللينك ده مش شغال', 'اتأكد إنك فتحت اللينك كامل زي ما وصلك، أو اطلب لينك جديد من الموارد البشرية.'],
    offline: ['wifi-off', 'warn', 'مش قادر يوصل', 'اتأكد إن النت شغال وافتح اللينك تاني.'],
  }[kind];
  $('#app').innerHTML = `<section class="card done ${M[1]}"><div class="big-ic">${icon(M[0])}</div><h1>${M[2]}</h1><p>${M[3]}</p></section>`;
}

$('#next').onclick = () => {
  if (!validateStep()) return;
  if (S.step === STEPS.length - 1) return send();
  S.step++; saveDraft(); render(); scrollTo(0, 0);
};
$('#back').onclick = () => { if (S.step > 0) { S.step--; saveDraft(); render(); scrollTo(0, 0); } };

(async function boot() {
  S.token = (location.hash.slice(1) || new URLSearchParams(location.search).get('t') || '').trim();
  if (!S.token) return done('invalid');
  let info;
  try { info = await API.info(S.token); } catch (e) { return done('offline'); }
  if (!info) return done('invalid');
  if (info.used) return done('used');
  if (info.expired) return done('expired');
  S.info = info;
  loadDraft();
  if (info.country) S.d._country = info.country;
  if (info.kind) S.d._kind = info.kind;
  if (info.label && !S.d.nameAr && /[؀-ۿ]/.test(info.label)) S.d.nameAr = info.label;
  render();
})();
