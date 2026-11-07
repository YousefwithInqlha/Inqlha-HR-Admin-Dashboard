/* =====================================================================
   INQLHA admin – payment requests
   pick due bills / rents → one request with several lines → send to the
   accountant (WhatsApp / email / copy / PDF / Excel) → mark paid, which
   writes the bill / rent payment records by itself
   ===================================================================== */
const PQ_STATUS = {
  draft: { label: 'مسودة', icon: 'file-pencil', cls: 'info' },
  sent: { label: 'اتبعت للمحاسب', icon: 'send', cls: 'warn' },
  partial: { label: 'اتدفع جزء', icon: 'progress-check', cls: 'warn' },
  paid: { label: 'اتدفع', icon: 'circle-check', cls: 'ok' },
  cancelled: { label: 'ملغي', icon: 'ban', cls: '' },
};
const pqTotal = q => round2(q.items.reduce((s, x) => s + num(x.amount), 0));
const pqPaidTotal = q => round2(q.items.filter(x => x.paidAt).reduce((s, x) => s + num(x.amount), 0));
const pqKey = x => `${x.ent}:${x.ref}:${x.due}`;
const pqOpen = () => DB.payRequests.filter(q => q.status !== 'paid' && q.status !== 'cancelled');
const pqHolding = key => pqOpen().find(q => q.items.some(x => !x.paidAt && pqKey(x) === key));
function pqStatusOf(q) {
  if (q.status === 'cancelled') return 'cancelled';
  const n = q.items.filter(x => x.paidAt).length;
  if (n && n === q.items.length) return 'paid';
  if (n) return 'partial';
  return q.status === 'draft' ? 'draft' : 'sent';
}
const pqPill = q => { const s = PQ_STATUS[pqStatusOf(q)]; return `<span class="pill ${s.cls}">${s.label}</span>`; };
function pqNextCode() {
  const n = DB.payRequests.reduce((m, q) => Math.max(m, parseInt(String(q.code).replace(/\D/g, ''), 10) || 0), 0) + 1;
  return `PQ-${String(n).padStart(3, '0')}`;
}

/* how each line gets paid: SADAD (biller + payment number) or a bank transfer (IBAN) */
function pqItemFrom(x) {
  const row = DB[x.ent][x.i];
  const base = { ent: x.ent, due: x.date, amount: x.amount, title: x.title, icon: x.icon };
  if (x.ent === 'bills') {
    return { ...base, ref: row.code, payTo: row.provider || '', method: row.payMethod || 'سداد', biller: row.sadad || '', sadadNo: row.accountNo || '', iban: '', month: x.date.slice(0, 7) };
  }
  const car = x.ent === 'cars';
  return { ...base, title: car ? `إيجار سيارة ${x.title}` : `إيجار ${x.title}`, ref: row.contractNo, payTo: (car ? row.rentalOffice : row.landlord) || '', method: 'تحويل', biller: '', sadadNo: '', iban: (car ? row.officeIban : row.landlordIban) || '', period: row.payPeriod || 'شهري' };
}
const pqMissing = it => it.ent === 'bills'
  ? (it.method === 'سداد' && !it.sadadNo ? 'ناقص رقم السداد' : '')
  : (!it.iban ? 'ناقص الـ IBAN' : '');
function pqHowHTML(it) {
  if (it.ent === 'bills' && (it.sadadNo || it.biller)) return `${icon('receipt')} سداد${it.biller ? ` · المفوتر <b class="num">${esc(it.biller)}</b>` : ''}${it.sadadNo ? ` · رقم السداد <b class="num">${esc(it.sadadNo)}</b>` : ''}`;
  if (it.iban) return `${icon('building-bank')} تحويل · <b class="num ltr">${esc(it.iban)}</b>`;
  return `${icon('cash')} ${esc(it.method || '—')}`;
}

/* ---------------- list (tab under الفواتير) ---------------- */
function renderPayRequests(el) {
  const qs = [...DB.payRequests].sort((a, b) => b.code.localeCompare(a.code));
  if (!qs.length) {
    el.innerHTML = `<div class="card"><div class="empty">${icon('file-dollar')}<b>لسه مفيش طلبات دفع</b>اختار الفواتير والإيجارات اللي ميعادها قرب، واعمل منها طلب واحد تبعته للمحاسب<br><button class="btn primary" id="pq-first">${icon('plus')}طلب دفع جديد</button></div></div>`;
    $('#pq-first').onclick = () => openPayReqNew();
    return;
  }
  el.innerHTML = `<div class="card tbl-card"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>الطلب</th><th>البنود</th><th class="hide-sm">اتبعت</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>
    ${qs.map(q => `<tr data-pq="${esc(q.code)}"><td><div class="cell-main"><span class="avatar sq">${icon('file-dollar')}</span><div><b>${esc(q.code)}</b><small>${fmtDate(q.date)}${q.note ? ' · ' + esc(q.note) : ''}</small></div></div></td>
      <td><div class="pq-mini">${q.items.slice(0, 3).map(x => `<span>${icon(x.icon || 'receipt')}${esc(x.title)}</span>`).join('')}${q.items.length > 3 ? `<span class="muted">+${q.items.length - 3}</span>` : ''}</div></td>
      <td class="hide-sm">${q.sentAt ? fmtDate(q.sentAt) : '—'}</td><td>${money(pqTotal(q))}</td><td>${pqPill(q)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
  $$('tr[data-pq]', el).forEach(tr => tr.onclick = () => openPayReq(tr.dataset.pq));
}

/* ---------------- new request: pick what's due ---------------- */
let PQ = null;
function openPayReqNew(preKeys = []) {
  PQ = { days: 30, sel: new Set(preKeys), amounts: {}, note: '' };
  openLayer(`<div class="d-head"><span class="avatar lg sq">${icon('file-dollar')}</span><div class="t"><h2>طلب دفع جديد</h2><p>علّم على اللي عايز تدفعه، وكل واحدة هتبقى بند في الطلب</p></div><button class="icon-btn" id="pq-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body" id="pq-body"></div><div class="d-foot" id="pq-foot"></div>`, 'drawer wide');
  $('#panel').style.width = 'min(1000px, 100vw)';
  layerGuard = () => !PQ.sel.size || confirm('اخترت بنود ولسه معملتش الطلب. تقفل؟');
  $('#pq-x').onclick = tryClose;
  pqPickRender();
}
function pqCandidates() {
  const horizon = Math.max(PQ.days, ...[...PQ.sel].map(k => { const due = k.split(':').pop(); return daysUntil(due); }));
  return upcomingPayments(horizon).map(x => { const it = pqItemFrom(x); return { ...it, key: pqKey(it), d: x.d, holder: pqHolding(pqKey(it)) }; });
}
function pqPickRender() {
  const list = pqCandidates();
  const groups = [['متأخرة', l => l.d < 0, 'danger'], ['خلال 7 أيام', l => l.d >= 0 && l.d <= 7, 'warn'], ['بعد كده', l => l.d > 7, '']];
  const row = it => {
    const amt = PQ.amounts[it.key] ?? it.amount; const miss = pqMissing(it);
    return `<div class="pq-row pick ${it.holder ? 'held' : ''} ${PQ.sel.has(it.key) ? 'on' : ''}">
      <input type="checkbox" data-k="${esc(it.key)}" ${PQ.sel.has(it.key) ? 'checked' : ''} ${it.holder ? 'disabled' : ''}>
      <span class="avatar sq">${icon(it.icon || 'receipt')}</span>
      <div class="txt"><b>${esc(it.title)}</b><small>${esc(it.payTo)} · ${fmtDate(it.due)} · ${it.d < 0 ? `متأخر ${-it.d} يوم` : daysTxt(it.d)}</small>
        <small class="how">${pqHowHTML(it)}${miss ? ` <span class="pill danger plain">${icon('alert-triangle')}${miss}</span>` : ''}${it.holder ? ` <span class="pill info plain">في طلب ${esc(it.holder.code)}</span>` : ''}</small></div>
      <div class="amt"><input class="input num" type="number" min="0" step="any" data-amt="${esc(it.key)}" value="${esc(amt)}" ${it.holder ? 'disabled' : ''}><small>ر.س</small></div>
    </div>`;
  };
  $('#pq-body').innerHTML = `<div class="pq-tools"><span class="muted">${icon('calendar-due')} اعرض اللي ميعاده خلال</span>
      ${[15, 30, 60, 90].map(n => `<button class="chip-btn ${PQ.days === n ? 'on' : ''}" data-days="${n}">${n} يوم</button>`).join('')}
      <span class="sp"></span><button class="btn ghost sm" id="pq-all">${icon('checks')}اختار الكل</button></div>` +
    (list.length ? groups.map(([g, fn, cls]) => { const ls = list.filter(fn); return ls.length ? `<div class="d-section"><h4>${cls ? `<span class="pill ${cls} plain">${g}</span>` : g} <span class="muted">${ls.length}</span></h4><div class="pq-list">${ls.map(row).join('')}</div></div>` : ''; }).join('')
      : `<div class="empty">${icon('calendar-check')}<b>مفيش دفعات خلال ${PQ.days} يوم</b>جرّب مدة أطول، أو اتأكد إن الفواتير والإيجارات متسجلة بمواعيدها</div>`) +
    `<div class="d-section"><h4>${icon('note')} ملاحظة للمحاسب (اختياري)</h4><textarea class="input" id="pq-note" rows="2" style="width:100%;resize:vertical" placeholder="مثال: محتاجين ندفعهم قبل يوم 25">${esc(PQ.note)}</textarea></div>`;
  $$('[data-days]').forEach(b => b.onclick = () => { PQ.days = +b.dataset.days; pqPickRender(); });
  $$('[data-k]').forEach(c => c.onchange = () => { c.checked ? PQ.sel.add(c.dataset.k) : PQ.sel.delete(c.dataset.k); c.closest('.pq-row').classList.toggle('on', c.checked); pqPickFoot(); });
  $$('.pq-row.pick').forEach(r => r.onclick = e => { if (e.target.closest('input')) return; const c = $('[data-k]', r); if (c.disabled) return; c.checked = !c.checked; c.onchange(); });
  $$('[data-amt]').forEach(i => { i.oninput = () => { PQ.amounts[i.dataset.amt] = num(i.value); pqPickFoot(); }; });
  $('#pq-note').oninput = e => { PQ.note = e.target.value; };
  $('#pq-all').onclick = () => { list.filter(x => !x.holder).forEach(x => PQ.sel.add(x.key)); pqPickRender(); };
  PQ.list = list;
  pqPickFoot();
}
function pqPickFoot() {
  const chosen = PQ.list.filter(x => PQ.sel.has(x.key) && !x.holder);
  const total = chosen.reduce((s, x) => s + num(PQ.amounts[x.key] ?? x.amount), 0);
  $('#pq-foot').innerHTML = `<button class="btn primary" id="pq-make" ${chosen.length ? '' : 'disabled'}>${icon('file-plus')}اعمل الطلب</button><button class="btn ghost" id="pq-cancel">إلغاء</button>
    <span class="note">${chosen.length} بند · <b class="num">${fmtNum(total)}</b> ر.س</span>`;
  $('#pq-cancel').onclick = tryClose;
  $('#pq-make').onclick = () => {
    const q = { code: pqNextCode(), date: todayStr(), status: 'draft', note: PQ.note.trim(), sentAt: '', items: chosen.map(({ key, d, holder, ...it }) => ({ ...it, amount: num(PQ.amounts[key] ?? it.amount) })) };
    DB.payRequests.push(q); save(); PQ.sel.clear(); closeLayer(); render();
    openPayReq(q.code); toast(`اتعمل طلب الدفع ${q.code}`);
  };
}

/* from a bill / car / property: start a request with that one ticked, or open the request that already has it */
function payReqFor(ent, ref) {
  const x = upcomingPayments(400).find(u => u.ent === ent && DB[ent][u.i][ent === 'bills' ? 'code' : 'contractNo'] === ref);
  if (!x) return alert('مفيش دفعة جاية متسجلة للبند ده. اتأكد من ميعاد الدفع الجاي.');
  const key = pqKey(pqItemFrom(x)); const h = pqHolding(key);
  if (h) return openPayReq(h.code);
  openPayReqNew([key]);
}

/* ---------------- one request ---------------- */
function openPayReq(code) {
  const q = DB.payRequests.find(x => x.code === code); if (!q) return;
  const st = pqStatusOf(q), open = st !== 'paid' && st !== 'cancelled';
  const unpaid = q.items.filter(x => !x.paidAt);
  const acc = DB.settings.accountant || {};
  const panel = openLayer(`<div class="d-head"><span class="avatar lg sq">${icon('file-dollar')}</span><div class="t"><h2>طلب دفع ${esc(q.code)}</h2><p>${fmtDate(q.date)} · ${q.items.length} بند ${pqPill(q)}</p></div><button class="icon-btn" id="pq-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body">
      <div class="sumbar">${[['البنود', q.items.length, 'list-numbers'], ['اتدفع', `${fmtNum(pqPaidTotal(q))} ر.س`, 'circle-check'], ['فاضل', `${fmtNum(round2(pqTotal(q) - pqPaidTotal(q)))} ر.س`, 'hourglass'], ['إجمالي الطلب', `${fmtNum(pqTotal(q))} ر.س`, 'wallet', 'hl']].map(([l, v, ic, hl]) => `<div class="fact ${hl || ''}"><small>${icon(ic)} ${l}</small><b class="num">${v}</b></div>`).join('')}</div>
      ${q.note ? `<div class="banner" style="background:var(--info-bg);color:var(--info);margin-top:0">${icon('note')}<div>${esc(q.note)}</div></div>` : ''}
      ${q.sentAt ? `<p class="muted pq-sent">${icon('send')} اتبعت للمحاسب ${fmtDate(q.sentAt)}${q.sentVia ? ' · ' + esc(q.sentVia) : ''}</p>` : ''}
      <div class="d-section"><h4>${icon('list-details')} البنود</h4><div class="pq-list">
        ${q.items.map((it, n) => `<label class="pq-row ${it.paidAt ? 'paid' : ''}">
          ${open && !it.paidAt ? `<input type="checkbox" data-pay="${n}" checked>` : `<span class="pq-ok">${it.paidAt ? icon('circle-check') : icon('point')}</span>`}
          <span class="avatar sq">${icon(it.icon || 'receipt')}</span>
          <div class="txt"><b>${esc(it.title)}</b><small>${esc(it.payTo)} · الاستحقاق ${fmtDate(it.due)}${it.paidAt ? ` · اتدفع ${fmtDate(it.paidAt)}` : ''}</small><small class="how">${pqHowHTML(it)}${!it.paidAt && pqMissing(it) ? ` <span class="pill danger plain">${icon('alert-triangle')}${pqMissing(it)}</span>` : ''}</small></div>
          <div class="amt">${money(it.amount)}</div></label>`).join('')}
      </div></div>
      ${open ? `<div class="d-section"><h4>${icon('send')} ابعت للمحاسب${acc.name ? ` · ${esc(acc.name)}` : ''}</h4>
        <div class="send-grid">
          <button class="send-btn wa" data-send="wa">${icon('brand-whatsapp')}<b>واتساب</b><small>${acc.phone ? esc(acc.phone) : 'ضيف رقمه من الإعدادات'}</small></button>
          <button class="send-btn" data-send="mail">${icon('mail')}<b>إيميل</b><small>${acc.email ? esc(acc.email) : 'ضيف إيميله من الإعدادات'}</small></button>
          <button class="send-btn" data-send="copy">${icon('copy')}<b>نسخ النص</b><small>تلزقه في أي مكان</small></button>
          <button class="send-btn" data-send="pdf">${icon('file-type-pdf')}<b>PDF</b><small>للطباعة أو الإرفاق</small></button>
          <button class="send-btn" data-send="xlsx">${icon('file-spreadsheet')}<b>Excel</b><small>بكل أرقام السداد</small></button>
        </div></div>` : `<div class="actions" style="margin-top:16px"><button class="btn" data-send="pdf">${icon('file-type-pdf')}PDF</button><button class="btn" data-send="xlsx">${icon('file-spreadsheet')}Excel</button></div>`}
    </div>
    <div class="d-foot">${open
      ? `<button class="btn accent" id="pq-paid">${icon('circle-check')}تسجيل اللي اتعلّم عليه كمدفوع</button><input type="date" class="input" id="pq-date" value="${todayStr()}" aria-label="تاريخ الدفع" style="width:auto">
         <span class="sp"></span><button class="btn ghost" id="pq-add">${icon('plus')}بنود تانية</button><button class="btn danger ghost" id="pq-cancel">${icon('ban')}إلغاء الطلب</button>`
      : st === 'paid' ? `<button class="btn primary" id="pq-done">${icon('check')}تم</button><span class="sp"></span><button class="btn danger ghost" id="pq-undo">${icon('arrow-back-up')}إلغاء تسجيل الدفع</button>`
      : `<button class="btn primary" id="pq-done">${icon('check')}تم</button><span class="sp"></span><button class="btn danger ghost" id="pq-del">${icon('trash')}حذف الطلب</button>`}</div>`, 'drawer wide');
  panel.style.width = 'min(920px, 100vw)';
  $('#pq-x').onclick = closeLayer;
  $$('[data-send]', panel).forEach(b => b.onclick = () => pqSend(q, b.dataset.send));
  const done = $('#pq-done'); if (done) done.onclick = closeLayer;
  if (open) {
    $('#pq-paid').disabled = !unpaid.length;
    $$('[data-pay]', panel).forEach(c => c.onchange = () => { $('#pq-paid').disabled = !$$('[data-pay]:checked', panel).length; });
    $('#pq-paid').onclick = () => {
      const idx = $$('[data-pay]:checked', panel).map(c => +c.dataset.pay);
      const date = $('#pq-date').value || todayStr();
      if (!confirm(`هيتسجل ${idx.length} بند كمدفوع بتاريخ ${fmtDate(date)}، وهيتضاف لكل واحد سجل دفعة في الفواتير أو الإيجارات. تمام؟`)) return;
      idx.forEach(n => pqMarkPaid(q, q.items[n], date));
      if (pqStatusOf(q) === 'paid') q.status = 'paid';
      save(); render(); openPayReq(q.code); toast('اتسجل الدفع');
    };
    $('#pq-add').onclick = () => pqAddMore(q);
    $('#pq-cancel').onclick = () => {
      if (q.items.some(x => x.paidAt)) return alert('فيه بنود اتسجل دفعها. الغي تسجيل الدفع الأول، أو سيب الطلب زي ما هو.');
      if (!confirm(`إلغاء طلب الدفع ${q.code}؟ البنود هترجع تظهر في الدفعات الجاية.`)) return;
      q.status = 'cancelled'; save(); render(); openPayReq(q.code); toast('اتلغى الطلب');
    };
  }
  const undo = $('#pq-undo'); if (undo) undo.onclick = () => {
    if (!confirm('ده هيمسح سجلات الدفع اللي الطلب ده عملها، ويرجّع مواعيد الدفع زي ما كانت. متأكد؟')) return;
    q.items.forEach(it => pqUnpay(it)); q.status = q.sentAt ? 'sent' : 'draft'; save(); render(); openPayReq(q.code); toast('اتلغى تسجيل الدفع');
  };
  const del = $('#pq-del'); if (del) del.onclick = () => { if (!confirm(`حذف طلب ${q.code} نهائياً؟`)) return; DB.payRequests.splice(DB.payRequests.indexOf(q), 1); save(); closeLayer(); render(); toast('اتحذف الطلب'); };
}

/* paying a line writes the same record you'd add by hand, so bill status and rent dates move on */
function pqMarkPaid(q, it, date) {
  const note = `طلب دفع ${q.code}`;
  if (it.ent === 'bills') {
    const bill = DB.bills.find(b => b.code === it.ref);
    it.prev = { amount: bill ? bill.amount : '' };
    const rec = { code: nextCode('billPayments'), billCode: it.ref, month: it.month || it.due.slice(0, 7), amount: it.amount, payDate: date, notes: note };
    DB.billPayments.push(rec); afterSave('billPayments', rec, null); it.rec = rec.code;
  } else {
    const c = DB[it.ent].find(x => x.contractNo === it.ref);
    it.prev = { nextPayment: c ? c.nextPayment : '' };
    const to = parseDate(it.due); to.setMonth(to.getMonth() + (PERIOD_MONTHS[it.period] || 1)); to.setDate(to.getDate() - 1);
    const rec = { code: nextCode('rentPayments'), contractNo: it.ref, payDate: date, amount: it.amount, from: it.due, to: iso(to), method: it.method || 'تحويل', notes: note };
    DB.rentPayments.push(rec); afterSave('rentPayments', rec, null); it.rec = rec.code;
  }
  it.paidAt = date;
}
function pqUnpay(it) {
  if (!it.paidAt) return;
  const list = it.ent === 'bills' ? DB.billPayments : DB.rentPayments;
  const k = list.findIndex(r => r.code === it.rec); if (k >= 0) list.splice(k, 1);
  if (it.ent === 'bills') { const b = DB.bills.find(x => x.code === it.ref); if (b && it.prev) b.amount = it.prev.amount; }
  else { const c = DB[it.ent].find(x => x.contractNo === it.ref); if (c && it.prev) c.nextPayment = it.prev.nextPayment; }
  delete it.paidAt; delete it.rec; delete it.prev;
}
function pqAddMore(q) {
  const extra = upcomingPayments(90).map(x => pqItemFrom(x)).filter(it => !pqHolding(pqKey(it)));
  if (!extra.length) return alert('مفيش دفعات تانية خلال 90 يوم مش موجودة في طلب.');
  showMenu($('#pq-add'), extra.slice(0, 12).map(it => ({ label: `${it.title} · ${fmtNum(it.amount)} ر.س · ${fmtDate(it.due)}`, icon: it.icon || 'receipt', run: () => { q.items.push(it); if (q.status === 'paid') q.status = 'sent'; save(); render(); openPayReq(q.code); toast('اتضاف البند'); } })));
}

/* ---------------- sending ---------------- */
function pqText(q) {
  const L1 = [`*طلب دفع ${q.code}* · إنقلها`, `التاريخ: ${fmtDate(q.date)}`, ''];
  q.items.filter(x => !x.paidAt).forEach((it, n) => {
    L1.push(`${n + 1}) ${it.title} — ${fmtNum(it.amount)} ر.س`);
    L1.push(`   الجهة: ${it.payTo || '—'} · الاستحقاق: ${fmtDate(it.due)}`);
    if (it.ent === 'bills' && (it.sadadNo || it.biller)) L1.push(`   سداد: ${it.biller ? `المفوتر ${it.biller} · ` : ''}رقم السداد ${it.sadadNo || '—'}`);
    else if (it.iban) L1.push(`   تحويل: ${it.iban}`);
    L1.push('');
  });
  L1.push(`*الإجمالي: ${fmtNum(round2(pqTotal(q) - pqPaidTotal(q)))} ر.س*`);
  if (q.note) L1.push('', `ملاحظة: ${q.note}`);
  return L1.join('\n');
}
function pqMarkSent(q, via) { if (q.status === 'draft') q.status = 'sent'; q.sentAt = todayStr(); q.sentVia = via; save(); render(); openPayReq(q.code); }
function pqSend(q, how) {
  const acc = DB.settings.accountant || {};
  if (how === 'wa') {
    const phone = String(acc.phone || '').replace(/\D/g, '').replace(/^00/, '').replace(/^0(5\d{8})$/, '966$1');
    if (!phone) { alert('ضيف رقم واتساب المحاسب من الإعدادات الأول.'); location.hash = 'settings'; return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(pqText(q))}`, '_blank');
    pqMarkSent(q, 'واتساب');
  } else if (how === 'mail') {
    if (!acc.email) { alert('ضيف إيميل المحاسب من الإعدادات الأول.'); location.hash = 'settings'; return; }
    location.href = `mailto:${acc.email}?subject=${encodeURIComponent(`طلب دفع ${q.code} - إنقلها`)}&body=${encodeURIComponent(pqText(q).replace(/\*/g, ''))}`;
    pqMarkSent(q, 'إيميل');
  } else if (how === 'copy') {
    const t = pqText(q);
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('اتنسخ نص الطلب'), () => prompt('انسخ النص ده:', t));
    if (q.status === 'draft') pqMarkSent(q, 'نسخ النص');
  } else if (how === 'pdf') pqPrint(q);
  else if (how === 'xlsx') pqExcel(q);
}
function pqExcel(q) {
  if (!window.XLSX) return alert('مكتبة Excel محتاجة نت عشان تشتغل. اتأكد إنك متصل وجرّب تاني.');
  const head = ['#', 'البند', 'الجهة', 'طريقة الدفع', 'رقم المفوتر', 'رقم السداد', 'IBAN', 'الاستحقاق', 'المبلغ (ر.س)', 'الحالة'].map(tr);
  const rows = q.items.map((it, n) => [n + 1, it.title, it.payTo, it.ent === 'bills' ? it.method : 'تحويل', it.biller, it.sadadNo, it.iban, it.due, num(it.amount), it.paidAt ? 'اتدفع' : 'مستني الدفع'].map(v => typeof v === 'string' ? tr(v) : v));
  const ws = XLSX.utils.aoa_to_sheet([[`${tr('طلب دفع')} ${q.code}`], [`${tr('التاريخ')}: ${q.date}`], [], head, ...rows, [], ['', '', '', '', '', '', '', tr('الإجمالي'), pqTotal(q)]]);
  ws['!cols'] = [4, 26, 22, 12, 12, 20, 28, 12, 14, 12].map(wch => ({ wch }));
  const H = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '014546' } }, alignment: { horizontal: 'center' } };
  head.forEach((_, c) => { const ref = XLSX.utils.encode_cell({ r: 3, c }); if (ws[ref]) ws[ref].s = H; });
  if (ws.A1) ws.A1.s = { font: { bold: true, sz: 14, color: { rgb: '014546' } } };
  const tot = XLSX.utils.encode_cell({ r: 5 + rows.length, c: 8 }); if (ws[tot]) ws[tot].s = { font: { bold: true } };
  rows.forEach((_, r) => { const ref = XLSX.utils.encode_cell({ r: 4 + r, c: 8 }); if (ws[ref]) ws[ref].z = '#,##0.00'; });
  const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: LANG !== 'en' }] };
  XLSX.utils.book_append_sheet(wb, ws, q.code);
  XLSX.writeFile(wb, `${tr('طلب دفع')} ${q.code}.xlsx`);
}
function pqPrint(q) {
  const logo = new URL('logo-wide.jpg', location.href).href;
  const en = LANG === 'en', T = s => esc(tr(s));
  const f = n => num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const html = `<!DOCTYPE html><html lang="${en ? 'en' : 'ar'}" dir="${en ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"><title>${T('طلب دفع')} ${esc(q.code)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: "IBM Plex Sans Arabic", system-ui, sans-serif; color: #0e2423; margin: 0; font-size: 11px; }
    header { display: flex; align-items: center; justify-content: space-between; background: #014546; color: #fff; border-radius: 10px; padding: 14px 18px; }
    header img { height: 44px; } header h1 { margin: 0; font-size: 19px; font-weight: 600; } header p { margin: 2px 0 0; color: rgba(255,255,255,.7); }
    .strip { height: 3px; background: #55f47f; border-radius: 2px; margin: 6px 0 14px; }
    .item { display: grid; grid-template-columns: 26px 1fr auto; gap: 10px; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; background: #f3f7f7; break-inside: avoid; }
    .item .n { width: 24px; height: 24px; border-radius: 50%; background: #014546; color: #fff; display: grid; place-items: center; font-size: 10px; }
    .item b { font-size: 12.5px; } .item small { display: block; color: #5d7473; margin-top: 2px; }
    .item .pay { margin-top: 5px; font-size: 11px; } .item .pay span { background: #fff; border-radius: 5px; padding: 2px 7px; margin-inline-end: 4px; display: inline-block; }
    .item .amt { font-size: 14px; font-weight: 600; white-space: nowrap; }
    .item.paid { opacity: .55; } .num { direction: ltr; unicode-bidi: embed; font-variant-numeric: tabular-nums; }
    .total { display: flex; justify-content: space-between; align-items: center; background: #014546; color: #fff; border-radius: 8px; padding: 12px 16px; margin-top: 10px; font-size: 13px; }
    .total b { color: #55f47f; font-size: 18px; }
    .note { margin-top: 12px; background: #eef6ff; color: #1d4f8a; padding: 10px 12px; border-radius: 8px; }
    .sign { display: flex; gap: 20px; margin-top: 46px; } .sign div { flex: 1; border-top: 1px solid #9fb3b1; padding-top: 5px; text-align: center; color: #5d7473; }
    footer { margin-top: 18px; color: #8aa09e; font-size: 9px; display: flex; justify-content: space-between; }
  </style></head><body>
  <header><div><h1>${T('طلب دفع')} ${esc(q.code)}</h1><p>${T('التاريخ')}: ${esc(q.date)} · ${q.items.length} ${T('بند')}</p></div><img src="${logo}" alt="INQLHA"></header><div class="strip"></div>
  ${q.items.map((it, n) => `<div class="item ${it.paidAt ? 'paid' : ''}"><span class="n">${n + 1}</span><div><b>${T(it.title)}</b><small>${T(it.payTo || '—')} · ${T('الاستحقاق')} <span class="num">${esc(it.due)}</span>${it.paidAt ? ` · ${T('اتدفع')} <span class="num">${esc(it.paidAt)}</span>` : ''}</small>
    <div class="pay">${it.ent === 'bills' && (it.sadadNo || it.biller) ? `<span>${T('سداد')}</span>${it.biller ? `<span>${T('رقم المفوتر')}: <b class="num">${esc(it.biller)}</b></span>` : ''}<span>${T('رقم السداد')}: <b class="num">${esc(it.sadadNo || '—')}</b></span>` : it.iban ? `<span>${T('تحويل')}</span><span>IBAN: <b class="num">${esc(it.iban)}</b></span>` : `<span>${T(it.method || '—')}</span>`}</div></div>
    <div class="amt num">${f(it.amount)} ${T('ر.س')}</div></div>`).join('')}
  <div class="total"><span>${T('الإجمالي')}</span><b class="num">${f(pqTotal(q))} ${T('ر.س')}</b></div>
  ${q.note ? `<div class="note">${T('ملاحظة')}: ${esc(q.note)}</div>` : ''}
  <div class="sign"><div>${T('طلبه')}</div><div>${T('اعتمده')}</div><div>${T('المحاسب')}</div></div>
  <footer><span>INQLHA · ${T('طلب دفع')}</span><span>${todayStr()}</span></footer></body></html>`;
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(fr);
  fr.onload = () => { setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { alert('مقدرتش أفتح الطباعة. جرّب من متصفح تاني.'); } setTimeout(() => fr.remove(), 60000); }, 700); };
  fr.srcdoc = html;
  toast('اختار "Save as PDF" من نافذة الطباعة');
}
