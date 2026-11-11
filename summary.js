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

/* ---------------- summary PDFs (same look as the payment request) ---------------- */
const SUM_ENTS = ['cars', 'properties', 'rentPayments'];
const money2 = n => num(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
function residentsText(s) {
  return String(s || '').split(/[\n،,]+/).map(x => x.trim()).filter(Boolean).map(x => { const e = L.emp(x); return e ? `${nameOf(e)} (${x})` : x; }).join('، ');
}
function dueTag(d, T) {
  const n = daysUntil(d); if (n == null) return '';
  if (n < 0) return `<i class="tag bad">${T('متأخرة')} ${-n} ${T('يوم')}</i>`;
  if (n <= 14) return `<i class="tag warn">${n === 0 ? T('النهارده') : `${T('بعد')} ${n} ${T('يوم')}`}</i>`;
  return '';
}
function lastRentPay(no) {
  return DB.rentPayments.filter(p => p.contractNo === no && p.payDate).sort((a, b) => b.payDate.localeCompare(a.payDate))[0];
}

/* the rent-payments summary asks for a period first */
function openSummary(ent, rows) {
  if (!rows.length) return toast('مفيش حاجة في القايمة تطلع في الملخص');
  if (ent !== 'rentPayments') return printSummary(ent, rows);
  const t = todayStr(), y = t.slice(0, 4), m = t.slice(0, 7);
  const ranges = [['الشهر ده', m + '-01', t], ['آخر 3 شهور', addMonths(t, -3), t], ['السنة دي', y + '-01-01', t], ['كل الدفعات', '', '']];
  const panel = openLayer(`<div class="d-head"><span class="avatar lg sq">${icon('file-type-pdf')}</span><div class="t"><h2>ملخص دفعات الإيجار</h2><p>اختار الفترة</p></div><button class="icon-btn" id="sm-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body"><p class="muted" style="margin:0 0 10px">الملخص هيطلع للدفعات اللي ظاهرة في القايمة (${rows.length}) في الفترة اللي تختارها.</p>
      <div class="choice-row" id="sm-r">${ranges.map((r, i) => `<button type="button" class="choice-pill ${i === 0 ? 'on' : ''}" data-i="${i}">${r[0]}</button>`).join('')}<button type="button" class="choice-pill" data-i="c">من تاريخ لتاريخ</button></div>
      <div class="sm-custom" id="sm-c" hidden><label>من<input type="date" class="input" id="sm-from" value="${m}-01"></label><label>إلى<input type="date" class="input" id="sm-to" value="${t}"></label></div>
      <div class="actions" style="margin-top:16px"><button class="btn primary" id="sm-go">${icon('download')}تحميل الملخص</button></div></div>`);
  let pick = '0';
  $('#sm-x', panel).onclick = closeLayer;
  $$('#sm-r .choice-pill', panel).forEach(b => b.onclick = () => { pick = b.dataset.i; $$('#sm-r .choice-pill', panel).forEach(x => x.classList.toggle('on', x === b)); $('#sm-c', panel).hidden = pick !== 'c'; });
  $('#sm-go', panel).onclick = () => {
    const [label, from, to] = pick === 'c' ? ['', $('#sm-from', panel).value, $('#sm-to', panel).value] : ranges[+pick];
    const sel = rows.filter(r => (!from || (r.payDate || '') >= from) && (!to || (r.payDate || '') <= to));
    if (!sel.length) return toast('مفيش دفعات في الفترة دي');
    closeLayer();
    printSummary(ent, sel, label || `${from || '…'} → ${to || '…'}`, from, to);
  };
}

async function printSummary(ent, rows, rangeLabel = '', from = '', to = '') {
  const en = LANG === 'en', T = s => esc(tr(s));
  const logo = new URL('logo-wide.jpg', location.href).href;
  const title = { cars: 'ملخص إيجارات السيارات', properties: 'ملخص إيجارات السكن والمكاتب', rentPayments: 'ملخص دفعات الإيجار' }[ent];
  const R = ' ' + T('ر.س');
  let stats = [], body = '';

  if (ent === 'cars') {
    toast('بيجهز صور العربيات...');
    const pics = await Promise.all(rows.map(r => carPhoto(carRow(r.contractNo) || r).catch(() => '')));
    const monthly = rows.reduce((s, r) => s + num(r.price), 0);
    const next = rows.map(r => r.nextPayment).filter(Boolean).sort()[0];
    stats = [['عدد السيارات', rows.length], ['إجمالي الإيجار الشهري', money2(monthly) + R], ['أقرب دفعة', next ? fmtDate(next) : '—']];
    body = rows.map((r, n) => {
      const lp = lastRentPay(r.contractNo);
      const name = [r.brand, r.model, r.year].filter(Boolean).join(' ');
      return `<div class="car"><div class="ph">${pics[n] ? `<img src="${pics[n]}" alt="">` : `<span>${T('مفيش صورة')}</span>`}</div>
        <div class="in"><div class="top"><div><b>${esc(name || r.carType || '—')}</b><small>${T(r.carType || '')}${r.color ? ' · ' + esc(r.color) : ''} · <span class="plate">${esc(r.plate || '')}</span>${r.city ? ' · ' + T(r.city) : ''}</small></div>
          <div class="amt"><b><span class="num">${money2(r.price)}</span>${R}</b><small>${T('شهري')}${r.payPeriod && r.payPeriod !== 'شهري' ? ` · ${T(r.payPeriod)}: <span class="num">${money2(r.periodAmount)}</span>` : ''}</small></div></div>
          <dl><div><dt>${T('المعرض / مكتب الإيجار')}</dt><dd>${esc(r.rentalOffice || '—')}</dd></div>
            <div><dt>${T('مين راكبها')}</dt><dd>${r.driver ? `${esc(empName(r.driver))} <span class="muted">${esc(r.driver)}</span>` : '—'}</dd></div>
            <div><dt>${T('الدفعة الجاية')}</dt><dd>${r.nextPayment ? `<span class="num">${esc(r.nextPayment)}</span> ${dueTag(r.nextPayment, T)}` : '—'}</dd></div>
            <div><dt>${T('آخر دفعة')}</dt><dd>${lp ? `<span class="num">${esc(lp.payDate)}</span> · <span class="num">${money2(lp.amount)}</span>${R}` : '—'}</dd></div></dl>
          ${r.status && r.status !== 'ساري' ? `<i class="tag bad">${T(r.status)}</i>` : ''}</div></div>`;
    }).join('');
  }

  if (ent === 'properties') {
    const monthly = rows.reduce((s, r) => s + num(r.price), 0);
    const next = rows.map(r => r.nextPayment).filter(Boolean).sort()[0];
    stats = [['عدد العقارات', rows.length], ['إجمالي الإيجار الشهري', money2(monthly) + R], ['أقرب دفعة', next ? fmtDate(next) : '—']];
    body = rows.map((r, n) => {
      const lp = lastRentPay(r.contractNo);
      return `<div class="item"><span class="n">${n + 1}</span><div><b>${T(r.propType || '')} ${T(r.city || '')}</b><small>${esc(r.address || '')}${r.address ? ' · ' : ''}${esc(r.contractNo)}</small>
        <dl><div><dt>${T('المؤجر')}</dt><dd>${esc(r.landlord || '—')}</dd></div>
          <div><dt>${T('مدة الدفع')}</dt><dd>${T(r.payPeriod || '—')} · <span class="num">${money2(r.periodAmount)}</span>${R}</dd></div>
          <div><dt>${T('الدفعة الجاية')}</dt><dd>${r.nextPayment ? `<span class="num">${esc(r.nextPayment)}</span> ${dueTag(r.nextPayment, T)}` : '—'}</dd></div>
          <div><dt>${T('آخر دفعة')}</dt><dd>${lp ? `<span class="num">${esc(lp.payDate)}</span>` : '—'}</dd></div>
          <div><dt>${T('نهاية العقد')}</dt><dd>${r.endDate ? `<span class="num">${esc(r.endDate)}</span>` : '—'}</dd></div>
          ${r.residents ? `<div class="wide"><dt>${T('الساكنين')}</dt><dd>${esc(residentsText(r.residents))}</dd></div>` : ''}</dl>
        ${r.status && r.status !== 'ساري' ? `<i class="tag bad">${T(r.status)}</i>` : ''}</div>
        <div class="amt"><b><span class="num">${money2(r.price)}</span>${R}</b><small>${T('شهري')}</small></div></div>`;
    }).join('');
  }

  if (ent === 'rentPayments') {
    rows = rows.slice().sort((a, b) => String(a.payDate).localeCompare(String(b.payDate)));
    const isCar = r => findEntOfContract(r.contractNo) === 'cars';
    const total = rows.reduce((s, r) => s + num(r.amount), 0);
    const cars = rows.filter(isCar).reduce((s, r) => s + num(r.amount), 0);
    stats = [['عدد الدفعات', rows.length], ['دفعات السيارات', money2(cars) + R], ['دفعات السكن والمكاتب', money2(total - cars) + R]];
    body = `<table><thead><tr><th>#</th><th>${T('العقد')}</th><th>${T('تاريخ الدفع')}</th><th>${T('الفترة')}</th><th>${T('طريقة الدفع')}</th><th>${T('المبلغ')}</th></tr></thead><tbody>
      ${rows.map((r, n) => `<tr><td>${n + 1}</td><td><b>${T(contractLabel(r.contractNo))}</b><small>${esc(r.contractNo)} · ${T(isCar(r) ? 'سيارة' : 'سكن / مكتب')}</small></td><td class="num">${esc(r.payDate || '—')}</td><td class="num">${r.from || r.to ? `${esc(r.from || '…')} → ${esc(r.to || '…')}` : '—'}</td><td>${T(r.method || '—')}</td><td class="num"><b>${money2(r.amount)}</b></td></tr>`).join('')}
      </tbody></table>
      <div class="total"><span>${T('الإجمالي')}</span><b><span class="num">${money2(total)}</span>${R}</b></div>`;
  }
  if (ent !== 'rentPayments') {
    const tot = rows.reduce((s, r) => s + num(r.price), 0);
    body += `<div class="total"><span>${T('إجمالي الإيجار الشهري')}</span><b><span class="num">${money2(tot)}</span>${R}</b></div>`;
  }

  const html = `<!DOCTYPE html><html lang="${en ? 'en' : 'ar'}" dir="${en ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"><title>${T(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "IBM Plex Sans Arabic", system-ui, sans-serif; color: #0e2423; margin: 0; font-size: 11px; }
    header { display: flex; align-items: center; justify-content: space-between; background: #014546; color: #fff; border-radius: 10px; padding: 14px 18px; }
    header img { height: 44px; } header h1 { margin: 0; font-size: 19px; font-weight: 600; } header p { margin: 2px 0 0; color: rgba(255,255,255,.7); }
    .strip { height: 3px; background: #55f47f; border-radius: 2px; margin: 6px 0 12px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
    .stats div { background: #f3f7f7; border-radius: 8px; padding: 8px 12px; } .stats small { display: block; color: #5d7473; } .stats b { font-size: 14px; font-weight: 600; }
    .num { direction: ltr; unicode-bidi: embed; font-variant-numeric: tabular-nums; }
    .muted { color: #5d7473; }
    .car { display: grid; grid-template-columns: 46mm 1fr; gap: 12px; padding: 10px; border-radius: 10px; margin-bottom: 8px; background: #f3f7f7; break-inside: avoid; }
    .car .ph { background: #fff; border-radius: 8px; height: 32mm; display: grid; place-items: center; overflow: hidden; }
    .car .ph img { width: 100%; height: 100%; object-fit: cover; } .car .ph span { color: #8aa09e; }
    .top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
    .top b, .item > div > b { font-size: 13px; font-weight: 600; } .top small, .item small { display: block; color: #5d7473; margin-top: 2px; }
    .plate { background: #fff; border: 1px solid #c9d6d5; border-radius: 4px; padding: 0 5px; color: #0e2423; }
    .amt { text-align: end; white-space: nowrap; } .amt b { font-size: 14px; font-weight: 600; display: block; } .amt small { color: #5d7473; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin: 8px 0 0; }
    dl div { background: #fff; border-radius: 6px; padding: 4px 8px; } dl .wide { grid-column: 1 / -1; }
    dt { color: #5d7473; font-size: 9.5px; } dd { margin: 0; font-weight: 500; }
    .item { display: grid; grid-template-columns: 26px 1fr auto; gap: 10px; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; background: #f3f7f7; break-inside: avoid; }
    .item .n { width: 24px; height: 24px; border-radius: 50%; background: #014546; color: #fff; display: grid; place-items: center; font-size: 10px; }
    .tag { font-style: normal; font-size: 9.5px; border-radius: 4px; padding: 1px 6px; margin-inline-start: 4px; display: inline-block; }
    .tag.bad { background: #fde3e3; color: #a32020; } .tag.warn { background: #fff3dc; color: #8a5300; }
    .car > .in > .tag { margin: 6px 0 0; }
    table { width: 100%; border-collapse: separate; border-spacing: 0 4px; } th { text-align: start; color: #5d7473; font-weight: 500; font-size: 10px; padding: 0 8px; }
    td { background: #f3f7f7; padding: 7px 8px; } td:first-child { border-radius: 0 6px 6px 0; } td:last-child { border-radius: 6px 0 0 6px; }
    [dir=ltr] td:first-child { border-radius: 6px 0 0 6px; } [dir=ltr] td:last-child { border-radius: 0 6px 6px 0; }
    td small { display: block; color: #5d7473; } tr { break-inside: avoid; }
    .total { display: flex; justify-content: space-between; align-items: center; background: #014546; color: #fff; border-radius: 8px; padding: 12px 16px; margin-top: 10px; font-size: 13px; break-inside: avoid; }
    .total b { color: #55f47f; font-size: 18px; }
    footer { margin-top: 18px; color: #8aa09e; font-size: 9px; display: flex; justify-content: space-between; }
  </style></head><body>
  <header><div><h1>${T(title)}</h1><p>${T('التاريخ')}: <span class="num">${todayStr()}</span>${rangeLabel ? ` · ${T('الفترة')}: ${T(rangeLabel)}` : ''}</p></div><img src="${logo}" alt="INQLHA"></header><div class="strip"></div>
  <div class="stats">${stats.map(([l, v]) => `<div><small>${T(l)}</small><b>${v}</b></div>`).join('')}</div>
  ${body}
  <footer><span>INQLHA · ${T(title)}</span><span class="num">${todayStr()}</span></footer></body></html>`;

  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(fr);
  fr.onload = () => { const imgs = [...fr.contentDocument.images]; Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => {}) : 0)).then(() => setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { alert('مقدرتش أفتح الطباعة. جرّب من متصفح تاني.'); } setTimeout(() => fr.remove(), 60000); }, 500)); };
  fr.srcdoc = html;
  toast('اختار "Save as PDF" من نافذة الطباعة');
}
