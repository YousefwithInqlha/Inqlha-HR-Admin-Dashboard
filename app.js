/* =====================================================================
   INQLHA admin – app shell, lists, detail drawer, forms, dashboard
   ===================================================================== */
const STORE = 'inqlha-admin-v1';
let DB = load();
const UI = { page: 'dashboard', tab: null, search: '', filters: {}, sort: null };

/* fill in anything an older copy of the data is missing */
function normalize(s) {
  s.lists = Object.assign(JSON.parse(JSON.stringify(DEFAULT_LISTS)), s.lists || {});
  s.settings = Object.assign({ egpToSar: 0.077, showSensitive: false }, s.settings || {});
  Object.keys(ENTITIES).forEach(k => { if (!s[k]) s[k] = []; });
  if (!s.payrolls) s.payrolls = [];
  return migrate(s);
}
function load() {
  if (CLOUD) return emptyDB(); // server mode: the real data arrives after login (cloud.js)
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (s && s.employees) return normalize(s);
  } catch (e) { /* start empty */ }
  return emptyDB();
}
/* a fresh start: no records, default dropdown lists (sample data is still available from Settings) */
function emptyDB() {
  const d = { lists: JSON.parse(JSON.stringify(DEFAULT_LISTS)), settings: { egpToSar: 0.077, showSensitive: true, accountant: { name: '', phone: '', email: '' } }, payrolls: [], payRequests: [] };
  Object.keys(ENTITIES).forEach(k => { d[k] = []; });
  return d;
}
function save() { if (CLOUD) return cloudQueueSave(); localStorage.setItem(STORE, JSON.stringify(DB)); }

/* ---------------- helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = n => num(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const fmtDate = s => { const d = parseDate(s); return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ''; };
const fmtMonth = s => { if (!s) return ''; const [y, m] = s.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
const daysTxt = n => n === 0 ? 'النهارده' : n === 1 ? 'بكرة' : n === 2 ? 'بعد يومين' : n <= 10 ? `بعد ${n} أيام` : `بعد ${n} يوم`;
const agoTxt = n => n === 1 ? 'من يوم' : n === 2 ? 'من يومين' : n <= 10 ? `من ${n} أيام` : `من ${n} يوم`;
const initials = s => String(s || '؟').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join(' ');
const allFields = ent => ENTITIES[ent].sections.flatMap(s => s[1]);
const fieldOf = (ent, k) => allFields(ent).find(f => f.k === k);
const options = o => DB.lists[o] || STATIC[o] || [];
const INACTIVE = ['منتهي', 'مستقيل', 'منتهي عقده'];
const toSar = (amount, currency) => currency === 'جنيه' ? num(amount) * num(DB.settings.egpToSar) : num(amount);
const MASK = '<span class="masked">••••</span>';
const icon = n => `<i class="ti ti-${n}" aria-hidden="true"></i>`;
const FIELD_ICONS = { kind: 'user-question', assignedCar: 'car', code: 'hash', nameAr: 'user', nameEn: 'language', nationality: 'flag', dob: 'cake', marital: 'heart', dependents: 'users', idNumber: 'id-badge-2', iqamaExpiry: 'calendar-exclamation', passportNo: 'book', passportExpiry: 'calendar-exclamation', phone: 'phone', companyEmail: 'mail', personalEmail: 'mail', emergencyName: 'urgent', emergencyRelation: 'users', emergencyPhone: 'phone-call', jobTitle: 'briefcase', department: 'sitemap', manager: 'user-star', joinDate: 'calendar-plus', contractYears: 'hourglass', contractEnd: 'calendar-x', probationEnd: 'calendar-check', serviceYears: 'clock', status: 'circle-check', lastDay: 'calendar-off', empType: 'id', country: 'world', workLocation: 'building', city: 'map-pin', saudizationCompany: 'building-community', saudizationFee: 'receipt-2', gosi: 'shield', gosiAmount: 'coins', medicalClass: 'heartbeat', medicalExpiry: 'calendar-heart', currency: 'currency', basic: 'wallet', housing: 'home', transport: 'car', cola: 'trending-up', comms: 'phone', other: 'plus', total: 'sum', payMethod: 'transfer', iban: 'building-bank', bank: 'building-bank', bankCode: 'code', advRemaining: 'cash', advDeduction: 'cash-off', net: 'wallet', eos: 'gift', licenseNo: 'license', licenseExpiry: 'calendar-exclamation', car: 'car', laptop: 'device-laptop', plate: 'car', carType: 'truck', color: 'palette', brand: 'tag', model: 'tag', driver: 'steering-wheel', rentalOffice: 'building-store', officeIban: 'building-bank', price: 'coins', payPeriod: 'repeat', periodAmount: 'calculator', nextPayment: 'calendar-due', startDate: 'calendar-plus', endDate: 'calendar-x', regExpiry: 'file-certificate', insuranceExpiry: 'shield-check', contractLink: 'link', contractNo: 'file-text', propType: 'building', address: 'map-2', residents: 'users', landlord: 'user', landlordIban: 'building-bank', amount: 'coins', payDate: 'calendar', from: 'calendar-event', to: 'calendar-event', method: 'credit-card', notes: 'notes', serviceType: 'category', location: 'map-pin', linkedContract: 'link', provider: 'building-store', accountNo: 'hash', sadad: 'receipt', frequency: 'repeat', dueDay: 'calendar', dueDate: 'calendar-event', amountType: 'adjustments', avg3: 'chart-line', responsible: 'user-check', thisMonth: 'circle-check', nextDue: 'calendar-due', billCode: 'receipt', month: 'calendar-month', type: 'category', serial: 'barcode', cpu: 'cpu', ram: 'database', storage: 'device-sd-card', screen: 'device-desktop', purchaseDate: 'shopping-cart', warrantyEnd: 'shield', condition: 'stethoscope', place: 'map-pin', empCode: 'user', handoverDate: 'calendar-share', formLink: 'signature', months: 'hourglass', monthly: 'calendar-repeat', paid: 'check', remaining: 'hourglass-low', loanType: 'tag', date: 'calendar', assetCode: 'device-laptop', fromEmp: 'user-minus', toEmp: 'user-plus' };
const fIcon = f => `<i class="ti ti-${FIELD_ICONS[f.k] || (f.t === 'date' ? 'calendar' : f.money ? 'coins' : 'point')}" aria-hidden="true"></i>`;
/* avatar: photo if there is one, else initials, else an icon tile */
function avatarHTML(p, V, cls = '') {
  if (p.photo) return `<img class="avatar ${cls}" src="${esc(p.photo)}" alt="">`;
  if (p.avatar) return `<span class="avatar ${cls}">${esc(p.avatar)}</span>`;
  return `<span class="avatar sq ${cls}"><i class="ti ti-${p.icon || (V && V.icon) || 'point'}" aria-hidden="true"></i></span>`;
}
function resizeImage(file, max = 360) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}
const curOf = r => r && r.currency === 'جنيه' ? 'ج.م' : 'ر.س';
const money = (v, cur = 'ر.س') => `<span class="money num">${fmtNum(v)}<small>${cur}</small></span>`;

function withCalc(ent, row) {
  const r = { ...row };
  allFields(ent).forEach(f => { if (f.calc) r[f.k] = f.calc(r); });
  return r;
}
const empName = code => { const e = L.emp(code); return e ? nameOf(e) : code; };
function contractLabel(no) {
  const c = DB.cars.find(x => x.contractNo === no);
  if (c) return `سيارة ${c.plate}`;
  const p = DB.properties.find(x => x.contractNo === no);
  if (p) return `${p.propType} ${p.city || ''}`;
  return no || '';
}
function billLabel(code) { const b = DB.bills.find(x => x.code === code); return b ? `${b.serviceType} - ${b.location}` : (code || ''); }
function findEntOfContract(no) { return DB.cars.some(c => c.contractNo === no) ? 'cars' : 'properties'; }

/* ---------------- per-entity view config ---------------- */
const VIEW = {
  employees: {
    icon: 'user', filters: ['kind', 'empType', 'country', 'workLocation', 'department', 'status'],
    primary: r => ({ title: nameOf(r), sub: [r.jobTitle, r.code].filter(Boolean).join(' · '), avatar: initials(nameOf(r)), photo: r.photo }),
    cols: ['primary', 'kind', 'department', 'empType', 'workLocation', 'net', 'status'],
    facts: r => [['صافي الراتب', sens(fmtNum(r.net) + ' ' + curOf(r))], ['السيارة', r.car], ['اللابتوب', r.laptop]],
    related: [
      { ent: 'advances', by: 'empCode', title: 'السلف' },
      { ent: 'cars', by: 'driver', title: 'السيارات اللي معاه' },
      { ent: 'assets', by: 'empCode', title: 'العهد اللي معاه' },
    ],
    quick: r => [{ label: 'إضافة سلفة', icon: 'cash', run: () => openForm('advances', null, { empCode: r.code }) }],
  },
  advances: {
    icon: 'cash', primary: r => ({ title: empName(r.empCode), sub: `${r.code} · ${fmtDate(r.date)}`, avatar: initials(empName(r.empCode)), photo: (L.emp(r.empCode) || {}).photo }),
    cols: ['primary', 'amount', 'monthly', 'progress', 'remaining'],
    facts: r => [['المبلغ', sens(fmtNum(r.amount))], ['الخصم الشهري', sens(fmtNum(r.monthly))], ['المتبقي', sens(fmtNum(r.remaining))]],
    related: [], parent: r => ['employees', 'code', r.empCode],
  },
  cars: {
    icon: 'car', filters: ['carType', 'city', 'status'],
    primary: r => ({ title: r.plate, sub: [r.carType, r.brand, r.model].filter(Boolean).join(' · '), icon: r.carType === 'ساطحة' ? 'truck' : 'car' }),
    cols: ['primary', 'city', 'driver', 'price', 'nextPayment', 'status'],
    facts: r => [['الإيجار الشهري', fmtNum(r.price) + ' ر.س'], ['الدفعة الجاية', fmtDate(r.nextPayment) || '—'], ['السواق', r.driver ? empName(r.driver) : '—']],
    related: [{ ent: 'rentPayments', by: 'contractNo', title: 'دفعات الإيجار' }],
    quick: r => [{ label: 'طلب دفع', icon: 'file-dollar', run: () => payReqFor(r.plate !== undefined ? 'cars' : 'properties', r.contractNo) }, { label: 'تسجيل دفعة', icon: 'cash-banknote', run: () => openForm('rentPayments', null, { contractNo: r.contractNo, amount: r.periodAmount }) }],
  },
  properties: {
    icon: 'building', filters: ['propType', 'city', 'payPeriod', 'status'],
    primary: r => ({ title: `${r.propType} ${r.city || ''}`, sub: [r.address, r.contractNo].filter(Boolean).join(' · '), icon: r.propType === 'مكتب' ? 'building' : 'home' }),
    cols: ['primary', 'landlord', 'price', 'payPeriod', 'periodAmount', 'nextPayment', 'status'],
    facts: r => [['الإيجار الشهري', fmtNum(r.price) + ' ر.س'], [`الدفعة (${r.payPeriod || ''})`, fmtNum(r.periodAmount) + ' ر.س'], ['الدفعة الجاية', fmtDate(r.nextPayment) || '—']],
    related: [{ ent: 'rentPayments', by: 'contractNo', title: 'دفعات الإيجار' }, { ent: 'bills', by: 'linkedContract', title: 'الفواتير المربوطة' }],
    quick: r => [{ label: 'طلب دفع', icon: 'file-dollar', run: () => payReqFor(r.plate !== undefined ? 'cars' : 'properties', r.contractNo) }, { label: 'تسجيل دفعة', icon: 'cash-banknote', run: () => openForm('rentPayments', null, { contractNo: r.contractNo, amount: r.periodAmount }) }],
  },
  rentPayments: {
    icon: 'cash-banknote', filters: ['method'],
    primary: r => ({ title: contractLabel(r.contractNo), sub: `${r.code} · ${r.contractNo}`, icon: 'cash-banknote' }),
    cols: ['primary', 'payDate', 'amount', 'period', 'method'],
    facts: r => [['المبلغ', fmtNum(r.amount) + ' ر.س'], ['تاريخ الدفع', fmtDate(r.payDate)], ['طريقة الدفع', r.method || '—']],
    related: [], parent: r => [findEntOfContract(r.contractNo), 'contractNo', r.contractNo],
  },
  bills: {
    icon: 'receipt', filters: ['serviceType', 'city', 'provider'],
    primary: r => ({ title: `${r.serviceType} · ${r.location}`, sub: [isOnceBill(r) ? 'مرة واحدة' : '', r.provider, r.code].filter(Boolean).join(' · '), icon: { 'نت': 'wifi', 'كهرباء': 'bolt', 'مية': 'droplet', 'موبايل': 'device-mobile', 'خط أرضي': 'phone' }[r.serviceType] || 'receipt' }),
    cols: ['primary', 'city', 'amount', 'nextDue', 'thisMonth'],
    facts: r => [['آخر مبلغ', fmtNum(r.amount) + ' ر.س'], ['رقم السداد', r.accountNo || '—'], ['الدفع الجاي', fmtDate(r.nextDue)]],
    related: [{ ent: 'billPayments', by: 'billCode', title: 'سجل الدفعات' }],
    quick: r => [{ label: 'طلب دفع', icon: 'file-dollar', run: () => payReqFor('bills', r.code) }, { label: 'تسجيل دفعة', icon: 'cash-banknote', run: () => openForm('billPayments', null, { billCode: r.code, amount: r.amount }) }],
  },
  billPayments: {
    icon: 'cash-banknote',
    primary: r => ({ title: billLabel(r.billCode), sub: `${r.code} · عن ${fmtMonth(r.month)}`, icon: 'receipt' }),
    cols: ['primary', 'month', 'amount', 'payDate'],
    facts: r => [['المبلغ', fmtNum(r.amount) + ' ر.س'], ['عن شهر', fmtMonth(r.month)], ['تاريخ الدفع', fmtDate(r.payDate) || '—']],
    related: [], parent: r => ['bills', 'code', r.billCode],
  },
  assets: {
    icon: 'device-laptop', filters: ['type', 'place', 'condition'],
    primary: r => ({ title: [r.brand, r.model].filter(Boolean).join(' ') || r.type, sub: `${r.type} · ${r.code}`, icon: { 'لابتوب': 'device-laptop', 'موبايل': 'device-mobile', 'شاشة': 'device-desktop', 'شريحة': 'device-sim', 'تابلت': 'device-tablet' }[r.type] || 'box' }),
    cols: ['primary', 'specs', 'place', 'empCode', 'condition', 'warrantyEnd'],
    facts: r => [['مكانه', r.place || '—'], ['مع', r.empCode ? empName(r.empCode) : '—'], ['المواصفات', specs(r) || '—']],
    related: [{ ent: 'assetHistory', by: 'assetCode', title: 'سجل التسليم' }],
    quick: r => r.place === 'مع موظف'
      ? [{ label: 'استلام للمخزن', icon: 'arrow-back-up', run: () => receiveAsset(r.code) }]
      : [{ label: 'تسليم لموظف', icon: 'user-share', run: () => openForm('assets', DB.assets.findIndex(a => a.code === r.code), { place: 'مع موظف', handoverDate: todayStr() }, 'empCode') }],
  },
  assetHistory: {
    icon: 'history',
    primary: r => { const a = DB.assets.find(x => x.code === r.assetCode); return { title: a ? [a.brand, a.model].join(' ') : r.assetCode, sub: r.assetCode, icon: 'history' }; },
    cols: ['primary', 'fromEmp', 'toEmp', 'date'],
    related: [], parent: r => ['assets', 'code', r.assetCode],
  },
};
const specs = r => [r.cpu, r.ram, r.storage].filter(Boolean).join(' · ');
const sens = v => DB.settings.showSensitive ? v : '••••';

const PAGES = {
  dashboard: { title: 'الرئيسية', icon: 'layout-dashboard' },
  employees: { title: 'الموظفين', icon: 'users', tabs: ['employees', 'advances', 'payrolls'], desc: 'بيانات الموظفين والرواتب والسلف' },
  rentals: { title: 'الإيجارات', icon: 'building-community', tabs: ['cars', 'properties', 'rentPayments'], desc: 'السيارات والسكن والمكاتب ودفعاتها' },
  bills: { title: 'الفواتير', icon: 'receipt', tabs: ['bills', 'billPayments', 'payRequests'], desc: 'الخدمات الشهرية، وطلبات الدفع اللي بتتبعت للمحاسب' },
  assets: { title: 'العهد', icon: 'device-laptop', tabs: ['assets', 'assetHistory'], desc: 'أجهزة الشركة ومع مين' },
  alerts: { title: 'التنبيهات', icon: 'bell', desc: 'كل حاجة قرب ميعادها أو عدّى' },
  settings: { title: 'الإعدادات', icon: 'settings', desc: 'القوائم المنسدلة وإدارة البيانات' },
};
const TAB_ICON = { employees: 'users', advances: 'cash', payrolls: 'file-invoice', cars: 'car', properties: 'building', rentPayments: 'cash-banknote', bills: 'receipt', billPayments: 'history', payRequests: 'file-dollar', assets: 'device-laptop', assetHistory: 'history' };
const TAB_LABEL = { payrolls: 'سجل الرواتب', employees: 'الموظفين', advances: 'السلف', cars: 'السيارات', properties: 'السكن والمكاتب', rentPayments: 'دفعات الإيجار', bills: 'الفواتير', billPayments: 'سجل الدفعات', payRequests: 'طلبات الدفع', assets: 'الأجهزة', assetHistory: 'سجل التسليم' };
const pageOfEnt = ent => Object.keys(PAGES).find(p => (PAGES[p].tabs || []).includes(ent));
const SECTION_ICONS = { 'بيانات السداد': 'building-bank', 'موظف ولا سواق؟': 'steering-wheel', 'البيانات الشخصية': 'id', 'الوظيفة والعقد': 'briefcase', 'التوظيف ومكان الدوام': 'map-pin', 'التأمينات والتأمين الطبي': 'shield-check', 'الراتب': 'wallet', 'السلف ونهاية الخدمة': 'cash', 'السواقين': 'steering-wheel', 'مسحوب من الشيتات التانية': 'link', 'بيانات السيارة': 'car', 'الإيجار والدفع': 'cash-banknote', 'العقد والمستندات': 'file-text', 'البيانات الأساسية': 'building', 'المؤجر والدفع': 'user-dollar', 'العقد': 'file-text', 'بيانات الدفعة': 'cash-banknote', 'بيانات الفاتورة': 'receipt', 'الدفع': 'calendar-dollar', 'بيانات الجهاز': 'device-laptop', 'المواصفات': 'cpu', 'الشراء والحالة': 'shopping-cart', 'التسليم': 'user-share', 'بيانات السلفة': 'cash', 'الحركة': 'history' };

/* ---------------- alerts ---------------- */
function alertOf(f, v, r) {
  if (!f.alert || !v || INACTIVE.includes(r.status)) return null;
  const d = daysUntil(v);
  if (d == null) return null;
  const isPay = f.k === 'nextDue' || f.k === 'nextPayment';
  if (d < 0) return { cls: 'danger', txt: isPay ? `متأخر ${-d} يوم` : `انتهى ${agoTxt(-d)}`, d };
  if (d <= f.alert) return { cls: 'warn', txt: (isPay ? 'مستحق ' : 'ينتهي ') + daysTxt(d), d };
  return null;
}
function rowAlerts(ent, r) {
  return allFields(ent).filter(f => f.alert && (!f.show || f.show(r)))
    .map(f => { const a = alertOf(f, r[f.k], r); return a && { ...a, field: f.l, date: r[f.k], k: f.k }; })
    .filter(Boolean);
}
function collectAlerts() {
  const out = [];
  ['employees', 'cars', 'properties', 'bills', 'assets'].forEach(ent => DB[ent].forEach((row, i) => {
    const r = withCalc(ent, row);
    rowAlerts(ent, r).forEach(a => out.push({ ...a, ent, i, item: VIEW[ent].primary(r).title }));
  }));
  return out.sort((a, b) => a.d - b.d);
}

/* ---------------- cell rendering ---------------- */
function dateCell(f, r) {
  const v = r[f.k]; if (!v) return '<span class="muted">—</span>';
  const a = alertOf(f, v, r);
  return `<div class="date-cell">${esc(fmtDate(v))}${a ? `<small class="${a.cls}">${a.txt}</small>` : ''}</div>`;
}
function statusPill(v) {
  if (!v) return '';
  const cls = { 'على رأس العمل': 'ok', 'ساري': 'ok', 'متجدد': 'info', 'مدفوعة': 'ok', 'مش مدفوعة': 'warn', 'إجازة طويلة': 'warn', 'مع موظف': 'info', 'في المخزن': '', 'في الصيانة': 'warn', 'جديد': 'ok', 'كويس': 'ok', 'محتاج صيانة': 'warn', 'عطلان': 'danger' }[v];
  return `<span class="pill ${cls ?? ''}">${esc(v)}</span>`;
}
function cellHTML(ent, k, r) {
  const V = VIEW[ent];
  if (k === 'primary') {
    const p = V.primary(r);
    const av = avatarHTML(p, V);
    return `<div class="cell-main">${av}<div><b>${esc(p.title)}</b><small>${esc(p.sub)}</small></div></div>`;
  }
  if (k === 'specs') return esc(specs(r)) || '<span class="muted">—</span>';
  if (k === 'period') return r.from ? `<span class="muted">${fmtDate(r.from)} ← ${fmtDate(r.to)}</span>` : '<span class="muted">—</span>';
  if (k === 'progress') { const p = num(r.amount) ? Math.min(100, num(r.paid) / num(r.amount) * 100) : 0; return `<div class="progress" title="اتسدد ${p.toFixed(0)}%"><span style="width:${p}%"></span></div>`; }
  const f = fieldOf(ent, k);
  const v = r[k];
  if (f.sens && !DB.settings.showSensitive && v !== '' && v != null) return MASK;
  if (v === '' || v == null) return '<span class="muted">—</span>';
  if (f.t === 'date' || k === 'nextDue') return dateCell(f, r);
  if (f.t === 'month') return esc(fmtMonth(v));
  if (f.t === 'emp') return esc(empName(v));
  if (f.t === 'contract') return esc(contractLabel(v));
  if (f.t === 'bill') return esc(billLabel(v));
  if (f.money) return money(v, ent === 'employees' ? curOf(r) : 'ر.س');
  if (['status', 'thisMonth', 'place', 'condition'].includes(k)) return statusPill(v);
  return esc(v);
}
function plainValue(ent, f, r) {
  const v = r[f.k];
  if (v === '' || v == null || f.t === 'photo') return '';
  if (f.t === 'emp') return `${v} - ${empName(v)}`;
  if (f.t === 'contract') return `${v} - ${contractLabel(v)}`;
  if (f.t === 'bill') return `${v} - ${billLabel(v)}`;
  if (f.money) return num(v);
  return v;
}
const colLabel = (ent, k) => ({ primary: { employees: 'الموظف', advances: 'الموظف', cars: 'السيارة', properties: 'العقار', rentPayments: 'العقد', bills: 'الفاتورة', billPayments: 'الفاتورة', assets: 'الجهاز', assetHistory: 'الجهاز' }[ent], specs: 'المواصفات', period: 'الفترة', progress: 'نسبة السداد' }[k] || fieldOf(ent, k).l);

/* ---------------- shell ---------------- */
function renderNav() {
  const alerts = collectAlerts();
  const groups = [['', ['dashboard']], ['الإدارة', ['employees', 'rentals', 'bills', 'assets']], ['', ['alerts', 'settings']]];
  $('#nav').innerHTML = groups.map(([g, keys]) => (g ? `<div class="nav-label">${g}</div>` : '') + keys.map(k => {
    const P = PAGES[k];
    const n = k === 'alerts' ? alerts.length : P.tabs ? DB[P.tabs[0]].length : null;
    const hot = k === 'alerts' && alerts.length;
    return `<a href="#${k}" class="${UI.page === k ? 'active' : ''}">${icon(P.icon)}<span>${P.title}</span>${n != null ? `<span class="count ${hot ? 'hot' : ''}">${n}</span>` : ''}</a>`;
  }).join('')).join('');
  const bell = $('#bell-btn');
  bell.innerHTML = icon('bell') + (alerts.length ? `<span class="dot">${alerts.length}</span>` : '');
  const eye = $('#eye-btn');
  eye.classList.toggle('on', !!DB.settings.showSensitive);
  eye.innerHTML = icon(DB.settings.showSensitive ? 'eye' : 'eye-off');
}
function parseHash() {
  const [p, t] = (location.hash.slice(1) || 'dashboard').split('/');
  UI.page = PAGES[p] ? p : 'dashboard';
  const tabs = PAGES[UI.page].tabs;
  UI.tab = tabs ? (tabs.includes(t) ? t : tabs[0]) : null;
}
window.addEventListener('hashchange', () => { parseHash(); UI.search = ''; UI.filters = {}; UI.sort = null; closeLayer(); render(); window.scrollTo(0, 0); $('#sidebar').classList.remove('open'); });

function render() {
  renderNav();
  const P = PAGES[UI.page];
  document.title = `${P.title} | إنقلها`;
  if (UI.page === 'dashboard') return renderDashboard();
  if (UI.page === 'alerts') return renderAlerts();
  if (UI.page === 'settings') return renderSettings();
  renderList();
}
function pageHead(title, desc, actions = '', ic = '') {
  return `<div class="page-head"><div class="title-row">${ic ? `<span class="page-ico">${icon(ic)}</span>` : ''}<div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div></div><div class="actions">${actions}</div></div>`;
}

/* ---------------- list pages ---------------- */
function tabsHTML(P, ent) {
  return `<div class="tabs" role="tablist">${P.tabs.map(t => `<a class="tab ${t === ent ? 'active' : ''}" href="#${UI.page}/${t}" role="tab">${icon(TAB_ICON[t] || 'point')}${TAB_LABEL[t]}<span class="c">${(DB[t] || []).length}</span></a>`).join('')}</div>`;
}
function rowMenuItems(ent, i) {
  const r = withCalc(ent, DB[ent][i]); const V = VIEW[ent];
  return [{ label: 'عرض التفاصيل', icon: 'eye', run: () => openDetail(ent, i) }, { label: 'تعديل', icon: 'pencil', run: () => openForm(ent, i) },
    ...((V.quick && V.quick(r)) || []), { label: 'حذف', icon: 'trash', danger: true, run: () => removeRow(ent, i) }];
}
function emptyState(ent, filtered) {
  const E = ENTITIES[ent], V = VIEW[ent];
  return `<div class="empty">${icon(filtered ? 'search-off' : V.icon)}<b>${filtered ? 'مفيش نتايج' : `لسه مفيش ${TAB_LABEL[ent]}`}</b>${filtered ? 'جرّب تغيّر البحث أو الفلاتر' : E.readonly ? 'السجل ده بيتملى لوحده لما العهدة تتنقل من موظف لموظف' : `ابدأ بإضافة أول ${E.single}`}${!filtered && !E.readonly ? `<br><button class="btn accent" onclick="openForm('${ent}')">${icon('plus')}إضافة ${E.single}</button>` : ''}</div>`;
}
function empCardHTML(r, i) {
  const al = rowAlerts('employees', r);
  const flag = al.some(a => a.cls === 'danger') ? 'flag-danger' : al.length ? 'flag-warn' : '';
  const meta = [['hash', r.code], ['sitemap', r.department], ['building', r.workLocation], ['world', r.country], r.kind === 'سواق' ? ['steering-wheel', ['سواق', ...L.carOf(r.code).map(c => c.plate)].join(' · ')] : ['id', r.empType], ['phone', r.phone]]
    .filter(m => m[1]).map(([ic, v]) => `<span title="${esc(v)}">${icon(ic)}<span class="${ic === 'phone' ? 'num' : ''}">${esc(v)}</span></span>`).join('');
  const hasCar = r.car && r.car !== 'لا', hasLap = r.laptop && r.laptop !== 'لا';
  return `<article class="emp-card ${flag}" data-i="${i}" tabindex="0">
    <div class="emp-photo">${r.photo ? `<img src="${esc(r.photo)}" alt="">` : esc(initials(nameOf(r)))}</div>
    <div class="emp-info">
      <div class="emp-top"><div style="min-width:0"><b>${esc(nameOf(r))}</b><small>${icon('briefcase')}${esc(r.jobTitle || '—')}</small></div>${statusPill(r.status)}</div>
      <div class="emp-meta">${meta}</div>
      <div class="emp-foot">
        <span class="salary">${icon('wallet')}${DB.settings.showSensitive ? `<span class="num">${fmtNum(r.net)}</span> <small class="muted">${curOf(r)}</small>` : MASK}</span>
        <span class="chips-mini">
          <span class="mini ${hasCar ? 'on' : ''}" title="${esc(hasCar ? r.car : 'مفيش سيارة')}">${icon('car')}</span>
          <span class="mini ${hasLap ? 'on' : ''}" title="${esc(hasLap ? r.laptop : 'مفيش لابتوب')}">${icon('device-laptop')}</span>
          ${num(r.advRemaining) > 0 ? `<span class="mini on" title="عليه سلفة">${icon('cash')}</span>` : ''}
          ${al.length ? `<span class="mini alert ${al.some(a => a.cls === 'danger') ? 'danger' : ''}" title="${esc(al.map(a => a.field + ': ' + a.txt).join(' | '))}">${icon('alert-triangle')}</span>` : ''}
        </span>
      </div>
    </div>
    <button class="icon-btn row-menu" data-menu="${i}" aria-label="خيارات">${icon('dots')}</button>
  </article>`;
}

function renderList() {
  const P = PAGES[UI.page], ent = UI.tab;
  const payBtn = UI.page === 'employees' ? `<button class="btn primary" id="pr-new">${icon('file-invoice')}إصدار ملف الرواتب</button>` : UI.page === 'bills' ? `<button class="btn primary" id="pq-new">${icon('file-dollar')}طلب دفع جديد</button>` : '';
  if (ent === 'payRequests') {
    $('#page').innerHTML = pageHead(P.title, P.desc, payBtn, P.icon) + tabsHTML(P, ent) + '<div id="pq-hist"></div>';
    $('#pq-new').onclick = () => openPayReqNew();
    renderPayRequests($('#pq-hist'));
    return;
  }
  if (ent === 'payrolls') {
    $('#page').innerHTML = pageHead(P.title, P.desc, payBtn, P.icon) + tabsHTML(P, ent) + '<div id="pr-hist"></div>';
    $('#pr-new').onclick = () => openPayroll();
    renderPayrollHistory($('#pr-hist'));
    return;
  }
  const E = ENTITIES[ent], V = VIEW[ent];
  const isEmp = ent === 'employees';
  const add = E.readonly ? '' : `<button class="btn accent" id="add">${icon('plus')}إضافة ${E.single}</button>`;
  $('#page').innerHTML = pageHead(P.title, P.desc, `${payBtn}<button class="btn" id="xl">${icon('file-spreadsheet')}تصدير Excel</button>${add}`, P.icon) + tabsHTML(P, ent) + `
    <div class="toolbar">
      <div class="search-box">${icon('search')}<input class="input" id="q" placeholder="بحث في ${TAB_LABEL[ent]}..." value="${esc(UI.search)}"></div>
      ${(V.filters || []).map(k => { const f = fieldOf(ent, k); const cur = UI.filters[k] || ''; const opts = [...new Set([...options(f.o), ...DB[ent].map(r => r[k]).filter(Boolean)])];
        return `<select class="select ${cur ? 'set' : ''}" data-filter="${k}" aria-label="${esc(f.l)}"><option value="">${esc(f.l)}: الكل</option>${opts.map(o => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`; }).join('')}
      <button class="btn ghost sm" id="clear" ${Object.values(UI.filters).some(Boolean) || UI.search ? '' : 'hidden'}>${icon('x')}مسح الفلاتر</button>
      <div class="grow"></div><span class="result-count" id="count"></span>
      ${isEmp ? `<div class="seg" role="group" aria-label="طريقة العرض"><button id="v-cards" class="${UI.empView !== 'table' ? 'on' : ''}" title="كروت">${icon('layout-grid')}</button><button id="v-table" class="${UI.empView === 'table' ? 'on' : ''}" title="جدول">${icon('list')}</button></div>` : ''}
    </div>
    <div id="list-area"></div>`;
  $('#xl').onclick = () => exportExcel([ent]);
  if ($('#add')) $('#add').onclick = () => openForm(ent);
  if ($('#pr-new')) $('#pr-new').onclick = () => openPayroll();
  if ($('#pq-new')) $('#pq-new').onclick = () => openPayReqNew();
  if (isEmp) { $('#v-cards').onclick = () => { UI.empView = 'cards'; renderList(); }; $('#v-table').onclick = () => { UI.empView = 'table'; renderList(); }; }
  $('#q').oninput = e => { UI.search = e.target.value; draw(); $('#clear').hidden = !UI.search && !Object.values(UI.filters).some(Boolean); };
  $$('[data-filter]').forEach(s => s.onchange = () => { UI.filters[s.dataset.filter] = s.value; renderList(); });
  $('#clear').onclick = () => { UI.search = ''; UI.filters = {}; renderList(); };
  draw();

  function draw() {
    const area = $('#list-area');
    const q = UI.search.trim().toLowerCase();
    let rows = DB[ent].map((row, i) => ({ r: withCalc(ent, row), i }))
      .filter(({ r }) => Object.entries(UI.filters).every(([k, v]) => !v || r[k] === v))
      .filter(({ r }) => !q || [V.primary(r).title, V.primary(r).sub, ...allFields(ent).filter(f => !f.sens || DB.settings.showSensitive).map(f => plainValue(ent, f, r))].join(' ').toLowerCase().includes(q));
    if (UI.sort) {
      const { k, dir } = UI.sort;
      const key = r => k === 'primary' ? V.primary(r).title : k === 'progress' ? num(r.paid) / (num(r.amount) || 1) : r[k];
      rows.sort((a, b) => { const x = key(a.r), y = key(b.r); return x !== '' && y !== '' && !isNaN(+x) && !isNaN(+y) ? (num(x) - num(y)) * dir : String(x ?? '').localeCompare(String(y ?? ''), 'ar') * dir; });
    }
    $('#count').textContent = `${rows.length} من ${DB[ent].length}`;
    const filtered = !!q || Object.values(UI.filters).some(Boolean);
    const bindMenus = () => $$('[data-menu]', area).forEach(b => b.onclick = e => { e.stopPropagation(); showMenu(b, rowMenuItems(ent, +b.dataset.menu)); });

    if (isEmp && UI.empView !== 'table') {
      area.innerHTML = rows.length ? `<div class="emp-grid">${rows.map(({ r, i }) => empCardHTML(r, i)).join('')}</div>` : `<div class="card">${emptyState(ent, filtered)}</div>`;
      $$('.emp-card', area).forEach(c => { c.onclick = e => { if (!e.target.closest('[data-menu]')) openDetail(ent, +c.dataset.i); }; c.onkeydown = e => { if (e.key === 'Enter') openDetail(ent, +c.dataset.i); }; });
      bindMenus();
      return;
    }
    const cols = V.cols;
    const head = cols.map((k, n) => { const s = UI.sort && UI.sort.k === k; return `<th class="sortable ${n > 2 ? 'hide-sm' : ''}" data-sort="${k}">${esc(colLabel(ent, k))} ${s ? icon(UI.sort.dir > 0 ? 'arrow-up' : 'arrow-down') : ''}</th>`; }).join('') + '<th style="width:1%"></th>';
    const body = rows.length ? rows.map(({ r, i }) => {
      const al = rowAlerts(ent, r);
      const flag = al.some(a => a.cls === 'danger') ? 'flag-danger' : al.length ? 'flag-warn' : '';
      return `<tr class="${flag}" data-i="${i}">${cols.map((k, n) => `<td class="${n > 2 ? 'hide-sm' : ''}">${cellHTML(ent, k, r)}</td>`).join('')}
        <td>${E.readonly ? '' : `<button class="icon-btn row-menu" data-menu="${i}" aria-label="خيارات">${icon('dots')}</button>`}</td></tr>`;
    }).join('') : `<tr><td colspan="${cols.length + 1}">${emptyState(ent, filtered)}</td></tr>`;
    area.innerHTML = `<div class="card tbl-card"><div class="tbl-scroll"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;
    $$('[data-sort]', area).forEach(th => th.onclick = () => { const k = th.dataset.sort; UI.sort = UI.sort && UI.sort.k === k ? (UI.sort.dir > 0 ? { k, dir: -1 } : null) : { k, dir: 1 }; draw(); });
    $$('tbody tr[data-i]', area).forEach(tr => tr.onclick = e => { if (!e.target.closest('[data-menu]')) openDetail(ent, +tr.dataset.i); });
    bindMenus();
  }
}

/* ---------------- popover menu ---------------- */
function showMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'menu'; m.id = 'menu';
  m.innerHTML = items.map((it, n) => `<button data-n="${n}" class="${it.danger ? 'danger' : ''}">${icon(it.icon)}${esc(it.label)}</button>`).join('');
  document.body.appendChild(m);
  const b = anchor.getBoundingClientRect();
  m.style.top = Math.min(b.bottom + 4, innerHeight - m.offsetHeight - 8) + 'px';
  m.style.left = Math.max(8, b.left) + 'px';
  m.onclick = e => { const btn = e.target.closest('[data-n]'); if (btn) { closeMenu(); items[+btn.dataset.n].run(); } };
  setTimeout(() => document.addEventListener('click', closeMenu, { once: true }));
}
function closeMenu() { $('#menu')?.remove(); }

/* ---------------- layer (drawer / palette) ---------------- */
let layerGuard = null;
function openLayer(html, cls = 'drawer') {
  $('#layer').innerHTML = `<div class="overlay ${cls === 'palette' ? 'top' : ''}" id="ov"></div><div class="${cls}" id="panel" role="dialog" aria-modal="true">${html}</div>`;
  $('#ov').onclick = () => tryClose();
  return $('#panel');
}
function tryClose() { if (layerGuard && !layerGuard()) return; closeLayer(); }
function closeLayer() { $('#layer').innerHTML = ''; layerGuard = null; }
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  else if (e.key === 'Escape' && $('#panel')) { if ($('#menu')) closeMenu(); else tryClose(); }
});

/* ---------------- detail drawer ---------------- */
function openDetail(ent, i) {
  const E = ENTITIES[ent], V = VIEW[ent];
  const r = withCalc(ent, DB[ent][i]);
  const p = V.primary(r);
  const al = rowAlerts(ent, r);
  const status = r.status || r.thisMonth || r.place;
  const av = avatarHTML(p, V, 'lg');
  const sections = E.sections.map(([title, fields]) => {
    const vis = fields.filter(f => f.t !== 'photo' && (!f.show || f.show(r)) && r[f.k] !== '' && r[f.k] != null);
    if (!vis.length) return '';
    return `<div class="d-section"><h4>${title}</h4><dl class="kv">${vis.map(f => `<div><dt>${fIcon(f)}${esc(f.l)}</dt><dd>${detailValue(ent, f, r)}</dd></div>`).join('')}</dl></div>`;
  }).join('');
  const related = (V.related || []).map(rel => {
    const items = DB[rel.ent].map((x, j) => ({ x: withCalc(rel.ent, x), j })).filter(({ x }) => x[rel.by] === r[E.key]);
    const RV = VIEW[rel.ent];
    const addBtn = ENTITIES[rel.ent].readonly ? '' : `<button class="link-btn" data-rel-add="${rel.ent}:${rel.by}">${icon('plus')}إضافة</button>`;
    return `<div class="d-section"><h4><span>${rel.title} (${items.length})</span>${addBtn}</h4><div class="rel">${items.length ? items.map(({ x, j }) => {
      const rp = RV.primary(x);
      return `<div class="rel-item" data-open="${rel.ent}:${j}"><span class="avatar sq">${icon(rp.icon || RV.icon)}</span><div class="txt"><b>${esc(relTitle(rel.ent, x, rp))}</b><small>${esc(relSub(rel.ent, x, rp))}</small></div>${icon('chevron-left')}</div>`;
    }).join('') : `<div class="rel-empty">مفيش ${rel.title} لسه</div>`}</div></div>`;
  }).join('');
  const parent = V.parent && V.parent(r);
  const parentIdx = parent ? DB[parent[0]].findIndex(x => x[parent[1]] === parent[2]) : -1;
  const quick = (V.quick && V.quick(r)) || [];

  const panel = openLayer(`
    <div class="d-head">${av}<div class="t"><h2>${esc(p.title)}</h2><p>${esc(p.sub)}</p>${status ? statusPill(status) : ''}</div>
      <button class="icon-btn" id="dclose" aria-label="إغلاق">${icon('x')}</button></div>
    ${E.readonly ? '' : `<div class="d-actions"><button class="btn primary sm" id="dedit">${icon('pencil')}تعديل</button>
      ${quick.map((q, n) => `<button class="btn sm" data-quick="${n}">${icon(q.icon)}${esc(q.label)}</button>`).join('')}
      ${parentIdx >= 0 ? `<button class="btn sm" id="dparent">${icon('arrow-up-left')}فتح ${esc(ENTITIES[parent[0]].single)}</button>` : ''}
      <span style="flex:1"></span><button class="btn sm danger" id="ddel">${icon('trash')}حذف</button></div>`}
    <div class="d-body">
      ${al.length ? `<div class="banner ${al.some(a => a.cls === 'danger') ? 'danger' : 'warn'}">${icon('alert-triangle')}<ul>${al.map(a => `<li><b>${esc(a.field)}:</b> ${a.txt} (${fmtDate(a.date)})</li>`).join('')}</ul></div>` : ''}
      ${V.facts ? `<div class="facts">${V.facts(r).map(([l, v]) => `<div class="fact"><small>${esc(l)}</small><b title="${esc(v)}">${esc(v || '—')}</b></div>`).join('')}</div>` : ''}
      ${related}${sections}
    </div>`);
  $('#dclose').onclick = closeLayer;
  if ($('#dedit')) $('#dedit').onclick = () => openForm(ent, i);
  if ($('#ddel')) $('#ddel').onclick = () => { closeLayer(); removeRow(ent, i); };
  if ($('#dparent')) $('#dparent').onclick = () => openDetail(parent[0], parentIdx);
  $$('[data-quick]', panel).forEach(b => b.onclick = () => quick[+b.dataset.quick].run());
  $$('[data-open]', panel).forEach(el => el.onclick = () => { const [e2, j] = el.dataset.open.split(':'); openDetail(e2, +j); });
  $$('[data-rel-add]', panel).forEach(b => b.onclick = () => { const [e2, by] = b.dataset.relAdd.split(':'); const pre = { [by]: r[E.key] }; if (e2 === 'rentPayments') pre.amount = r.periodAmount; if (e2 === 'billPayments') pre.amount = r.amount; openForm(e2, null, pre); });
}
function relTitle(ent, x, rp) {
  if (ent === 'advances') return `سلفة ${fmtNum(x.amount)} ر.س`;
  if (ent === 'rentPayments') return `${fmtNum(x.amount)} ر.س`;
  if (ent === 'billPayments') return `${fmtMonth(x.month)}: ${fmtNum(x.amount)} ر.س`;
  if (ent === 'assetHistory') return x.toEmp ? `اتسلمت لـ ${empName(x.toEmp)}` : `رجعت المخزن من ${empName(x.fromEmp)}`;
  return rp.title;
}
function relSub(ent, x, rp) {
  if (ent === 'advances') return DB.settings.showSensitive ? `المتبقي ${fmtNum(x.remaining)} · خصم ${fmtNum(x.monthly)} شهرياً` : fmtDate(x.date);
  if (ent === 'rentPayments') return `${fmtDate(x.payDate)}${x.method ? ' · ' + x.method : ''}`;
  if (ent === 'billPayments') return x.payDate ? `اتدفعت ${fmtDate(x.payDate)}` : '';
  if (ent === 'assetHistory') return fmtDate(x.date);
  return rp.sub;
}
function detailValue(ent, f, r) {
  const v = r[f.k];
  if (f.sens && !DB.settings.showSensitive) return MASK;
  if (f.t === 'date' || f.k === 'nextDue') { const a = alertOf(f, v, r); return esc(fmtDate(v)) + (a ? ` <span class="pill ${a.cls} plain">${a.txt}</span>` : ''); }
  if (f.t === 'month') return esc(fmtMonth(v));
  if (f.t === 'emp') return esc(empName(v));
  if (f.t === 'contract') return esc(contractLabel(v));
  if (f.t === 'bill') return esc(billLabel(v));
  if (f.t === 'url') return `<a href="${esc(v)}" target="_blank" rel="noopener">فتح الرابط ${icon('external-link')}</a>`;
  if (f.money) return money(v, ent === 'employees' ? curOf(r) : 'ر.س');
  if (f.v === 'iban') return `<span class="num">${esc(v)}</span>`;
  return esc(v);
}

/* ---------------- delete with undo ---------------- */
function removeRow(ent, i) {
  const row = DB[ent][i];
  const title = VIEW[ent].primary(withCalc(ent, row)).title;
  if (ent === 'employees') {
    const links = [DB.cars.some(c => c.driver === row.code) && 'سيارة', DB.assets.some(a => a.empCode === row.code) && 'عهدة', DB.advances.some(a => a.empCode === row.code) && 'سلفة'].filter(Boolean);
    if (links.length && !confirm(`الموظف ده مربوط بـ: ${links.join('، ')}.\nالأفضل تغيّر حالته لـ "مستقيل" بدل الحذف.\n\nتحذفه برضه؟`)) return;
  }
  DB[ent].splice(i, 1); save(); render();
  toast(`اتحذف "${title}"`, 'تراجع', () => { DB[ent].splice(i, 0, row); save(); render(); toast('رجع تاني'); });
}
function toast(msg, actionLabel = '', action = null) {
  const t = $('#toast');
  $('span', t).textContent = msg;
  const b = $('button', t); b.textContent = actionLabel; b.onclick = () => { t.classList.remove('show'); action && action(); };
  t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), actionLabel ? 6000 : 2600);
}
function receiveAsset(code) {
  const i = DB.assets.findIndex(a => a.code === code); const a = DB.assets[i];
  DB.assetHistory.push({ code: nextCode('assetHistory'), assetCode: code, fromEmp: a.empCode || '', toEmp: '', date: todayStr() });
  Object.assign(a, { place: 'في المخزن', empCode: '', handoverDate: '', formLink: '' });
  save(); render(); openDetail('assets', i); toast('الجهاز رجع المخزن');
}

/* ---------------- forms ---------------- */
function nextCode(ent) {
  const E = ENTITIES[ent];
  const nums = DB[ent].map(r => parseInt(String(r[E.key] || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
  return E.codePrefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
}
function optionList(f, current) {
  let opts;
  if (f.t === 'emp') opts = DB.employees.filter(e => !INACTIVE.includes(e.status) || e.code === current).map(e => [e.code, `${e.nameAr} (${e.code})`]);
  else if (f.t === 'contract') opts = [...DB.cars.map(c => [c.contractNo, `${contractLabel(c.contractNo)} (${c.contractNo})`]), ...DB.properties.map(p => [p.contractNo, `${contractLabel(p.contractNo)} (${p.contractNo})`])];
  else if (f.t === 'bill') opts = DB.bills.map(b => [b.code, `${billLabel(b.code)} (${b.code})`]);
  else if (f.t === 'car') opts = DB.cars.filter(c => c.status !== 'منتهي' || c.contractNo === current).map(c => [c.contractNo, [c.plate, [c.carType, c.brand, c.model].filter(Boolean).join(' '), c.driver ? `مع ${empName(c.driver)}` : 'فاضية'].join(' · ')]);
  else opts = options(f.o).map(o => [o, o]);
  if (current && !opts.some(o => o[0] === current)) opts.push([current, current]);
  return `<option value="">اختار...</option>` + opts.map(([v, l]) => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(l)}</option>`).join('');
}
function inputFor(f, v) {
  const val = esc(v ?? '');
  if (f.t === 'photo') return `<div class="photo-up"><div class="emp-photo" id="ph-prev">${v ? `<img src="${val}" alt="">` : icon('camera')}</div><div class="btns"><label class="btn sm">${icon('upload')}${v ? 'تغيير الصورة' : 'رفع صورة'}<input type="file" accept="image/*" hidden id="ph-file"></label><button type="button" class="btn sm ghost danger" id="ph-del" ${v ? '' : 'hidden'}>${icon('trash')}إزالة</button><small class="muted">JPG أو PNG · بتتصغر لوحدها</small></div><input type="hidden" data-k="photo" value="${val}"></div>`;
  if (f.calc) return `<input data-k="${f.k}" readonly tabindex="-1" value="${val}">`;
  if (['select', 'emp', 'contract', 'bill', 'car'].includes(f.t)) return `<select data-k="${f.k}" id="f-${f.k}">${optionList(f, v)}</select>`;
  if (f.t === 'textarea') return `<textarea data-k="${f.k}" id="f-${f.k}" rows="2">${val}</textarea>`;
  const type = { number: 'number', date: 'date', month: 'month', email: 'email', url: 'url' }[f.t] || 'text';
  const ltr = ['number', 'email', 'url'].includes(type) || f.v === 'iban' || f.v === 'id' || f.k === 'phone' || f.k === 'emergencyPhone';
  const ph = { iban: 'SA0000000000000000000000', id: '10 أو 14 رقم', email: 'name@company.com' }[f.v] || '';
  return `<input data-k="${f.k}" id="f-${f.k}" type="${type}" ${type === 'number' ? 'step="any" min="0" inputmode="decimal"' : ''} ${ltr ? 'class="ltr"' : ''} placeholder="${ph}" value="${val}">`;
}
function calcDisplay(f, v) {
  if (v === '' || v == null) return '';
  if (f.sens && !DB.settings.showSensitive) return '••••';
  if (f.t === 'date') return fmtDate(v);
  return f.money ? fmtNum(v) : v;
}

function openForm(ent, idx, prefill = {}, focusKey) {
  const E = ENTITIES[ent];
  const editing = idx != null && idx >= 0;
  const base = editing ? { ...DB[ent][idx] } : {};
  if (!editing) {
    allFields(ent).forEach(f => { if (f.def) base[f.k] = f.def; });
    if (E.codePrefix) base[E.key] = nextCode(ent);
    if (ent === 'billPayments') { base.month = todayStr().slice(0, 7); base.payDate = todayStr(); }
    if (ent === 'rentPayments' || ent === 'advances') base[ent === 'advances' ? 'date' : 'payDate'] = todayStr();
  }
  if (ent === 'employees' && editing) base.assignedCar = (DB.cars.find(c => c.driver === base.code) || {}).contractNo || '';
  Object.assign(base, prefill);
  let initial = "";
  const r = withCalc(ent, base);
  const secs = E.sections.filter(([, fs]) => fs.some(f => !f.calc) || ent === 'employees');
  const panel = openLayer(`
    <div class="d-head"><span class="avatar lg sq">${icon(editing ? 'pencil' : 'plus')}</span><div class="t"><h2>${editing ? 'تعديل' : 'إضافة'} ${E.single}</h2><p>${editing ? esc(VIEW[ent].primary(withCalc(ent, DB[ent][idx])).title) : 'الخانات اللي عليها <span style="color:var(--danger)">*</span> مطلوبة، والباقي تقدر تكمله بعدين'}</p></div>
      <button class="icon-btn" id="fclose" aria-label="إغلاق">${icon('x')}</button></div>
    <div class="form-wrap" style="${secs.length < 2 ? 'grid-template-columns:1fr' : ''}">
      ${secs.length >= 2 ? `<nav class="form-nav">${secs.map(([t], n) => `<button type="button" data-goto="${n}">${`<span class="n">${n + 1}</span>`}${esc(t)}</button>`).join('')}</nav>` : ''}
      <form class="form-body" id="fbody" novalidate>
        ${secs.map(([title, fields], n) => `<section class="fsec" id="sec-${n}" data-sec="${n}"><h3>${icon(SECTION_ICONS[title] || 'point')}${esc(title)}</h3><div class="fgrid">
          ${fields.map(f => `<div class="f ${f.t === 'textarea' || f.t === 'photo' ? 'full' : ''}" data-f="${f.k}"><label for="f-${f.k}">${f.t === 'photo' ? '' : fIcon(f)}${esc(f.l)}${f.req ? ' <span class="req">*</span>' : ''}</label>${inputFor(f, f.calc ? calcDisplay(f, r[f.k]) : r[f.k])}
            ${f.calc ? `<div class="help">${icon('calculator')}${esc(f.help || 'بيتحسب لوحده')}</div>` : f.help ? `<div class="help">${esc(f.help)}</div>` : ''}<div class="err"></div></div>`).join('')}
        </div></section>`).join('')}
      </form>
    </div>
    <div class="d-foot"><button class="btn primary" id="fsave">${icon('check')}حفظ</button>${editing ? '' : `<button class="btn" id="fsave-new">حفظ وإضافة جديد</button>`}<button class="btn ghost" id="fcancel">إلغاء</button><span class="note" id="fnote"></span></div>`, 'drawer wide');

  const body = $('#fbody');
  const read = () => { const vals = { ...base }; $$('[data-k]', body).forEach(el => { const f = fieldOf(ent, el.dataset.k); if (!f.calc) vals[f.k] = el.value.trim(); }); return vals; };
  const dirty = () => JSON.stringify(read()) !== initial;
  layerGuard = () => !dirty() || confirm('فيه تعديلات مش محفوظة. تقفل من غير حفظ؟');
  $('#fclose').onclick = tryClose; $('#fcancel').onclick = tryClose;

  const refresh = () => {
    const vals = withCalc(ent, read());
    let missing = 0;
    allFields(ent).forEach(f => {
      const w = $(`[data-f="${f.k}"]`, body); if (!w) return;
      const shown = !f.show || f.show(vals);
      w.style.display = shown ? '' : 'none';
      if (f.calc) $('input', w).value = calcDisplay(f, vals[f.k]);
      if (shown && f.req && !vals[f.k]) missing++;
    });
    $$('.fsec', body).forEach(sec => { sec.style.display = $$('.f', sec).some(w => w.style.display !== 'none') ? '' : 'none'; });
    $$('[data-goto]', panel).forEach(b => { const sec = $(`#sec-${b.dataset.goto}`); b.style.display = sec.style.display; const req = $$('.f', sec).filter(w => w.style.display !== 'none' && $('.req', w)); b.classList.toggle('done', req.length > 0 && req.every(w => { const el = $('[data-k]', w); return el && el.value; })); });
    const note = $('#fnote'); note.className = 'note'; note.textContent = missing ? `فاضل ${missing} خانة مطلوبة` : 'كل الخانات المطلوبة متعبية';
  };
  body.addEventListener('input', e => { const w = e.target.closest('.f'); if (w) w.classList.remove('invalid'); refresh(); });
  body.addEventListener('change', refresh);
  $$('[data-goto]', panel).forEach(b => b.onclick = () => $(`#sec-${b.dataset.goto}`).scrollIntoView({ block: 'start' }));
const phFile = $('#ph-file', panel);
if (phFile) {
  const setPhoto = url => { $('[data-k="photo"]', body).value = url; $('#ph-prev', panel).innerHTML = url ? `<img src="${url}" alt="">` : icon('camera'); $('#ph-del', panel).hidden = !url; body.dispatchEvent(new Event('input')); };
  phFile.onchange = () => { const file = phFile.files[0]; if (!file) return; if (!file.type.startsWith('image/')) return alert('اختار ملف صورة'); resizeImage(file).then(setPhoto).catch(() => alert('مقدرتش أقرا الصورة دي')); };
  $('#ph-del', panel).onclick = () => setPhoto('');
}
  body.addEventListener('scroll', () => {
    const top = body.getBoundingClientRect().top + 40;
    let cur = 0; $$('.fsec', body).forEach(s => { if (s.style.display !== 'none' && s.getBoundingClientRect().top <= top) cur = +s.dataset.sec; });
    $$('[data-goto]', panel).forEach(b => b.classList.toggle('active', +b.dataset.goto === cur));
  });
  refresh();
  body.dispatchEvent(new Event('scroll'));
  initial = JSON.stringify(read());
  setTimeout(() => (focusKey ? $(`#f-${focusKey}`) : $('input:not([readonly]), select', body))?.focus(), 60);

  const doSave = andNew => {
    const vals = read();
    allFields(ent).forEach(f => { if (f.show && !f.show(vals)) vals[f.k] = ''; if (f.v === 'iban' && vals[f.k]) vals[f.k] = vals[f.k].replace(/\s/g, '').toUpperCase(); });
    const errs = validate(ent, vals, editing ? idx : -1);
    $$('.f', body).forEach(w => { const m = errs[w.dataset.f]; w.classList.toggle('invalid', !!m); $('.err', w).textContent = m || ''; });
    $$('[data-goto]', panel).forEach(b => b.classList.toggle('err', $$('.f.invalid', $(`#sec-${b.dataset.goto}`)).length > 0));
    if (Object.keys(errs).length) {
      const n = Object.keys(errs).length; const note = $('#fnote'); note.className = 'note bad'; note.textContent = `فيه ${n} ${n > 2 ? 'أخطاء' : 'خطأ'}، صلّحهم الأول`;
      const first = $('.f.invalid', body); first.scrollIntoView({ block: 'center' }); $('[data-k]', first)?.focus(); return;
    }
    allFields(ent).forEach(f => { if (f.calc) delete vals[f.k]; });
    afterSave(ent, vals, editing ? DB[ent][idx] : null);
    let at = idx;
    if (editing) DB[ent][idx] = vals; else { DB[ent].push(vals); at = DB[ent].length - 1; }
    save(); layerGuard = null; render();
    const msg = editing ? 'اتحفظت التعديلات' : `اتضاف ${E.single}`;
    if (ent === 'bills' && isOnceBill(vals) && nextBillDue(vals) && !pqHolding(`bills:${vals.code}:${nextBillDue(vals)}`)) toast(msg, 'اعمل طلب دفع', () => payReqFor('bills', vals.code));
    else toast(msg);
    if (andNew) openForm(ent, null, {}); else if (!ENTITIES[ent].readonly) openDetail(ent, at);
  };
  $('#fsave').onclick = () => doSave(false);
  if ($('#fsave-new')) $('#fsave-new').onclick = () => doSave(true);
  panel.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(false); } });
  body.onsubmit = e => { e.preventDefault(); doSave(false); };
}

function validate(ent, v, idx) {
  const errs = {};
  allFields(ent).forEach(f => {
    if (f.calc || (f.show && !f.show(v))) return;
    const x = v[f.k];
    if (f.req && !x) return errs[f.k] = 'الخانة دي مطلوبة';
    if (!x) return;
    if (f.unique && DB[ent].some((r, i) => i !== idx && r[f.k] === x)) return errs[f.k] = 'الكود ده مستخدم قبل كده';
    if (f.t === 'number' && num(x) < 0) return errs[f.k] = 'الرقم لازم يكون موجب';
    if (f.v === 'id' && !/^(\d{10}|\d{14})$/.test(x)) return errs[f.k] = '10 أرقام للهوية/الإقامة السعودية، أو 14 رقم للرقم القومي المصري';
    if (f.v === 'iban' && !/^(SA\d{22}|EG\d{27})$/.test(x)) return errs[f.k] = 'IBAN سعودي: SA و22 رقم · مصري: EG و27 رقم';
    if (f.v === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)) return errs[f.k] = 'الإيميل مكتوب غلط';
    if (f.v === 'day' && !(Number.isInteger(num(x)) && num(x) >= 1 && num(x) <= 31)) return errs[f.k] = 'اكتب يوم من 1 لـ 31';
  });
  if (ent === 'advances' && v.months && num(v.months) < 1) errs.months = 'أقل حاجة شهر واحد';
  if (ent === 'advances' && num(v.paid) > num(v.amount)) errs.paid = 'المدفوع أكبر من مبلغ السلفة';
  if (ent === 'assets' && v.place === 'مع موظف' && !v.empCode) errs.empCode = 'اختار الموظف اللي معاه الجهاز';
  if (v.startDate && v.endDate && v.endDate < v.startDate) errs.endDate = 'نهاية العقد قبل بدايته';
  if (v.from && v.to && v.to < v.from) errs.to = 'نهاية الفترة قبل بدايتها';
  return errs;
}

function afterSave(ent, vals, old) {
  if (ent === 'employees') {
    if (old && old.code !== vals.code) DB.cars.forEach(c => { if (c.driver === old.code) c.driver = vals.code; });
    if (vals.kind === 'سواق') {
      const car = vals.assignedCar || '';
      DB.cars.forEach(c => { if (c.driver === vals.code && c.contractNo !== car) c.driver = ''; });
      const c = DB.cars.find(x => x.contractNo === car);
      if (c && c.driver !== vals.code) { const prev = c.driver; c.driver = vals.code; setTimeout(() => toast(prev ? `العربية ${c.plate} اتنقلت من ${empName(prev)}` : `العربية ${c.plate} اتسلمت للسواق`), 2700); }
    }
    delete vals.assignedCar;
  }
  if (ent === 'assets') {
    const before = old ? old.empCode || '' : '';
    const after = vals.place === 'مع موظف' ? vals.empCode || '' : '';
    if (before !== after) DB.assetHistory.push({ code: nextCode('assetHistory'), assetCode: vals.code, fromEmp: before, toEmp: after, date: todayStr() });
  }
  if (ent === 'billPayments') {
    const bill = DB.bills.find(b => b.code === vals.billCode);
    const latest = [...DB.billPayments.filter(p => p.billCode === vals.billCode && p !== old), vals].sort((a, b) => b.month.localeCompare(a.month))[0];
    if (bill && latest === vals) bill.amount = vals.amount;
  }
  if (ent === 'rentPayments' && vals.to) {
    const c = DB.cars.find(x => x.contractNo === vals.contractNo) || DB.properties.find(x => x.contractNo === vals.contractNo);
    if (c) { const d = parseDate(vals.to); d.setDate(d.getDate() + 1); const nd = iso(d); if (!c.nextPayment || nd > c.nextPayment) c.nextPayment = nd; }
  }
}
ENTITIES.assetHistory.codePrefix = 'H-';

/* ---------------- dashboard ---------------- */
const groupSum = (arr, key, val) => Object.entries(arr.reduce((m, x) => { const k = (typeof key === 'function' ? key(x) : x[key]) || 'غير محدد'; m[k] = (m[k] || 0) + val(x); return m; }, {})).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]);
function hbars(rows, unit) {
  if (!rows.length) return `<div class="empty" style="padding:24px">${icon('chart-bar')}لا توجد بيانات</div>`;
  const max = Math.max(...rows.map(r => r[1]));
  return `<div class="hbars">${rows.map(([l, v]) => `<div class="hbar" title="${esc(l)}: ${fmtNum(v)} ${unit}"><span>${esc(l)}</span><div class="track"><div class="fill" style="width:${(v / max * 100).toFixed(1)}%"></div></div><span class="v num">${fmtNum(v)} <small class="muted">${unit}</small></span></div>`).join('')}</div>`;
}
function upcomingPayments(days = 30) {
  const out = [];
  [...DB.cars.map((c, i) => ['cars', c, i]), ...DB.properties.map((p, i) => ['properties', p, i])].forEach(([ent, row, i]) => {
    if (row.status === 'منتهي' || !row.nextPayment) return;
    const r = withCalc(ent, row); const d = daysUntil(r.nextPayment);
    if (d <= days) out.push({ ent, i, d, date: r.nextPayment, title: VIEW[ent].primary(r).title, sub: `إيجار ${r.payPeriod || ''} · ${ent === 'cars' ? r.rentalOffice || '' : r.landlord || ''}`, amount: num(r.periodAmount), icon: VIEW[ent].primary(r).icon });
  });
  DB.bills.forEach((row, i) => {
    const r = withCalc('bills', row); if (!r.nextDue) return; const d = daysUntil(r.nextDue);
    if (d <= days) out.push({ ent: 'bills', i, d, date: r.nextDue, title: VIEW.bills.primary(r).title, sub: `${isOnceBill(r) ? 'فاتورة مرة واحدة' : 'فاتورة'} · ${r.provider}`, amount: num(r.amount), icon: VIEW.bills.primary(r).icon });
  });
  return out.sort((a, b) => a.d - b.d);
}

/* payroll deadline: the 27th of each month */
const PAYROLL_DAY = 27;
function payrollDue() {
  const t = parseDate(todayStr());
  const m = todayStr().slice(0, 7);
  const catsNow = Object.keys(PR_CATS).filter(k => eligible(k, m).length);
  const doneNow = catsNow.length > 0 && catsNow.every(k => (findRun(k, m) || {}).status === 'مؤكد');
  let due = new Date(t.getFullYear(), t.getMonth(), PAYROLL_DAY);
  if (t.getDate() > PAYROLL_DAY && doneNow) due = new Date(t.getFullYear(), t.getMonth() + 1, PAYROLL_DAY);
  const prev = new Date(due.getFullYear(), due.getMonth() - 1, PAYROLL_DAY);
  const month = iso(due).slice(0, 7);
  const days = Math.round((due - t) / 86400000);
  const span = Math.round((due - prev) / 86400000);
  const cats = Object.keys(PR_CATS).filter(k => eligible(k, month).length).map(k => ({ k, n: eligible(k, month).length, run: findRun(k, month) }));
  return { due: iso(due), month, days, progress: Math.min(100, Math.max(0, (1 - days / span) * 100)), cats };
}
function missingData(e) {
  const m = [];
  if (INACTIVE.includes(e.status)) return m;
  const method = e.payMethod || '';
  if (!method) m.push('طريقة الصرف');
  if (!e.iban) m.push('IBAN');
  if ((method || (e.country === 'السعودية' ? 'مدد' : '')) === 'مدد' && !BANK_CODES[e.bank]) m.push('البنك');
  if (!e.idNumber) m.push('رقم الهوية');
  if (!num(e.basic)) m.push('الراتب الأساسي');
  return m;
}
const empAvatar = e => avatarHTML({ photo: e.photo, avatar: initials(nameOf(e)) });
const empIdx = code => DB.employees.findIndex(e => e.code === code);

function renderDashboard() {
  const show = DB.settings.showSensitive;
  const today = todayStr(), thisMonth = today.slice(0, 7), mm = today.slice(5, 7);
  const emps = DB.employees.filter(e => !INACTIVE.includes(e.status)).map(e => withCalc('employees', e));
  const cnt = (a, k, v) => a.filter(x => x[k] === v).length;
  const m = v => show ? fmtNum(v) : '••••';
  const P = payrollDue();
  const dueD = parseDate(P.due);
  const late = P.days < 0;
  const alerts = collectAlerts();
  const empAlerts = alerts.filter(a => a.ent === 'employees');
  const missing = DB.employees.map(e => ({ e, miss: missingData(e) })).filter(x => x.miss.length);
  const joined = DB.employees.filter(e => (e.joinDate || '').startsWith(thisMonth));
  const left = DB.employees.filter(e => (e.lastDay || '').startsWith(thisMonth));
  const probation = emps.filter(e => e.probationEnd && daysUntil(e.probationEnd) >= 0 && daysUntil(e.probationEnd) <= 30);
  const withAdv = emps.filter(e => num(e.advRemaining) > 0);
  const births = emps.filter(e => e.dob && e.dob.slice(5, 7) === mm).sort((a, b) => a.dob.slice(8).localeCompare(b.dob.slice(8)));
  const statusOf = run => !run ? ['لسه متعملتش', ''] : run.status === 'مؤكد' ? ['مؤكدة', 'ok'] : ['مسودة', 'warn'];

  /* cost: kept, but small and lower on the page */
  const payroll = emps.reduce((s, e) => s + toSar(e.total, e.currency), 0);
  const saud = emps.reduce((s, e) => s + (e.empType === 'سعودة' ? num(e.saudizationFee) : 0), 0);
  const cars = DB.cars.filter(c => c.status !== 'منتهي'), props = DB.properties.filter(p => p.status !== 'منتهي');
  const rent = [...cars, ...props].reduce((s, x) => s + num(x.price), 0);
  const bills = DB.bills.filter(b => !isOnceBill(b)).reduce((s, b) => s + num(b.amount) / (PERIOD_MONTHS[b.frequency] || 1), 0);
  const total = payroll + saud + rent + bills;
  const parts = [['الرواتب', payroll, 'var(--s1)'], ['رسوم السعودة', saud, 'var(--s2)'], ['الإيجارات', rent, 'var(--s3)'], ['الفواتير', bills, 'var(--s4)']];
  const up = upcomingPayments(30);

  const tile = (ic, l, v, h, href, tone = '') => `<a class="card stat span-3 ${tone}" href="#${href}" style="text-decoration:none;color:inherit"><span class="ico">${icon(ic)}</span><div><div class="l">${l}</div><div class="v num">${v}</div><div class="h">${h}</div></div></a>`;
  const emptyOk = (ic, t, s = '') => `<div class="all-good">${icon(ic)}<div><b>${t}</b>${s ? `<br><small class="muted">${s}</small>` : ''}</div></div>`;
  const greet = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير';

  $('#page').innerHTML = `
    <div class="page-head greet"><div><h1>${greet}</h1><p>${fmtDate(today)} · ده ملخص الموظفين النهارده</p></div>
      <div class="actions"><button class="btn" id="xl-all">${icon('file-spreadsheet')}تصدير كل البيانات</button><button class="btn accent" id="quick-add">${icon('plus')}إضافة جديد</button></div></div>
    <div class="dash">
      <div class="card hero pay-hero span-7 ${late ? 'late' : ''}">
        <div class="label">${icon('calendar-dollar')}ملفات الرواتب · ${fmtMonth(P.month)}</div>
        <div class="count-row">
          <div class="big num">${Math.abs(P.days)}</div>
          <div class="count-txt"><b>${late ? 'يوم تأخير على ملفات الرواتب' : P.days === 0 ? 'النهارده ميعاد ملفات الرواتب' : P.days === 1 ? 'يوم واحد باقي على ملفات الرواتب' : 'يوم باقي على ملفات الرواتب'}</b><small>الميعاد يوم ${PAYROLL_DAY} من كل شهر · ${fmtDate(P.due)}</small></div>
          <button class="btn accent" id="pay-go">${icon('file-invoice')}إصدار ملف الرواتب</button>
        </div>
        <div class="pay-prog" role="progressbar" aria-valuenow="${Math.round(P.progress)}" aria-valuemin="0" aria-valuemax="100" aria-label="الوقت لحد ميعاد الرواتب"><span style="width:${P.progress.toFixed(1)}%"></span></div>
        <div class="cat-status">${P.cats.map(c => { const [t, cls] = statusOf(c.run); return `<button class="cat-chip" data-pcat="${c.k}" data-run="${c.run ? esc(c.run.id) : ''}">${icon(PR_CATS[c.k].icon)}<span><b>${PR_CATS[c.k].label}</b><small>${c.n} موظف</small></span><span class="pill ${cls}">${t}</span></button>`; }).join('')}</div>
        ${missing.length ? `<button class="pay-warn" id="go-missing">${icon('alert-triangle')}${missing.length} موظف ناقصهم بيانات للرواتب · راجعهم قبل يوم ${PAYROLL_DAY}</button>` : DB.employees.length ? `<div class="pay-ok">${icon('circle-check')}بيانات الرواتب كاملة لكل الموظفين</div>` : `<button class="pay-warn" id="go-add-emp">${icon('user-plus')}لسه مفيش موظفين · ابدأ بإضافة أول موظف</button>`}
      </div>
      <div class="card span-5">
        <div class="card-head"><h3>${icon('alert-triangle')}محتاج انتباهك</h3>${alerts.length ? `<button class="link-btn" onclick="location.hash='alerts'">الكل (${alerts.length}) ${icon('chevron-left')}</button>` : ''}</div>
        <div class="card-body">${alerts.length ? `<ul class="attn">${alerts.slice(0, 5).map((a, n) => `<li data-alert="${n}"><span class="sev ${a.cls}">${icon(a.cls === 'danger' ? 'alert-octagon' : 'clock')}</span><div class="txt"><b>${esc(a.item)}</b><small>${esc(a.field)} · ${a.txt}</small></div>${icon('chevron-left')}</li>`).join('')}</ul>` : emptyOk('circle-check', 'كله تمام', 'مفيش حاجة قربت ميعادها')}</div>
      </div>

      ${tile('users', 'الموظفين على رأس العمل', emps.length, `${icon('flag')} السعودية ${cnt(emps, 'country', 'السعودية')} · مصر ${cnt(emps, 'country', 'مصر')}`, 'employees')}
      ${tile('building-community', 'موظفين السعودة', cnt(emps, 'empType', 'سعودة'), `${new Set(emps.filter(e => e.saudizationCompany).map(e => e.saudizationCompany)).size} شركة سعودة · ${cnt(emps, 'kind', 'سواق')} سواق`, 'employees')}
      ${tile('user-plus', 'انضموا الشهر ده', joined.length, left.length ? `${icon('user-minus')} سابوا الشهر ده: ${left.length}` : 'محدش ساب الشهر ده', 'employees')}
      ${tile('hourglass', 'فترة التجربة بتخلص', probation.length, 'خلال الـ 30 يوم الجايين', 'employees', probation.length ? 'warn-tile' : '')}

      <div class="card span-6">
        <div class="card-head"><h3>${icon('id-badge-2')}مستندات الموظفين اللي قربت تخلص</h3><span class="muted">${empAlerts.length}</span></div>
        <div class="card-body">${empAlerts.length ? `<ul class="attn">${empAlerts.slice(0, 6).map((a, n) => { const e = DB.employees[a.i]; return `<li data-empalert="${n}">${empAvatar(e)}<div class="txt"><b>${esc(nameOf(e))}</b><small>${esc(a.field)} · ${fmtDate(a.date)}</small></div><span class="pill ${a.cls} plain">${a.txt}</span></li>`; }).join('')}</ul>` : emptyOk('shield-check', 'كل المستندات سارية', 'إقامات وجوازات وعقود وتأمين')}</div>
      </div>
      <div class="card span-6" id="missing-card">
        <div class="card-head"><h3>${icon('clipboard-x')}بيانات ناقصة قبل الرواتب</h3><span class="muted">${missing.length}</span></div>
        <div class="card-body">${missing.length ? `<ul class="attn">${missing.slice(0, 6).map(({ e, miss }) => `<li data-fix="${esc(e.code)}">${empAvatar(e)}<div class="txt"><b>${esc(nameOf(e))}</b><small>${miss.map(x => `<span class="miss">${esc(x)}</span>`).join(' ')}</small></div><span class="link-btn">${icon('pencil')}كمّل</span></li>`).join('')}</ul>` : emptyOk('circle-check', 'كل البيانات كاملة', 'IBAN وأرقام الهوية وطرق الصرف موجودة')}</div>
      </div>

      <div class="card span-4">
        <div class="card-head"><h3>${icon('cash')}سلف بتتخصم الشهر ده</h3><span class="muted">${withAdv.length}</span></div>
        <div class="card-body">${withAdv.length ? `<ul class="attn">${withAdv.slice(0, 5).map(e => `<li data-emp="${esc(e.code)}">${empAvatar(e)}<div class="txt"><b>${esc(nameOf(e))}</b><small>قسط ${m(e.advDeduction)} · متبقي ${m(e.advRemaining)}</small></div></li>`).join('')}</ul>` : emptyOk('circle-check', 'مفيش سلف مفتوحة')}</div>
      </div>
      <div class="card span-4">
        <div class="card-head"><h3>${icon('cake')}أعياد ميلاد الشهر</h3><span class="muted">${births.length}</span></div>
        <div class="card-body">${births.length ? `<ul class="timeline">${births.map(e => { const d = parseDate(e.dob); return `<li data-emp="${esc(e.code)}"><span class="datechip ${e.dob.slice(5) === today.slice(5) ? 'soon' : ''}"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></span>${empAvatar(e)}<div class="txt"><b>${esc(nameOf(e))}</b><small>${e.dob.slice(5) === today.slice(5) ? 'النهارده' : esc(e.jobTitle || '')}</small></div></li>`; }).join('')}</ul>` : emptyOk('cake', 'مفيش أعياد ميلاد الشهر ده', 'ضيف تاريخ الميلاد في بيانات الموظف')}</div>
      </div>
      <div class="card span-4">
        <div class="card-head"><h3>${icon('building')}الموظفين حسب مكان الدوام</h3></div>
        <div class="card-body">${hbars(groupSum(emps, 'workLocation', () => 1), 'موظف')}</div>
      </div>

      <div class="card span-6">
        <div class="card-head"><h3>${icon('calendar-due')}دفعات الـ 30 يوم الجايين</h3><span class="muted num">${fmtNum(up.reduce((s, x) => s + x.amount, 0))} ر.س</span>${up.length ? `<button class="btn sm" id="up-req">${icon('file-dollar')}طلب دفع</button>` : ''}</div>
        <div class="card-body">${up.length ? `<ul class="timeline">${up.slice(0, 6).map((x, n) => { const d = parseDate(x.date); return `<li data-up="${n}"><span class="datechip ${x.d < 0 ? 'late' : x.d <= 7 ? 'soon' : ''}"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></span><div class="txt"><b>${esc(x.title)}</b><small>${esc(x.sub)} · ${x.d < 0 ? `متأخر ${-x.d} يوم` : daysTxt(x.d)}</small>${(h => h ? `<span class="pill info plain sm-pill">${icon('file-dollar')}في طلب ${esc(h.code)}</span>` : '')(pqHolding(pqKey(pqItemFrom(x))))}</div>${money(x.amount)}</li>`; }).join('')}</ul>` : emptyOk('calendar-check', 'مفيش دفعات قريبة')}</div>
      </div>
      <div class="card span-6">
        <div class="card-head"><h3>${icon('wallet')}التكلفة الشهرية</h3><span class="num" style="font-weight:600">${m(total)} <small class="muted">ر.س</small></span></div>
        <div class="card-body">
          <div class="stack light" role="img" aria-label="تقسيم التكلفة">${parts.map(([l, v, c]) => v > 0 ? `<span style="width:${(v / (total || 1) * 100).toFixed(2)}%;background:${c}" title="${l}: ${m(v)} ر.س"></span>` : '').join('')}</div>
          <div class="legend light">${parts.map(([l, v, c]) => `<div><i style="background:${c}"></i>${l}<b class="num">${m(v)}</b></div>`).join('')}</div>
          <div class="mini-stats"><a href="#rentals/cars">${icon('car')}${cars.length} سيارة</a><a href="#rentals/properties">${icon('building')}${props.length} سكن ومكتب</a><a href="#bills">${icon('receipt')}${DB.bills.length} فاتورة</a><a href="#assets">${icon('device-laptop')}${DB.assets.length} جهاز</a></div>
        </div>
      </div>
    </div>`;

  $('#xl-all').onclick = () => exportExcel(Object.keys(ENTITIES));
  $('#quick-add').onclick = e => { e.stopPropagation(); showMenu(e.currentTarget, ['employees', 'advances', 'cars', 'properties', 'rentPayments', 'bills', 'billPayments', 'assets'].map(k => ({ label: ENTITIES[k].single, icon: VIEW[k].icon, run: () => openForm(k) }))); };
  $('#pay-go').onclick = () => openPayroll();
  $$('[data-pcat]').forEach(b => b.onclick = () => { if (b.dataset.run) return openPayroll(b.dataset.run); openPayroll(); W.cat = b.dataset.pcat; W.month = P.month; wzRender(); });
  if ($('#go-add-emp')) $('#go-add-emp').onclick = () => openForm('employees');
  if ($('#go-missing')) $('#go-missing').onclick = () => $('#missing-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  $$('[data-alert]').forEach(li => li.onclick = () => { const a = alerts[+li.dataset.alert]; openDetail(a.ent, a.i); });
  $$('[data-empalert]').forEach(li => li.onclick = () => { const a = empAlerts[+li.dataset.empalert]; openDetail('employees', a.i); });
  $$('[data-fix]').forEach(li => li.onclick = () => openForm('employees', empIdx(li.dataset.fix), {}, 'iban'));
  $$('[data-emp]').forEach(li => li.onclick = () => openDetail('employees', empIdx(li.dataset.emp)));
  $$('[data-up]').forEach(li => li.onclick = () => { const x = up[+li.dataset.up]; openDetail(x.ent, x.i); });
  if ($('#up-req')) $('#up-req').onclick = () => openPayReqNew();
}

/* ---------------- alerts page ---------------- */
function renderAlerts() {
  const all = collectAlerts();
  const f = UI.filters.cat || '';
  const list = all.filter(a => !f || a.ent === f);
  const groups = [['متأخر أو منتهي', 'danger', a => a.d < 0], ['خلال أسبوع', 'warn', a => a.d >= 0 && a.d <= 7], ['خلال الشهر', 'warn', a => a.d > 7]];
  const cats = [...new Set(all.map(a => a.ent))];
  $('#page').innerHTML = pageHead('التنبيهات', `${all.length} تنبيه · المواعيد اللي قربت أو عدّت`, '', 'bell') +
    `<div class="tabs">${[['', 'الكل', all.length], ...cats.map(c => [c, TAB_LABEL[c], all.filter(a => a.ent === c).length])].map(([k, l, n]) => `<button class="tab ${k === f ? 'active' : ''}" data-cat="${k}">${l}<span class="c">${n}</span></button>`).join('')}</div>` +
    (list.length ? groups.map(([title, cls, test]) => {
      const items = list.filter(test); if (!items.length) return '';
      return `<div class="card" style="margin-bottom:16px"><div class="card-head"><h3><span class="pill ${cls}">${items.length}</span>${title}</h3></div><div class="card-body"><ul class="attn">${items.map(a => `<li data-ai="${all.indexOf(a)}"><span class="sev ${a.cls}">${icon(VIEW[a.ent].icon)}</span><div class="txt"><b>${esc(a.item)}</b><small>${esc(a.field)} · ${fmtDate(a.date)}</small></div><span class="pill ${a.cls} plain">${a.txt}</span>${icon('chevron-left')}</li>`).join('')}</ul></div></div>`;
    }).join('') : `<div class="card"><div class="empty">${icon('circle-check')}<b>مفيش تنبيهات</b>كل المواعيد تمام</div></div>`);
  $$('[data-cat]').forEach(b => b.onclick = () => { UI.filters.cat = b.dataset.cat; renderAlerts(); });
  $$('[data-ai]').forEach(li => li.onclick = () => { const a = all[+li.dataset.ai]; openDetail(a.ent, a.i); });
}

/* ---------------- global search (Ctrl+K) ---------------- */
function openPalette() {
  closeMenu();
  const panel = openLayer(`<div class="palette-in">${icon('search')}<input id="pq" placeholder="دوّر على موظف، رقم سيارة، فاتورة، جهاز، صفحة..." autocomplete="off"><span class="kbd">Esc</span></div><div class="palette-list" id="pl"></div>
    <div class="palette-foot"><span><span class="kbd">↑↓</span> تنقّل</span><span><span class="kbd">Enter</span> فتح</span></div>`, 'palette');
  let results = [], sel = 0;
  const pages = Object.entries(PAGES).map(([k, P]) => ({ group: 'الصفحات', title: P.title, sub: P.desc || '', icon: P.icon, run: () => { location.hash = k; } }));
  const actions = ['employees', 'cars', 'properties', 'bills', 'assets'].map(k => ({ group: 'إجراءات', title: `إضافة ${ENTITIES[k].single}`, sub: '', icon: 'plus', run: () => openForm(k) }));
  const draw = () => {
    const q = $('#pq').value.trim().toLowerCase();
    const recs = [];
    if (q) ['employees', 'cars', 'properties', 'bills', 'assets', 'advances'].forEach(ent => DB[ent].forEach((row, i) => {
      const r = withCalc(ent, row); const p = VIEW[ent].primary(r);
      const hay = [p.title, p.sub, ...allFields(ent).filter(f => !f.sens).map(f => plainValue(ent, f, r))].join(' ').toLowerCase();
      if (hay.includes(q)) recs.push({ group: TAB_LABEL[ent], title: p.title, sub: p.sub, icon: p.icon || VIEW[ent].icon, av: p.avatar, photo: p.photo, run: () => openDetail(ent, i) });
    }));
    const match = x => !q || (x.title + ' ' + x.sub).toLowerCase().includes(q);
    results = [...recs.slice(0, 30), ...pages.filter(match), ...actions.filter(match)];
    sel = Math.min(sel, Math.max(0, results.length - 1));
    let lastG = '';
    $('#pl').innerHTML = results.length ? results.map((x, n) => { const g = x.group !== lastG ? `<div class="palette-group">${x.group}</div>` : ''; lastG = x.group;
      return `${g}<div class="palette-item ${n === sel ? 'sel' : ''}" data-n="${n}">${avatarHTML({ avatar: x.av, photo: x.photo, icon: x.icon })}<div class="txt"><b>${esc(x.title)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</div></div>`; }).join('')
      : `<div class="empty" style="padding:30px">${icon('search-off')}<b>مفيش نتايج لـ "${esc(q)}"</b></div>`;
    $$('.palette-item', panel).forEach(el => { el.onclick = () => go(+el.dataset.n); el.onmousemove = () => { if (sel !== +el.dataset.n) { sel = +el.dataset.n; $$('.palette-item', panel).forEach(x => x.classList.toggle('sel', +x.dataset.n === sel)); } }; });
  };
  const go = n => { const x = results[n]; if (!x) return; closeLayer(); x.run(); };
  $('#pq').oninput = () => { sel = 0; draw(); };
  $('#pq').onkeydown = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % (results.length || 1); draw(); $('.palette-item.sel', panel)?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { e.preventDefault(); go(sel); }
  };
  draw(); $('#pq').focus();
}

/* ---------------- settings ---------------- */
function renderSettings() {
  $('#page').innerHTML = pageHead('الإعدادات', 'القوائم المنسدلة اللي بتظهر في الفورمز، وإدارة البيانات', '', 'settings') + `
    <div class="dash">
      ${Object.keys(LIST_LABELS).map(k => `<div class="card span-6"><div class="card-head"><h3>${icon('list')}${LIST_LABELS[k]}</h3><span class="muted">${DB.lists[k].length}</span></div><div class="card-body">
        <div class="chips">${DB.lists[k].map((v, i) => `<span class="chip">${esc(v)}<button data-rm="${k}:${i}" aria-label="حذف ${esc(v)}">${icon('x')}</button></span>`).join('')}</div>
        <div class="inline"><input class="input" data-new="${k}" placeholder="إضافة عنصر جديد"><button class="btn" data-addl="${k}">${icon('plus')}إضافة</button></div></div></div>`).join('')}
      <div class="card span-6"><div class="card-head"><h3>${icon('currency-dollar')}سعر تحويل الجنيه للريال</h3></div><div class="card-body">
        <div class="inline"><input class="input ltr" id="rate" type="number" step="any" min="0" value="${esc(DB.settings.egpToSar)}"><button class="btn" id="rate-save">حفظ</button></div>
        <p class="muted" style="margin:10px 0 0;font-size:13px">بيُستخدم عشان رواتب مصر تتجمع مع رواتب السعودية في الرئيسية</p></div></div>
      <div class="card span-6"><div class="card-head"><h3>${icon('calculator')}المحاسب</h3></div><div class="card-body">
        <p class="muted" style="margin:0 0 12px;font-size:13px">طلبات الدفع بتتبعتله على الواتساب أو الإيميل ده</p>
        <div class="acc-grid"><input class="input" id="acc-name" placeholder="الاسم" value="${esc(DB.settings.accountant.name)}"><input class="input ltr" id="acc-phone" placeholder="رقم الواتساب: 05xxxxxxxx" value="${esc(DB.settings.accountant.phone)}"><input class="input ltr" id="acc-email" type="email" placeholder="الإيميل" value="${esc(DB.settings.accountant.email)}"><button class="btn" id="acc-save">حفظ</button></div></div></div>
      <div class="card span-6"><div class="card-head"><h3>${icon('database')}البيانات</h3></div><div class="card-body">
        <p class="muted" style="margin:0 0 12px;font-size:13px">${CLOUD ? 'البيانات متخزنة على السيرفر، وكل حفظ بيتعمله نسخة في السجل.' : 'البيانات متخزنة في المتصفح ده بس. خد نسخة احتياطية كل فترة.'}</p>
        <div class="actions"><button class="btn primary" id="xl-all">${icon('file-spreadsheet')}تصدير Excel</button><button class="btn" id="backup">${icon('download')}نسخة احتياطية</button>
          <label class="btn">${icon('upload')}استرجاع نسخة<input type="file" id="restore" accept=".json" hidden></label>
          ${CLOUD ? (localData() ? `<button class="btn" id="imp-local">${icon('cloud-upload')}انقل بيانات المتصفح للسيرفر</button>` : '') : `<button class="btn" id="sample">${icon('refresh')}البيانات التجريبية</button>`}<button class="btn danger" id="wipe">${icon('trash')}مسح الكل</button></div></div></div>
      ${CLOUD ? `<div class="card span-12"><div class="card-head"><h3>${icon('history')}النسخ المحفوظة على السيرفر</h3><span class="muted">آخر 20 حفظ</span></div><div class="card-body" id="hist"></div></div>` : ''}
    </div>`;
  $$('[data-rm]').forEach(b => b.onclick = () => { const [k, i] = b.dataset.rm.split(':'); DB.lists[k].splice(+i, 1); save(); renderSettings(); });
  const addItem = k => { const inp = $(`[data-new="${k}"]`); const v = inp.value.trim(); if (!v) return inp.focus(); if (!DB.lists[k].includes(v)) DB.lists[k].push(v); save(); renderSettings(); $(`[data-new="${k}"]`).focus(); toast('اتضاف'); };
  $$('[data-addl]').forEach(b => b.onclick = () => addItem(b.dataset.addl));
  $$('[data-new]').forEach(i => i.onkeydown = e => { if (e.key === 'Enter') addItem(i.dataset.new); });
  $('#rate-save').onclick = () => { DB.settings.egpToSar = num($('#rate').value); save(); toast('اتحفظ'); };
  $('#acc-save').onclick = () => { DB.settings.accountant = { name: $('#acc-name').value.trim(), phone: $('#acc-phone').value.trim(), email: $('#acc-email').value.trim() }; save(); toast('اتحفظت بيانات المحاسب'); };
  $('#xl-all').onclick = () => exportExcel(Object.keys(ENTITIES));
  $('#backup').onclick = () => download(new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' }), `inqlha-backup-${todayStr()}.json`);
  $('#restore').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    file.text().then(t => { const d = JSON.parse(t); if (!d.employees) throw 0; DB = normalize(d); save(); render(); toast('اتسترجعت النسخة'); }).catch(() => alert('الملف ده مش نسخة احتياطية صحيحة'));
  };
  if ($('#hist')) cloudHistory($('#hist'));
  if ($('#imp-local')) $('#imp-local').onclick = () => { const old = localData(); if (old && confirm(`ده هيستبدل البيانات اللي على السيرفر بـ ${countRecords(old)} سجل من المتصفح ده. النسخة الحالية هتفضل في السجل. تمام؟`)) importLocal(old); };
  if ($('#sample')) $('#sample').onclick = () => { if (confirm('ده هيمسح بياناتك الحالية ويرجّع البيانات التجريبية. متأكد؟')) { DB = migrate(sampleData()); save(); render(); toast('رجعت البيانات التجريبية'); } };
  $('#wipe').onclick = () => { if (!confirm('ده هيمسح كل البيانات (الموظفين والإيجارات والفواتير والعهد). القوائم هتفضل. متأكد؟')) return; Object.keys(ENTITIES).forEach(k => DB[k] = []); DB.payrolls = []; DB.payRequests = []; save(); render(); toast('اتمسحت البيانات'); };
}

/* ---------------- export ---------------- */
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function exportExcel(ents) {
  if (!window.XLSX) return alert('مكتبة Excel محتاجة نت عشان تشتغل. اتأكد إنك متصل وجرّب تاني.');
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  ents.forEach(ent => {
    const fields = allFields(ent).filter(f => f.t !== 'photo');
    const rows = DB[ent].map(row => { const r = withCalc(ent, row); const o = {}; fields.forEach(f => { const v = plainValue(ent, f, r); o[tr(f.l)] = typeof v === 'string' ? tr(v) : v; }); return o; });
    const ws = XLSX.utils.json_to_sheet(rows, { header: fields.map(f => tr(f.l)) });
    ws['!cols'] = fields.map(f => ({ wch: Math.max(12, tr(f.l).length + 4) }));
    XLSX.utils.book_append_sheet(wb, ws, tr(TAB_LABEL[ent] || ENTITIES[ent].title).slice(0, 31));
    if (LANG === 'en') wb.Workbook.Views[0].RTL = false;
  });
  XLSX.writeFile(wb, `inqlha-${ents.length > 1 ? 'all' : ents[0]}-${todayStr()}.xlsx`);
  toast('اتصدّر ملف Excel');
}

/* ---------------- boot ---------------- */
$('#search-trigger').onclick = openPalette;
$('#bell-btn').onclick = () => { location.hash = 'alerts'; };
$('#eye-btn').onclick = () => { DB.settings.showSensitive = !DB.settings.showSensitive; save(); render(); toast(DB.settings.showSensitive ? 'الرواتب والبيانات الحساسة ظاهرة' : 'الرواتب والبيانات الحساسة مخفية'); };
$('#menu-btn').onclick = () => $('#sidebar').classList.toggle('open');
addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', scrollY > 4));
/* boot after every script (payroll.js too) has loaded */
addEventListener('DOMContentLoaded', () => { if (CLOUD) return cloudBoot(); parseHash(); save(); render(); });
