/* =====================================================================
   INQLHA admin – attachments (invoices, IBAN certificates)
   A "files" field keeps a small list on the record: [{ id, name, type, size, due, at }].
   The file itself (PDF or image as a data URL) lives in FILES (app_files / IndexedDB).
   Payment requests show each bill's files and can put them all in one PDF.
   ===================================================================== */
const FILE_MAX_MB = 5;
const asFiles = v => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim().startsWith('[')) { try { return JSON.parse(v); } catch (e) { /* bad value: treat as empty */ } }
  return [];
};
const fileIcon = x => x.type === 'pdf' ? 'file-type-pdf' : 'photo';
const fileSize = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} ميجا` : `${Math.max(1, Math.round(n / 1024))} كيلو`;
const fileDue = x => x.due ? `استحقاق ${fmtDate(x.due)}` : '';

function fileChipHTML(x, removable) {
  return `<div class="fchip"><span class="fic ${x.type === 'pdf' ? 'pdf' : ''}">${icon(fileIcon(x))}</span>
    <button type="button" class="fname" data-file-open="${esc(x.id)}" data-name="${esc(x.name)}" title="فتح الملف"><b dir="auto">${esc(x.name)}</b><small>${[fileDue(x), fileSize(x.size || 0)].filter(Boolean).join(' · ')}</small></button>
    ${removable ? `<button type="button" class="icon-btn sm" data-file-rm="${esc(x.id)}" aria-label="شيل ${esc(x.name)}">${icon('x')}</button>` : ''}</div>`;
}
/* newest due date first, so the current period's invoice sits on top */
const sortFiles = fs => [...fs].sort((a, b) => (b.due || '').localeCompare(a.due || '') || (b.at || '').localeCompare(a.at || ''));

function filesInputHTML(f, v) {
  const fs = asFiles(v);
  return `<div class="fup" data-files="${f.k}">
      <div class="fup-list">${sortFiles(fs).map(x => fileChipHTML(x, true)).join('')}</div>
      <label class="fup-add">${icon('cloud-upload')}<span><b>${f.max === 1 && fs.length ? 'غيّر الملف' : f.period ? 'ارفع فاتورة' : 'ارفع ملف'}</b><small class="fup-hint">PDF أو صورة · لحد ${FILE_MAX_MB} ميجا</small></span>
        <input type="file" hidden accept="application/pdf,image/*" ${f.max === 1 ? '' : 'multiple'}></label>
    </div><input type="hidden" data-k="${f.k}" value="${esc(JSON.stringify(fs))}">`;
}
function filesViewHTML(f, v) {
  const fs = asFiles(v);
  if (!fs.length) return '<span class="muted">—</span>';
  return `<div class="fup-list view">${sortFiles(fs).map(x => fileChipHTML(x, false)).join('')}</div>`;
}

/* read an upload: PDFs as they are, photos made smaller (white behind any transparency) */
function readUpload(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImg = (file.type || '').startsWith('image/');
  if (!isPdf && !isImg) return Promise.reject(`"${file.name}" مش PDF ولا صورة`);
  if (file.size > FILE_MAX_MB * 1048576) return Promise.reject(`"${file.name}" أكبر من ${FILE_MAX_MB} ميجا. صغّره أو صوّره تاني`);
  if (isPdf) return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ data: r.result, type: 'pdf', size: file.size }); r.onerror = () => rej(`مقدرتش أقرا "${file.name}"`); r.readAsDataURL(file); });
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      const data = c.toDataURL('image/jpeg', 0.85);
      res({ data, type: 'img', size: Math.round(data.length * 0.75) });
    };
    img.onerror = () => rej(`مقدرتش أقرا الصورة "${file.name}"`);
    img.src = URL.createObjectURL(file);
  });
}
const newFileId = () => `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
async function storeUploads(files, extra = {}) {
  const out = [];
  for (const file of files) {
    const r = await readUpload(file);
    const id = newFileId();
    await FILES.put(id, r.data);
    out.push({ id, name: file.name || (r.type === 'pdf' ? 'ملف.pdf' : 'صورة.jpg'), type: r.type, size: r.size, at: todayStr(), ...extra });
  }
  return out;
}

/* the upload boxes inside openForm */
function bindFileFields(ent, body, read) {
  $$('.fup', body).forEach(box => {
    const k = box.dataset.files, f = fieldOf(ent, k);
    const hid = $(`[data-k="${k}"]`, body), input = $('input[type=file]', box);
    const get = () => asFiles(hid.value);
    const dueNow = () => { const v = withCalc(ent, read()); return v.nextDue || v.dueDate || ''; };
    const paint = () => {
      const fs = get();
      $('.fup-list', box).innerHTML = sortFiles(fs).map(x => fileChipHTML(x, true)).join('');
      $('.fup-add b', box).textContent = f.max === 1 && fs.length ? 'غيّر الملف' : f.period ? 'ارفع فاتورة' : 'ارفع ملف';
      const d = f.period && dueNow();
      $('.fup-hint', box).textContent = d ? `هتترفع على استحقاق ${fmtDate(d)} · PDF أو صورة` : `PDF أو صورة · لحد ${FILE_MAX_MB} ميجا`;
    };
    const set = fs => { hid.value = JSON.stringify(fs); paint(); body.dispatchEvent(new Event('input')); };
    input.onchange = async () => {
      const picked = [...input.files]; input.value = ''; if (!picked.length) return;
      box.classList.add('busy');
      try {
        const extra = f.period ? { due: dueNow() } : {};
        const added = await storeUploads(f.max === 1 ? picked.slice(0, 1) : picked, extra);
        set(f.max === 1 ? added : [...get(), ...added]);
        toast(added.length > 1 ? `اترفع ${added.length} ملفات` : 'اترفع الملف');
      } catch (e) { alert(typeof e === 'string' ? e : 'حصلت مشكلة وأنا برفع الملف. جرّب تاني.'); }
      box.classList.remove('busy');
    };
    box.addEventListener('click', e => {
      const rm = e.target.closest('[data-file-rm]'); if (!rm) return;
      e.preventDefault();
      set(get().filter(x => x.id !== rm.dataset.fileRm));
    });
    /* the hint follows the due date while it's being typed */
    body.addEventListener('change', () => { if (f.period) paint(); });
    paint();
  });
}

/* open a stored file in a new tab (the tab is opened first so popup blockers allow it) */
async function openStoredFile(id, name) {
  const w = window.open('', '_blank');
  try {
    const data = await FILES.get(id);
    if (!data) throw new Error('missing');
    const url = URL.createObjectURL(await (await fetch(data)).blob());
    if (w) w.location.href = url; else { const a = document.createElement('a'); a.href = url; a.download = name || 'file'; a.click(); }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (e) { if (w) w.close(); alert('الملف ده مش موجود أو مقدرتش أفتحه.'); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-file-open]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  openStoredFile(b.dataset.fileOpen, b.dataset.name);
}, true);

/* ---------------- payment requests ---------------- */
/* a bill line's files: the invoice(s) for that due date, and the IBAN certificate for a transfer */
function pqFiles(it) {
  if (it.ent !== 'bills') return { bill: null, inv: [], cert: [] };
  const bill = DB.bills.find(b => b.code === it.ref);
  if (!bill) return { bill: null, inv: [], cert: [] };
  return { bill, inv: asFiles(bill.invoices).filter(x => x.due === it.due), cert: it.method === 'تحويل' ? asFiles(bill.ibanCert) : [] };
}
const pqAllFiles = it => { const p = pqFiles(it); return [...p.inv.map(x => ({ ...x, kind: 'الفاتورة' })), ...p.cert.map(x => ({ ...x, kind: 'شهادة الآيبان' }))]; };
function pqSoft(it) {
  if (it.ent !== 'bills' || it.paidAt) return [];
  const p = pqFiles(it); if (!p.bill) return [];
  return [!p.inv.length && 'ناقص الفاتورة', it.method === 'تحويل' && !p.cert.length && 'ناقص شهادة الآيبان'].filter(Boolean);
}
function pqFilesHTML(it, n) {
  if (it.ent !== 'bills') return '';
  const fs = pqAllFiles(it), soft = pqSoft(it);
  return `<div class="pq-files">${fs.map(x => `<button type="button" class="fmini" data-file-open="${esc(x.id)}" data-name="${esc(x.name)}" title="${esc(x.name)}">${icon(fileIcon(x))}${esc(x.kind)}</button>`).join('')}
    ${soft.map(s => `<span class="pill warn plain">${icon('paperclip')}${s}</span>`).join('')}
    ${!it.paidAt && pqFiles(it).bill ? `<button type="button" class="fmini add" data-pq-up="${n}">${icon('upload')}${pqFiles(it).inv.length ? 'فاتورة تانية' : 'ارفع الفاتورة'}</button>` : ''}</div>`;
}
/* upload an invoice straight from the request; it is stored on the bill for that due date */
function pqUploadInvoice(q, it) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/pdf,image/*'; inp.multiple = true;
  inp.onchange = async () => {
    const bill = pqFiles(it).bill; if (!bill || !inp.files.length) return;
    try {
      const added = await storeUploads([...inp.files], { due: it.due });
      bill.invoices = [...asFiles(bill.invoices), ...added];
      save(); openPayReq(q.code); toast('اترفعت الفاتورة واتحفظت في الفاتورة نفسها');
    } catch (e) { alert(typeof e === 'string' ? e : 'حصلت مشكلة وأنا برفع الملف. جرّب تاني.'); }
  };
  inp.click();
}

/* the files a request sends: one list in line order */
const pqSendFiles = q => q.items.flatMap((it, n) => pqAllFiles(it).map(x => ({ ...x, line: n + 1, title: it.title })));
const extOf = x => x.type === 'pdf' ? 'pdf' : 'jpg';
const sendName = (q, x) => `${q.code} - ${x.line} - ${x.kind} - ${x.title}.${extOf(x)}`.replace(/[\\/:*?"<>|]/g, '-');
async function fileBlob(x) { const d = await FILES.get(x.id); if (!d) throw new Error('missing'); return (await fetch(d)).blob(); }

const canShareFiles = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] })); } catch (e) { return false; } };
async function pqShare(q) {
  const list = pqSendFiles(q.items.some(x => !x.paidAt) ? { ...q, items: q.items.filter(x => !x.paidAt) } : q);
  try {
    const files = [];
    for (const x of list) files.push(new File([await fileBlob(x)], sendName(q, x), { type: x.type === 'pdf' ? 'application/pdf' : 'image/jpeg' }));
    await navigator.share({ title: `طلب دفع ${q.code}`, text: pqText(q).replace(/\*/g, ''), files });
    pqMarkSent(q, 'مشاركة');
  } catch (e) { if (e && e.name !== 'AbortError') alert('مقدرتش أشارك الملفات من الجهاز ده. استخدم PDF أو تنزيل المرفقات.'); }
}
async function pqDownloadFiles(q) {
  const list = pqSendFiles(q);
  if (!list.length) return alert('مفيش مرفقات في الطلب ده.');
  for (const x of list) {
    try {
      const url = URL.createObjectURL(await fileBlob(x));
      const a = document.createElement('a'); a.href = url; a.download = sendName(q, x); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      await new Promise(r => setTimeout(r, 350));
    } catch (e) { /* skip a missing file */ }
  }
  toast(`اتنزل ${list.length} ملف`);
}

/* PDF pages become images so they can sit inside the printed request (pdf.js, loaded only when needed) */
let pdfjsReady = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = () => { pdfjsReady = null; rej(new Error('pdfjs')); };
    document.head.appendChild(s);
  });
  return pdfjsReady;
}
async function pdfToImages(dataUrl, maxPages = 15) {
  const lib = await loadPdfJs();
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
  const doc = await lib.getDocument({ data: bytes }).promise;
  const out = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 2 });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    out.push(c.toDataURL('image/jpeg', 0.88));
  }
  return { pages: out, more: doc.numPages > maxPages };
}
/* the attachment pages that follow the request in its PDF */
async function pqAttachPagesHTML(q, T) {
  const list = pqSendFiles(q);
  let html = '', k = 0;
  for (const x of list) {
    k++;
    const head = (extra = '') => `<div class="att-h"><b>${T('مرفق')} ${k}</b><span>${T(x.kind)} · ${T('البند')} ${x.line}: ${T(x.title)}${x.due ? ` · ${T('الاستحقاق')} <span class="num">${esc(x.due)}</span>` : ''}${extra}</span></div>`;
    try {
      const data = await FILES.get(x.id);
      if (!data) throw new Error('missing');
      if (x.type === 'pdf') {
        const r = await pdfToImages(data);
        r.pages.forEach((src, i) => { html += `<section class="att">${head(r.pages.length > 1 ? ` · ${T('صفحة')} ${i + 1}/${r.pages.length}` : '')}<img src="${src}" alt=""></section>`; });
        if (r.more) html += `<p class="att-more">${T('الملف فيه صفحات أكتر، افتحه من السيستم')}</p>`;
      } else html += `<section class="att">${head()}<img src="${data}" alt=""></section>`;
    } catch (e) {
      html += `<section class="att">${head()}<p class="att-miss">${T('مقدرتش أحط الملف ده هنا')}: ${esc(x.name)}</p></section>`;
    }
  }
  return { html, count: list.length };
}
