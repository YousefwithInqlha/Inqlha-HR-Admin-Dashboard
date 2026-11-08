/* =====================================================================
   INQLHA – employee data links (dashboard side of form.html)
   - make a one-time link for an employee (or a new hire) and send it on WhatsApp
   - see what came back, compare it with what's on file, approve field by field
   On the server: tables form_invites / form_submissions (supabase/form.sql).
   Locally: kept in this browser, so the whole flow can be tried without a server.
   ===================================================================== */
const FX_LOCAL = 'inqlha-form-local';
const fxLocal = () => { try { return JSON.parse(localStorage.getItem(FX_LOCAL)) || { invites: [], submissions: [] }; } catch (e) { return { invites: [], submissions: [] }; } };
const fxLocalSave = st => localStorage.setItem(FX_LOCAL, JSON.stringify(st));
const FX = {
  count: 0,
  async invites() {
    if (CLOUD) { const { data, error } = await SB.from('form_invites').select('*').is('used_at', null).order('created_at', { ascending: false }); if (error) throw error; return data; }
    return fxLocal().invites.filter(i => !i.used_at).reverse();
  },
  async submissions() {
    if (CLOUD) { const { data, error } = await SB.from('form_submissions').select('*').eq('status', 'new').order('created_at', { ascending: false }); if (error) throw error; return data; }
    return fxLocal().submissions.filter(s => s.status === 'new').reverse();
  },
  async newCount() {
    if (CLOUD) { const { count, error } = await SB.from('form_submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'); if (error) throw error; return count || 0; }
    return fxLocal().submissions.filter(s => s.status === 'new').length;
  },
  async create(inv) {
    const b = crypto.getRandomValues(new Uint8Array(18));
    const token = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const row = { token, emp_code: inv.emp_code || null, label: inv.label || null, kind: inv.kind || null, country: inv.country || null, expires_at: new Date(Date.now() + 14 * 864e5).toISOString() };
    if (CLOUD) { const { error } = await SB.from('form_invites').insert(row); if (error) throw error; }
    else { const st = fxLocal(); st.invites.push({ ...row, created_at: new Date().toISOString(), used_at: null }); fxLocalSave(st); }
    return row;
  },
  async removeInvite(token) {
    if (CLOUD) { const { error } = await SB.from('form_invites').delete().eq('token', token); if (error) throw error; return; }
    const st = fxLocal(); st.invites = st.invites.filter(i => i.token !== token); fxLocalSave(st);
  },
  async setStatus(id, status) {
    if (CLOUD) { const { error } = await SB.from('form_submissions').update({ status }).eq('id', id); if (error) throw error; return; }
    const st = fxLocal(); const s = st.submissions.find(x => x.id === id); if (s) s.status = status; fxLocalSave(st);
  },
};
const fxLink = token => new URL('form.html', location.href).href.replace(/\.html$/, location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? '.html' : '') + '#' + token;
const fxFail = err => { console.error(err); alert(CLOUD ? 'مقدرتش أوصل للسيرفر. لو أول مرة، اتأكد إنك شغّلت ملف supabase/form.sql في Supabase.' : 'حصلت مشكلة، جرّب تاني.'); };

/* the little count on the employees page button */
async function fxBadge() {
  try { FX.count = await FX.newCount(); } catch (e) { FX.count = 0; }
  const b = $('#fx-btn'); if (!b) return;
  let d = $('.fx-dot', b);
  if (FX.count) { if (!d) { d = document.createElement('span'); d.className = 'fx-dot'; b.appendChild(d); } d.textContent = FX.count; } else if (d) d.remove();
}

/* main drawer: what came back + open links + make a new one */
async function openFormLinks() {
  const panel = openLayer(`
    <div class="d-head"><span class="avatar lg sq">${icon('forms')}</span><div class="t"><h2>بيانات من الموظفين</h2><p>ابعت للموظف لينك يملا فيه بياناته من الموبايل، وراجعها هنا قبل ما تتسجل</p></div><button class="icon-btn" id="fx-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body" id="fx-body"><div class="fx-load">${icon('loader-2')}بيحمّل...</div></div>
    <div class="d-foot"><button class="btn primary" id="fx-new">${icon('link-plus')}اعمل لينك جديد</button><span class="note">كل لينك شغال مرة واحدة ولمدة 14 يوم</span></div>`, 'drawer');
  $('#fx-x', panel).onclick = closeLayer;
  $('#fx-new', panel).onclick = () => openNewLink();
  let subs, invs;
  try { [subs, invs] = await Promise.all([FX.submissions(), FX.invites()]); } catch (e) { $('#fx-body', panel).innerHTML = `<div class="empty">${icon('cloud-off')}<b>مقدرتش أوصل للسيرفر</b>${CLOUD ? 'اتأكد إنك شغّلت ملف supabase/form.sql في Supabase' : ''}</div>`; return; }
  if (!$('#fx-body')) return;
  const who = s => { const e = s.emp_code && L.emp(s.emp_code); return e ? nameOf(e) : (s.data && s.data.nameAr) || s.label || 'موظف جديد'; };
  $('#fx-body', panel).innerHTML = `
    <div class="d-section"><h4><span>${icon('inbox')} وصلت ومستنية مراجعة (${subs.length})</span></h4>
      ${subs.length ? `<div class="rel">${subs.map((s, n) => `<div class="rel-item" data-sub="${n}"><span class="avatar">${s.data && s.data._photo ? `<img src="${esc(s.data._photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : esc(initials(who(s)))}</span><div class="txt"><b>${esc(who(s))}</b><small>${s.emp_code ? esc(s.emp_code) + ' · تحديث بيانات' : 'موظف جديد'} · ${esc(fmtDate(String(s.created_at).slice(0, 10)))}</small></div><span class="pill warn plain">راجعها</span>${icon('chevron-left')}</div>`).join('')}</div>`
        : `<div class="rel-empty">مفيش حاجة جديدة</div>`}
    </div>
    <div class="d-section"><h4><span>${icon('link')} لينكات اتبعتت ولسه متملتش (${invs.length})</span></h4>
      ${invs.length ? `<div class="rel">${invs.map((i, n) => { const exp = new Date(i.expires_at) < new Date(); const e = i.emp_code && L.emp(i.emp_code); return `<div class="rel-item fx-inv"><span class="avatar sq">${icon(exp ? 'clock-x' : 'send')}</span><div class="txt"><b>${esc(e ? nameOf(e) : i.label || 'موظف جديد')}</b><small>${exp ? 'اللينك خلص' : 'شغال لحد ' + esc(fmtDate(String(i.expires_at).slice(0, 10)))}${i.country ? ' · ' + esc(i.country) : ''}${i.kind ? ' · ' + esc(i.kind) : ''}</small></div>${exp ? '' : `<button class="icon-btn sm" data-copy-inv="${n}" title="نسخ اللينك" aria-label="نسخ اللينك">${icon('copy')}</button>`}<button class="icon-btn sm" data-del-inv="${n}" title="إلغاء اللينك" aria-label="إلغاء اللينك">${icon('trash')}</button></div>`; }).join('')}</div>`
        : `<div class="rel-empty">مفيش لينكات مفتوحة</div>`}
    </div>`;
  $$('[data-sub]', panel).forEach(el => el.onclick = () => openSubmission(subs[+el.dataset.sub]));
  $$('[data-copy-inv]', panel).forEach(b => b.onclick = () => navigator.clipboard.writeText(fxLink(invs[+b.dataset.copyInv].token)).then(() => toast('اتنسخ اللينك')));
  $$('[data-del-inv]', panel).forEach(b => b.onclick = async () => { if (!confirm('تلغي اللينك ده؟ الموظف مش هيقدر يفتحه.')) return; try { await FX.removeInvite(invs[+b.dataset.delInv].token); openFormLinks(); toast('اتلغى اللينك'); } catch (e) { fxFail(e); } });
}

/* make a link: for someone on file (pre-filled) or for a new hire */
function openNewLink(empCode) {
  const e = empCode && L.emp(empCode);
  const emps = [...DB.employees].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ar'));
  const panel = openLayer(`
    <div class="d-head"><span class="avatar lg sq">${icon('link-plus')}</span><div class="t"><h2>لينك بيانات جديد</h2><p>الموظف يفتحه من الموبايل ويملا بياناته</p></div><button class="icon-btn" id="nl-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body"><form class="fgrid" id="nl" style="margin-top:18px">
      <div class="f full"><label>لمين؟</label><div class="seg nl-seg"><button type="button" data-who="new" class="${e ? '' : 'on'}">${icon('user-plus')}موظف جديد</button><button type="button" data-who="old" class="${e ? 'on' : ''}">${icon('user-check')}موظف موجود</button></div></div>
      <div class="f full" data-for="old" ${e ? '' : 'hidden'}><label for="nl-emp">الموظف</label><select class="select" id="nl-emp">${emps.map(x => `<option value="${esc(x.code)}" ${e && x.code === e.code ? 'selected' : ''}>${esc(nameOf(x))} · ${esc(x.code)}</option>`).join('')}</select><div class="help">لما البيانات توصل هتقارنها باللي عندك وتختار تحدّث إيه</div></div>
      <div class="f full" data-for="new" ${e ? 'hidden' : ''}><label for="nl-name">اسمه (اختياري)</label><input class="input" id="nl-name" placeholder="عشان الصفحة ترحب بيه باسمه"></div>
      <div class="f"><label for="nl-country">هيشتغل فين؟</label><select class="select" id="nl-country"><option value="">يختار هو</option><option ${(e ? e.country : 'السعودية') === 'السعودية' ? 'selected' : ''}>السعودية</option><option ${e && e.country === 'مصر' ? 'selected' : ''}>مصر</option></select></div>
      <div class="f"><label for="nl-kind">موظف ولا سواق؟</label><select class="select" id="nl-kind"><option value="">يختار هو</option><option ${e && e.kind === 'موظف' ? 'selected' : ''}>موظف</option><option ${e && e.kind === 'سواق' ? 'selected' : ''}>سواق</option></select></div>
    </form></div>
    <div class="d-foot"><button class="btn primary" id="nl-go">${icon('link')}اعمل اللينك</button><button class="btn ghost" id="nl-cancel">إلغاء</button></div>`, 'drawer');
  let mode = e ? 'old' : 'new';
  $$('[data-who]', panel).forEach(b => b.onclick = () => { mode = b.dataset.who; $$('[data-who]', panel).forEach(x => x.classList.toggle('on', x === b)); $$('[data-for]', panel).forEach(x => x.hidden = x.dataset.for !== mode); });
  $('#nl-emp', panel).onchange = ev => { const x = L.emp(ev.target.value); if (x) { $('#nl-country', panel).value = x.country || ''; $('#nl-kind', panel).value = x.kind || ''; } };
  $('#nl-x', panel).onclick = closeLayer; $('#nl-cancel', panel).onclick = closeLayer;
  $('#nl-go', panel).onclick = async () => {
    const btn = $('#nl-go', panel); btn.disabled = true;
    const code = mode === 'old' ? $('#nl-emp', panel).value : null;
    const x = code && L.emp(code);
    try {
      const row = await FX.create({ emp_code: code, label: x ? x.nameAr || nameOf(x) : $('#nl-name', panel).value.trim(), country: $('#nl-country', panel).value, kind: $('#nl-kind', panel).value });
      showLink(row, x);
    } catch (err) { btn.disabled = false; fxFail(err); }
  };
}
function showLink(row, e) {
  const url = fxLink(row.token);
  const first = (row.label || '').split(' ')[0];
  const msg = `أهلاً${first ? ' ' + first : ''} 👋\nده لينك تملا فيه بياناتك لإنقلها من الموبايل (5 دقايق):\n${url}\n\nجهّز الهوية أو الإقامة، ورقم الـ IBAN، وصورة شخصية. اللينك شغال مرة واحدة لمدة 14 يوم.`;
  const wa = e && e.phone ? waLink(e.phone) : '';
  const panel = openLayer(`
    <div class="d-head"><span class="avatar lg sq" style="background:var(--ok-bg);color:var(--ok)">${icon('circle-check')}</span><div class="t"><h2>اللينك جاهز</h2><p>${esc(row.label || 'موظف جديد')} · شغال لمدة 14 يوم ولمرة واحدة</p></div><button class="icon-btn" id="sl-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body">
      <div class="fx-url"><input class="input ltr" id="sl-url" value="${esc(url)}" readonly><button class="btn" id="sl-copy">${icon('copy')}نسخ</button></div>
      <div class="fx-share">
        <a class="btn accent" href="${wa ? wa + '?text=' + encodeURIComponent(msg) : 'https://wa.me/?text=' + encodeURIComponent(msg)}" target="_blank" rel="noopener">${icon('brand-whatsapp')}ابعته على واتساب</a>
        <button class="btn" id="sl-msg">${icon('message')}نسخ الرسالة كاملة</button>
        <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">${icon('external-link')}افتح الفورم</a>
      </div>
      <div class="fx-msg">${esc(msg).replace(/\n/g, '<br>')}</div>
    </div>`, 'drawer');
  $('#sl-x', panel).onclick = closeLayer;
  $('#sl-copy', panel).onclick = () => navigator.clipboard.writeText(url).then(() => toast('اتنسخ اللينك'));
  $('#sl-msg', panel).onclick = () => navigator.clipboard.writeText(msg).then(() => toast('اتنسخت الرسالة'));
  $('#sl-url', panel).onclick = ev => ev.target.select();
}

/* review what came back, field by field */
const FX_SKIP = ['_submittedAt', 'accountHolder', '_photo', '_iqamaImg', '_licenseImg'];
function openSubmission(sub) {
  const d = sub.data || {};
  const cur = sub.emp_code ? L.emp(sub.emp_code) : null;
  const keys = Object.keys(d).filter(k => !FX_SKIP.includes(k) && fieldOf('employees', k) && !fieldOf('employees', k).calc);
  const disp = (k, v) => { const f = fieldOf('employees', k); return !v ? '<span class="muted">—</span>' : f.t === 'date' ? esc(fmtDate(v)) : esc(v); };
  const rows = keys.map(k => { const f = fieldOf('employees', k), nv = String(d[k] || ''), ov = cur ? String(cur[k] || '') : ''; const same = cur && nv === ov; return { k, f, nv, ov, same }; });
  const imgs = [['_photo', 'الصورة الشخصية', cur && cur.photo], ['_iqamaImg', 'صورة الإقامة / الهوية', cur && (cur.docs || {}).iqama], ['_licenseImg', 'صورة الرخصة', cur && (cur.docs || {}).license]].filter(x => d[x[0]]);
  const merged = { ...(cur || {}), ...Object.fromEntries(keys.map(k => [k, d[k]])) };
  const warns = (typeof gfWarnings === 'function' ? gfWarnings({ emp: merged, holder: d.accountHolder }) : []);
  const dup = d.idNumber && DB.employees.find(x => x.idNumber === d.idNumber && (!cur || x.code !== cur.code));
  if (dup) warns.unshift(`رقم الهوية ده متسجل لموظف تاني: ${nameOf(dup)} (${dup.code})`);
  const panel = openLayer(`
    <div class="d-head">${d._photo ? `<img class="avatar lg" src="${esc(d._photo)}" alt="">` : `<span class="avatar lg">${esc(initials(d.nameAr || ''))}</span>`}<div class="t"><h2>${esc(d.nameAr || 'بيانات جديدة')}</h2><p>${cur ? `تحديث بيانات ${esc(cur.code)} · ` : 'موظف جديد · '}وصلت ${esc(fmtDate(String(sub.created_at).slice(0, 10)))}</p></div><button class="icon-btn" id="sv-x" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="d-body">
      ${warns.length ? `<div class="banner warn">${icon('alert-triangle')}<ul>${warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
      ${d.accountHolder ? `<p class="fx-holder">${icon('building-bank')}صاحب الحساب البنكي: <b>${esc(d.accountHolder)}</b></p>` : ''}
      ${imgs.length ? `<div class="d-section"><h4><span>الصور</span></h4><div class="fx-imgs">${imgs.map(([k, l, had]) => `<label class="fx-img"><img src="${esc(d[k])}" alt=""><span><input type="checkbox" data-img="${k}" checked> ${l}${had ? ' <small>(هتحل محل الحالية)</small>' : ''}</span></label>`).join('')}</div></div>` : ''}
      <div class="d-section"><h4><span>البيانات (${rows.length})</span><span><button class="link-btn" id="sv-all">علّم الكل</button></span></h4>
        <div class="fx-rows">${rows.map((x, n) => `<label class="fx-row ${x.same ? 'same' : cur && x.ov ? 'chg' : 'add'}"><input type="checkbox" data-row="${n}" ${x.same ? '' : 'checked'}><span class="l">${fIcon(x.f)}${esc(x.f.l)}</span><span class="v"><b dir="auto">${disp(x.k, x.nv)}</b>${cur ? (x.same ? '<small>زي اللي عندك</small>' : x.ov ? `<small>كان: ${disp(x.k, x.ov)}</small>` : '<small>جديدة</small>') : ''}</span></label>`).join('')}</div>
      </div>
    </div>
    <div class="d-foot"><button class="btn primary" id="sv-ok">${icon('check')}${cur ? 'حدّث بيانات الموظف' : 'ضيف الموظف'}</button><button class="btn danger" id="sv-no">${icon('x')}ارفض</button><span class="note" id="sv-note"></span></div>`, 'drawer wide');
  $('#sv-x', panel).onclick = () => openFormLinks();
  $('#sv-all', panel).onclick = () => $$('[data-row]', panel).forEach(c => c.checked = true);
  $('#sv-no', panel).onclick = async () => { if (!confirm('ترفض البيانات دي؟ مش هتتسجل.')) return; try { await FX.setStatus(sub.id, 'rejected'); toast('اترفضت'); fxBadge(); openFormLinks(); } catch (e) { fxFail(e); } };
  $('#sv-ok', panel).onclick = async () => {
    const btn = $('#sv-ok', panel); btn.disabled = true;
    try {
      const picked = $$('[data-row]', panel).filter(c => c.checked).map(c => rows[+c.dataset.row]);
      const isNew = !cur;
      const emp = cur || { code: nextCode('employees'), status: 'على رأس العمل', empType: 'دوام كامل', kind: d.kind || 'موظف', country: d.country || 'السعودية', currency: d.country === 'مصر' ? 'جنيه' : 'ريال' };
      picked.forEach(x => { emp[x.k] = x.nv; });
      ['nationality', 'city', 'bank'].forEach(k => { const lk = { nationality: 'nationalities', city: 'cities', bank: 'banks' }[k]; if (emp[k] && DB.lists[lk] && !DB.lists[lk].includes(emp[k])) DB.lists[lk].push(emp[k]); });
      const want = k => { const c = $(`[data-img="${k}"]`, panel); return c && c.checked; };
      if (want('_photo')) emp.photo = d._photo;
      for (const [k, kind] of [['_iqamaImg', 'iqama'], ['_licenseImg', 'license']]) {
        if (!want(k)) continue;
        const id = `doc-${emp.code}-${kind}-${Date.now()}`;
        await FILES.put(id, d[k]);
        emp.docs = { ...(emp.docs || {}), [kind]: id };
      }
      if (isNew) DB.employees.push(emp);
      save();
      await FX.setStatus(sub.id, 'done');
      closeLayer(); fxBadge();
      toast(cur ? `اتحدثت بيانات ${nameOf(emp)}` : `اتضاف ${nameOf(emp)} (${emp.code}) · كمّل الراتب والوظيفة`);
      location.hash = '#emp/' + encodeURIComponent(emp.code);
      render();
    } catch (err) { btn.disabled = false; fxFail(err); }
  };
}
