/* =====================================================================
   Payroll: wizard (category + month -> review -> confirm -> files),
   history, Mudad bank file and the designed salary summary.
   ===================================================================== */
const PR_CATS = {
  office: { label: 'موظفين المكتب', en: 'Office Employees (KSA)', sub: 'موظفين السعودية غير السعودة', icon: 'building', test: e => e.country === 'السعودية' && e.empType !== 'سعودة', mudad: true, cur: 'ر.س', curEn: 'SAR' },
  egypt: { label: 'موظفين مصر', en: 'Egypt Employees', sub: 'رواتب بالجنيه · تحويل بنكي', icon: 'world', test: e => e.country === 'مصر', mudad: false, cur: 'ج.م', curEn: 'EGP' },
  saud: { label: 'السعودة', en: 'Saudization', sub: 'موظفين شركات السعودة', icon: 'building-community', test: e => e.empType === 'سعودة', mudad: true, cur: 'ر.س', curEn: 'SAR' },
};
const LOAN_EN = { 'سلفة نقدية': 'Cash Loan', 'سلفة سكن': 'Housing Loan', 'أخرى': 'Loan' };
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_EN_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthBounds = m => { const [y, mo] = m.split('-').map(Number); const days = new Date(y, mo, 0).getDate(); return { start: `${m}-01`, end: `${m}-${String(days).padStart(2, '0')}`, days, y, mo }; };
const lineTotal = l => num(l.basic) + num(l.housing) + num(l.transport) + num(l.cola) + num(l.other) + num(l.overtime) + num(l.telecom);
const lineDed = l => num(l.loanDed) + num(l.otherDed);
const lineNet = l => round2(lineTotal(l) - num(l.attendance) - lineDed(l));
const lineAllDed = l => round2(num(l.attendance) + lineDed(l));
const runLines = run => run.lines.filter(l => l.include);
const runTitle = run => `${PR_CATS[run.cat].label} · ${fmtMonth(run.month)}`;

function eligible(cat, month) {
  const b = monthBounds(month);
  return DB.employees.filter(e => PR_CATS[cat].test(e))
    .filter(e => !e.joinDate || e.joinDate <= b.end)
    .filter(e => !INACTIVE.includes(e.status) || (e.lastDay && e.lastDay >= b.start));
}

/* one employee's salary line for a month, with automatic deductions */
function buildLine(e, month) {
  const b = monthBounds(month);
  const telecom = num(e.comms);
  const fixed = num(e.basic) + num(e.housing) + num(e.transport) + num(e.cola) + num(e.other) + telecom;
  const startIn = e.joinDate && e.joinDate >= b.start && e.joinDate <= b.end;
  const endIn = e.lastDay && e.lastDay >= b.start && e.lastDay <= b.end;
  const sd = startIn ? parseDate(e.joinDate).getDate() : 1;
  const ed = endIn ? parseDate(e.lastDay).getDate() : b.days;
  const worked = startIn || endIn ? Math.max(0, Math.min(30, ed - sd + 1)) : 30;
  const notes = [];
  if (startIn) notes.push(`Start Date : ${sd} ${MONTHS_EN[b.mo - 1]}`);
  if (endIn) notes.push(`End Date : ${ed} ${MONTHS_EN[b.mo - 1]}`);
  const absent = (DB.attendance || []).filter(a => a.empCode === e.code && a.type === 'غياب' && a.date >= b.start && a.date <= b.end && (!startIn || a.date >= e.joinDate) && (!endIn || a.date <= e.lastDay)).length;
  if (absent) notes.push(`Absence : ${absent} day${absent > 1 ? 's' : ''}`);
  const loans = L.advancesOf(e.code).filter(a => advRemaining(a) > 0).map(a => ({ code: a.code, amount: round2(Math.min(advMonthly(a), advRemaining(a))), type: a.loanType || 'سلفة نقدية' }));
  const loanTypes = [...new Set(loans.map(x => LOAN_EN[x.type] || 'Loan'))];
  if (loanTypes.length) notes.push(loanTypes.join(' + '));
  return {
    empCode: e.code, name: e.nameAr, nameEn: e.nameEn || '', nationality: e.nationality || '', position: e.jobTitle || '',
    basic: num(e.basic), housing: num(e.housing), transport: num(e.transport), cola: num(e.cola), other: num(e.other), telecom, overtime: 0,
    worked, attendance: round2(fixed * (30 - worked + absent) / 30), absent, loans, loanDed: round2(loans.reduce((s, x) => s + x.amount, 0)), otherDed: 0,
    note: notes.join(' + '), payMethod: e.payMethod || (e.country === 'السعودية' ? 'مدد' : 'تحويل'),
    bank: e.bank || '', bankCode: BANK_CODES[e.bank] || '', iban: e.iban || '', idNumber: e.idNumber || '', city: CITY_EN[e.city] || e.city || '', include: true,
  };
}
function lineWarnings(l, cat) {
  const w = [];
  if (PR_CATS[cat].mudad && l.payMethod === 'مدد') {
    if (!l.iban) w.push('ناقص IBAN');
    if (!l.bankCode) w.push('البنك مش معروف كوده');
    if (!l.idNumber) w.push('ناقص رقم الهوية/الإقامة');
  }
  if (lineNet(l) < 0) w.push('الصافي بالسالب');
  return w;
}

/* ---------------- history tab ---------------- */
function renderPayrollHistory(el) {
  const runs = [...DB.payrolls].sort((a, b) => b.month.localeCompare(a.month) || a.cat.localeCompare(b.cat));
  if (!runs.length) {
    el.innerHTML = `<div class="card"><div class="empty">${icon('file-invoice')}<b>لسه مفيش رواتب متصدرة</b>اضغط "إصدار ملف الرواتب" عشان تبدأ أول شهر<br><button class="btn primary" id="pr-first">${icon('file-invoice')}إصدار ملف الرواتب</button></div></div>`;
    $('#pr-first').onclick = () => openPayroll();
    return;
  }
  el.innerHTML = `<div class="card tbl-card"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>الشهر</th><th>الفئة</th><th>الموظفين</th><th class="hide-sm">الإجمالي</th><th class="hide-sm">الخصومات</th><th>الصافي</th><th>الحالة</th></tr></thead><tbody>
    ${runs.map(run => { const ls = runLines(run); const c = PR_CATS[run.cat]; const sum = fn => ls.reduce((s, l) => s + fn(l), 0);
      return `<tr data-run="${esc(run.id)}"><td><div class="cell-main"><span class="avatar sq">${icon('calendar-month')}</span><div><b>${fmtMonth(run.month)}</b><small>الصرف: ${fmtDate(run.payDate) || '—'}</small></div></div></td>
        <td>${icon(c.icon)} ${c.label}</td><td>${ls.length}</td><td class="hide-sm">${money(sum(lineTotal), c.cur)}</td><td class="hide-sm">${money(sum(lineAllDed), c.cur)}</td><td>${money(sum(lineNet), c.cur)}</td>
        <td>${run.status === 'مؤكد' ? `<span class="pill ok">مؤكد</span>` : `<span class="pill warn">مسودة</span>`}</td></tr>`; }).join('')}
  </tbody></table></div></div>`;
  $$('tr[data-run]', el).forEach(tr => tr.onclick = () => openPayroll(tr.dataset.run));
}

/* ---------------- wizard ---------------- */
let W = null;
function openPayroll(runId) {
  const existing = runId && DB.payrolls.find(r => r.id === runId);
  W = existing
    ? { step: existing.status === 'مؤكد' ? 3 : 2, cat: existing.cat, month: existing.month, payDate: existing.payDate, run: JSON.parse(JSON.stringify(existing)), onlyDed: false, dirty: false }
    : { step: 1, cat: 'office', month: todayStr().slice(0, 7), payDate: todayStr(), run: null, onlyDed: false, dirty: false };
  openLayer(`<div class="d-head"><span class="avatar lg sq">${icon('file-invoice')}</span><div class="t"><h2>إصدار ملف الرواتب</h2><p id="wz-sub"></p></div><button class="icon-btn" id="wz-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="steps" id="wz-steps"></div><div class="d-body" id="wz-body"></div><div class="d-foot" id="wz-foot"></div>`, 'drawer wide');
  $('#panel').style.width = 'min(1180px, 100vw)';
  layerGuard = () => !W.dirty || confirm('فيه تعديلات على الرواتب مش محفوظة. تقفل من غير حفظ؟');
  $('#wz-x').onclick = tryClose;
  wzRender();
}
function wzSteps() {
  const names = ['الفئة والشهر', 'مراجعة الرواتب', 'التأكيد والملفات'];
  $('#wz-steps').innerHTML = names.map((n, i) => `${i ? '<span class="step-line"></span>' : ''}<span class="step ${W.step === i + 1 ? 'on' : W.step > i + 1 ? 'done' : ''}"><span class="n">${W.step > i + 1 ? icon('check') : i + 1}</span>${n}</span>`).join('');
  $('#wz-sub').textContent = W.run ? `${runTitle(W.run)}${W.run.status === 'مؤكد' ? ' · مؤكد' : ''}` : 'اختار الفئة والشهر، راجع، وأكّد';
}
function wzRender() { wzSteps(); [null, wzStep1, wzStep2, wzStep3][W.step](); }
function findRun(cat, month) { return DB.payrolls.find(r => r.cat === cat && r.month === month); }
function saveRun(status) {
  W.run.status = status || W.run.status || 'مسودة';
  W.run.payDate = W.payDate;
  const i = DB.payrolls.findIndex(r => r.id === W.run.id);
  if (i >= 0) DB.payrolls[i] = JSON.parse(JSON.stringify(W.run)); else DB.payrolls.push(JSON.parse(JSON.stringify(W.run)));
  save(); W.dirty = false;
}

/* step 1: category + month */
function wzStep1() {
  const ex = findRun(W.cat, W.month);
  const n = eligible(W.cat, W.month).length;
  $('#wz-body').innerHTML = `
    <div class="d-section"><h4>1. اختار الفئة</h4>
      <div class="cat-grid">${Object.entries(PR_CATS).map(([k, c]) => `<button type="button" class="cat ${W.cat === k ? 'on' : ''}" data-cat="${k}"><span class="ico">${icon(c.icon)}</span><b>${c.label}</b><small>${c.sub}</small><small>${icon('users')} ${eligible(k, W.month).length} موظف${c.mudad ? ` · ${icon('building-bank')} ملف مدد` : ''}</small></button>`).join('')}</div></div>
    <div class="d-section"><h4>2. الشهر وتاريخ الصرف</h4>
      <div class="wz-row"><div class="f"><label for="wz-month">${icon('calendar-month')} شهر الرواتب</label><input type="month" id="wz-month" value="${W.month}"></div>
      <div class="f"><label for="wz-pay">${icon('calendar-dollar')} تاريخ الصرف</label><input type="date" id="wz-pay" value="${W.payDate}"></div></div></div>
    ${ex ? `<div class="banner ${ex.status === 'مؤكد' ? 'warn' : ''}" style="${ex.status === 'مؤكد' ? '' : 'background:var(--info-bg);color:var(--info)'}">${icon(ex.status === 'مؤكد' ? 'lock' : 'file-pencil')}<div>${ex.status === 'مؤكد' ? `<b>رواتب ${runTitle(ex)} اتأكدت قبل كده.</b> تقدر تفتحها وتنزّل ملفاتها.` : `<b>فيه مسودة محفوظة لـ ${runTitle(ex)}.</b> هتكمل منها.`}</div></div>` : ''}
    ${!n ? `<div class="banner warn">${icon('users')}<div>مفيش موظفين في الفئة دي للشهر ده.</div></div>` : ''}`;
  $$('[data-cat]').forEach(b => b.onclick = () => { W.cat = b.dataset.cat; wzStep1(); });
  $('#wz-month').onchange = e => { if (e.target.value) { W.month = e.target.value; wzStep1(); } };
  $('#wz-pay').onchange = e => { W.payDate = e.target.value; };
  $('#wz-foot').innerHTML = `<button class="btn primary" id="wz-next" ${n || ex ? '' : 'disabled'}>${ex && ex.status === 'مؤكد' ? 'فتح الرواتب المؤكدة' : 'مراجعة الرواتب'} ${icon('arrow-left')}</button><button class="btn ghost" id="wz-cancel">إلغاء</button><span class="note">${n} موظف في ${PR_CATS[W.cat].label} · ${fmtMonth(W.month)}</span>`;
  $('#wz-cancel').onclick = tryClose;
  $('#wz-next').onclick = () => {
    if (ex) { W.run = JSON.parse(JSON.stringify(ex)); W.payDate = W.payDate || ex.payDate; W.step = ex.status === 'مؤكد' ? 3 : 2; }
    else { W.run = { id: `PR-${W.month}-${W.cat}`, month: W.month, cat: W.cat, payDate: W.payDate, status: 'مسودة', createdAt: todayStr(), lines: eligible(W.cat, W.month).map(e => buildLine(e, W.month)) }; W.dirty = true; W.step = 2; }
    wzRender();
  };
}

/* step 2: review */
function wzStep2() {
  const c = PR_CATS[W.cat], cur = c.cur;
  const lines = W.run.lines;
  const dedCount = lines.filter(l => l.include && lineAllDed(l) > 0).length;
  $('#wz-body').innerHTML = `
    <div class="sumbar" id="wz-sum"></div>
    <div class="toolbar"><label class="only-ded"><input type="checkbox" id="wz-only" ${W.onlyDed ? 'checked' : ''}> ${icon('filter')} اللي عليهم خصم بس (${dedCount})</label><div class="grow"></div>
      <span class="result-count">${icon('info-circle')} الإضافي والخصومات والسبب بيتعدلوا من الجدول. خصم الحضور بيتحسب لوحده لو الموظف بدأ أو ساب في نص الشهر (على أساس 30 يوم).</span></div>
    <div class="card tbl-card"><div class="tbl-scroll"><table class="tbl pr-table"><thead><tr>
      <th style="width:1%">${icon('checkbox')}</th><th>الموظف</th><th>الإجمالي</th><th>إضافي</th><th>خصم حضور</th><th>سلفة</th><th>خصم آخر</th><th>سبب الخصم</th><th>الصافي</th><th>الصرف</th></tr></thead>
      <tbody>${lines.map((l, i) => wzRow(l, i, cur)).join('')}</tbody></table></div></div>`;
  wzSum();
  $('#wz-only').onchange = e => { W.onlyDed = e.target.checked; wzFilter(); };
  wzFilter();
  const body = $('#wz-body');
  body.oninput = e => {
    const el = e.target; const tr = el.closest('tr[data-l]'); if (!tr || !el.dataset.f) return;
    const l = lines[+tr.dataset.l];
    if (el.type === 'checkbox') l.include = el.checked; else l[el.dataset.f] = el.dataset.f === 'note' ? el.value : num(el.value);
    W.dirty = true;
    tr.classList.toggle('off', !l.include);
    tr.classList.toggle('has-ded', lineAllDed(l) > 0);
    $('[data-net]', tr).innerHTML = money(lineNet(l), cur);
    $('[data-tot]', tr).innerHTML = money(lineTotal(l), cur);
    $('[data-badge]', tr).innerHTML = dedBadge(l, cur);
    wzSum();
  };
  $('#wz-foot').innerHTML = `<button class="btn primary" id="wz-next">التأكيد ${icon('arrow-left')}</button><button class="btn" id="wz-save">${icon('device-floppy')}حفظ مسودة</button><button class="btn ghost" id="wz-back">${icon('arrow-right')}رجوع</button><span class="note" id="wz-note"></span>`;
  $('#wz-back').onclick = () => { if (W.dirty && !confirm('ترجع للخطوة الأولى؟ التعديلات هتفضل لحد ما تقفل.')) return; W.step = 1; wzRender(); };
  $('#wz-save').onclick = () => { saveRun('مسودة'); render(); toast('اتحفظت المسودة'); };
  $('#wz-next').onclick = () => { if (!runLines(W.run).length) return toast('اختار موظف واحد على الأقل'); saveRun('مسودة'); render(); W.step = 3; wzRender(); };
}
function dedBadge(l, cur) {
  const d = lineAllDed(l);
  return d > 0 ? `<span class="ded-badge" title="${esc(l.note || '')}">${icon('arrow-down-right')}عليه خصم ${fmtNum(d)} ${cur}</span>` : `<span class="ok-badge">${icon('circle-check')}مفيش خصم</span>`;
}
function wzRow(l, i, cur) {
  const e = L.emp(l.empCode) || {};
  const warn = lineWarnings(l, W.cat);
  const inp = (f, cls = '') => `<input class="cell ${cls}" data-f="${f}" type="${f === 'note' ? 'text' : 'number'}" ${f === 'note' ? '' : 'min="0" step="any"'} value="${esc(f === 'note' ? l.note : l[f] || '')}" placeholder="${f === 'note' ? 'مثال: غياب يومين' : '0'}" aria-label="${f}">`;
  return `<tr data-l="${i}" class="${l.include ? '' : 'off'} ${lineAllDed(l) > 0 ? 'has-ded' : ''}">
    <td><input type="checkbox" data-f="include" ${l.include ? 'checked' : ''} aria-label="ضمن الرواتب" style="width:17px;height:17px;accent-color:var(--brand)"></td>
    <td><div class="cell-main">${avatarHTML({ photo: e.photo, avatar: initials(l.name) })}<div><b>${esc(l.name)}</b><small>${esc(l.position || l.empCode)}</small><span data-badge>${dedBadge(l, cur)}</span></div></div></td>
    <td data-tot>${money(lineTotal(l), cur)}</td>
    <td>${inp('overtime')}</td>
    <td>${inp('attendance')}${l.worked < 30 ? `<span class="why">${icon('calendar-off')} اشتغل ${l.worked} يوم</span>` : ''}</td>
    <td>${l.loanDed ? `${money(l.loanDed, cur)}<span class="why">${esc([...new Set(l.loans.map(x => x.type))].join(' + '))}</span>` : '<span class="muted">—</span>'}</td>
    <td>${inp('otherDed')}</td>
    <td>${inp('note', 'txt')}</td>
    <td data-net style="font-weight:600">${money(lineNet(l), cur)}</td>
    <td>${l.payMethod === 'مدد' ? `<span class="pill info">${icon('building-bank')} مدد</span>` : `<span class="pill">${icon('transfer')} تحويل</span>`}${warn.length ? `<span class="why" style="color:var(--danger)" title="${esc(warn.join('، '))}">${icon('alert-triangle')} ${esc(warn[0])}</span>` : ''}</td></tr>`;
}
function wzFilter() { $$('tr[data-l]').forEach(tr => { const l = W.run.lines[+tr.dataset.l]; tr.hidden = W.onlyDed && !(lineAllDed(l) > 0); }); }
function wzSum() {
  const cur = PR_CATS[W.cat].cur; const ls = runLines(W.run); const sum = fn => ls.reduce((s, l) => s + fn(l), 0);
  const ded = ls.filter(l => lineAllDed(l) > 0);
  $('#wz-sum').innerHTML = [['الموظفين', `${ls.length} / ${W.run.lines.length}`, 'users'], ['إجمالي المستحقات', `${fmtNum(sum(lineTotal))} ${cur}`, 'sum'], ['إجمالي الخصومات', `${fmtNum(sum(lineAllDed))} ${cur}`, 'arrow-down-right'], ['عليهم خصم', `${ded.length} موظف`, 'user-minus'], ['صافي الرواتب', `${fmtNum(sum(lineNet))} ${cur}`, 'wallet', 'hl']]
    .map(([l, v, ic, hl]) => `<div class="fact ${hl || ''}"><small>${icon(ic)} ${l}</small><b class="num">${v}</b></div>`).join('');
}

/* step 3: confirm + files */
function wzStep3() {
  const run = W.run, c = PR_CATS[run.cat], cur = c.cur;
  const ls = runLines(run); const sum = (arr, fn) => arr.reduce((s, l) => s + fn(l), 0);
  const warns = ls.flatMap(l => lineWarnings(l, run.cat).map(w => [l.name, w]));
  const mudadLines = ls.filter(l => l.payMethod === 'مدد');
  const confirmed = run.status === 'مؤكد';
  const facts = `<div class="sumbar">${[['الموظفين', ls.length, 'users'], ['إجمالي المستحقات', `${fmtNum(sum(ls, lineTotal))} ${cur}`, 'sum'], ['الخصومات', `${fmtNum(sum(ls, lineAllDed))} ${cur}`, 'arrow-down-right'], ['رواتب مدد', `${fmtNum(sum(mudadLines, lineNet))} ${cur}`, 'building-bank'], ['رواتب تحويل', `${fmtNum(sum(ls.filter(l => l.payMethod !== 'مدد'), lineNet))} ${cur}`, 'transfer'], ['صافي الرواتب', `${fmtNum(sum(ls, lineNet))} ${cur}`, 'wallet', 'hl']]
    .map(([l, v, ic, hl]) => `<div class="fact ${hl || ''}"><small>${icon(ic)} ${l}</small><b class="num">${v}</b></div>`).join('')}</div>`;
  const dedList = ls.filter(l => lineAllDed(l) > 0);
  const dedHTML = dedList.length ? `<div class="d-section"><h4>${icon('user-minus')} الموظفين اللي عليهم خصم (${dedList.length})</h4><div class="rel">${dedList.map(l => `<div class="rel-item" style="cursor:default"><span class="avatar sq">${icon('arrow-down-right')}</span><div class="txt"><b>${esc(l.name)}</b><small>${esc(l.note || 'خصم')}</small></div>${money(lineAllDed(l), cur)}</div>`).join('')}</div></div>` : '';

  if (!confirmed) {
    $('#wz-body').innerHTML = facts + (warns.length ? `<div class="banner warn">${icon('alert-triangle')}<div><b>فيه ${warns.length} ملاحظة محتاجة مراجعة:</b><ul class="warn-list">${warns.map(([n, w]) => `<li>${icon('point')} ${esc(n)}: ${esc(w)}</li>`).join('')}</ul></div></div>` : `<div class="banner" style="background:var(--ok-bg);color:var(--ok)">${icon('circle-check')}<div>كل البيانات المطلوبة لملف البنك موجودة.</div></div>`) + dedHTML +
      `<label class="confirm-box"><input type="checkbox" id="wz-ok"><div><b>راجعت الرواتب وموافق عليها</b><br><small class="muted">بعد التأكيد: الرواتب هتتقفل، وأقساط السلف (${fmtNum(sum(ls, l => num(l.loanDed)))} ${cur}) هتتخصم من المتبقي على الموظفين، وتقدر تنزّل الملفات.</small></div></label>`;
    $('#wz-foot').innerHTML = `<button class="btn accent" id="wz-confirm" disabled>${icon('lock')}تأكيد الرواتب</button><button class="btn ghost" id="wz-back">${icon('arrow-right')}رجوع للمراجعة</button>`;
    $('#wz-ok').onchange = e => { $('#wz-confirm').disabled = !e.target.checked; };
    $('#wz-back').onclick = () => { W.step = 2; wzRender(); };
    $('#wz-confirm').onclick = () => {
      run.applied = [];
      ls.forEach(l => l.loans.forEach(x => { const a = DB.advances.find(v => v.code === x.code); if (!a) return; const amt = Math.min(x.amount, advRemaining(a)); a.paid = round2(num(a.paid) + amt); run.applied.push({ code: x.code, amount: amt }); }));
      run.confirmedAt = todayStr();
      saveRun('مؤكد'); render(); wzRender(); toast('اتأكدت الرواتب');
    };
    return;
  }
  $('#wz-body').innerHTML = `<div class="stamp">${icon('rosette-discount-check')} الرواتب مؤكدة · ${fmtDate(run.confirmedAt)}</div>` + facts + `
    <div class="out-grid">
      <div class="out-card"><div class="head"><span class="ico">${icon('building-bank')}</span><div><b>ملف مدد</b><p>للرفع على البنك · ${mudadLines.length} موظف · ${fmtNum(sum(mudadLines, lineNet))} ${cur}</p></div></div>
        ${c.mudad ? `<p>نفس شكل ملف مدد بالظبط: Bank, Account Number, Total Salary, ...</p><div class="fmt" style="grid-template-columns:1fr 1fr"><button class="xl" data-out="mudad-xlsx">${icon('file-spreadsheet')}Excel</button><button class="csv" data-out="mudad-csv">${icon('file-text')}CSV</button></div>`
          : `<p>${icon('info-circle')} موظفين مصر مش بيترفعوا على مدد. استخدم ملف الملخص.</p>`}</div>
      <div class="out-card"><div class="head"><span class="ico">${icon('report-money')}</span><div><b>ملف الملخص (Summary)</b><p>بتصميم إنقلها · كل البدلات والخصومات وأسبابها</p></div></div>
        <p>اختار الصيغة:</p><div class="fmt"><button class="xl" data-out="sum-xlsx">${icon('file-spreadsheet')}Excel</button><button class="pdf" data-out="sum-pdf">${icon('file-type-pdf')}PDF</button><button class="csv" data-out="sum-csv">${icon('file-text')}CSV</button></div></div>
    </div>` + dedHTML;
  $$('[data-out]').forEach(b => b.onclick = () => ({ 'mudad-xlsx': () => exportMudad(run, 'xlsx'), 'mudad-csv': () => exportMudad(run, 'csv'), 'sum-xlsx': () => exportSummaryXlsx(run), 'sum-pdf': () => printSummary(run), 'sum-csv': () => exportSummaryCsv(run) })[b.dataset.out]());
  $('#wz-foot').innerHTML = `<button class="btn primary" id="wz-done">${icon('check')}تم</button><button class="btn danger" id="wz-unlock">${icon('lock-open')}إلغاء التأكيد</button>`;
  $('#wz-done').onclick = closeLayer;
  $('#wz-unlock').onclick = () => {
    if (!confirm('إلغاء التأكيد هيرجّع أقساط السلف اللي اتخصمت، والرواتب ترجع مسودة. متأكد؟')) return;
    (run.applied || []).forEach(x => { const a = DB.advances.find(v => v.code === x.code); if (a) a.paid = Math.max(0, round2(num(a.paid) - x.amount)); });
    run.applied = []; run.confirmedAt = '';
    saveRun('مسودة'); render(); W.step = 2; wzRender(); toast('اتلغى التأكيد');
  };
}

/* ---------------- files ---------------- */
const fileBase = run => `${MONTHS_EN_FULL[monthBounds(run.month).mo - 1]} ${monthBounds(run.month).y} - ${PR_CATS[run.cat].en}`;
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
const r2 = n => round2(num(n));

function mudadRows(run) {
  const head = ['Bank', 'Account Number', 'Total Salary', 'Transaction Refrence', 'Employee Name', 'National ID/Iqama ID', 'Employee Address', 'Basic Salary', 'Housing Allowance', 'Other Earnings', 'Deduction'];
  const rows = runLines(run).filter(l => l.payMethod === 'مدد').map(l => [
    l.bankCode, l.iban, r2(lineNet(l)), 'Salary', l.nationality === 'سعودي' || !l.nameEn ? l.name : l.nameEn, l.idNumber, l.city || 'Riyadh',
    r2(l.basic), r2(l.housing), r2(num(l.transport) + num(l.cola) + num(l.other) + num(l.overtime) + num(l.telecom)), r2(lineAllDed(l))]);
  return [head, ...rows];
}
function exportMudad(run, fmt) {
  const rows = mudadRows(run);
  if (rows.length < 2) return toast('مفيش موظفين بطريقة صرف "مدد" في الشهر ده');
  const name = `Mudad ${fileBase(run)}`;
  if (fmt === 'csv') return download(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), name + '.csv'), toast('اتنزل ملف مدد CSV');
  if (!window.XLSX) return alert('مكتبة Excel محتاجة نت. جرّب CSV أو اتأكد من الاتصال.');
  const ws = XLSX.utils.aoa_to_sheet(rows);
  rows.forEach((r, i) => { if (!i) return; [1, 5].forEach(c => { const ref = XLSX.utils.encode_cell({ r: i, c }); if (ws[ref]) { ws[ref].t = 's'; ws[ref].v = String(ws[ref].v); } }); });
  ws['!cols'] = [8, 28, 12, 20, 34, 20, 16, 12, 18, 14, 11].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, name + '.xlsx'); toast('اتنزل ملف مدد');
}

const SUM_HEAD1 = ['S.N', 'Name', 'Position', 'Basic Salary', 'Housing Allowance', 'Transportation Allowance', 'Other Allowances', '', 'Over Time', 'Telecom', 'Total', 'Attendance Deduction', 'Deductions', 'Deduction Justification', 'Accrued salary'];
const SUM_HEAD2 = ['', '', '', '', '', '', 'COLA', 'Others', '', '', '', '', '', '', ''];
function summaryData(run) {
  const ls = runLines(run);
  const rows = ls.map((l, i) => [i + 1, l.nameEn || l.name, l.position || '-', r2(l.basic), r2(l.housing), r2(l.transport), r2(l.cola), r2(l.other), r2(l.overtime), r2(l.telecom), r2(lineTotal(l)), r2(l.attendance), r2(lineDed(l)), l.note || '-', r2(lineNet(l))]);
  const tot = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14].reduce((o, c) => (o[c] = r2(rows.reduce((s, r) => s + r[c], 0)), o), {});
  const totalRow = SUM_HEAD1.map((_, c) => c === 0 ? 'Total' : c in tot ? tot[c] : '');
  const mudad = r2(ls.filter(l => l.payMethod === 'مدد').reduce((s, l) => s + lineNet(l), 0));
  const transfer = r2(ls.filter(l => l.payMethod !== 'مدد').reduce((s, l) => s + lineNet(l), 0));
  return { ls, rows, totalRow, mudad, transfer };
}
function exportSummaryCsv(run) {
  const d = summaryData(run);
  const head = SUM_HEAD1.map((h, i) => i === 6 ? 'Other Allowances - COLA' : i === 7 ? 'Other Allowances - Others' : h);
  const out = [head, ...d.rows, d.totalRow, [], ['', tr('رواتب مدد'), '', d.mudad], ['', tr('رواتب تحويل'), '', d.transfer]];
  download(new Blob([toCsv(out)], { type: 'text/csv;charset=utf-8' }), `Inqlha Salaries - ${fileBase(run)}.csv`); toast('اتنزل الملخص CSV');
}
function exportSummaryXlsx(run) {
  if (!window.XLSX) return alert('مكتبة Excel محتاجة نت. جرّب CSV أو PDF.');
  const d = summaryData(run), c = PR_CATS[run.cat], b = monthBounds(run.month);
  const title = `INQLHA · Salaries ${MONTHS_EN_FULL[b.mo - 1]} ${b.y}`;
  const meta = `${c.en}  ·  Payment date: ${run.payDate || '-'}  ·  Currency: ${c.curEn}  ·  Employees: ${d.ls.length}`;
  const aoa = [[title], [meta], [], SUM_HEAD1, SUM_HEAD2, ...d.rows, d.totalRow, [], ['', tr('رواتب مدد'), '', d.mudad], ['', tr('رواتب تحويل'), '', d.transfer]];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const H = 3, first = 5, last = first + d.rows.length - 1, totR = last + 1;
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 14 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } }, { s: { r: H, c: 6 }, e: { r: H, c: 7 } }, { s: { r: totR, c: 0 }, e: { r: totR, c: 2 } }];
  [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14].forEach(col => merges.push({ s: { r: H, c: col }, e: { r: H + 1, c: col } }));
  [totR + 2, totR + 3].forEach(r => merges.push({ s: { r, c: 1 }, e: { r, c: 2 } }));
  ws['!merges'] = merges;
  const border = { top: { style: 'thin', color: { rgb: 'D5E3E2' } }, bottom: { style: 'thin', color: { rgb: 'D5E3E2' } }, left: { style: 'thin', color: { rgb: 'D5E3E2' } }, right: { style: 'thin', color: { rgb: 'D5E3E2' } } };
  const font = (o = {}) => ({ name: 'Calibri', sz: 11, color: { rgb: '0E2423' }, ...o });
  const set = (r, col, s) => { const ref = XLSX.utils.encode_cell({ r, c: col }); if (!ws[ref]) ws[ref] = { t: 's', v: '' }; ws[ref].s = s; };
  set(0, 0, { font: font({ sz: 16, bold: true, color: { rgb: '014546' } }), alignment: { vertical: 'center' } });
  set(1, 0, { font: font({ sz: 10, color: { rgb: '5F7674' } }) });
  for (let col = 0; col < 15; col++) {
    [H, H + 1].forEach(r => set(r, col, { fill: { fgColor: { rgb: '014546' } }, font: font({ bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }), alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { ...border, top: { style: 'thin', color: { rgb: '0B6062' } }, bottom: { style: 'thin', color: { rgb: '0B6062' } } } }));
    for (let r = first; r <= last; r++) {
      const line = d.ls[r - first]; const isDed = (col === 11 || col === 12 || col === 13) && lineAllDed(line) > 0;
      set(r, col, { font: font({ bold: col === 14 || col === 1 }), border, numFmt: col >= 3 && col !== 13 ? '#,##0.00' : undefined, alignment: { horizontal: col === 0 ? 'center' : col === 13 || col === 1 || col === 2 ? 'left' : 'right', vertical: 'center', wrapText: col === 13 },
        fill: { fgColor: { rgb: isDed ? 'FFF3DC' : col === 14 ? 'E9F9EF' : (r - first) % 2 ? 'F6FAF9' : 'FFFFFF' } } });
    }
    set(totR, col, { font: font({ bold: true, color: { rgb: '014546' } }), border, numFmt: '#,##0.00', fill: { fgColor: { rgb: 'D5E8E7' } }, alignment: { horizontal: col === 0 ? 'center' : 'right' } });
  }
  [totR + 2, totR + 3].forEach(r => { set(r, 1, { font: font({ bold: true }), fill: { fgColor: { rgb: 'ECF5F4' } }, border }); set(r, 2, { border, fill: { fgColor: { rgb: 'ECF5F4' } } }); set(r, 3, { font: font({ bold: true, color: { rgb: '014546' } }), numFmt: '#,##0.00', border }); });
  ws['!cols'] = [6, 26, 26, 12, 12, 14, 10, 10, 10, 10, 12, 13, 12, 26, 14].map(w => ({ wch: w }));
  ws['!rows'] = [{ hpt: 28 }, { hpt: 18 }, { hpt: 8 }, { hpt: 30 }, { hpt: 18 }];
  ws['!freeze'] = { xSplit: 2, ySplit: 5 };
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Salaries');
  XLSX.writeFile(wb, `Inqlha Salaries - ${fileBase(run)}.xlsx`); toast('اتنزل الملخص Excel');
}

/* designed PDF: printable page in a hidden frame -> browser "Save as PDF" */
function printSummary(run) {
  const d = summaryData(run), c = PR_CATS[run.cat], b = monthBounds(run.month);
  const f = n => typeof n === 'number' ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : esc(n);
  const logo = new URL('logo-wide.jpg', location.href).href;
  const sum = (fn) => d.ls.reduce((s, l) => s + fn(l), 0);
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Inqlha Salaries - ${fileBase(run)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "IBM Plex Sans Arabic", system-ui, sans-serif; color: #0e2423; margin: 0; font-size: 9.5px; }
    header { display: flex; align-items: center; justify-content: space-between; background: #014546; color: #fff; border-radius: 10px; padding: 12px 18px; }
    header img { height: 42px; }
    header h1 { margin: 0; font-size: 18px; font-weight: 600; }
    header p { margin: 2px 0 0; color: rgba(255,255,255,.7); font-size: 10.5px; }
    .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 10px 0; }
    .kpi { border: 1px solid #dfe9e8; border-radius: 8px; padding: 7px 10px; }
    .kpi small { color: #6b8381; display: block; font-size: 9px; }
    .kpi b { font-size: 13px; }
    .kpi.hl { background: #014546; color: #fff; border-color: #014546; } .kpi.hl small { color: rgba(255,255,255,.7); } .kpi.hl b { color: #55f47f; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #014546; color: #fff; font-weight: 500; padding: 5px 4px; border: 1px solid #0b6062; font-size: 8.5px; }
    td { padding: 4px; border: 1px solid #e2eaea; text-align: right; white-space: nowrap; }
    td.l { text-align: left; } td.c { text-align: center; } td.wrap { white-space: normal; max-width: 120px; }
    tbody tr:nth-child(even) td { background: #f6faf9; }
    tr.ded td.d { background: #fff3dc !important; color: #8a5200; }
    td.acc { font-weight: 600; background: #e9f9ef !important; }
    tfoot td { background: #d5e8e7; font-weight: 600; color: #014546; }
    .bottom { display: flex; gap: 14px; margin-top: 12px; align-items: stretch; }
    .split { display: flex; gap: 8px; }
    .split div { border: 1px solid #dfe9e8; border-radius: 8px; padding: 8px 14px; min-width: 150px; }
    .split small { display: block; color: #6b8381; } .split b { font-size: 13px; }
    .sign { flex: 1; display: flex; gap: 14px; justify-content: flex-end; }
    .sign div { width: 180px; border-top: 1px solid #9fb3b1; padding-top: 4px; color: #6b8381; text-align: center; margin-top: 30px; }
    footer { margin-top: 10px; color: #8aa09e; font-size: 8.5px; display: flex; justify-content: space-between; }
  </style></head><body>
  <header><div><h1>Salaries · ${MONTHS_EN_FULL[b.mo - 1]} ${b.y}</h1><p>${c.en} · Payment date: ${esc(run.payDate || '-')} · Currency: ${c.curEn} · Confirmed: ${esc(run.confirmedAt || '-')}</p></div><img src="${logo}" alt="INQLHA"></header>
  <div class="kpis">
    <div class="kpi"><small>Employees</small><b>${d.ls.length}</b></div>
    <div class="kpi"><small>Total earnings</small><b>${f(r2(sum(lineTotal)))}</b></div>
    <div class="kpi"><small>Total deductions</small><b>${f(r2(sum(lineAllDed)))}</b></div>
    <div class="kpi"><small>Employees with deductions</small><b>${d.ls.filter(l => lineAllDed(l) > 0).length}</b></div>
    <div class="kpi hl"><small>Net payable (${c.curEn})</small><b>${f(r2(sum(lineNet)))}</b></div>
  </div>
  <table><thead><tr>${SUM_HEAD1.map((h, i) => i === 7 ? '' : i === 6 ? `<th colspan="2">${h}</th>` : `<th rowspan="2">${h}</th>`).join('')}</tr><tr><th>COLA</th><th>Others</th></tr></thead>
  <tbody>${d.rows.map((r, i) => `<tr class="${lineAllDed(d.ls[i]) > 0 ? 'ded' : ''}">${r.map((v, ci) => `<td class="${ci === 0 ? 'c' : ci === 1 || ci === 2 ? 'l' : ''}${ci === 13 ? ' l wrap d' : ''}${ci === 11 || ci === 12 ? ' d' : ''}${ci === 14 ? ' acc' : ''}">${ci === 0 ? v : f(v)}</td>`).join('')}</tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="3" class="c">Total</td>${d.totalRow.slice(3).map((v, i) => `<td>${v === '' ? '' : f(v)}</td>`).join('')}</tr></tfoot></table>
  <div class="bottom"><div class="split"><div><small>${tr('رواتب مدد')}</small><b>${f(d.mudad)}</b></div><div><small>${tr('رواتب تحويل')}</small><b>${f(d.transfer)}</b></div></div>
    <div class="sign"><div>Prepared by</div><div>HR Manager</div><div>Approved by</div></div></div>
  <footer><span>INQLHA · Salaries summary</span><span>Generated ${todayStr()}</span></footer>
  </body></html>`;
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(fr);
  fr.onload = () => { setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { alert('مقدرتش أفتح الطباعة. جرّب من متصفح تاني.'); } setTimeout(() => fr.remove(), 60000); }, 700); };
  fr.srcdoc = html;
  toast('اختار "Save as PDF" من نافذة الطباعة');
}
