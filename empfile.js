/* =====================================================================
   INQLHA – the employee's digital file as a PDF
   Profile, every field, the Iqama / ID and licence cards (the uploaded photo,
   or the card drawn from the data), documents and this year's attendance.
   Printed by the browser itself ("Save as PDF"): Arabic text stays sharp,
   correctly joined and selectable, which image-based PDF libraries get wrong.
   ===================================================================== */

function openEmpPDF(code) {
  const e = L.emp(code); if (!e) return;
  const has = k => !!(e.docs || {})[k];
  const panel = openLayer(`
    <div class="d-head"><span class="avatar lg sq">${icon('file-type-pdf')}</span><div class="t"><h2>الملف الرقمي للموظف</h2><p>${esc(nameOf(e))} · ${esc(e.code)}</p></div><button class="icon-btn" id="ep-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body">
      <p class="muted" style="margin:18px 0 12px">ملف PDF فيه كل بيانات الموظف، مترتب وجاهز للطباعة أو الإرسال. اختار اللي يتحط فيه:</p>
      <div class="ep-opts">
        <label class="ep-opt"><input type="checkbox" checked disabled><span>${icon('id')}<b>البيانات الشخصية والوظيفة</b><small>دايماً موجودة</small></span></label>
        <label class="ep-opt"><input type="checkbox" id="ep-cards" checked><span>${icon('wallet')}<b>الإقامة والرخصة</b><small>${has('iqama') || has('license') ? 'بصورة الكارت الأصلية' : 'مرسومة من البيانات'}</small></span></label>
        <label class="ep-opt"><input type="checkbox" id="ep-salary" checked><span>${icon('wallet')}<b>الراتب والبنك والسلف</b><small>بيانات حساسة</small></span></label>
        <label class="ep-opt"><input type="checkbox" id="ep-att" checked><span>${icon('fingerprint')}<b>ملخص الحضور ${todayStr().slice(0, 4)}</b><small>شهر بشهر</small></span></label>
        <label class="ep-opt"><input type="checkbox" id="ep-assets" checked><span>${icon('device-laptop')}<b>العُهد</b><small>الأجهزة والعربيات اللي معاه</small></span></label>
      </div>
      <div class="ep-how">${icon('info-circle')}<div>هتفتح نافذة الطباعة: اختار <b>Save as PDF</b> (أو <b>حفظ بتنسيق PDF</b>) ودوس <b>Save</b>. اسم الملف بيتكتب لوحده.</div></div>
      <p class="ep-status" id="ep-st" hidden></p>
    </div>
    <div class="d-foot"><button class="btn primary" id="ep-go">${icon('download')}اعمل ملف الـ PDF</button><button class="btn ghost" id="ep-cancel">إلغاء</button></div>`, 'drawer');
  $('#ep-x', panel).onclick = closeLayer; $('#ep-cancel', panel).onclick = closeLayer;
  $('#ep-go', panel).onclick = async () => {
    const opt = { cards: $('#ep-cards', panel).checked, salary: $('#ep-salary', panel).checked, att: $('#ep-att', panel).checked, assets: $('#ep-assets', panel).checked };
    const btn = $('#ep-go', panel), st = $('#ep-st', panel);
    btn.disabled = true; btn.innerHTML = `${icon('loader-2')}بيجهّز الملف...`;
    try { await makeEmpPDF(e, opt); closeLayer(); }
    catch (err) {
      console.error(err);
      btn.disabled = false; btn.innerHTML = `${icon('download')}اعمل ملف الـ PDF`;
      st.hidden = false; st.textContent = 'حصلت مشكلة وأنا بجهّز الملف. جرّب تاني.';
    }
  };
}

/* builds the file as its own page in a hidden frame and opens the print dialog */
async function makeEmpPDF(e, opt) {
  const r = withCalc('employees', e);
  const imgs = {};
  if (opt.cards) for (const k of ['iqama', 'license']) { const id = (e.docs || {})[k]; if (id) imgs[k] = await FILES.get(id).catch(() => ''); }
  let body;
  PDF_FULL = true;
  try { body = empPDFHTML(e, r, opt, imgs); } finally { PDF_FULL = false; }
  const name = `${e.code} - ${(e.nameEn || e.nameAr || '').trim()}`.replace(/[\\/:*?"<>|]/g, '');
  const css = new URL('styles.css?v=' + Date.now().toString(36), location.href).href;
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${css}">
    <style>
      @page { size: A4 portrait; margin: 12mm 11mm 16mm; }
      html, body { background: #fff !important; margin: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .epdf { width: auto; }
      .ep-hero, .ep-kpis, .ep-cardgrid, .ep-sign, tr, .kr { break-inside: avoid; }
      .ep-sec h3 { break-after: avoid; }
      .ep-foot { position: fixed; bottom: -10mm; left: 0; right: 0; display: flex; justify-content: space-between; font-size: 8.5px; color: #7a8f8d; border-top: 1px solid #e2eaea; padding-top: 3px; }
    </style></head>
    <body><div class="epdf">${body}</div><div class="ep-foot"><span>إنقلها · الملف الرقمي للموظف · سري</span><span>${esc(e.code)} · ${fmtDate(todayStr())}</span></div></body></html>`;
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(fr);
  await new Promise(res => { fr.onload = res; fr.srcdoc = html; });
  const doc = fr.contentDocument;
  if (doc.fonts && doc.fonts.ready) await Promise.race([doc.fonts.ready, new Promise(res => setTimeout(res, 2500))]);
  await Promise.all([...doc.images].map(im => im.complete ? 0 : new Promise(res => { im.onload = im.onerror = res; })));
  const oldTitle = document.title;
  document.title = name; /* Chrome uses the top page's title as the file name */
  try { fr.contentWindow.focus(); fr.contentWindow.print(); }
  finally { setTimeout(() => { document.title = oldTitle; }, 1500); setTimeout(() => fr.remove(), 60000); }
}

function empPDFHTML(e, r, opt, imgs) {
  const cur = curOf(r);
  const val = f => {
    const v = r[f.k];
    if (v === '' || v == null) return '';
    if (f.t === 'date') return fmtDate(v);
    if (f.t === 'emp') return empName(v);
    if (f.money) return num(v) ? `${fmtNum(v)} ${cur}` : "";
    return String(v);
  };
  /* the file is grouped the way people read it, not the way the form is laid out */
  const GROUPS = [
    ['البيانات الشخصية', ['nameAr', 'nameEn', 'nationality', 'dob', 'marital', 'dependents', 'bloodType', 'idNumber', 'iqamaExpiry', 'iqamaProfession', 'iqamaEmployer', 'iqamaIssuePlace', 'passportNo', 'passportExpiry']],
    ['التواصل والطوارئ', ['phone', 'companyEmail', 'personalEmail', 'city', 'emergencyName', 'emergencyRelation', 'emergencyPhone']],
    ['الوظيفة والعقد', ['code', 'kind', 'jobTitle', 'department', 'manager', 'status', 'empType', 'country', 'workLocation', 'saudizationCompany', 'saudizationFee', 'joinDate', 'contractYears', 'contractEnd', 'probationEnd', 'serviceYears', 'lastDay', 'leaveDays']],
    ['رخصة القيادة', ['licenseNo', 'licenseType', 'licenseIssue', 'licenseExpiry']],
    ['التأمينات والتأمين الطبي', ['gosi', 'gosiAmount', 'medicalClass', 'medicalExpiry']],
    ['الراتب والبنك', ['basic', 'housing', 'transport', 'cola', 'comms', 'other', 'total', 'advDeduction', 'net', 'currency', 'payMethod', 'bank', 'bankCode', 'iban', 'eos'], true],
  ];
  const SKIPK = ['photo', 'assignedCar', 'car', 'laptop', 'advRemaining'];
  const used = new Set(GROUPS.flatMap(g => g[1]));
  const rest = allFields('employees').filter(f => !used.has(f.k) && !SKIPK.includes(f.k)).map(f => f.k);
  if (rest.length) GROUPS.push(['بيانات أخرى', rest]);
  const sec = ([title, keys, money]) => {
    if (money && !opt.salary) return '';
    const rows = keys.map(k => fieldOf('employees', k)).filter(f => f && (!f.show || f.show(r)) && val(f) !== '');
    if (!rows.length) return '';
    return `<section class="ep-sec"><h3>${esc(title)}</h3><div class="ep-kv">${rows.map(f => `<div class="kr"><span>${esc(f.l)}</span><b>${esc(val(f))}</b></div>`).join('')}</div></section>`;
  };
  const secs = GROUPS;
  const svc = r.joinDate ? yearsSince(r.joinDate) : null;
  const li = leaveInfo(e);
  const y = todayStr().slice(0, 4);
  const months = Array.from({ length: +todayStr().slice(5, 7) }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
  const att = months.map(m => [m, attMonth(e, m)]).filter(([, s]) => s.work > 0);
  const tot = att.reduce((a, [, s]) => ({ work: a.work + s.work, absent: a.absent + s.absent, late: a.late + s.late, leave: a.leave + s.leave, sick: a.sick + s.sick, present: a.present + s.present }), { work: 0, absent: 0, late: 0, leave: 0, sick: 0, present: 0 });
  const totRate = tot.work - tot.leave - tot.sick > 0 ? Math.round((tot.present + tot.late) / (tot.work - tot.leave - tot.sick) * 100) : null;
  const card = k => imgs[k] ? `<img class="ep-cardimg" src="${imgs[k]}" alt="">` : (k === 'license' && !(e.licenseNo || e.licenseExpiry || e.kind === 'سواق')) ? '' : idCardHTML(e, k);
  const docs = [['الإقامة / الهوية', e.idNumber, e.iqamaExpiry], ['رخصة القيادة', e.licenseNo, e.licenseExpiry], ['جواز السفر', e.passportNo, e.passportExpiry], ['التأمين الطبي', e.medicalClass && 'فئة ' + e.medicalClass, e.medicalExpiry], ['العقد', e.contractYears && e.contractYears + ' سنة', r.contractEnd]].filter(d => d[1] || d[2]);
  const docState = d => { if (!d) return ['—', '']; const n = daysUntil(d); return n < 0 ? ['منتهي', 'bad'] : n <= 60 ? [`ينتهي ${daysTxt(n)}`, 'warn'] : ['ساري', 'ok']; };
  const cars = L.carOf(e.code), assets = L.assetsOf(e.code), advs = L.advancesOf(e.code);
  const logo = new URL('logo-wide.jpg', location.href).href;

  return `<div class="ep-page">
    <header class="ep-head"><div><h1>الملف الرقمي للموظف</h1><p>تاريخ الإصدار: ${fmtDate(todayStr())}</p></div><img src="${logo}" alt=""></header>
    <div class="ep-strip"></div>
    <div class="ep-hero">
      <div class="ep-photo" ${e.photo ? `style="background-image:url('${esc(e.photo)}')"` : ''}>${e.photo ? '' : esc(initials(nameOf(e)))}</div>
      <div class="ep-who"><h2>${esc(e.nameAr || '')}</h2>${e.nameEn ? `<div class="en">${esc(e.nameEn.toUpperCase())}</div>` : ''}
        <div class="ep-tags"><span>${esc(e.code)}</span>${e.status ? `<span class="st">${esc(e.status)}</span>` : ''}<span>${esc(e.kind || 'موظف')}</span>${e.empType ? `<span>${esc(e.empType)}</span>` : ''}</div>
        <div class="ep-meta">${[e.jobTitle, e.department, [e.workLocation, e.country].filter(Boolean).join(' · ')].filter(Boolean).map(esc).join('  ·  ')}</div></div>
    </div>
    <div class="ep-kpis">
      <div><small>مدة الخدمة</small><b>${svc != null ? (svc >= 1 ? svc.toFixed(1) + ' سنة' : Math.round(svc * 12) + ' شهر') : '—'}</b></div>
      <div><small>تاريخ الانضمام</small><b>${e.joinDate ? fmtDate(e.joinDate) : '—'}</b></div>
      <div><small>رصيد الإجازات ${y}</small><b>${li.left} من ${li.total} يوم</b></div>
      <div><small>نسبة الحضور ${y}</small><b>${totRate != null ? totRate + '%' : '—'}</b></div>
    </div>
    ${docs.length ? `<section class="ep-sec"><h3>المستندات</h3><table class="ep-docs"><tr><th>المستند</th><th>الرقم / التفاصيل</th><th>تاريخ الانتهاء</th><th>الحالة</th></tr>${docs.map(d => { const [t, c] = docState(d[2]); return `<tr><td>${esc(d[0])}</td><td class="num">${esc(d[1] || '—')}</td><td>${d[2] ? fmtDate(d[2]) : '—'}</td><td><span class="ep-st ${c}">${t}</span></td></tr>`; }).join('')}</table></section>` : ''}
    ${secs.map(sec).join('')}
    ${opt.cards ? `<section class="ep-sec ep-cards"><h3>الإقامة والرخصة</h3><div class="ep-cardgrid">
      ${['iqama', 'license'].map(k => { const c = card(k); return c ? `<div class="ep-card">${c}<div class="cap">${k === 'license' ? 'رخصة القيادة' : docTitle(e).ar} · ${imgs[k] ? 'صورة الكارت الأصلية' : 'من بيانات السيستم'}</div></div>` : ''; }).join('')}</div></section>` : ''}
    ${opt.att && att.length ? `<section class="ep-sec"><h3>ملخص الحضور ${y}</h3><table class="ep-att"><tr><th>الشهر</th><th>أيام الشغل</th><th>حضور</th><th>تأخير</th><th>إجازة</th><th>مرضي</th><th>غياب</th><th>النسبة</th></tr>
      ${att.map(([m, s]) => `<tr><td>${fmtMonth(m)}</td><td>${s.work}</td><td>${s.present}</td><td>${s.late}</td><td>${s.leave}</td><td>${s.sick}</td><td class="${s.absent ? 'bad' : ''}">${s.absent}</td><td><b>${s.rate != null ? s.rate + '%' : '—'}</b></td></tr>`).join('')}
      <tr class="tot"><td>الإجمالي</td><td>${tot.work}</td><td>${tot.present}</td><td>${tot.late}</td><td>${tot.leave}</td><td>${tot.sick}</td><td>${tot.absent}</td><td><b>${totRate != null ? totRate + '%' : '—'}</b></td></tr></table></section>` : ''}
    ${opt.salary && advs.length ? `<section class="ep-sec"><h3>السلف</h3><table class="ep-docs"><tr><th>الرقم</th><th>النوع</th><th>التاريخ</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th></tr>${advs.map(a => `<tr><td>${esc(a.code)}</td><td>${esc(a.loanType || '—')}</td><td>${a.date ? fmtDate(a.date) : '—'}</td><td>${fmtNum(a.amount)}</td><td>${fmtNum(a.paid)}</td><td><b>${fmtNum(advRemaining(a))}</b></td></tr>`).join('')}</table></section>` : ''}
    ${opt.assets && (cars.length || assets.length) ? `<section class="ep-sec"><h3>العُهد</h3><table class="ep-docs"><tr><th>النوع</th><th>التفاصيل</th><th>من تاريخ</th></tr>${cars.map(c => `<tr><td>سيارة ${esc(c.carType || '')}</td><td>${esc([c.brand, c.model, c.plate].filter(Boolean).join(' · '))}</td><td>${c.startDate ? fmtDate(c.startDate) : '—'}</td></tr>`).join('')}${assets.map(a => `<tr><td>${esc(a.type || '')}</td><td>${esc([a.brand, a.model, a.serial].filter(Boolean).join(' · '))}</td><td>${a.handoverDate ? fmtDate(a.handoverDate) : '—'}</td></tr>`).join('')}</table></section>` : ''}
    <div class="ep-sign"><div><span>توقيع الموظف</span></div><div><span>الموارد البشرية</span></div></div>
  </div>`;
}
