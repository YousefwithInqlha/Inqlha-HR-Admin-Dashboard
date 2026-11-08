/* =====================================================================
   INQLHA – import new employees from the Google Form responses sheet
   File (xlsx / csv downloaded from the responses sheet) → review → add.
   Columns are matched by the English part of each question title, so
   small edits to the Arabic wording don't break it.
   ===================================================================== */
const GF_COLS = [
  ['kind', /employee or a driver/i],
  ['licenseNo', /driving licen[cs]e number/i],
  ['licenseExpiry', /licen[cs]e expiry/i, 'date'],
  ['nameAr', /full name \(arabic\)/i],
  ['nameEn', /full name \(english\)/i],
  ['nationality', /nationality/i],
  ['dob', /date of birth/i, 'date'],
  ['marital', /marital/i],
  ['dependents', /dependents/i, 'num'],
  ['idNumber', /national id|iqama number/i, 'digits'],
  ['iqamaExpiry', /iqama expiry/i, 'date'],
  ['passportNo', /passport number/i],
  ['passportExpiry', /passport expiry/i, 'date'],
  ['emergencyName', /emergency contact name/i],
  ['emergencyRelation', /relationship/i],
  ['emergencyPhone', /emergency contact mobile/i, 'digits'],
  ['phone', /^(?!.*emergency).*mobile number/i, 'digits'],
  ['personalEmail', /personal email/i],
  ['city', /city you live/i],
  ['bank', /\bbank$/i],
  ['iban', /\biban\b/i, 'iban'],
  ['holder', /account holder/i],
  ['jobTitle', /job title/i],
  ['joinDate', /start date/i, 'date'],
];
const EGYPT_CITIES = ['القاهرة', 'الإسكندرية', 'الجيزة'];
const arPart = v => String(v ?? '').split(' · ')[0].trim();

/* turn a sheet cell into the value the system stores */
function gfValue(v, type) {
  if (v === undefined || v === null) return '';
  if (type === 'date') {
    if (v instanceof Date) return isNaN(v) ? '' : iso(v);
    if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 864e5)); return iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
    const s = String(v).trim(); if (!s) return '';
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
    if (m) { let [a, b] = [+m[1], +m[2]]; const [d, mo] = b > 12 ? [b, a] : [a, b]; return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
    return '';
  }
  const s = String(v).trim();
  if (type === 'digits') return s.replace(/[\s-]/g, '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  if (type === 'iban') return s.replace(/\s/g, '').toUpperCase();
  if (type === 'num') return s === '' ? '' : num(s);
  return s;
}
function gfRowToEmp(row, map) {
  const r = {};
  GF_COLS.forEach(([k, , type]) => { if (map[k] !== undefined) r[k] = gfValue(row[map[k]], type); });
  const e = {
    kind: /سواق|driver/i.test(r.kind || '') ? 'سواق' : 'موظف',
    nameAr: r.nameAr || '', nameEn: r.nameEn || '',
    nationality: arPart(r.nationality), dob: r.dob, marital: arPart(r.marital), dependents: r.dependents,
    idNumber: r.idNumber, iqamaExpiry: r.iqamaExpiry, passportNo: r.passportNo, passportExpiry: r.passportExpiry,
    phone: r.phone, personalEmail: r.personalEmail, city: arPart(r.city),
    emergencyName: r.emergencyName, emergencyRelation: r.emergencyRelation, emergencyPhone: r.emergencyPhone,
    bank: arPart(r.bank), iban: r.iban, jobTitle: r.jobTitle, joinDate: r.joinDate,
    licenseNo: r.licenseNo, licenseExpiry: r.licenseExpiry,
  };
  e.country = EGYPT_CITIES.includes(e.city) || /^EG/.test(e.iban || '') ? 'مصر' : 'السعودية';
  e.currency = e.country === 'مصر' ? 'جنيه' : 'ريال';
  e.empType = 'دوام كامل'; e.status = 'على رأس العمل';
  Object.keys(e).forEach(k => { if (e[k] === '' || e[k] === undefined) delete e[k]; });
  return { emp: e, holder: r.holder || '' };
}
function gfWarnings(x) {
  const e = x.emp, w = [];
  if (!e.nameAr) w.push('الاسم بالعربي ناقص');
  if (e.idNumber && !/^(\d{10}|\d{14})$/.test(e.idNumber)) w.push('رقم الهوية مش مظبوط');
  if (e.iban && !/^(SA\d{22}|EG\d{27})$/.test(e.iban)) w.push('الـ IBAN مش مظبوط');
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (x.holder && ![e.nameAr, e.nameEn].some(n => n && (norm(n).includes(norm(x.holder)) || norm(x.holder).includes(norm(n).split(' ')[0]))))
    w.push(`صاحب الحساب "${x.holder}" مش زي اسم الموظف`);
  return w;
}

let GF = null;
function openFormImport() {
  GF = { rows: [], sel: new Set(), file: '' };
  openLayer(`<div class="d-head"><span class="avatar lg sq">${icon('file-import')}</span><div class="t"><h2>استيراد من Google Form</h2><p>الموظفين اللي ملوا فورم البيانات</p></div><button class="icon-btn" id="gf-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body" id="gf-body"></div><div class="d-foot" id="gf-foot"></div>`, 'drawer wide');
  $('#panel').style.width = 'min(1000px, 100vw)';
  $('#gf-x').onclick = closeLayer;
  gfPick();
}
function gfPick(err = '') {
  $('#gf-body').innerHTML = `
    <div class="d-section"><h4>${icon('download')} نزّل الردود من Google</h4>
      <ol class="gf-steps"><li>افتح <b>شيت الردود</b> بتاع الفورم</li><li><b>File ← Download ← Microsoft Excel (.xlsx)</b></li><li>اختار الملف هنا</li></ol></div>
    <label class="drop" id="gf-drop">${icon('file-spreadsheet')}<b>اختار ملف الردود</b><small>Excel (.xlsx) أو CSV</small><input type="file" id="gf-file" accept=".xlsx,.xls,.csv" hidden></label>
    ${err ? `<div class="banner danger">${icon('alert-triangle')}<div>${esc(err)}</div></div>` : ''}`;
  $('#gf-foot').innerHTML = `<button class="btn ghost" id="gf-cancel">إلغاء</button>`;
  $('#gf-cancel').onclick = closeLayer;
  const drop = $('#gf-drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) gfRead(e.dataTransfer.files[0]); };
  $('#gf-file').onchange = e => { if (e.target.files[0]) gfRead(e.target.files[0]); };
}
async function gfRead(file) {
  if (!window.XLSX) return gfPick('مكتبة Excel محتاجة نت عشان تشتغل. اتأكد إنك متصل وجرّب تاني.');
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    const head = (aoa[0] || []).map(h => String(h));
    const map = {};
    GF_COLS.forEach(([k, re]) => { const i = head.findIndex((h, n) => re.test(h) && !Object.values(map).includes(n)); if (i >= 0) map[k] = i; });
    if (map.nameAr === undefined) return gfPick('الملف ده مش شبه ردود فورم الموظفين. اتأكد إنك نزّلت شيت الردود.');
    const ids = new Set(DB.employees.map(e => e.idNumber).filter(Boolean));
    const seen = new Set();
    GF.rows = aoa.slice(1).filter(r => r.some(c => String(c).trim())).map(r => {
      const x = gfRowToEmp(r, map);
      x.warn = gfWarnings(x);
      x.dup = !!(x.emp.idNumber && (ids.has(x.emp.idNumber) || seen.has(x.emp.idNumber)));
      if (x.emp.idNumber) seen.add(x.emp.idNumber);
      return x;
    });
    GF.file = file.name;
    GF.sel = new Set(GF.rows.map((x, i) => i).filter(i => !GF.rows[i].dup && GF.rows[i].emp.nameAr));
    gfReview();
  } catch (e) { gfPick('مقدرتش أقرا الملف. نزّله تاني كـ Excel (.xlsx) وجرّب.'); }
}
function gfReview() {
  const rows = GF.rows;
  if (!rows.length) return gfPick('الملف مفيهوش ردود لسه.');
  $('#gf-body').innerHTML = `<p class="muted gf-file">${icon('file-spreadsheet')} ${esc(GF.file)} · ${rows.length} رد</p>
    <div class="pq-list">${rows.map((x, i) => { const e = x.emp; return `<div class="pq-row pick ${GF.sel.has(i) ? 'on' : ''} ${x.dup ? 'held' : ''}" data-i="${i}">
      <input type="checkbox" data-gf="${i}" ${GF.sel.has(i) ? 'checked' : ''} ${e.nameAr ? '' : 'disabled'}>
      <span class="avatar">${esc(initials(e.nameAr || '?'))}</span>
      <div class="txt"><b>${esc(e.nameAr || '—')}${e.nameEn ? ` <span class="muted ltr-txt" style="font-weight:400">${esc(e.nameEn)}</span>` : ''}</b>
        <small>${icon(e.kind === 'سواق' ? 'steering-wheel' : 'user')} ${esc(e.kind)}${e.jobTitle ? ' · ' + esc(e.jobTitle) : ''}${e.city ? ' · ' + esc(e.city) : ''}${e.phone ? ` · <span class="num">${esc(e.phone)}</span>` : ''}</small>
        <small class="how">${e.idNumber ? `${icon('id')} <span class="num">${esc(e.idNumber)}</span>` : ''}${e.iban ? ` ${icon('building-bank')} <span class="num">${esc(e.iban)}</span>` : ''}
          ${x.dup ? ` <span class="pill info plain">${icon('copy')}موجود قبل كده</span>` : ''}${x.warn.map(w => ` <span class="pill warn plain">${icon('alert-triangle')}${esc(w)}</span>`).join('')}</small></div>
    </div>`; }).join('')}</div>
    <div class="banner" style="background:var(--info-bg);color:var(--info)">${icon('info-circle')}<div>كل موظف هياخد كود لوحده. <b>بعد الاستيراد كمّل بياناته</b>: الراتب، والقسم، ونوع التوظيف، ومكان الدوام، وطريقة الصرف${rows.some(x => x.emp.kind === 'سواق') ? '، والعربية اللي السواق بيسوقها' : ''}.</div></div>`;
  $$('.pq-row.pick', $('#gf-body')).forEach(r => r.onclick = ev => { const c = $('[data-gf]', r); if (c.disabled || ev.target === c) return; c.checked = !c.checked; c.onchange(); });
  $$('[data-gf]').forEach(c => c.onchange = () => { const i = +c.dataset.gf; c.checked ? GF.sel.add(i) : GF.sel.delete(i); c.closest('.pq-row').classList.toggle('on', c.checked); gfFoot(); });
  gfFoot();
}
function gfFoot() {
  $('#gf-foot').innerHTML = `<button class="btn primary" id="gf-go" ${GF.sel.size ? '' : 'disabled'}>${icon('user-plus')}ضيف ${GF.sel.size} موظف</button><button class="btn ghost" id="gf-back">${icon('arrow-right')}ملف تاني</button>`;
  $('#gf-back').onclick = () => gfPick();
  $('#gf-go').onclick = () => {
    const added = [];
    [...GF.sel].sort((a, b) => a - b).forEach(i => {
      const e = { ...GF.rows[i].emp, code: nextCode('employees') };
      [['nationality', 'nationalities'], ['city', 'cities'], ['bank', 'banks']].forEach(([k, list]) => { if (e[k] && DB.lists[list] && !DB.lists[list].includes(e[k])) DB.lists[list].push(e[k]); });
      DB.employees.push(e); added.push(e.code);
    });
    save(); closeLayer();
    if (location.hash !== '#employees/employees') location.hash = 'employees/employees'; else render();
    toast(`اتضاف ${added.length} موظف (${added[0]}${added.length > 1 ? ' → ' + added[added.length - 1] : ''}) · كمّل الراتب والعقد`);
  };
}
