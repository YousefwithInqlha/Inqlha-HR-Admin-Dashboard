/* =====================================================================
   INQLHA – employee profile page  (#emp/<code>)
   - header with photo, status and quick numbers
   - digital wallet: Iqama / ID and driving licence cards, drawn from the
     employee's data or from an uploaded photo of the real card (the photo is
     auto-cropped, its background removed and turned upright)
   - attendance: every working day counts as present; you only record
     absence, lateness and leave by clicking a day
   ===================================================================== */

/* ---------------- file store (card photos) ----------------
   Card photos are too big to live inside the main data, so they are kept apart:
   on the server in the "app_files" table, locally in the browser's IndexedDB. */
const FILES = {
  cache: {},
  db: null,
  idb() {
    if (this.db) return this.db;
    this.db = new Promise((res, rej) => {
      const rq = indexedDB.open('inqlha-files', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('files');
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
    return this.db;
  },
  async tx(mode, fn) {
    const db = await this.idb();
    return new Promise((res, rej) => { const t = db.transaction('files', mode); const rq = fn(t.objectStore('files')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); });
  },
  async get(id) {
    if (!id) return '';
    if (id in this.cache) return this.cache[id];
    let v = '';
    if (CLOUD) { const { data, error } = await SB.from('app_files').select('data').eq('id', id).maybeSingle(); if (error) throw error; v = data ? data.data : ''; }
    else v = (await this.tx('readonly', s => s.get(id))) || '';
    return (this.cache[id] = v);
  },
  async put(id, data) {
    if (CLOUD) { const { error } = await SB.from('app_files').upsert({ id, data }); if (error) throw error; }
    else await this.tx('readwrite', s => s.put(data, id));
    this.cache[id] = data;
  },
  async del(id) {
    if (!id) return;
    try { if (CLOUD) await SB.from('app_files').delete().eq('id', id); else await this.tx('readwrite', s => s.delete(id)); } catch (e) { /* an orphan file is harmless */ }
    delete this.cache[id];
  },
};

/* ---------------- card photo: crop, clean background, turn upright ---------------- */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const cdist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/* finds the card inside a photo/screenshot: the area that differs from the border colour */
function findCard(img) {
  const k = Math.min(1, 700 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const at = (x, y) => { const i = (y * w + x) * 4; return [px[i], px[i + 1], px[i + 2]]; };
  const edge = [];
  for (let x = 0; x < w; x += 3) edge.push(at(x, 0), at(x, h - 1));
  for (let y = 0; y < h; y += 3) edge.push(at(0, y), at(w - 1, y));
  const med = j => edge.map(p => p[j]).sort((a, b) => a - b)[edge.length >> 1];
  const bg = [med(0), med(1), med(2)];
  const fg = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fg[y * w + x] = cdist(at(x, y), bg) > 60 ? 1 : 0;
  const rows = [], cols = new Array(w).fill(0);
  for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) { n += fg[y * w + x]; cols[x] += fg[y * w + x]; } rows.push(n); }
  const span = (arr, len) => { let a = arr.findIndex(n => n > len * 0.3), b = arr.length - 1 - [...arr].reverse().findIndex(n => n > len * 0.3); return a < 0 ? null : [a, b]; };
  const ry = span(rows, w), rx = span(cols, h);
  if (!ry || !rx) return null;
  const box = { x: rx[0] / k, y: ry[0] / k, w: (rx[1] - rx[0] + 1) / k, h: (ry[1] - ry[0] + 1) / k, bg };
  if (box.w * box.h < img.width * img.height * 0.15) return null;
  if (box.w > img.width * 0.98 && box.h > img.height * 0.98) return null; // nothing to cut
  return box;
}

/* draws the card: cropped, rotated (quarter turns), with the corners cleaned */
function drawCard(img, box, turns) {
  const src = box || { x: 0, y: 0, w: img.width, h: img.height };
  const inset = box ? Math.round(Math.min(src.w, src.h) * 0.004) : 0;
  const sx = src.x + inset, sy = src.y + inset, sw = src.w - inset * 2, sh = src.h - inset * 2;
  const side = ((turns % 4) + 4) % 4;
  const k = Math.min(1, 1200 / Math.max(sw, sh));
  const cw = Math.round(sw * k), ch = Math.round(sh * k);
  const c = document.createElement('canvas');
  c.width = side % 2 ? ch : cw; c.height = side % 2 ? cw : ch;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.translate(c.width / 2, c.height / 2); g.rotate(side * Math.PI / 2);
  g.drawImage(img, sx, sy, sw, sh, -cw / 2, -ch / 2, cw, ch);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (box) {
    /* the rounded corners still show the old background: paint them with the card colour */
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data, W = c.width, H = c.height;
    const R = Math.round(Math.min(W, H) * 0.09);
    const pick = (x, y) => { const i = (y * W + x) * 4; return [p[i], p[i + 1], p[i + 2]]; };
    const paper = pick(Math.round(W / 2), Math.min(H - 1, R));
    [[0, 0], [W - R, 0], [0, H - R], [W - R, H - R]].forEach(([x0, y0]) => {
      for (let y = y0; y < y0 + R; y++) for (let x = x0; x < x0 + R; x++) {
        const i = (y * W + x) * 4;
        if (cdist([p[i], p[i + 1], p[i + 2]], box.bg) < 90) { p[i] = paper[0]; p[i + 1] = paper[1]; p[i + 2] = paper[2]; }
      }
    });
    g.putImageData(d, 0, 0);
  }
  return c;
}

/* upload dialog: pick a photo, see it cleaned, turn it if needed, save */
function openCardUpload(code, kind) {
  const e = L.emp(code); if (!e) return;
  const title = kind === 'license' ? 'رخصة القيادة' : docTitle(e).ar;
  const st = { img: null, box: null, turns: 0, crop: true };
  const panel = openLayer(`
    <div class="d-head"><span class="avatar lg sq">${icon(kind === 'license' ? 'license' : 'id')}</span><div class="t"><h2>صورة ${esc(title)}</h2><p>${esc(nameOf(e))}</p></div>
      <button class="icon-btn" id="cu-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body">
      <label class="drop" id="cu-drop"><input type="file" accept="image/*" id="cu-file" hidden>${icon('photo-up')}<b>اختار صورة الكارت</b><small>سكرين شوت من أبشر، أو صورة بالموبايل على خلفية سادة · هشيل الخلفية وأعدّلها لوحدي</small></label>
      <div id="cu-out" hidden>
        <div class="cu-stage"><img id="cu-img" alt=""></div>
        <div class="cu-tools">
          <button class="btn sm" id="cu-l">${icon('rotate-2')}لف شمال</button>
          <button class="btn sm" id="cu-r">${icon('rotate-clockwise-2')}لف يمين</button>
          <label class="cu-chk"><input type="checkbox" id="cu-crop" checked> قص الخلفية أوتوماتيك</label>
          <span style="flex:1"></span>
          <button class="btn sm ghost" id="cu-again">${icon('replace')}صورة تانية</button>
        </div>
        <p class="cu-hint" id="cu-hint"></p>
      </div>
    </div>
    <div class="d-foot"><button class="btn primary" id="cu-save" disabled>${icon('check')}حفظ الصورة</button><button class="btn ghost" id="cu-cancel">إلغاء</button></div>`, 'drawer');
  const show = () => {
    const c = drawCard(st.img, st.crop ? st.box : null, st.turns);
    st.out = c.toDataURL('image/jpeg', 0.86);
    $('#cu-img', panel).src = st.out;
    $('#cu-hint', panel).innerHTML = st.box ? `${icon('sparkles')} اتشالت الخلفية واتعدلت الصورة. لو الكارت مقلوب، لفّه بالزراير.` : `${icon('info-circle')} مقدرتش ألاقي حدود الكارت، فهتتحفظ الصورة زي ما هي. الأحسن تصوّره على خلفية سادة.`;
  };
  const take = async file => {
    if (!file || !file.type.startsWith('image/')) return alert('اختار ملف صورة');
    const url = URL.createObjectURL(file);
    try { st.img = await loadImg(url); } catch (err) { return alert('مقدرتش أقرا الصورة دي'); }
    st.box = findCard(st.img);
    const w = st.box ? st.box.w : st.img.width, h = st.box ? st.box.h : st.img.height;
    st.turns = h > w * 1.05 ? -1 : 0; /* Absher screenshots come sideways: turn them upright */
    st.crop = true; $('#cu-crop', panel).checked = true;
    $('#cu-drop', panel).hidden = true; $('#cu-out', panel).hidden = false; $('#cu-save', panel).disabled = false;
    show();
  };
  const fileIn = $('#cu-file', panel);
  fileIn.onchange = () => take(fileIn.files[0]);
  const drop = $('#cu-drop', panel);
  drop.ondragover = ev => { ev.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = ev => { ev.preventDefault(); drop.classList.remove('over'); take(ev.dataTransfer.files[0]); };
  $('#cu-l', panel).onclick = () => { st.turns--; show(); };
  $('#cu-r', panel).onclick = () => { st.turns++; show(); };
  $('#cu-crop', panel).onchange = ev => { st.crop = ev.target.checked; show(); };
  $('#cu-again', panel).onclick = () => { fileIn.value = ''; fileIn.click(); };
  $('#cu-x', panel).onclick = closeLayer; $('#cu-cancel', panel).onclick = closeLayer;
  $('#cu-save', panel).onclick = async () => {
    const btn = $('#cu-save', panel); btn.disabled = true; btn.innerHTML = `${icon('loader-2')}بيحفظ...`;
    const id = `doc-${code}-${kind}-${Date.now()}`;
    try { await FILES.put(id, st.out); }
    catch (err) {
      btn.disabled = false; btn.innerHTML = `${icon('check')}حفظ الصورة`;
      return alert(CLOUD ? 'مقدرتش أحفظ الصورة على السيرفر. اتأكد إنك شغّلت ملف supabase/files.sql في Supabase.' : 'مقدرتش أحفظ الصورة في المتصفح.');
    }
    const emp = L.emp(code); if (!emp) return closeLayer();
    const old = (emp.docs || {})[kind];
    emp.docs = { ...(emp.docs || {}), [kind]: id };
    save(); closeLayer(); PF.view[kind] = 'photo'; render();
    toast('اتحفظت صورة الكارت', 'تراجع', () => { const x = L.emp(code); if (!x) return; x.docs = { ...(x.docs || {}), [kind]: old || '' }; if (!old) delete x.docs[kind]; FILES.del(id); save(); render(); });
    if (old) setTimeout(() => { const x = L.emp(code); if (x && (x.docs || {})[kind] !== old) FILES.del(old); }, 6000);
  };
}

/* ---------------- attendance ---------------- */
const ATT = {
  'غياب': { cls: 'a', ic: 'user-x', color: '#c93636' },
  'تأخير': { cls: 'l', ic: 'clock-exclamation', color: '#eda100' },
  'إجازة': { cls: 'v', ic: 'beach', color: '#2a78d6' },
  'إجازة مرضية': { cls: 's', ic: 'stethoscope', color: '#7a5bd6' },
};
const weekendDays = () => (DB.settings.weekend && DB.settings.weekend.length ? DB.settings.weekend : [5, 6]); /* Friday + Saturday */
const attOf = code => (DB.attendance || []).filter(a => a.empCode === code);
const ymOf = d => d.slice(0, 7);
const monthDays = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const addMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return iso(d).slice(0, 7); };
const MONTHS_SHORT = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];

/* one employee's month, day by day */
function attMonth(e, ym) {
  const recs = {}; attOf(e.code).forEach(a => { if (ymOf(a.date) === ym) recs[a.date] = a; });
  const today = todayStr(), wk = weekendDays();
  const end = INACTIVE.includes(e.status) && e.lastDay ? e.lastDay : '9999';
  const s = { days: [], work: 0, present: 0, late: 0, lateMin: 0, leave: 0, sick: 0, absent: 0 };
  for (let d = 1; d <= monthDays(ym); d++) {
    const date = `${ym}-${String(d).padStart(2, '0')}`;
    const wd = parseDate(date).getDay();
    const r = recs[date];
    let cls = 'p';
    if ((e.joinDate && date < e.joinDate) || date > end) cls = 'x';
    else if (date > today) cls = 'f';
    else if (wk.includes(wd)) cls = 'o';
    else if (r) cls = ATT[r.type] ? ATT[r.type].cls : 'p';
    if (!['x', 'f', 'o'].includes(cls)) {
      s.work++;
      if (cls === 'p') s.present++; else if (cls === 'l') { s.late++; s.lateMin += num(r.minutes); } else if (cls === 'v') s.leave++; else if (cls === 's') s.sick++; else if (cls === 'a') s.absent++;
    }
    s.days.push({ d, date, wd, cls, rec: r });
  }
  const expected = s.work - s.leave - s.sick;
  s.rate = expected > 0 ? Math.round((s.present + s.late) / expected * 100) : null;
  return s;
}
function leaveInfo(e) {
  const y = todayStr().slice(0, 4);
  const used = attOf(e.code).filter(a => a.type === 'إجازة' && a.date.startsWith(y)).length;
  const total = num(e.leaveDays) || (yearsSince(e.joinDate) >= 5 ? 30 : 21);
  return { used, total, left: total - used };
}
function setAtt(code, date, type, extra = {}) {
  DB.attendance = (DB.attendance || []).filter(a => !(a.empCode === code && a.date === date));
  if (type) DB.attendance.push({ empCode: code, date, type, ...extra });
  save();
}
function dayMenu(anchor, e, day) {
  const set = (type, extra) => { setAtt(e.code, day.date, type, extra); render(); toast(type ? `${fmtDate(day.date)}: ${type}` : `${fmtDate(day.date)}: حضور`); };
  showMenu(anchor, [
    { label: 'حضور', icon: 'circle-check', run: () => set('') },
    { label: 'تأخير...', icon: ATT['تأخير'].ic, run: () => openAttForm(e, { from: day.date, type: 'تأخير' }) },
    { label: 'إجازة', icon: ATT['إجازة'].ic, run: () => set('إجازة') },
    { label: 'إجازة مرضية', icon: ATT['إجازة مرضية'].ic, run: () => set('إجازة مرضية') },
    { label: 'غياب', icon: ATT['غياب'].ic, danger: true, run: () => set('غياب') },
  ]);
}
/* record lateness for one day, or a leave/absence over a period */
function openAttForm(e, pre = {}) {
  const type = pre.type || 'إجازة';
  const panel = openLayer(`
    <div class="d-head"><span class="avatar lg sq">${icon('calendar-plus')}</span><div class="t"><h2>تسجيل حضور</h2><p>${esc(nameOf(e))}</p></div><button class="icon-btn" id="af-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body"><form class="fgrid" id="af" style="margin-top:18px">
      <div class="f full"><label for="af-type">النوع</label><select class="select" id="af-type">${Object.keys(ATT).map(t => `<option ${t === type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="f"><label for="af-from">من</label><input class="input" type="date" id="af-from" value="${esc(pre.from || todayStr())}" max="${todayStr()}"></div>
      <div class="f" data-range><label for="af-to">لحد</label><input class="input" type="date" id="af-to" value="${esc(pre.from || todayStr())}"></div>
      <div class="f" data-late hidden><label for="af-min">كام دقيقة تأخير؟</label><input class="input" type="number" min="1" id="af-min" value="30"></div>
      <div class="f full"><label for="af-note">ملاحظة</label><input class="input" id="af-note" placeholder="مثال: ظرف عائلي"></div>
      <div class="f full"><div class="help" id="af-help"></div></div>
    </form></div>
    <div class="d-foot"><button class="btn primary" id="af-save">${icon('check')}حفظ</button><button class="btn ghost" id="af-cancel">إلغاء</button></div>`, 'drawer');
  const sync = () => {
    const t = $('#af-type', panel).value, late = t === 'تأخير';
    $('[data-late]', panel).hidden = !late; $('[data-range]', panel).hidden = late;
    const days = rangeWorkdays($('#af-from', panel).value, late ? $('#af-from', panel).value : $('#af-to', panel).value);
    $('#af-help', panel).textContent = late ? 'التأخير بيتحسب حضور، بس بيظهر في التقرير' : `هيتسجل ${days.length} يوم شغل (من غير الويك إند)`;
  };
  $('#af', panel).addEventListener('input', sync); sync();
  $('#af-x', panel).onclick = closeLayer; $('#af-cancel', panel).onclick = closeLayer;
  $('#af-save', panel).onclick = () => {
    const t = $('#af-type', panel).value, from = $('#af-from', panel).value, late = t === 'تأخير';
    const to = late ? from : $('#af-to', panel).value, note = $('#af-note', panel).value.trim();
    if (!from || !to || to < from) return alert('اختار تاريخ صح');
    const days = rangeWorkdays(from, to);
    if (!days.length) return alert('الفترة دي كلها ويك إند');
    days.forEach(d => setAtt(e.code, d, t, { ...(late ? { minutes: num($('#af-min', panel).value) } : {}), ...(note ? { note } : {}) }));
    closeLayer(); PF.month = ymOf(from); render(); toast(`اتسجل ${t}: ${days.length} يوم`);
  };
}
function rangeWorkdays(from, to) {
  const out = []; if (!from || !to || to < from) return out;
  const d = parseDate(from), end = parseDate(to), wk = weekendDays();
  for (let n = 0; d <= end && n < 400; n++, d.setDate(d.getDate() + 1)) if (!wk.includes(d.getDay())) out.push(iso(d));
  return out;
}

/* ---------------- profile page ---------------- */
const PF = { code: null, tab: 'overview', month: null, view: {} };
const DOC_PAL = { res: ['#b08d3c', '#8a6a22'], nat: ['#3a9a4a', '#237033'], eg: ['#2f6db0', '#1d4f86'], lic: ['#3a9a4a', '#237033'] };
function docTitle(e) {
  if (e.country === 'مصر') return { ar: 'بطاقة الرقم القومي', en: 'National ID Card', pal: 'eg' };
  if (/سعود/.test(e.nationality || '')) return { ar: 'هوية وطنية', en: 'National Identity', pal: 'nat' };
  return { ar: 'هوية مقيم', en: 'Resident Identity', pal: 'res' };
}
const slash = s => s ? s.replace(/-/g, '/') : '—';
const maskId = v => !v ? '—' : DB.settings.showSensitive ? v : '••••••' + String(v).slice(-4);
const waLink = p => { let d = String(p || '').replace(/\D/g, ''); if (/^05\d{8}$/.test(d)) d = '966' + d.slice(1); else if (/^01\d{9}$/.test(d)) d = '20' + d.slice(1); else if (d.startsWith('00')) d = d.slice(2); return d ? `https://wa.me/${d}` : ''; };
function expPill(date, days = 60) {
  if (!date) return `<span class="pill plain">${icon('calendar-question')}مفيش تاريخ انتهاء</span>`;
  const n = daysUntil(date);
  if (n < 0) return `<span class="pill danger">خلصت ${agoTxt(-n)}</span>`;
  if (n <= days) return `<span class="pill warn">تنتهي ${daysTxt(n)}</span>`;
  const y = n / 365.25;
  return `<span class="pill ok">سارية · ${y >= 1 ? y.toFixed(1) + ' سنة' : n + ' يوم'}</span>`;
}

function guillocheSVG(color) {
  let s = '';
  for (let k = 0; k < 20; k++) {
    let d = ''; const a = 10 + k * 1.6, ph = k * 0.32;
    for (let x = -10; x <= 410; x += 8) d += (x === -10 ? 'M' : 'L') + x + ' ' + (126 + Math.sin(x / 38 + ph) * a + Math.sin(x / 13 + ph * 2) * 4 + (k - 10) * 4).toFixed(1);
    s += `<path d="${d}"/>`;
  }
  for (let k = 0; k < 12; k++) s += `<circle cx="70" cy="70" r="${12 + k * 7}"/>`;
  return `<svg class="gl" viewBox="0 0 400 252" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="${color}" stroke-opacity=".14" stroke-width=".7">${s}</g></svg>`;
}
/* a card drawn from the employee's data (styled after the Absher digital cards, marked internal) */
function idCardHTML(e, kind) {
  const isLic = kind === 'license';
  const t = isLic ? { ar: 'رخصة قيادة', en: 'Driving License', pal: 'lic' } : docTitle(e);
  const [c1, c2] = DOC_PAL[t.pal];
  const photo = e.photo ? `style="background-image:url('${esc(e.photo)}')"` : '';
  const rows = isLic
    ? [['رقم الرخصة', maskId(e.licenseNo || e.idNumber)], ['نوع الرخصة', e.licenseType || '—'], ['تاريخ الإصدار', slash(e.licenseIssue)], ['تاريخ الميلاد', slash(e.dob)], ['فصيلة الدم', e.bloodType || '—'], ['تاريخ الانتهاء', slash(e.licenseExpiry), 'exp']]
    : t.pal === 'eg'
      ? [['الرقم القومي', maskId(e.idNumber)], ['تاريخ الميلاد', slash(e.dob)], ['المحافظة', e.city || '—'], ['المهنة', e.iqamaProfession || e.jobTitle || '—'], ['الحالة', e.marital || '—']]
      : [['رقم الهوية', maskId(e.idNumber)], ['تاريخ الميلاد', slash(e.dob)], ['الجنسية', e.nationality || '—'], ['المهنة', e.iqamaProfession || e.jobTitle || '—'], ['صاحب العمل', e.iqamaEmployer || (e.empType === 'سعودة' && e.saudizationCompany) || 'شركة إنقلها'], ['تاريخ الانتهاء', slash(e.iqamaExpiry), 'exp']];
  const expDate = isLic ? e.licenseExpiry : e.iqamaExpiry;
  const expCls = expDate && daysUntil(expDate) <= 60 ? (daysUntil(expDate) < 0 ? 'bad' : 'warn') : '';
  return `<div class="idc" style="--c:${c1};--c2:${c2}">${guillocheSVG(c1)}
    <div class="in">
      <div class="top"><div class="ttl">${t.ar}<small>${t.en}</small></div><div class="org"><span>إنقلها<br>نسخة داخلية</span><i class="mk">إ</i></div></div>
      <div class="pic" ${photo}>${e.photo ? '' : esc(initials(nameOf(e)))}</div>
      <div class="flds">
        <div class="nm">${esc(e.nameAr || '—')}</div><div class="nm-en">${esc((e.nameEn || '').toUpperCase())}</div>
        ${rows.map(([l, v, x]) => `<div class="row"><span>${l}</span><b class="${x ? expCls : ''}">${esc(v)}</b></div>`).join('')}
      </div>
      <div class="foot"><span>${isLic ? '' : t.pal === 'eg' ? '' : 'مكان الإصدار: ' + esc(e.iqamaIssuePlace || e.city || '—')}</span><span class="chip-no">${isLic ? 'DL' : 'ID'} · ${esc(maskId(isLic ? (e.licenseNo || e.idNumber) : e.idNumber))}</span></div>
    </div></div>`;
}
function walletSlotHTML(e, kind) {
  const isLic = kind === 'license';
  const has = isLic ? (e.licenseNo || e.licenseExpiry || e.kind === 'سواق') : true;
  const img = (e.docs || {})[kind];
  const view = img ? (PF.view[kind] || 'photo') : 'data';
  const expDate = isLic ? e.licenseExpiry : e.iqamaExpiry;
  const focus = isLic ? 'licenseNo' : 'iqamaExpiry';
  if (!has && !img) return `<div class="idc-wrap"><button class="idc-empty" data-upload="${kind}">${icon('license')}<b>مفيش رخصة قيادة متسجلة</b><small>ارفع صورة الرخصة أو ضيف بياناتها</small></button>
    <div class="idc-meta"><span class="sp"></span><button data-editf="${focus}">${icon('pencil')}ضيف البيانات</button></div></div>`;
  return `<div class="idc-wrap">
    ${view === 'photo' ? `<div class="idc photo ${DB.settings.showSensitive ? '' : 'hidden-doc'}" data-zoom="${kind}" data-img="${esc(img)}"><div class="ph-load">${icon('loader-2')}</div>${DB.settings.showSensitive ? '' : `<button class="reveal" data-reveal>${icon('eye')}إظهار</button>`}</div>`
      : `<div class="idc-click" data-zoom="${kind}">${idCardHTML(e, kind)}</div>`}
    <div class="idc-meta">${expPill(expDate, isLic ? 30 : 60)}<span class="sp"></span>
      ${img ? `<div class="seg"><button class="${view === 'photo' ? 'on' : ''}" data-view="${kind}:photo">الصورة</button><button class="${view === 'data' ? 'on' : ''}" data-view="${kind}:data">البيانات</button></div>` : ''}
      <button data-upload="${kind}" title="${img ? 'غيّر الصورة' : 'ارفع صورة الكارت'}">${icon(img ? 'replace' : 'photo-up')}${img ? '' : 'ارفع صورة'}</button>
      <button data-editf="${focus}" title="عدّل البيانات">${icon('pencil')}</button>
    </div></div>`;
}
function attCardHTML(e) {
  const ym = PF.month, s = attMonth(e, ym);
  const [y, m] = ym.split('-').map(Number);
  const pct = n => s.work ? n / s.work * 100 : 0;
  const segs = [['#0b6062', pct(s.present)], ['#eda100', pct(s.late)], ['#2a78d6', pct(s.leave)], ['#7a5bd6', pct(s.sick)], ['#c93636', pct(s.absent)]].filter(x => x[1] > 0);
  let acc = 0;
  const ring = segs.length ? segs.map(([c, p], n) => { const a = acc; acc += p; return `${c} ${a.toFixed(2)}% ${(acc - (n < segs.length - 1 ? 0.6 : 0)).toFixed(2)}%, #fff ${(acc - 0.6).toFixed(2)}% ${acc.toFixed(2)}%`; }).join(', ') : '#e8efef 0 100%';
  const first = s.days.length ? s.days[0].wd : 0;
  const cal = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(d => `<div class="dh">${d}</div>`).join('') + '<div class="d x"></div>'.repeat(first)
    + s.days.map(d => `<button class="d ${d.cls} ${d.date === todayStr() ? 'today' : ''}" data-day="${d.date}" ${['x', 'f', 'o'].includes(d.cls) ? 'disabled' : ''} title="${fmtDate(d.date)} · ${{ p: 'حضور', l: 'تأخير' + (d.rec && d.rec.minutes ? ' ' + d.rec.minutes + ' دقيقة' : ''), v: 'إجازة', s: 'إجازة مرضية', a: 'غياب', o: 'ويك إند', f: 'لسه', x: 'مكانش في الشركة' }[d.cls]}${d.rec && d.rec.note ? ' · ' + esc(d.rec.note) : ''}">${d.d}</button>`).join('');
  const months = Array.from({ length: 12 }, (_, i) => addMonth(todayStr().slice(0, 7), i - 11));
  const vals = months.map(x => attMonth(e, x).rate);
  const valid = vals.filter(v => v != null);
  const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  const bars = months.map((x, i) => { const v = vals[i]; return `<button class="bar ${x === ym ? 'cur' : ''} ${v != null && v < 90 ? 'low' : ''}" data-month="${x}" title="${fmtMonth(x)}${v != null ? ': ' + v + '%' : ''}" ${v == null ? 'disabled' : ''}><b>${v != null ? v : ''}</b><i style="height:${v != null ? Math.max(4, (v - 50) / 50 * 100) : 0}%"></i></button>`; }).join('');
  const lt = (c, l, v, sub) => `<div class="lg"><small><i style="background:${c}"></i>${l}</small><b class="num">${v}${sub ? ` <em>${sub}</em>` : ''}</b></div>`;
  return `<section class="card pf-sec">
    <div class="pf-h"><h3>${icon('fingerprint')}الحضور</h3><span class="sp"></span>
      <button class="icon-btn sm" data-mnav="-1" aria-label="الشهر اللي فات">${icon('chevron-right')}</button><b class="pf-month">${MONTHS[m - 1]} ${y}</b><button class="icon-btn sm" data-mnav="1" aria-label="الشهر الجاي" ${ym >= todayStr().slice(0, 7) ? 'disabled' : ''}>${icon('chevron-left')}</button>
      <button class="btn sm" data-attadd>${icon('calendar-plus')}سجّل إجازة / غياب</button></div>
    <div class="pf-legend">${lt('#0b6062', 'حضور', s.present, 'يوم')}${lt('#eda100', 'تأخير', s.late, s.lateMin ? s.lateMin + ' دقيقة' : '')}${lt('#2a78d6', 'إجازة', s.leave + s.sick, s.sick ? `منها ${s.sick} مرضي` : 'يوم')}${lt('#c93636', 'غياب', s.absent, 'يوم')}</div>
    <div class="att">
      <div class="ring" style="background:conic-gradient(${ring})" role="img" aria-label="نسبة الحضور"><div class="h"><div><b class="num">${s.rate != null ? s.rate + '%' : '—'}</b><small>${s.rate != null ? 'نسبة الحضور' : 'مفيش أيام شغل'}</small></div></div></div>
      <div><div class="cal">${cal}</div><p class="att-hint">${icon('hand-click')}كل أيام الشغل بتتحسب حضور لوحدها. دوس على أي يوم عشان تسجل غياب أو تأخير أو إجازة.</p></div>
    </div>
    <div class="subh">آخر 12 شهر<span class="sp"></span><span class="muted">${avg != null ? `المتوسط ${avg}%` : ''}</span></div>
    <div class="bars">${bars}</div>
    <div class="mlabels">${months.map(x => `<span>${MONTHS_SHORT[+x.slice(5) - 1]}</span>`).join('')}</div>
  </section>`;
}
function attLogHTML(e) {
  const recs = attOf(e.code).sort((a, b) => b.date.localeCompare(a.date));
  const y = todayStr().slice(0, 4), yr = recs.filter(a => a.date.startsWith(y));
  const cnt = t => yr.filter(a => a.type === t).length;
  const li = leaveInfo(e);
  return `<section class="card pf-sec">
    <div class="pf-h"><h3>${icon('list-details')}سجل الحضور</h3><span class="sp"></span><button class="btn sm primary" data-attadd>${icon('calendar-plus')}سجّل إجازة / غياب</button></div>
    <div class="pf-legend">
      <div class="lg"><small>${icon('beach')}رصيد الإجازات ${y}</small><b class="num">${li.left} <em>من ${li.total}</em></b></div>
      <div class="lg"><small>${icon('user-x')}غياب ${y}</small><b class="num">${cnt('غياب')}</b></div>
      <div class="lg"><small>${icon('clock-exclamation')}تأخير ${y}</small><b class="num">${cnt('تأخير')}</b></div>
      <div class="lg"><small>${icon('stethoscope')}إجازة مرضية ${y}</small><b class="num">${cnt('إجازة مرضية')}</b></div>
    </div>
    ${recs.length ? `<div class="att-log">${recs.slice(0, 60).map(a => `<div class="al"><span class="ic" style="color:${(ATT[a.type] || {}).color}">${icon((ATT[a.type] || {}).ic || 'point')}</span><div><b>${esc(a.type)}${a.minutes ? ` · ${a.minutes} دقيقة` : ''}</b><small>${fmtDate(a.date)}${a.note ? ' · ' + esc(a.note) : ''}</small></div><button class="icon-btn sm" data-attdel="${a.date}" aria-label="امسح">${icon('trash')}</button></div>`).join('')}</div>`
      : `<div class="empty" style="padding:30px">${icon('mood-happy')}<b>مفيش غياب ولا تأخير ولا إجازات</b>كل أيامه حضور</div>`}
  </section>`;
}
function sideHTML(e, r) {
  const show = DB.settings.showSensitive, cur = curOf(r);
  const parts = [['الأساسي', r.basic, '#024849'], ['بدل سكن', r.housing, '#2a78d6'], ['بدل تنقلات', r.transport, '#1baf7a'], ['غلاء معيشة', r.cola, '#eb6834'], ['بدل اتصالات', r.comms, '#7a5bd6'], ['بدلات أخرى', r.other, '#eda100']].filter(p => num(p[1]) > 0);
  const total = empTotal(r);
  const v = x => show ? fmtNum(x) : '••••';
  const advs = L.advancesOf(e.code);
  const cars = L.carOf(e.code), assets = L.assetsOf(e.code);
  const lastPay = (DB.payrolls || []).filter(p => (p.lines || []).some(l => l.empCode === e.code)).sort((a, b) => (b.month || '').localeCompare(a.month || ''))[0];
  const lp = lastPay && lastPay.lines.find(l => l.empCode === e.code);
  const lpNet = lp && typeof lineNet === 'function' ? lineNet(lp) : null;
  const ev = timeline(e);
  return `
    <section class="card pf-sec">
      <div class="pf-h"><h3>${icon('wallet')}الراتب الشهري</h3><span class="sp"></span><button class="icon-btn sm" data-reveal aria-label="${show ? 'إخفاء' : 'إظهار'} المبالغ">${icon(show ? 'eye-off' : 'eye')}</button></div>
      ${total ? `<div class="pf-money"><b class="num">${v(total)}</b><small>${cur}${r.payMethod ? ' · ' + esc(r.payMethod) : ''}${r.bank ? ' · ' + esc(r.bank) : ''}</small></div>
      <div class="stack">${parts.map(p => `<i style="flex:${num(p[1])};background:${p[2]}"></i>`).join('')}</div>
      <div class="slist">${parts.map(p => `<div><i style="background:${p[2]}"></i><span>${p[0]}</span><b class="num">${v(p[1])}</b></div>`).join('')}</div>
      ${num(r.advDeduction) ? `<div class="pf-line"><span>خصم السلفة الشهري</span><b class="num" style="color:var(--danger)">- ${v(r.advDeduction)}</b></div><div class="pf-line"><span>الصافي</span><b class="num">${v(r.net)} ${cur}</b></div>` : ''}
      ${lp ? `<div class="pf-line"><span>آخر راتب · ${esc(fmtMonth(lastPay.month))}</span><b class="num">${lpNet != null ? v(lpNet) + ' ' + cur : '✓'}</b></div>` : ''}`
      : `<div class="pf-none">لسه مفيش راتب متسجل · <button class="link-btn" data-editf="basic">ضيف الراتب</button></div>`}
    </section>
    <section class="card pf-sec">
      <div class="pf-h"><h3>${icon('cash')}السلف</h3><span class="sp"></span><button class="link-btn" data-advadd>${icon('plus')}سلفة</button></div>
      ${advs.length ? advs.map(a => { const p = num(a.amount) ? Math.round(num(a.paid) / num(a.amount) * 100) : 0; const left = advRemaining(a); const mo = advMonthly(a); return `<div class="adv" data-adv="${esc(a.code)}"><div class="pf-line" style="border:0;padding:0"><span>${esc(a.loanType || 'سلفة')} · ${v(a.amount)} ${cur}</span><b class="num">${p}%</b></div><div class="prog"><i style="width:${p}%"></i></div><small>${left > 0 ? `فاضل ${v(left)}${mo ? ` · ${Math.ceil(left / mo)} قسط` : ''}` : 'اتسددت ✓'}</small></div>`; }).join('')
        : `<div class="pf-none">مفيش سلف</div>`}
    </section>
    <section class="card pf-sec">
      <div class="pf-h"><h3>${icon('device-laptop')}العُهد</h3></div>
      ${cars.length || assets.length ? cars.map(c => `<div class="asset" data-open-ent="cars:${esc(c.contractNo)}"><span class="ic">${icon(c.carType === 'ساطحة' ? 'truck' : 'car')}</span><div><b>${esc([c.brand, c.model].filter(Boolean).join(' ') || 'سيارة')} · ${esc(c.plate || '')}</b><small>${esc(c.carType || '')}${c.rentalOffice ? ' · ' + esc(c.rentalOffice) : ''}</small></div></div>`).join('')
        + assets.map(a => `<div class="asset" data-open-ent="assets:${esc(a.code)}"><span class="ic">${icon({ 'لابتوب': 'device-laptop', 'موبايل': 'device-mobile', 'شاشة': 'device-desktop', 'شريحة': 'sim', 'تابلت': 'device-tablet' }[a.type] || 'box')}</span><div><b>${esc([a.type, a.brand, a.model].filter(Boolean).join(' '))}</b><small>${a.handoverDate ? 'من ' + fmtDate(a.handoverDate) : esc(a.serial || '')}</small></div></div>`).join('')
        : `<div class="pf-none">مفيش عُهد معاه</div>`}
    </section>
    <section class="card pf-sec">
      <div class="pf-h"><h3>${icon('address-book')}التواصل والبنك</h3></div>
      <dl class="pf-kv">
        ${[['phone', 'الموبايل', r.phone, 1], ['mail', 'الإيميل', r.companyEmail || r.personalEmail, 1], ['urgent', 'الطوارئ', [r.emergencyName, r.emergencyRelation && `(${r.emergencyRelation})`, r.emergencyPhone].filter(Boolean).join(' '), 0], ['building-bank', 'البنك', [r.bank, r.bankCode].filter(Boolean).join(' · '), 0], ['credit-card', 'IBAN', r.iban ? (show ? r.iban : r.iban.slice(0, 4) + ' •••• ' + r.iban.slice(-4)) : '', 1]]
          .map(([ic, l, val, ltr]) => `<dt>${icon(ic)}${l}</dt><dd ${ltr ? 'dir="ltr"' : ''}>${esc(val || '—')}</dd>`).join('')}
      </dl>
    </section>
    ${ev.length ? `<section class="card pf-sec"><div class="pf-h"><h3>${icon('history')}آخر الأحداث</h3></div><ul class="tl">${ev.slice(0, 7).map(x => `<li class="${x.cls || ''}"><span class="b"></span>${esc(x.t)}<small>${x.d === todayStr() ? 'النهارده' : fmtDate(x.d)}</small></li>`).join('')}</ul></section>` : ''}`;
}
function timeline(e) {
  const ev = [];
  const t = todayStr();
  rowAlerts('employees', withCalc('employees', e)).forEach(a => ev.push({ d: t, t: `تنبيه: ${a.field} ${a.txt}`, cls: 'wr' }));
  if (e.joinDate) ev.push({ d: e.joinDate, t: `انضم للشركة${e.contractYears ? ` · عقد ${e.contractYears} ${num(e.contractYears) > 2 ? 'سنين' : 'سنة'}` : ''}` });
  if (e.probationEnd && e.probationEnd <= t) ev.push({ d: e.probationEnd, t: 'خلصت فترة التجربة', cls: 'acc' });
  L.advancesOf(e.code).forEach(a => a.date && ev.push({ d: a.date, t: `أخد ${a.loanType || 'سلفة'}${DB.settings.showSensitive ? ' ' + fmtNum(a.amount) : ''}` }));
  (DB.assetHistory || []).forEach(h => {
    const a = DB.assets.find(x => x.code === h.assetCode); const n = a ? [a.type, a.brand, a.model].filter(Boolean).join(' ') : h.assetCode;
    if (h.toEmp === e.code) ev.push({ d: h.date, t: `استلم ${n}`, cls: 'acc' }); else if (h.fromEmp === e.code) ev.push({ d: h.date, t: `سلّم ${n}` });
  });
  (DB.payrolls || []).forEach(p => (p.lines || []).some(l => l.empCode === e.code) && p.month && ev.push({ d: (p.confirmedAt || p.month + '-27').slice(0, 10), t: `اتعمل راتب ${fmtMonth(p.month)}` }));
  attOf(e.code).filter(a => a.type !== 'تأخير').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).forEach(a => ev.push({ d: a.date, t: a.type, cls: a.type === 'غياب' ? 'wr' : '' }));
  return ev.filter(x => x.d && x.d <= t).sort((a, b) => b.d.localeCompare(a.d));
}
function fullDataHTML(e, r) {
  return ENTITIES.employees.sections.map(([title, fields]) => {
    const vis = fields.filter(f => f.t !== 'photo' && (!f.show || f.show(r)) && r[f.k] !== '' && r[f.k] != null);
    if (!vis.length) return '';
    return `<section class="card pf-sec"><div class="pf-h"><h3>${icon(SECTION_ICONS[title] || 'point')}${esc(title)}</h3><span class="sp"></span><button class="link-btn" data-editf="${vis[0].k}">${icon('pencil')}تعديل</button></div><dl class="kv">${vis.map(f => `<div><dt>${fIcon(f)}${esc(f.l)}</dt><dd>${detailValue('employees', f, r)}</dd></div>`).join('')}</dl></section>`;
  }).join('');
}
function miniDocsHTML(e) {
  const d = (ic, bg, fg, t, sub, date, days) => `<div class="mdoc"><span class="ic" style="background:${bg};color:${fg}">${icon(ic)}</span><div><b>${t}</b><small>${sub}</small>${date ? `<div>${expPill(date, days)}</div>` : ''}</div></div>`;
  return `<div class="mini-docs">
    ${d('book-2', 'var(--info-bg)', 'var(--info)', 'جواز السفر', e.passportNo ? esc(maskId(e.passportNo)) : 'مش متسجل', e.passportExpiry, 90)}
    ${d('heart-plus', 'var(--ok-bg)', 'var(--ok)', 'التأمين الطبي', e.medicalClass ? 'فئة ' + esc(e.medicalClass) : 'مش متسجل', e.medicalExpiry, 30)}
    ${d('file-certificate', 'var(--brand-50)', 'var(--brand)', 'العقد', e.contractYears ? `${e.contractYears} ${num(e.contractYears) > 2 ? 'سنين' : 'سنة'}` : 'مش متسجل', withCalc('employees', e).contractEnd, 60)}
  </div>`;
}

function renderProfile() {
  const code = UI.profile;
  const i = empIdx(code);
  if (i < 0) { location.hash = '#employees'; return; }
  if (PF.code !== code) { PF.code = code; PF.tab = 'overview'; PF.month = todayStr().slice(0, 7); PF.view = {}; }
  if (!PF.month) PF.month = todayStr().slice(0, 7);
  const e = DB.employees[i], r = withCalc('employees', e);
  document.title = `${nameOf(e)} | إنقلها`;
  const n = DB.employees.length, prev = DB.employees[(i - 1 + n) % n], next = DB.employees[(i + 1) % n];
  const al = rowAlerts('employees', r);
  const cur = attMonth(e, todayStr().slice(0, 7));
  const att = cur.rate != null ? cur : attMonth(e, addMonth(todayStr().slice(0, 7), -1));
  const attLabel = cur.rate != null ? 'الحضور الشهر ده' : 'الحضور الشهر اللي فات';
  const li = leaveInfo(e);
  const docs = [['الإقامة', e.iqamaExpiry], ['رخصة القيادة', e.licenseExpiry], ['الجواز', e.passportExpiry], ['التأمين الطبي', e.medicalExpiry], ['العقد', r.contractEnd]].filter(d => d[1]).map(d => [d[0], daysUntil(d[1])]).sort((a, b) => a[1] - b[1]);
  const nd = docs[0];
  const ndCls = nd && nd[1] < 0 ? 'danger' : nd && nd[1] <= 60 ? 'warn' : '';
  const svc = r.joinDate ? yearsSince(r.joinDate) : null;
  const wa = waLink(r.phone);
  const kpi = (ic, l, val, sub, cls = '') => `<div class="pf-kpi ${cls}"><span class="ic">${icon(ic)}</span><div><small>${l}</small><b class="num">${val}${sub ? `<em>${sub}</em>` : ''}</b></div></div>`;
  const tabs = [['overview', 'layout-dashboard', 'نظرة عامة'], ['attendance', 'fingerprint', 'الحضور'], ['data', 'list-details', 'كل البيانات']];

  $('#page').innerHTML = `
    <div class="pf-crumbs"><a href="#employees">${icon('arrow-right')}الموظفين</a><span>/</span><span class="num">${esc(e.code)}</span><span class="sp"></span>
      ${n > 1 ? `<a class="icon-btn sm" href="#emp/${encodeURIComponent(prev.code)}" title="${esc(nameOf(prev))}" aria-label="الموظف اللي قبله">${icon('chevron-right')}</a><a class="icon-btn sm" href="#emp/${encodeURIComponent(next.code)}" title="${esc(nameOf(next))}" aria-label="الموظف اللي بعده">${icon('chevron-left')}</a>` : ''}</div>
    <section class="card pf-hero">
      <div class="pf-band"></div>
      <div class="pf-main">
        <div class="pf-photo" ${e.photo ? `style="background-image:url('${esc(e.photo)}')"` : ''}>${e.photo ? '' : `<span>${esc(initials(nameOf(e)))}</span>`}<span class="st ${INACTIVE.includes(e.status) ? 'off' : e.status === 'إجازة طويلة' ? 'away' : ''}" title="${esc(e.status || '')}"></span></div>
        <div class="pf-who">
          <h1>${esc(nameOf(e))}</h1>${e.nameEn ? `<div class="en">${esc(e.nameEn.toUpperCase())}</div>` : ''}
          <div class="tags">${e.status ? statusPill(e.status) : ''}<span class="pill plain brand">${icon(e.kind === 'سواق' ? 'steering-wheel' : 'user')}${esc(e.kind || 'موظف')}</span>${e.empType ? `<span class="pill plain info">${esc(e.empType)}</span>` : ''}<span class="pill plain num">${esc(e.code)}</span></div>
          <div class="meta">${[['briefcase', e.jobTitle], ['sitemap', e.department], ['map-pin', [e.workLocation, e.country].filter(Boolean).join(' · ')], ['user-star', e.manager && 'المدير: ' + empName(e.manager)]].filter(x => x[1]).map(([ic, v]) => `<span>${icon(ic)}${esc(v)}</span>`).join('')}</div>
        </div>
        <div class="pf-actions">
          ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">${icon('brand-whatsapp')}واتساب</a>` : ''}
          ${r.phone ? `<a class="btn" href="tel:${esc(r.phone.replace(/\s/g, ''))}">${icon('phone')}اتصال</a>` : ''}
          <button class="btn primary" id="pf-edit">${icon('pencil')}تعديل</button>
          <button class="icon-btn" id="pf-more" aria-label="خيارات">${icon('dots')}</button>
        </div>
      </div>
      <div class="pf-kpis">
        ${kpi('calendar-time', 'مدة الخدمة', svc != null ? (svc >= 1 ? svc.toFixed(1) : Math.round(svc * 12)) : '—', svc != null ? (svc >= 1 ? 'سنة' : 'شهر') : '')}
        ${kpi('fingerprint', attLabel, att.rate != null ? att.rate + '%' : '—', att.rate != null ? `${att.present + att.late} من ${att.work - att.leave - att.sick} يوم` : '')}
        ${kpi('beach', 'رصيد الإجازات', li.left, `من ${li.total} يوم`)}
        ${kpi('cash', 'متبقي السلف', DB.settings.showSensitive ? fmtNum(r.advRemaining) : '••••', curOf(r))}
        ${nd ? kpi(ndCls ? 'alert-triangle' : 'shield-check', ndCls ? `${nd[0]} ${nd[1] < 0 ? 'خلصت من' : 'تنتهي بعد'}` : 'أقرب مستند ينتهي', ndCls ? Math.abs(nd[1]) : nd[0], ndCls ? 'يوم' : daysTxt(nd[1]), ndCls) : kpi('file-off', 'المستندات', '—', 'مفيش تواريخ')}
      </div>
    </section>
    ${al.length ? `<div class="pf-alert ${al.some(a => a.cls === 'danger') ? 'danger' : ''}">${icon('alert-triangle')}<div>${al.map(a => `<div><b>${esc(a.field)}</b> ${a.txt} (${fmtDate(a.date)})</div>`).join('')}</div><button class="btn sm" data-editf="${(ENTITIES.employees.sections.flatMap(s => s[1]).find(f => f.l === al[0].field) || {}).k || ''}">${icon('refresh')}حدّث التاريخ</button></div>` : ''}
    <nav class="tabs pf-tabs">${tabs.map(([k, ic, l]) => `<button class="tab ${PF.tab === k ? 'active' : ''}" data-tab="${k}">${icon(ic)}${l}</button>`).join('')}</nav>
    ${PF.tab === 'data' ? `<div class="pf-data">${fullDataHTML(e, r)}</div>` : `
    <div class="pf-grid">
      <div class="pf-col">
        ${PF.tab === 'overview' ? `<section class="card pf-sec">
          <div class="pf-h"><h3>${icon('wallet')}المحفظة الرقمية</h3><span class="sp"></span><span class="muted sm">دوس على الكارت يكبر</span></div>
          <div class="wallet">${walletSlotHTML(e, 'iqama')}${walletSlotHTML(e, 'license')}</div>
          ${miniDocsHTML(e)}
        </section>` : ''}
        ${attCardHTML(e)}
        ${PF.tab === 'attendance' ? attLogHTML(e) : ''}
      </div>
      <aside class="pf-col">${sideHTML(e, r)}</aside>
    </div>`}`;
  bindProfile(e, i);
}

function bindProfile(e, i) {
  const page = $('#page');
  $('#pf-edit').onclick = () => openForm('employees', i);
  $('#pf-more').onclick = ev => { ev.stopPropagation(); showMenu(ev.currentTarget, rowMenuItems('employees', i).filter(x => x.icon !== 'eye' && x.icon !== 'pencil')); };
  $$('[data-tab]', page).forEach(b => b.onclick = () => { PF.tab = b.dataset.tab; renderProfile(); });
  $$('[data-editf]', page).forEach(b => b.onclick = () => b.dataset.editf ? openForm('employees', i, {}, b.dataset.editf) : openForm('employees', i));
  $$('[data-upload]', page).forEach(b => b.onclick = ev => { ev.stopPropagation(); openCardUpload(e.code, b.dataset.upload); });
  $$('[data-view]', page).forEach(b => b.onclick = () => { const [k, v] = b.dataset.view.split(':'); PF.view[k] = v; renderProfile(); });
  $$('[data-reveal]', page).forEach(b => b.onclick = ev => { ev.stopPropagation(); $('#eye-btn').click(); });
  $$('[data-mnav]', page).forEach(b => b.onclick = () => { PF.month = addMonth(PF.month, +b.dataset.mnav); renderProfile(); });
  $$('[data-month]', page).forEach(b => b.onclick = () => { PF.month = b.dataset.month; renderProfile(); });
  $$('[data-day]', page).forEach(b => b.onclick = ev => { ev.stopPropagation(); dayMenu(b, e, { date: b.dataset.day }); });
  $$('[data-attadd]', page).forEach(b => b.onclick = () => openAttForm(e));
  $$('[data-attdel]', page).forEach(b => b.onclick = () => { const d = b.dataset.attdel; const old = attOf(e.code).find(a => a.date === d); setAtt(e.code, d, ''); render(); toast('اتمسح', 'تراجع', () => { DB.attendance.push(old); save(); render(); }); });
  $$('[data-advadd]', page).forEach(b => b.onclick = () => openForm('advances', null, { empCode: e.code }));
  $$('[data-adv]', page).forEach(b => b.onclick = () => openDetail('advances', DB.advances.findIndex(a => a.code === b.dataset.adv)));
  $$('[data-open-ent]', page).forEach(b => b.onclick = () => { const [ent, k] = b.dataset.openEnt.split(':'); const key = ent === 'cars' ? 'contractNo' : 'code'; const j = DB[ent].findIndex(x => x[key] === k); if (j >= 0) openDetail(ent, j); });
  /* card photos are loaded on demand */
  $$('.idc.photo[data-img]', page).forEach(async box => {
    try { const src = await FILES.get(box.dataset.img); if (!box.isConnected) return; if (src) { box.style.backgroundImage = `url('${src}')`; box.classList.add('ready'); } else box.innerHTML = `<div class="ph-load">${icon('photo-off')}<small>الصورة مش موجودة</small></div>`; }
    catch (err) { if (box.isConnected) box.innerHTML = `<div class="ph-load">${icon('cloud-off')}<small>مقدرتش أحمّل الصورة</small></div>`; }
  });
  $$('[data-zoom]', page).forEach(c => c.onclick = async () => {
    const kind = c.dataset.zoom;
    if (c.classList.contains('photo')) {
      if (!DB.settings.showSensitive) return $('#eye-btn').click();
      const src = await FILES.get(c.dataset.img).catch(() => '');
      if (!src) return;
      openLayer(`<div class="viewer-in"><img src="${src}" alt=""><div class="viewer-bar"><a class="btn sm" href="${src}" download="${esc(e.code)}-${kind}.jpg">${icon('download')}تنزيل</a><button class="btn sm" id="vw-x">${icon('x')}قفل</button></div></div>`, 'viewer');
    } else openLayer(`<div class="viewer-in">${idCardHTML(e, kind)}<div class="viewer-bar"><button class="btn sm" id="vw-x">${icon('x')}قفل</button></div></div>`, 'viewer');
    $('#vw-x').onclick = closeLayer;
  });
}
