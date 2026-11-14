/* =====================================================================
   INQLHA – fill the employee form from the Iqama / ID and licence photos
   The photos go to /api/read-card (Claude reads them on the server), the
   answer fills the form, and every filled field is marked for review.
   The photos are also kept as the employee's card images (docs.iqama / docs.license).
   ===================================================================== */
const AI_KINDS = [['iqama', 'صورة الإقامة / الهوية', 'id'], ['license', 'صورة رخصة القيادة', 'license']];

function aiScanHTML() {
  return `<section class="ai-scan" id="ai-scan">
    <div class="ai-head"><span class="ai-ico">${icon('sparkles')}</span><div><b>املا البيانات من الإقامة والرخصة</b>
      <small>ارفع صورة الكارت أو سكرين شوت من أبشر، والذكاء الاصطناعي هيقرا البيانات ويكتبها في الخانات. راجعها وكمّل الباقي قبل الحفظ.</small></div></div>
    <div class="ai-slots">${AI_KINDS.map(([k, l, ic]) => `<label class="ai-slot" data-slot="${k}"><span class="ai-prev">${icon(ic)}</span><span class="ai-txt"><b>${l}</b><small>اختار صورة أو اسحبها هنا</small></span><button type="button" class="icon-btn ai-del" data-del="${k}" hidden aria-label="شيل الصورة">${icon('x')}</button><input type="file" accept="image/*" hidden data-file="${k}"></label>`).join('')}</div>
    <div class="ai-act"><button type="button" class="btn accent" id="ai-go" disabled>${icon('sparkles')}استخرج البيانات</button><span class="ai-msg" id="ai-msg"></span></div>
    <ul class="ai-warn" id="ai-warn" hidden></ul>
  </section>`;
}

/* a Hijri (Umm al-Qura) YYYY-MM-DD to Gregorian, using the browser's own calendar */
function hijriToG(h) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(h || '').trim()); if (!m) return '';
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  let fmt; try { fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' }); } catch (e) { return ''; }
  const guess = Date.UTC(622, 6, 16) + ((y - 1) * 354.367 + (mo - 1) * 29.53 + d - 1) * 864e5;
  for (let k = 0; k <= 60; k++) for (const s of k ? [k, -k] : [0]) {
    const t = guess + s * 864e5, p = {};
    fmt.formatToParts(new Date(t)).forEach(x => { p[x.type] = parseInt(x.value, 10); });
    if (p.year === y && p.month === mo && p.day === d) return new Date(t).toISOString().slice(0, 10);
  }
  return '';
}
const aiDate = v => { if (!v) return ''; const g = /^\d{4}-\d{2}-\d{2}$/.test(v.gregorian || '') ? v.gregorian : ''; return g || hijriToG(v.hijri); };

/* the image sent to the server: upright-ish, max 1600px, JPEG */
async function aiPrepare(file) {
  const img = await loadImg(URL.createObjectURL(file));
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  /* the copy kept on the profile: card found, background cut, turned upright (same as the profile upload) */
  const box = findCard(img), w = box ? box.w : img.width, h = box ? box.h : img.height;
  const card = drawCard(img, box, h > w * 1.05 ? -1 : 0).toDataURL('image/jpeg', 0.86);
  URL.revokeObjectURL(img.src);
  return { send: c.toDataURL('image/jpeg', 0.88), card };
}

const AI_ERR = {
  no_key: 'مفتاح الذكاء الاصطناعي (ANTHROPIC_API_KEY) لسه متضافش في Vercel.', bad_key: 'مفتاح الذكاء الاصطناعي اللي في Vercel غلط أو اتلغى.',
  auth: 'لازم تكون مسجل دخول. اعمل تحديث للصفحة وجرّب تاني.', busy: 'الخدمة مشغولة دلوقتي. جرّب كمان دقيقة.', refusal: 'مقدرش يقرا الصور دي. جرّب صورة أوضح.',
  no_image: 'ارفع صورة الأول.', local: 'الميزة دي بتشتغل على النسخة المرفوعة على Vercel بس، مش على النسخة المحلية.',
};

/* which form field each answer goes to, and where it came from */
const AI_MAP = [
  ['idNumber', 'id_number', 'iqama'], ['nameAr', 'name_ar'], ['nameEn', 'name_en'], ['nationality', 'nationality', 'iqama'],
  ['dob', 'dob', '', true], ['iqamaExpiry', 'iqama_expiry', 'iqama', true], ['iqamaProfession', 'iqama_profession', 'iqama'],
  ['iqamaEmployer', 'iqama_employer', 'iqama'], ['iqamaIssuePlace', 'iqama_issue_place', 'iqama'], ['bloodType', 'blood_type'],
  ['licenseNo', 'license_number', 'license'], ['licenseType', 'license_type', 'license'], ['licenseIssue', 'license_issue', 'license', true], ['licenseExpiry', 'license_expiry', 'license', true],
];

function bindAiScan(panel, body, base) {
  const box = $('#ai-scan', panel); if (!box) return;
  const st = { iqama: null, license: null };
  const msg = (t, cls = '') => { const m = $('#ai-msg', box); m.className = 'ai-msg ' + cls; m.innerHTML = t; };
  const sync = () => {
    AI_KINDS.forEach(([k, , ic]) => {
      const s = $(`[data-slot="${k}"]`, box);
      s.classList.toggle('has', !!st[k]);
      $('.ai-prev', s).innerHTML = st[k] ? `<img src="${st[k].card}" alt="">` : icon(ic);
      $('small', s).textContent = tr(st[k] ? 'جاهزة · دوس تاني عشان تغيّرها' : 'اختار صورة أو اسحبها هنا');
      $('.ai-del', s).hidden = !st[k];
    });
    $('#ai-go', box).disabled = !st.iqama && !st.license;
  };
  const take = async (k, file) => {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) return alert('اختار ملف صورة (لو معاك PDF خد منه سكرين شوت)');
    try { st[k] = await aiPrepare(file); } catch (e) { return alert('مقدرتش أقرا الصورة دي'); }
    sync(); msg('');
  };
  AI_KINDS.forEach(([k]) => {
    const s = $(`[data-slot="${k}"]`, box), inp = $(`[data-file="${k}"]`, box);
    inp.onchange = () => { take(k, inp.files[0]); inp.value = ''; };
    s.ondragover = e => { e.preventDefault(); s.classList.add('over'); };
    s.ondragleave = () => s.classList.remove('over');
    s.ondrop = e => { e.preventDefault(); s.classList.remove('over'); take(k, e.dataTransfer.files[0]); };
  });
  $$('[data-del]', box).forEach(b => b.onclick = e => { e.preventDefault(); st[b.dataset.del] = null; sync(); });

  const setField = (k, v, from) => {
    const el = $(`[data-k="${k}"]`, body), w = $(`[data-f="${k}"]`, body);
    if (!el || !w || v === '' || v == null) return 0;
    v = String(v).trim();
    const old = el.value.trim();
    $('.ai-tag', w)?.remove();
    const src = tr(from === 'license' ? 'من الرخصة' : from === 'iqama' ? 'من الإقامة' : 'من الكارت');
    if (old && old !== v) {
      /* never overwrite what was typed: offer the card's value instead */
      w.insertAdjacentHTML('beforeend', `<div class="ai-tag warn">${icon('alert-triangle')}<span>${src}: <b>${esc(v)}</b></span><button type="button" class="link-btn">${tr('استخدمها')}</button></div>`);
      $('.ai-tag button', w).onclick = () => { putValue(el, k, v); $('.ai-tag', w).remove(); w.classList.add('ai'); body.dispatchEvent(new Event('input')); };
      return 0;
    }
    if (old === v) return 0;
    putValue(el, k, v);
    w.classList.add('ai');
    w.insertAdjacentHTML('beforeend', `<div class="ai-tag">${icon('sparkles')}<span>${src} · ${tr('راجعها')}</span></div>`);
    return 1;
  };
  const putValue = (el, k, v) => {
    if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) {
      const f = fieldOf('employees', k);
      if (f && f.o && DB.lists[f.o] && !DB.lists[f.o].includes(v)) DB.lists[f.o].push(v);
      el.add(new Option(v, v));
    }
    el.value = v;
  };
  body.addEventListener('input', e => { const w = e.target.closest && e.target.closest('.f.ai'); if (w && e.isTrusted) { w.classList.remove('ai'); $('.ai-tag', w)?.remove(); } });

  $('#ai-go', box).onclick = async () => {
    const go = $('#ai-go', box); go.disabled = true;
    msg(`${icon('loader-2')} ${tr('بيقرا الصور... ده بياخد حوالي 20 ثانية')}`, 'busy');
    $('#ai-warn', box).hidden = true;
    try {
      if (typeof SB === 'undefined' || !SB) throw { code: 'local' };
      const { data: { session } } = await SB.auth.getSession();
      if (!session) throw { code: 'auth' };
      const r = await fetch('api/read-card', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ iqama: st.iqama && st.iqama.send, license: st.license && st.license.send, lists: { bloodType: options('bloodType'), licenseType: options('licenseType') } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.data) throw { code: j.error || (r.status === 404 ? 'local' : 'server') };
      const d = j.data;
      let n = 0;
      AI_MAP.forEach(([k, a, from, isDate]) => { n += setField(k, isDate ? aiDate(d[a]) : d[a], from); });
      /* keep the photos as the employee's card images */
      for (const [kind, ok] of [['iqama', d.iqama_found], ['license', d.license_found]]) {
        if (!st[kind] || !ok) continue;
        const id = `doc-${base.code || 'new'}-${kind}-${Date.now()}`;
        try { await FILES.put(id, st[kind].card); base.docs = { ...(base.docs || {}), [kind]: id }; } catch (e) { /* the data still fills; the photo can be added from the profile */ }
      }
      body.dispatchEvent(new Event('input'));
      const warns = (d.warnings || []).filter(Boolean);
      if (warns.length) { const ul = $('#ai-warn', box); ul.innerHTML = warns.map(w => `<li>${icon('info-circle')}${esc(w)}</li>`).join(''); ul.hidden = false; }
      const conflicts = $$('.ai-tag.warn', body).length;
      msg(`${icon('circle-check')} ${n ? `${tr('اتملت')} ${n} ${tr('خانة. الخانات المعلّمة بالأخضر محتاجة مراجعة')}` : tr('مفيش خانات جديدة اتملت')}${conflicts ? ` · ${conflicts} ${tr('خانة مكتوب فيها حاجة مختلفة عن الكارت')}` : ''}`, 'ok');
      const first = $('.f.ai, .ai-tag.warn', body); if (first) (first.closest('.f') || first).scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (e) {
      msg(`${icon('alert-circle')} ${tr(AI_ERR[e && e.code] || 'حصلت مشكلة. جرّب تاني كمان شوية.')}`, 'bad');
    } finally { go.disabled = !st.iqama && !st.license; }
  };
  sync();
}
