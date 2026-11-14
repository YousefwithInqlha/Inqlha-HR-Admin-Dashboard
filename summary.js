/* ---------------- rentals: car photos + summary PDFs ----------------
   A car's photo is looked up on Wikipedia by brand + model (free, no key), or uploaded
   by hand. Either way it is kept in the file store (FILES) under car.photoId. */

const CAR_KEEP = ['photoId', 'photoQ', 'photoN', 'photoMine'];
const BRAND_EN = { 'تويوتا': 'Toyota', 'هيونداي': 'Hyundai', 'هونداي': 'Hyundai', 'نيسان': 'Nissan', 'كيا': 'Kia', 'شيفروليه': 'Chevrolet', 'شفروليه': 'Chevrolet', 'فورد': 'Ford', 'هوندا': 'Honda', 'مازدا': 'Mazda', 'ميتسوبيشي': 'Mitsubishi', 'متسوبيشي': 'Mitsubishi', 'إيسوزو': 'Isuzu', 'ايسوزو': 'Isuzu', 'سوزوكي': 'Suzuki', 'جي ام سي': 'GMC', 'جمس': 'GMC', 'لكزس': 'Lexus', 'مرسيدس': 'Mercedes-Benz', 'بي ام دبليو': 'BMW', 'رينو': 'Renault', 'بيجو': 'Peugeot', 'شانجان': 'Changan', 'جيلي': 'Geely', 'إم جي': 'MG', 'ام جي': 'MG', 'هافال': 'Haval', 'شيري': 'Chery', 'فولكس فاجن': 'Volkswagen', 'دودج': 'Dodge', 'جيب': 'Jeep', 'هينو': 'Hino', 'فوتون': 'Foton', 'جاك': 'JAC' };
const MODEL_EN = { 'كامري': 'Camry', 'كورولا': 'Corolla', 'يارس': 'Yaris', 'هايلكس': 'Hilux', 'هايلوكس': 'Hilux', 'لاندكروزر': 'Land Cruiser', 'لاند كروزر': 'Land Cruiser', 'هايس': 'HiAce', 'هاي اس': 'HiAce', 'راف فور': 'RAV4', 'النترا': 'Elantra', 'إلنترا': 'Elantra', 'اكسنت': 'Accent', 'أكسنت': 'Accent', 'سوناتا': 'Sonata', 'توسان': 'Tucson', 'صني': 'Sunny', 'التيما': 'Altima', 'باترول': 'Patrol', 'نافارا': 'Navara', 'ريو': 'Rio', 'سيراتو': 'Cerato', 'بيكانتو': 'Picanto', 'تاهو': 'Tahoe', 'سلفرادو': 'Silverado', 'كابرس': 'Caprice', 'اكسبلورر': 'Explorer', 'إف 150': 'F-150', 'سيفيك': 'Civic', 'اكورد': 'Accord', 'ديماكس': 'D-Max', 'دي ماكس': 'D-Max' };
const carQuery = c => [c.brand, c.model].map(s => String(s || '').trim()).filter(Boolean).join(' ');
const toEn = (s, map) => { s = String(s || '').trim(); return map[s] || s; };

async function wikiCarImages(c) {
  const out = [];
  /* with no model, a brand alone finds the company's headquarters, so add the kind of vehicle */
  const truck = c.carType === 'ساطحة';
  const kindAr = c.model ? '' : truck ? 'شاحنة' : 'سيارة', kindEn = c.model ? '' : truck ? 'truck' : 'car';
  const tries = [['en', [toEn(c.brand, BRAND_EN), toEn(c.model, MODEL_EN), kindEn].filter(Boolean).join(' ')], ['ar', [carQuery(c), kindAr].filter(Boolean).join(' ')]];
  for (const [lang, q] of tries) {
    if (!q) continue;
    const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=8&prop=pageimages&piprop=thumbnail&pithumbsize=900&gsrsearch=${encodeURIComponent(q)}`;
    try {
      const j = await (await fetch(u)).json();
      Object.values((j.query || {}).pages || {}).sort((a, b) => a.index - b.index)
        .forEach(p => { const s = p.thumbnail && p.thumbnail.source; if (s && !/\.svg/i.test(s) && !out.some(x => x.s === s)) out.push({ s, t: p.title }); });
    } catch (e) { /* offline or blocked: try the next */ }
  }
  /* the brand's own article shows its building or logo, so it goes last */
  const isBrand = t => [c.brand, toEn(c.brand, BRAND_EN)].some(b => b && String(t).trim().toLowerCase() === String(b).trim().toLowerCase());
  return [...out.filter(x => !isBrand(x.t)), ...out.filter(x => isBrand(x.t))].map(x => x.s);
}
/* draws a remote image onto a white canvas and returns a JPEG data URL */
function imgToData(src, max = 900) {
  return new Promise((res, rej) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
      try { res(cv.toDataURL('image/jpeg', 0.85)); } catch (e) { rej(e); }
    };
    img.onerror = () => rej('load');
    img.src = src;
  });
}
const CAR_TRIED = {};
const carRow = no => DB.cars.find(c => c.contractNo === no);
async function carSetPhoto(c, data, extra) {
  const id = c.photoId || `car-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  await FILES.put(id, data); FILES.cache[id] = data;
  Object.assign(c, { photoId: id }, extra); save();
}
/* finds (or skips to the next) Wikipedia photo; returns true when the car got one */
async function carFindPhoto(c, next = false) {
  const q = carQuery(c); if (!q) return false;
  const list = await wikiCarImages(c);
  if (!list.length) return false;
  let n = next ? (num(c.photoN) + 1) % list.length : 0;
  for (let k = 0; k < list.length; k++, n = (n + 1) % list.length) {
    try { await carSetPhoto(c, await imgToData(list[n]), { photoQ: q, photoN: n, photoMine: false }); return true; } catch (e) { /* try the next picture */ }
  }
  return false;
}
/* the photo to show; looks one up the first time, and again when brand/model changed */
async function carPhoto(c, lookup = true) {
  if (c.photoId && (c.photoMine || c.photoQ === carQuery(c))) { try { const d = await FILES.get(c.photoId); if (d) return d; } catch (e) {} }
  if (!lookup || c.photoMine) return '';
  if (CAR_TRIED[c.contractNo] === carQuery(c)) return '';
  const ok = await carFindPhoto(c).catch(() => false);
  if (!ok) { CAR_TRIED[c.contractNo] = carQuery(c); return ''; }
  return FILES.get(c.photoId).catch(() => '');
}

/* photo box at the top of a car's detail panel */
function carPhotoBoxHTML(c) {
  return `<div class="car-photo" id="car-photo" data-car="${esc(c.contractNo)}">
    <div class="cp-img" id="cp-img"><span class="cp-empty">${icon('loader-2')}بيدور على صورة ${esc(carQuery(c) || 'العربية')}...</span></div>
    <div class="cp-acts">
      <label class="btn sm">${icon('photo-up')}ارفع صورة<input type="file" accept="image/*" hidden id="cp-up"></label>
      ${carQuery(c) ? `<button class="btn sm ghost" id="cp-next">${icon('refresh')}دوّر تاني</button>` : ''}
      <small class="cp-note" id="cp-note"></small>
    </div></div>`;
}
function bindCarPhotoBox(panel, c) {
  const box = $('#cp-img', panel), note = $('#cp-note', panel);
  const show = d => {
    box.innerHTML = d ? `<img src="${d}" alt="${esc(carQuery(c))}">` : `<span class="cp-empty">${icon('car')}${carQuery(c) ? 'مالقيتش صورة للموديل ده. ارفع صورة العربية' : 'اكتب الماركة والموديل أو ارفع صورة'}</span>`;
    note.textContent = d ? (c.photoMine ? 'صورة العربية نفسها' : 'صورة عامة للموديل من ويكيبيديا، ممكن لونها يختلف') : '';
  };
  carPhoto(c).then(show);
  $('#cp-up', panel).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const u = await readUpload(f); if (u.type !== 'img') throw 'اختار صورة مش PDF'; await carSetPhoto(c, u.data, { photoMine: true, photoQ: carQuery(c) }); show(u.data); toast('اتحفظت صورة العربية'); }
    catch (err) { alert(typeof err === 'string' ? err : 'مقدرتش أحفظ الصورة'); }
  };
  if ($('#cp-next', panel)) $('#cp-next', panel).onclick = async () => {
    box.innerHTML = `<span class="cp-empty">${icon('loader-2')}بيدور...</span>`;
    const ok = await carFindPhoto(c, !c.photoMine && !!c.photoId).catch(() => false);
    if (ok) show(await FILES.get(c.photoId)); else { show(''); toast('مالقيتش صورة تانية'); }
  };
}

/* ---------------- rental summaries: a popup picks Excel or PDF, the period and the columns ----------------
   Both files follow the payroll summary's design, and every cell is centered. */
const SUM_ENTS = ['employees', 'cars', 'properties', 'rentPayments'];
/* salary amounts are in the employee's own currency; Saudization fees are always in riyals */
const CUR_UNIT = { 'ريال': 'ر.س', 'جنيه': 'ج.م' };
const empCur = r => r.currency || 'ريال';
/* who goes into the employees summary: picked in the popup, prefilled from the page's filters */
const EMP_SUM_FILTERS = ['empType', 'saudizationCompany', 'status', 'country', 'workLocation', 'department', 'manager', 'nationality'];
const money2 = n => num(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
function residentsText(s, lang = LANG) {
  return String(s || '').split(/[\n،,]+/).map(x => x.trim()).filter(Boolean).map(x => { const e = L.emp(x); return e ? `${nameIn(lang, e)} (${x})` : x; }).join(lang === 'en' ? ', ' : '، ');
}
function dueTag(d, T, en = LANG === 'en') {
  const n = daysUntil(d); if (n == null) return '';
  if (n < 0) return `<i class="tag bad">${en ? `${-n} day${n === -1 ? '' : 's'} late` : `متأخرة ${-n} يوم`}</i>`;
  if (n <= 14) return `<i class="tag warn">${n === 0 ? (en ? 'Today' : 'النهارده') : en ? `in ${n} day${n === 1 ? '' : 's'}` : `بعد ${n} يوم`}</i>`;
  return '';
}
function lastRentPay(no) {
  return DB.rentPayments.filter(p => p.contractNo === no && p.payDate).sort((a, b) => b.payDate.localeCompare(a.payDate))[0];
}
const carName = r => [r.brand, r.model, r.year].filter(Boolean).join(' ');
const isCarPay = r => findEntOfContract(r.contractNo) === 'cars';

/* the columns each summary can show.
   on: picked by default · money: summed in the total row · date · pdf: PDF only · v: the value (default r[k]) */
const SUM_COLS = {
  cars: [
    { k: 'photo', l: 'صورة العربية', on: true, pdf: true },
    { k: 'car', l: 'السيارة', on: true, v: r => carName(r) || r.carType },
    { k: 'carType', l: 'نوع السيارة', on: true },
    { k: 'plate', l: 'رقم السيارة', on: true },
    { k: 'color', l: 'اللون' },
    { k: 'city', l: 'المدينة', on: true },
    { k: 'driver', l: 'مين راكبها', on: true, v: r => r.driver ? (nameIn('ar', L.emp(r.driver)) || r.driver) : '' },
    { k: 'rentalOffice', l: 'مكتب الإيجار', on: true },
    { k: 'officeIban', l: 'IBAN مكتب الإيجار' },
    { k: 'price', l: 'الإيجار الشهري', on: true, money: true },
    { k: 'payPeriod', l: 'مدة الدفع' },
    { k: 'periodAmount', l: 'المبلغ في الفترة', money: true },
    { k: 'nextPayment', l: 'الدفعة الجاية', on: true, date: true },
    { k: 'lastPay', l: 'آخر دفعة', date: true, v: r => (lastRentPay(r.contractNo) || {}).payDate },
    { k: 'startDate', l: 'بداية الإيجار', date: true },
    { k: 'endDate', l: 'نهاية العقد', date: true },
    { k: 'regExpiry', l: 'انتهاء الاستمارة', date: true },
    { k: 'insuranceExpiry', l: 'انتهاء التأمين', date: true },
    { k: 'status', l: 'حالة العقد', on: true },
    { k: 'contractNo', l: 'رقم العقد' },
  ],
  properties: [
    { k: 'contractNo', l: 'رقم العقد' },
    { k: 'propType', l: 'النوع', on: true },
    { k: 'city', l: 'المدينة', on: true },
    { k: 'address', l: 'العنوان' },
    { k: 'residents', l: 'الساكنين', v: r => residentsText(r.residents, 'ar') },
    { k: 'landlord', l: 'المؤجر', on: true },
    { k: 'landlordIban', l: 'IBAN المؤجر' },
    { k: 'price', l: 'الإيجار الشهري', on: true, money: true },
    { k: 'payPeriod', l: 'مدة الدفع', on: true },
    { k: 'periodAmount', l: 'المبلغ في الفترة', on: true, money: true },
    { k: 'nextPayment', l: 'الدفعة الجاية', on: true, date: true },
    { k: 'lastPay', l: 'آخر دفعة', date: true, v: r => (lastRentPay(r.contractNo) || {}).payDate },
    { k: 'startDate', l: 'بداية العقد', date: true },
    { k: 'endDate', l: 'نهاية العقد', on: true, date: true },
    { k: 'status', l: 'حالة العقد', on: true },
  ],
  employees: [
    { k: 'code', l: 'كود الموظف', on: true },
    { k: 'nameAr', l: 'الاسم بالعربي', on: true },
    { k: 'nameEn', l: 'الاسم بالإنجليزي' },
    { k: 'nationality', l: 'الجنسية' },
    { k: 'idNumber', l: 'رقم الهوية / الإقامة' },
    { k: 'iqamaExpiry', l: 'انتهاء الإقامة', date: true },
    { k: 'jobTitle', l: 'المسمى الوظيفي', on: true },
    { k: 'department', l: 'القسم' },
    { k: 'manager', l: 'المدير المباشر', v: r => r.manager ? (nameIn('ar', L.emp(r.manager)) || r.manager) : '' },
    { k: 'empType', l: 'نوع التوظيف', on: true },
    { k: 'saudizationCompany', l: 'شركة السعودة', on: true },
    { k: 'workLocation', l: 'مكان الدوام' },
    { k: 'city', l: 'المدينة' },
    { k: 'joinDate', l: 'تاريخ الانضمام', date: true },
    { k: 'status', l: 'حالة الموظف', on: true },
    { k: 'basic', l: 'الراتب الأساسي', on: true, money: true, cur: true },
    { k: 'housing', l: 'بدل سكن', money: true, cur: true },
    { k: 'transport', l: 'بدل تنقلات', money: true, cur: true },
    { k: 'cola', l: 'بدل غلاء معيشة', money: true, cur: true },
    { k: 'comms', l: 'بدل اتصالات', money: true, cur: true },
    { k: 'other', l: 'بدلات أخرى', money: true, cur: true },
    { k: 'total', l: 'إجمالي الراتب', money: true, cur: true },
    { k: 'saudizationFee', l: 'رسوم السعودة الشهرية', on: true, money: true, v: r => r.empType === 'سعودة' ? r.saudizationFee : '' },
    { k: 'gosiAmount', l: 'اشتراك التأمينات', money: true, v: r => r.gosi === 'نعم' ? r.gosiAmount : '' },
    { k: 'currency', l: 'عملة الراتب' },
    { k: 'payMethod', l: 'طريقة الصرف' },
    { k: 'bank', l: 'البنك' },
    { k: 'iban', l: 'IBAN' },
    { k: 'phone', l: 'الموبايل' },
  ],
  rentPayments: [
    { k: 'code', l: 'رقم الدفعة' },
    { k: 'contract', l: 'العقد', on: true, v: (r, lang) => { const car = DB.cars.find(x => x.contractNo === r.contractNo); return lang === 'en' && car ? `Car ${car.plate}` : contractLabel(r.contractNo); } },
    { k: 'contractNo', l: 'رقم العقد' },
    { k: 'kind', l: 'النوع', on: true, v: (r, lang) => lang === 'en' ? (isCarPay(r) ? 'Car' : 'Housing / office') : (isCarPay(r) ? 'سيارة' : 'سكن / مكتب') },
    { k: 'payDate', l: 'تاريخ الدفع', on: true, date: true },
    { k: 'from', l: 'الفترة من', on: true, date: true },
    { k: 'to', l: 'الفترة إلى', on: true, date: true },
    { k: 'method', l: 'طريقة الدفع', on: true },
    { k: 'amount', l: 'المبلغ', on: true, money: true },
    { k: 'notes', l: 'ملاحظات' },
  ],
};
const SUM_TITLE = { employees: 'ملخص الموظفين', cars: 'ملخص إيجارات السيارات', properties: 'ملخص إيجارات السكن والمكاتب', rentPayments: 'ملخص دفعات الإيجار' };
const SUM_FILE = { employees: 'Employees summary', cars: 'Car rentals summary', properties: 'Housing & offices rent summary', rentPayments: 'Rent payments summary' };
/* the file can be in Arabic or English whatever language the screen is in */
const fileTr = (lang, s) => { if (lang !== 'en' || s == null) return s; s = String(s); if (!AR.test(s)) return s; const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0]; return lead + trCore(s.trim()) + trail; };
const nameIn = (lang, e) => (e && ((lang === 'en' && e.nameEn) || e.nameAr)) || '';
const SUM_OK = ['ساري', 'على رأس العمل'];
const unitOf = (c, o) => c.cur ? (o.mixed ? '' : o.curUnit || 'ر.س') : 'ر.س';
const sumVal = (c, r, lang = LANG) => { const v = c.v ? c.v(r, lang) : r[c.k]; return v == null ? '' : v; };

/* the last choices are remembered per page, in this browser only */
const SUM_PREF_KEY = 'inqlha-sum-prefs';
function sumPrefs(ent) { try { return (JSON.parse(localStorage.getItem(SUM_PREF_KEY)) || {})[ent] || null; } catch (e) { return null; } }
function sumSavePrefs(ent, p) { try { const all = JSON.parse(localStorage.getItem(SUM_PREF_KEY)) || {}; all[ent] = p; localStorage.setItem(SUM_PREF_KEY, JSON.stringify(all)); } catch (e) { /* private window */ } }

/* the KPIs at the top of both files */
function sumStats(ent, rows, lang = LANG) {
  const R = fileTr(lang, 'ر.س');
  if (ent === 'rentPayments') {
    const total = rows.reduce((s, r) => s + num(r.amount), 0), cars = rows.filter(isCarPay).reduce((s, r) => s + num(r.amount), 0);
    return [['عدد الدفعات', rows.length], ['دفعات السيارات', `${money2(cars)} ${R}`], ['دفعات السكن والمكاتب', `${money2(total - cars)} ${R}`], ['الإجمالي', `${money2(total)} ${R}`, 1]];
  }
  if (ent === 'employees') {
    const curs = [...new Set(rows.map(empCur))];
    const per = k => curs.map(c => `${money2(rows.filter(r => empCur(r) === c).reduce((s, r) => s + num(r[k]), 0))} ${fileTr(lang, CUR_UNIT[c] || c)}`).join(' + ');
    const fee = rows.filter(r => r.empType === 'سعودة').reduce((s, r) => s + num(r.saudizationFee), 0);
    return [['عدد الموظفين', rows.length], ['إجمالي الأساسي', per('basic')], ['رسوم السعودة الشهرية', `${money2(fee)} ${R}`], ['إجمالي الرواتب', per('total'), 1]];
  }
  const monthly = rows.reduce((s, r) => s + num(r.price), 0);
  const next = rows.map(r => r.nextPayment).filter(Boolean).sort()[0];
  const late = rows.filter(r => r.nextPayment && daysUntil(r.nextPayment) < 0).length;
  return [[ent === 'cars' ? 'عدد السيارات' : 'عدد العقارات', rows.length], ['أقرب دفعة', next ? fileTr(lang, fmtDate(next)) : '—'], ['دفعات متأخرة', late], ['إجمالي الإيجار الشهري', `${money2(monthly)} ${R}`, 1]];
}

function openSummary(ent, rows) {
  const isEmp = ent === 'employees';
  if (isEmp) rows = DB.employees; /* the popup's own filters decide who goes in */
  if (!rows.length) return toast('مفيش حاجة في القايمة تطلع في الملخص');
  rows = rows.map(r => withCalc(ent, r));
  const flt = {};
  if (isEmp) EMP_SUM_FILTERS.forEach(k => { if (UI.filters && UI.filters[k]) flt[k] = UI.filters[k]; });
  const fOpts = k => { const f = fieldOf('employees', k); const vals = [...new Set([...(f.o ? options(f.o) : []), ...rows.map(r => r[k]).filter(Boolean)])]; return k === 'manager' ? vals.filter(v => L.emp(v)).map(v => [v, nameIn('ar', L.emp(v))]) : vals.map(v => [v, v]); };
  const filtered = () => rows.filter(r => Object.entries(flt).every(([k, v]) => !v || r[k] === v));
  const cols = SUM_COLS[ent], pref = sumPrefs(ent) || {};
  const picked = new Set(pref.cols || cols.filter(c => c.on).map(c => c.k));
  const st = { fmt: pref.fmt || 'pdf', lang: pref.lang || LANG, range: '0', sign: pref.sign !== false };
  const isPay = ent === 'rentPayments';
  const t = todayStr(), y = t.slice(0, 4), m = t.slice(0, 7);
  const ranges = [['الشهر ده', m + '-01', t], ['آخر 3 شهور', addMonths(t, -3), t], ['السنة دي', y + '-01-01', t], ['كل الدفعات', '', '']];

  const panel = openLayer(`<div class="d-head"><span class="avatar lg sq">${icon('file-download')}</span><div class="t"><h2>${SUM_TITLE[ent]}</h2><p>${isEmp ? 'الموظفين اللي هيطلعوا في الملف' : isPay ? 'الدفعات اللي ظاهرة في القايمة دلوقتي' : 'العقود اللي ظاهرة في القايمة دلوقتي'} <b class="num" id="sm-n">${rows.length}</b></p></div><button class="icon-btn" id="sm-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body sm-body">
      <section class="sm-sec"><h4>${icon('file-export')}الصيغة</h4>
        <div class="fmt sm-fmt">
          <button type="button" class="xl" data-fmt="xlsx">${icon('file-spreadsheet')}<b>Excel</b><small>جدول تقدر تعدّل فيه</small></button>
          <button type="button" class="pdf" data-fmt="pdf">${icon('file-type-pdf')}<b>PDF</b><small>ملف منسق للطباعة والإرسال</small></button>
        </div></section>
      <section class="sm-sec"><h4>${icon('language')}لغة الملف</h4>
        <div class="choice-row" id="sm-lang"><button type="button" class="choice-pill" data-lang="ar">عربي</button><button type="button" class="choice-pill" data-lang="en">English</button></div></section>
      ${isEmp ? `<section class="sm-sec"><h4>${icon('filter')}مين يطلع في الملف <span class="sm-links"><button type="button" class="link-btn" id="sm-fclear">كل الموظفين</button></span></h4>
        <div class="sm-filters">${EMP_SUM_FILTERS.map(k => `<label><span>${fieldOf('employees', k).l}</span><select class="select" data-sf="${k}"><option value="">الكل</option>${fOpts(k).map(([v, l]) => `<option value="${esc(v)}" ${flt[k] === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div></section>` : ''}
      ${isPay ? `<section class="sm-sec"><h4>${icon('calendar')}الفترة</h4>
        <div class="choice-row" id="sm-r">${ranges.map((r, i) => `<button type="button" class="choice-pill ${i === 0 ? 'on' : ''}" data-i="${i}">${r[0]}</button>`).join('')}<button type="button" class="choice-pill" data-i="c">من تاريخ لتاريخ</button></div>
        <div class="sm-custom" id="sm-c" hidden><label>من<input type="date" class="input" id="sm-from" value="${m}-01"></label><label>إلى<input type="date" class="input" id="sm-to" value="${t}"></label></div></section>` : ''}
      <section class="sm-sec"><h4>${icon('list-check')}البيانات اللي تطلع في الملف <span class="sm-links"><button type="button" class="link-btn" id="sm-all">الكل</button><button type="button" class="link-btn" id="sm-def">الأساسي</button></span></h4>
        <div class="sm-cols" id="sm-cols">${cols.map(c => `<label class="sm-col ${c.pdf ? 'pdf-only' : ''}"><input type="checkbox" value="${c.k}" ${picked.has(c.k) ? 'checked' : ''}><span>${c.l}</span>${c.pdf ? `<small>PDF بس</small>` : ''}</label>`).join('')}</div></section>
      <section class="sm-sec"><h4>${icon('adjustments')}إضافات</h4>
        <label class="sm-col sm-wide pdf-only"><input type="checkbox" id="sm-sign" ${st.sign ? 'checked' : ''}><span>خانات التوقيع في الآخر (أعدّه · مدير الموارد البشرية · اعتمده)</span><small>PDF بس</small></label>
        <label class="sm-note">ملاحظة تظهر في الملف (اختياري)<textarea class="input" id="sm-note" rows="2" placeholder="مثال: ملخص لطلب تجديد العقود"></textarea></label></section>
    </div>
    <div class="d-foot"><button class="btn primary" id="sm-go">${icon('download')}<span id="sm-go-t"></span></button><button class="btn ghost" id="sm-cancel">إلغاء</button><span class="note" id="sm-count"></span></div>`, 'modal');

  const boxes = () => $$('#sm-cols input', panel);
  const sync = () => {
    $$('[data-fmt]', panel).forEach(b => b.classList.toggle('on', b.dataset.fmt === st.fmt));
    $$('[data-lang]', panel).forEach(b => { b.classList.toggle('on', b.dataset.lang === st.lang); b.setAttribute('aria-pressed', b.dataset.lang === st.lang); });
    panel.classList.toggle('is-xlsx', st.fmt === 'xlsx');
    $('#sm-go-t', panel).textContent = tr(st.fmt === 'pdf' ? 'تحميل PDF' : 'تحميل Excel');
    const n = boxes().filter(b => b.checked && !(st.fmt === 'xlsx' && cols.find(c => c.k === b.value).pdf)).length;
    $('#sm-count', panel).textContent = `${n} ${tr('خانة')}`;
    const cnt = isEmp ? filtered().length : rows.length;
    $('#sm-n', panel).textContent = cnt;
    $('#sm-go', panel).disabled = !n || !cnt;
  };
  $$('[data-sf]', panel).forEach(x => x.onchange = () => { flt[x.dataset.sf] = x.value; x.classList.toggle('set', !!x.value); sync(); });
  $$('[data-sf]', panel).forEach(x => x.classList.toggle('set', !!x.value));
  if (isEmp) $('#sm-fclear', panel).onclick = () => { $$('[data-sf]', panel).forEach(x => { x.value = ''; x.classList.remove('set'); flt[x.dataset.sf] = ''; }); sync(); };
  $$('[data-fmt]', panel).forEach(b => b.onclick = () => { st.fmt = b.dataset.fmt; sync(); });
  $$('[data-lang]', panel).forEach(b => b.onclick = () => { st.lang = b.dataset.lang; sync(); });
  boxes().forEach(b => b.onchange = sync);
  $('#sm-all', panel).onclick = () => { boxes().forEach(b => b.checked = true); sync(); };
  $('#sm-def', panel).onclick = () => { boxes().forEach(b => b.checked = !!cols.find(c => c.k === b.value).on); sync(); };
  $('#sm-x', panel).onclick = $('#sm-cancel', panel).onclick = closeLayer;
  if (isPay) $$('#sm-r .choice-pill', panel).forEach(b => b.onclick = () => { st.range = b.dataset.i; $$('#sm-r .choice-pill', panel).forEach(x => x.classList.toggle('on', x === b)); $('#sm-c', panel).hidden = st.range !== 'c'; });
  sync();

  $('#sm-go', panel).onclick = () => {
    const keys = boxes().filter(b => b.checked).map(b => b.value);
    let use = cols.filter(c => keys.includes(c.k) && !(st.fmt === 'xlsx' && c.pdf));
    let sel = isEmp ? filtered() : rows, rangeLabel = '';
    const extra = {};
    if (isEmp) {
      if (!sel.length) return toast('مفيش موظفين بالفلتر ده');
      /* filters say what the file is about, e.g. "سعودة · شركة سعودة (أ)" */
      rangeLabel = EMP_SUM_FILTERS.filter(k => flt[k]).map(k => k === 'manager' ? nameIn('ar', L.emp(flt[k])) : flt[k]).join(' · ');
      const curs = [...new Set(sel.map(empCur))];
      extra.rangeTitle = 'الفلتر'; extra.mixed = curs.length > 1; extra.curUnit = CUR_UNIT[curs[0]] || curs[0];
      /* different currencies: show which one each salary is in, and don't add them up */
      if (extra.mixed && use.some(c => c.cur) && !use.some(c => c.k === 'currency')) { const i = use.findIndex(c => c.cur); use = [...use.slice(0, i), cols.find(c => c.k === 'currency'), ...use.slice(i)]; }
    }
    if (isPay) {
      const [label, from, to] = st.range === 'c' ? ['', $('#sm-from', panel).value, $('#sm-to', panel).value] : ranges[+st.range];
      sel = rows.filter(r => (!from || (r.payDate || '') >= from) && (!to || (r.payDate || '') <= to)).sort((a, b) => String(a.payDate).localeCompare(String(b.payDate)));
      if (!sel.length) return toast('مفيش دفعات في الفترة دي');
      rangeLabel = label ? fileTr(st.lang, label) : `${from || '…'} → ${to || '…'}`;
    }
    const opts = { cols: use, lang: st.lang, sign: $('#sm-sign', panel).checked, note: $('#sm-note', panel).value.trim(), rangeLabel, ...extra };
    sumSavePrefs(ent, { fmt: st.fmt, lang: st.lang, cols: keys, sign: opts.sign });
    closeLayer();
    if (st.fmt === 'xlsx') rentSummaryXlsx(ent, sel, opts); else rentSummaryPDF(ent, sel, opts);
  };
}

/* ---------- Excel: same styling as the payroll summary, everything centered ---------- */
function rentSummaryXlsx(ent, rows, o) {
  if (!window.XLSX) return alert('مكتبة Excel محتاجة نت. جرّب PDF أو اتأكد من الاتصال.');
  const en = o.lang === 'en', cols = o.cols, W = cols.length + 1, tr = s => fileTr(o.lang, s);
  const cell = (c, r) => { const v = sumVal(c, r, o.lang); return c.money ? (v === '' ? '' : round2(num(v))) : c.tv ? tr(v) : v; };
  const head = ['#', ...cols.map(c => tr(c.l))];
  const body = rows.map((r, i) => [i + 1, ...cols.map(c => cell(c, r))]);
  const totalRow = [tr('الإجمالي'), ...cols.map(c => c.money && !(o.mixed && c.cur) ? round2(rows.reduce((s, r) => s + num(sumVal(c, r, o.lang)), 0)) : '')];
  const hasMoney = cols.some(c => c.money);
  const meta = [`${tr('التاريخ')}: ${todayStr()}`, o.rangeLabel && `${tr(o.rangeTitle || 'الفترة')}: ${o.rangeLabel}`, `${tr('العدد')}: ${rows.length}`].filter(Boolean).join('   ·   ');
  const stats = sumStats(ent, rows, o.lang);

  const aoa = [[`INQLHA · ${tr(SUM_TITLE[ent])}`], [meta]];
  if (o.note) aoa.push([o.note]);
  aoa.push([]);
  const H = aoa.length; aoa.push(head, ...body);
  const last = H + body.length; let totR = -1;
  if (hasMoney) { totR = aoa.length; aoa.push(totalRow); }
  aoa.push([]);
  const statR = aoa.length; stats.forEach(([l, v]) => aoa.push([tr(l), '', v]));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const span = (r, c1, c2) => ({ s: { r, c: c1 }, e: { r, c: c2 } });
  const merges = [span(0, 0, W - 1), span(1, 0, W - 1)];
  if (o.note) merges.push(span(2, 0, W - 1));
  stats.forEach((_, i) => merges.push(span(statR + i, 0, 1), span(statR + i, 2, Math.max(3, Math.min(W - 1, 4)))));
  ws['!merges'] = merges;

  const line = { style: 'thin', color: { rgb: 'D5E3E2' } }, border = { top: line, bottom: line, left: line, right: line };
  const font = (x = {}) => ({ name: 'Calibri', sz: 11, color: { rgb: '0E2423' }, ...x });
  const center = { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: en ? 0 : 2 };
  const set = (r, c, s) => { const ref = XLSX.utils.encode_cell({ r, c }); if (!ws[ref]) ws[ref] = { t: 's', v: '' }; ws[ref].s = { alignment: center, ...s }; };
  set(0, 0, { font: font({ sz: 16, bold: true, color: { rgb: '014546' } }) });
  set(1, 0, { font: font({ sz: 10, color: { rgb: '5F7674' } }) });
  if (o.note) set(2, 0, { font: font({ sz: 10, italic: true, color: { rgb: '8A5300' } }), fill: { fgColor: { rgb: 'FFF8EA' } } });
  for (let c = 0; c < W; c++) {
    const col = cols[c - 1] || {};
    set(H, c, { fill: { fgColor: { rgb: '014546' } }, font: font({ bold: true, color: { rgb: 'FFFFFF' }, sz: 10.5 }), border: { ...border, top: { style: 'thin', color: { rgb: '0B6062' } }, bottom: { style: 'thin', color: { rgb: '0B6062' } } } });
    for (let r = H + 1; r <= last; r++) {
      const row = rows[r - H - 1], v = col.k ? sumVal(col, row, o.lang) : '';
      const late = col.k === 'nextPayment' && v && daysUntil(v) < 0, off = col.k === 'status' && v && !SUM_OK.includes(v);
      set(r, c, { font: font({ bold: !!col.money, color: { rgb: late || off ? 'A32020' : '0E2423' } }), border, numFmt: col.money ? '#,##0.00' : undefined,
        fill: { fgColor: { rgb: late || off ? 'FDE3E3' : col.money ? 'E9F9EF' : (r - H) % 2 ? 'FFFFFF' : 'F6FAF9' } } });
    }
    if (totR > 0) set(totR, c, { font: font({ bold: true, color: { rgb: '014546' } }), border, numFmt: '#,##0.00', fill: { fgColor: { rgb: 'D5E8E7' } } });
  }
  stats.forEach(([, , hl], i) => { const r = statR + i; for (let c = 0; c <= Math.max(3, Math.min(W - 1, 4)); c++) set(r, c, { border, font: font({ bold: c >= 2 || !!hl, color: { rgb: c >= 2 ? '014546' : '0E2423' } }), fill: { fgColor: { rgb: hl ? 'D5E8E7' : 'ECF5F4' } } }); });

  /* width from the longest value in each column */
  const len = v => String(v ?? '').length;
  ws['!cols'] = head.map((h, c) => ({ wch: Math.min(40, Math.max(c ? 12 : 6, len(h) + 4, ...body.map(r => len(typeof r[c] === 'number' ? money2(r[c]) : r[c]) + 3))) }));
  ws['!rows'] = []; ws['!rows'][0] = { hpt: 30 }; ws['!rows'][1] = { hpt: 18 }; ws['!rows'][H] = { hpt: 30 };
  ws['!freeze'] = { xSplit: 0, ySplit: H + 1 };
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: !en }] };
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  XLSX.writeFile(wb, `INQLHA - ${en ? SUM_FILE[ent] : SUM_TITLE[ent]} - ${todayStr()}.xlsx`);
  toast('اتنزل الملخص Excel');
}

/* ---------- PDF: the payroll summary's design (header, KPIs, table, total, signatures), everything centered ---------- */
async function rentSummaryPDF(ent, rows, o) {
  const en = o.lang === 'en', T = s => esc(fileTr(o.lang, s)), cols = o.cols;
  const logo = new URL('logo-wide.jpg', location.href).href;
  const R = ' ' + T('ر.س');
  const photoCol = cols.some(c => c.k === 'photo');
  let pics = [];
  if (photoCol) { toast('بيجهز صور العربيات...'); pics = await Promise.all(rows.map(r => carPhoto(carRow(r.contractNo) || r).catch(() => ''))); }
  const landscape = cols.length > 7;

  const td = (c, r, n) => {
    if (c.k === 'photo') return `<td class="ph">${pics[n] ? `<img src="${pics[n]}" alt="">` : `<span>${T('مفيش صورة')}</span>`}</td>`;
    const v = sumVal(c, r, o.lang);
    if (v === '' || v == null) return '<td class="mut">—</td>';
    if (c.money) return `<td class="amt"><span class="num">${money2(v)}</span></td>`;
    if (c.date) return `<td><span class="num">${esc(v)}</span>${c.k === 'nextPayment' ? dueTag(v, T, en) : ''}</td>`;
    if (c.k === 'status') return `<td><i class="tag ${SUM_OK.includes(v) ? 'ok' : 'bad'}" dir="auto">${esc(v)}</i></td>`;
    if (c.k === 'plate') return `<td><span class="plate">${esc(v)}</span></td>`;
    if (/Iban/.test(c.k) || c.k === 'contractNo' || c.k === 'code') return `<td><span class="num">${esc(v)}</span></td>`;
    if (c.k === 'car' || c.k === 'contract') return `<td><b dir="auto">${esc(v)}</b></td>`;
    return `<td class="${c.k === 'residents' || c.k === 'address' || c.k === 'notes' ? 'wrap' : ''}"><span dir="auto">${c.tv ? T(v) : esc(v)}</span></td>`;
  };
  const money = cols.filter(c => c.money);
  const foot = money.length ? `<tfoot><tr><td>${T('الإجمالي')}</td>${cols.map(c => c.money && !(o.mixed && c.cur) ? `<td><span class="num">${money2(rows.reduce((s, r) => s + num(sumVal(c, r, o.lang)), 0))}</span> ${T(unitOf(c, o))}</td>` : '<td></td>').join('')}</tr></tfoot>` : '';
  const stats = sumStats(ent, rows, o.lang);

  const html = `<!DOCTYPE html><html lang="${en ? 'en' : 'ar'}" dir="${en ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"><title>INQLHA - ${en ? SUM_FILE[ent] : SUM_TITLE[ent]} - ${todayStr()}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "IBM Plex Sans Arabic", system-ui, sans-serif; color: #0e2423; margin: 0; font-size: ${landscape ? 9.5 : 10}px; text-align: center; background: #fff; }
    :root { color-scheme: light; }
    header { background: #014546; color: #fff; border-radius: 10px; padding: 12px 18px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    header img { height: 38px; border-radius: 4px; }
    header h1 { margin: 2px 0 0; font-size: 18px; font-weight: 600; }
    header p { margin: 0; color: rgba(255,255,255,.72); font-size: 10.5px; }
    .strip { height: 3px; background: #55f47f; border-radius: 2px; margin: 6px 0 10px; }
    .note { background: #fff8ea; color: #8a5300; border-radius: 8px; padding: 7px 12px; margin-bottom: 10px; font-size: 10.5px; }
    .kpis { display: grid; grid-template-columns: repeat(${stats.length}, 1fr); gap: 8px; margin-bottom: 10px; }
    .kpi { border: 1px solid #dfe9e8; border-radius: 8px; padding: 7px 10px; }
    .kpi small { color: #6b8381; display: block; font-size: 9px; } .kpi b { font-size: 13px; font-weight: 600; }
    .kpi.hl { background: #014546; color: #fff; border-color: #014546; } .kpi.hl small { color: rgba(255,255,255,.7); } .kpi.hl b { color: #55f47f; }
    .num { direction: ltr; unicode-bidi: embed; font-variant-numeric: tabular-nums; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: center; vertical-align: middle; }
    th { background: #014546; color: #fff; font-weight: 500; padding: 6px 4px; border: 1px solid #0b6062; font-size: ${landscape ? 8.5 : 9}px; }
    td { padding: 5px 4px; border: 1px solid #e2eaea; background: #fff; }
    td.wrap { max-width: 150px; } td.mut { color: #9fb3b1; }
    td.amt { font-weight: 600; background: #e9f9ef !important; }
    td.ph { padding: 3px; width: 30mm; } td.ph img { width: 28mm; height: 18mm; object-fit: cover; border-radius: 5px; display: block; margin: 0 auto; } td.ph span { color: #9fb3b1; font-size: 8.5px; }
    tbody tr:nth-child(even) td { background: #f6faf9; }
    tr { break-inside: avoid; } thead { display: table-header-group; }
    tfoot td { background: #d5e8e7; font-weight: 600; color: #014546; }
    .plate { border: 1px solid #c9d6d5; border-radius: 4px; padding: 0 5px; background: #fff; white-space: nowrap; }
    .tag { font-style: normal; font-size: 8.5px; border-radius: 4px; padding: 1px 6px; display: inline-block; white-space: nowrap; }
    td .tag { margin-top: 2px; } td .num + .tag { display: block; width: max-content; margin: 2px auto 0; }
    .tag.ok { background: #e3f6ea; color: #1d6b3c; } .tag.bad { background: #fde3e3; color: #a32020; } .tag.warn { background: #fff3dc; color: #8a5300; }
    .sign { display: flex; gap: 24px; justify-content: center; margin-top: 34px; break-inside: avoid; }
    .sign div { width: 180px; border-top: 1px solid #9fb3b1; padding-top: 4px; color: #6b8381; }
    footer { margin-top: 14px; color: #8aa09e; font-size: 8.5px; }
  </style></head><body>
  <header><img src="${logo}" alt="INQLHA"><h1>${T(SUM_TITLE[ent])}</h1><p>${T('التاريخ')}: <span class="num">${todayStr()}</span>${o.rangeLabel ? ` · ${T(o.rangeTitle || 'الفترة')}: ${esc(o.rangeLabel)}` : ''} · ${T('العدد')}: ${rows.length}</p></header><div class="strip"></div>
  ${o.note ? `<div class="note">${esc(o.note)}</div>` : ''}
  <div class="kpis">${stats.map(([l, v, hl]) => `<div class="kpi ${hl ? 'hl' : ''}"><small>${T(l)}</small><b>${esc(v)}</b></div>`).join('')}</div>
  <table><thead><tr><th>#</th>${cols.map(c => `<th>${T(c.l)}${c.money && unitOf(c, o) ? `<br><small>(${T(unitOf(c, o))})</small>` : ''}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r, n) => `<tr><td>${n + 1}</td>${cols.map(c => td(c, r, n)).join('')}</tr>`).join('')}</tbody>${foot}</table>
  ${o.sign ? `<div class="sign"><div>${T('أعدّه')}</div><div>${T('مدير الموارد البشرية')}</div><div>${T('اعتمده')}</div></div>` : ''}
  <footer>INQLHA · ${T(SUM_TITLE[ent])} · <span class="num">${todayStr()}</span></footer></body></html>`;

  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(fr);
  fr.onload = () => { const imgs = [...fr.contentDocument.images]; Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => {}) : 0)).then(() => setTimeout(() => { printFrame(fr); }, 500)); };
  fr.srcdoc = html;
  toast('اختار "Save as PDF" من نافذة الطباعة');
}
