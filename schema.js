/* ---------- helpers used by calculated fields ---------- */
const num = v => (v === '' || v == null || isNaN(+v)) ? 0 : +v;
const iso = d => { const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const todayStr = () => iso(new Date());
const parseDate = s => s ? new Date(s + 'T00:00:00') : null;
const daysUntil = s => { const d = parseDate(s); if (!d) return null; const t = parseDate(todayStr()); return Math.round((d - t) / 86400000); };
const addYears = (s, y) => { const d = parseDate(s); if (!d || !num(y)) return ''; d.setFullYear(d.getFullYear() + Math.floor(num(y))); const m = Math.round((num(y) % 1) * 12); if (m) d.setMonth(d.getMonth() + m); return iso(d).slice(0, 10); };
const yearsSince = s => { const d = parseDate(s); if (!d) return 0; return Math.max(0, (parseDate(todayStr()) - d) / (365.25 * 86400000)); };
const round2 = n => Math.round(n * 100) / 100;
const addDays = (s, n) => { const d = parseDate(s); if (!d) return ''; d.setDate(d.getDate() + n); return iso(d); };
/* same day n months later; the 31st becomes the last day of a shorter month */
const addMonths = (s, n) => { const d = parseDate(s); if (!d) return ''; const t = new Date(d.getFullYear(), d.getMonth() + n, 1); t.setDate(Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return iso(t); };
const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

const PERIOD_MONTHS = { 'شهري': 1, 'كل 3 شهور': 3, 'كل 6 شهور': 6, 'سنوي': 12 };

/* ---------- editable lists (Settings page) ---------- */
const DEFAULT_LISTS = {
  cities: ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'القاهرة', 'الإسكندرية'],
  workLocations: ['مكتب الرياض', 'مكتب جدة', 'مكتب القاهرة', 'لا يداوم'],
  departments: ['الإدارة', 'الموارد البشرية', 'المالية', 'العمليات', 'المبيعات', 'التقنية', 'النقل'],
  banks: ['مصرف الراجحي', 'البنك الأهلي السعودي', 'بنك الرياض', 'مصرف الإنماء', 'بنك البلاد', 'البنك السعودي الأول', 'البنك السعودي الفرنسي', 'البنك العربي الوطني', 'بنك الجزيرة', 'البنك السعودي للاستثمار', 'البنك الأهلي المصري', 'بنك مصر', 'البنك التجاري الدولي'],
  saudizationCompanies: [],
  saudizationCompaniesSample: ['شركة سعودة (أ)', 'شركة سعودة (ب)'],
  serviceTypes: ['نت', 'كهرباء', 'مية', 'موبايل', 'خط أرضي', 'أخرى'],
  providers: ['stc', 'موبايلي', 'زين', 'الشركة السعودية للكهرباء', 'شركة المياه الوطنية'],
  nationalities: ['سعودي', 'مصري', 'أخرى'],
  insurers: ['التعاونية', 'بوبا العربية', 'ميدغلف', 'الراجحي تكافل', 'ملاذ للتأمين', 'الجزيرة تكافل', 'جي آي جي (أكسا)', 'ولاء للتأمين'],
};
const LIST_LABELS = {
  cities: 'المدن', workLocations: 'أماكن الدوام', departments: 'الأقسام', banks: 'البنوك',
  saudizationCompanies: 'شركات السعودة', serviceTypes: 'أنواع الخدمات (الفواتير)', providers: 'مقدمي الخدمات', nationalities: 'الجنسيات', insurers: 'شركات التأمين الطبي',
};

/* bank short codes used in the Mudad bank file, and English city names for its address column */
const BANK_CODES = { 'مصرف الراجحي': 'RJHI', 'البنك الأهلي السعودي': 'NCBK', 'بنك الرياض': 'RIBL', 'مصرف الإنماء': 'INMA', 'بنك البلاد': 'ALBI', 'البنك السعودي الأول': 'SABB', 'البنك السعودي الفرنسي': 'BSFR', 'البنك العربي الوطني': 'ARNB', 'بنك الجزيرة': 'BJAZ', 'البنك السعودي للاستثمار': 'SIBC' };
const CITY_EN = { 'الرياض': 'Riyadh', 'جدة': 'Jeddah', 'الدمام': 'Dammam', 'مكة': 'Makkah', 'المدينة': 'Madinah', 'الخبر': 'Khobar', 'القاهرة': 'Cairo', 'الإسكندرية': 'Alexandria' };

/* ---------- fixed dropdowns ---------- */
const STATIC = {
  marital: ['أعزب', 'متزوج', 'مطلق', 'أرمل'],
  empType: ['دوام كامل', 'سعودة'],
  empKind: ['موظف', 'سواق'],
  country: ['السعودية', 'مصر'],
  empStatus: ['على رأس العمل', 'إجازة طويلة', 'مستقيل', 'منتهي عقده'],
  currency: ['ريال', 'جنيه'],
  salaryPay: ['مدد', 'تحويل'],
  loanType: ['سلفة نقدية', 'سلفة سكن', 'أخرى'],
  yesno: ['نعم', 'لا'],
  licenseType: ['خصوصي', 'نقل خفيف', 'نقل ثقيل', 'عمومي', 'دراجة نارية'],
  bloodType: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  medicalClass: ['VIP', 'A', 'B', 'C'],
  carType: ['ملاكي', 'ساطحة'],
  contractStatus: ['ساري', 'متجدد', 'منتهي'],
  payPeriod: Object.keys(PERIOD_MONTHS),
  propType: ['سكن', 'مكتب'],
  payMethod: ['تحويل', 'كاش', 'شيك', 'سداد', 'خصم تلقائي'],
  billFreq: ['مرة واحدة', 'شهري', 'كل 3 شهور', 'كل 6 شهور', 'سنوي'],
  billPay: ['سداد', 'تحويل بنكي'],
  amountType: ['ثابت', 'متغير'],
  assetType: ['لابتوب', 'موبايل', 'شاشة', 'شريحة', 'تابلت', 'أخرى'],
  assetCond: ['جديد', 'كويس', 'محتاج صيانة', 'عطلان'],
  assetPlace: ['مع موظف', 'في المخزن', 'في الصيانة'],
};

/* older data had "سواق" as an employment type; it is now its own choice (kind) */
function migrate(d) {
  (d.employees || []).forEach(e => {
    if (!e.kind) e.kind = e.empType === 'سواق' ? 'سواق' : 'موظف';
    if (e.empType === 'سواق') e.empType = 'دوام كامل';
    delete e.assignedCar;
  });
  if (!d.payRequests) d.payRequests = [];
  if (!d.attendance) d.attendance = [];
  /* the medical policy end date used to be typed in; it now follows from the start date (+1 year) */
  (d.employees || []).forEach(e => { if (e.medicalExpiry && !e.medicalStart) e.medicalStart = addDays(addYears(e.medicalExpiry, -1), 1); delete e.medicalExpiry; });
  /* bills: only SADAD or bank transfer; recurring bills keep a first due date instead of a day of the month */
  (d.bills || []).forEach(b => {
    if (b.payMethod !== 'سداد' && b.payMethod !== 'تحويل بنكي') b.payMethod = b.payMethod === 'تحويل' ? 'تحويل بنكي' : 'سداد';
    if (b.frequency !== 'مرة واحدة' && !b.dueDate && b.dueDay) {
      const t = new Date(), day = Math.min(31, Math.max(1, num(b.dueDay) || 1));
      const ym = iso(t).slice(0, 7);
      const paid = (d.billPayments || []).some(p => p.billCode === b.code && p.month === ym);
      const m = t.getMonth() + (paid ? 1 : 0);
      b.dueDate = iso(new Date(t.getFullYear(), m, Math.min(day, new Date(t.getFullYear(), m + 1, 0).getDate())));
    }
    delete b.dueDay;
    if (!Array.isArray(b.invoices)) b.invoices = [];
    if (!Array.isArray(b.ibanCert)) b.ibanCert = [];
  });
  /* cars: the year used to be typed inside the model ("كامري 2024") */
  (d.cars || []).forEach(c => {
    const m = String(c.model || '').match(/(?:^|\s)((?:19|20)\d{2})(?:\s|$)/);
    if (m && !c.year) { c.year = +m[1]; c.model = String(c.model).replace(m[0], ' ').replace(/\s+/g, ' ').trim(); }
  });
  d.settings = d.settings || {};
  if (!d.settings.accountant) d.settings.accountant = { name: '', phone: '', email: '' };
  return d;
}

/* ---------- link lookups (filled by app.js) ---------- */
const L = {
  emp: code => (DB.employees || []).find(e => e.code === code),
  advancesOf: code => (DB.advances || []).filter(a => a.empCode === code),
  carOf: code => (DB.cars || []).filter(c => c.driver === code && c.status !== 'منتهي'),
  assetsOf: code => (DB.assets || []).filter(a => a.empCode === code),
  billPays: code => (DB.billPayments || []).filter(p => p.billCode === code).sort((a, b) => (b.month || '').localeCompare(a.month || '')),
};
const advMonthly = a => num(a.months) ? round2(num(a.amount) / num(a.months)) : 0;
const advRemaining = a => Math.max(0, round2(num(a.amount) - num(a.paid)));
const empTotal = r => num(r.basic) + num(r.housing) + num(r.transport) + num(r.cola) + num(r.comms) + num(r.other);
const empDeduction = r => round2(L.advancesOf(r.code).reduce((s, a) => s + Math.min(advMonthly(a), advRemaining(a)), 0));
/* a one-time bill is due once on its own date, and is done after its first payment */
const isOnceBill = r => r.frequency === 'مرة واحدة';
const isTransferBill = r => r.payMethod === 'تحويل بنكي';
/* a recurring bill is due on dueDate, then every N months after it. Each payment
   counts for the due date nearest to the month it was recorded for, so paying a
   bit early or late still closes the right period. The next due is the first one
   that has no payment. */
const nextBillDue = r => {
  const pays = L.billPays(r.code);
  if (isOnceBill(r)) return pays.length ? '' : (r.dueDate || '');
  if (!r.dueDate) return '';
  const step = PERIOD_MONTHS[r.frequency] || 1;
  const done = new Set(pays.filter(p => p.month).map(p => Math.round(monthsBetween(r.dueDate, p.month) / step)));
  let k = 0; while (done.has(k) && k < 1200) k++;
  return addMonths(r.dueDate, k * step);
};
const billState = r => {
  const n = nextBillDue(r), t = todayStr();
  if (!n) return L.billPays(r.code).length ? 'مدفوعة' : '';
  if (n < t) return 'متأخرة';
  if (n.slice(0, 7) === t.slice(0, 7)) return 'مش مدفوعة';
  return L.billPays(r.code).length ? 'مدفوعة' : 'لسه مجاش ميعادها';
};
const billPaidThisMonth = r => billState(r) === 'مدفوعة';

/*
  Field options:
  k key | l label | t type (text number date month select emp contract bill textarea url email)
  o options source (list name or STATIC name) | req required | table show in table
  sens sensitive (masked) | money format as money | alert days before date to warn
  calc (row) => value  (read-only, recalculated) | show (row) => bool  (form visibility)
  v validator name | unique
*/
const ENTITIES = {
  employees: {
    title: 'بيانات الموظفين', single: 'موظف', group: 'الموظفين', key: 'code', codePrefix: 'E-',
    sections: [
      ['موظف ولا سواق؟', [
        { k: 'kind', l: 'موظف ولا سواق؟', t: 'select', o: 'empKind', req: true, def: 'موظف', table: true },
        { k: 'assignedCar', l: 'السيارة اللي بيسوقها', t: 'car', show: r => r.kind === 'سواق', help: 'من صفحة السيارات · لو العربية مع حد تاني هتتنقل للسواق ده' },
      ]],
      ['رخصة القيادة', [
        { k: 'licenseNo', l: 'رقم رخصة القيادة', help: 'في السعودية غالباً نفس رقم الهوية' },
        { k: 'licenseType', l: 'نوع الرخصة', t: 'select', o: 'licenseType' },
        { k: 'licenseIssue', l: 'تاريخ إصدار الرخصة', t: 'date' },
        { k: 'licenseExpiry', l: 'انتهاء رخصة القيادة', t: 'date', alert: 30 },
      ]],
      ['البيانات الشخصية', [
        { k: 'photo', l: 'صورة الموظف', t: 'photo' },
        { k: 'code', l: 'كود الموظف', req: true, unique: true, table: true },
        { k: 'nameAr', l: 'الاسم بالعربي', req: true, table: true },
        { k: 'nameEn', l: 'الاسم بالإنجليزي' },
        { k: 'nationality', l: 'الجنسية', t: 'select', o: 'nationalities' },
        { k: 'dob', l: 'تاريخ الميلاد', t: 'date' },
        { k: 'marital', l: 'الحالة الاجتماعية', t: 'select', o: 'marital' },
        { k: 'dependents', l: 'عدد التابعين', t: 'number' },
        { k: 'idNumber', l: 'رقم الهوية / الإقامة', sens: true, v: 'id' },
        { k: 'iqamaExpiry', l: 'تاريخ انتهاء الإقامة', t: 'date', alert: 60 },
        { k: 'iqamaProfession', l: 'المهنة في الإقامة', help: 'زي ما هي مكتوبة في الإقامة · لو فاضية هيظهر المسمى الوظيفي' },
        { k: 'iqamaEmployer', l: 'صاحب العمل في الإقامة', help: 'لو فاضية: شركة إنقلها، أو شركة السعودة' },
        { k: 'iqamaIssuePlace', l: 'مكان إصدار الإقامة' },
        { k: 'bloodType', l: 'فصيلة الدم', t: 'select', o: 'bloodType' },
        { k: 'passportNo', l: 'رقم الجواز', sens: true },
        { k: 'passportExpiry', l: 'تاريخ انتهاء الجواز', t: 'date', alert: 90 },
        { k: 'phone', l: 'الموبايل', table: true },
        { k: 'companyEmail', l: 'الإيميل الرسمي للشركة', t: 'email', v: 'email' },
        { k: 'personalEmail', l: 'الإيميل الشخصي', t: 'email', v: 'email' },
        { k: 'emergencyName', l: 'اسم للطوارئ' },
        { k: 'emergencyRelation', l: 'صلة القرابة' },
        { k: 'emergencyPhone', l: 'رقم الطوارئ' },
      ]],
      ['الوظيفة والعقد', [
        { k: 'jobTitle', l: 'المسمى الوظيفي', table: true },
        { k: 'department', l: 'القسم', t: 'select', o: 'departments' },
        { k: 'manager', l: 'المدير المباشر', t: 'emp' },
        { k: 'joinDate', l: 'تاريخ الانضمام للشركة', t: 'date' },
        { k: 'contractYears', l: 'مدة العقد (سنين)', t: 'number' },
        { k: 'contractEnd', l: 'تاريخ نهاية العقد', t: 'date', alert: 60, calc: r => addYears(r.joinDate, r.contractYears), help: 'بيتحسب أوتوماتيك' },
        { k: 'probationEnd', l: 'نهاية فترة التجربة', t: 'date', alert: 14 },
        { k: 'leaveDays', l: 'الإجازة السنوية (يوم)', t: 'number', help: 'لو فاضية: 21 يوم، و30 بعد 5 سنين خدمة' },
        { k: 'serviceYears', l: 'مدة الخدمة (سنين)', calc: r => r.joinDate ? round2(yearsSince(r.joinDate)).toFixed(1) : '' },
        { k: 'status', l: 'حالة الموظف', t: 'select', o: 'empStatus', table: true, def: 'على رأس العمل' },
        { k: 'lastDay', l: 'آخر يوم عمل', t: 'date', show: r => ['مستقيل', 'منتهي عقده'].includes(r.status), help: 'بيُستخدم في حساب راتب آخر شهر' },
      ]],
      ['التوظيف ومكان الدوام', [
        { k: 'empType', l: 'نوع التوظيف', t: 'select', o: 'empType', req: true, table: true },
        { k: 'country', l: 'الدولة', t: 'select', o: 'country', req: true, table: true },
        { k: 'workLocation', l: 'مكان الدوام', t: 'select', o: 'workLocations', table: true },
        { k: 'city', l: 'مدينة الموظف', t: 'select', o: 'cities', help: 'بتظهر كعنوان في ملف مدد' },
        { k: 'saudizationCompany', l: 'شركة السعودة', t: 'select', o: 'saudizationCompanies', show: r => r.empType === 'سعودة' },
        { k: 'saudizationFee', l: 'رسوم شركة السعودة الشهرية', t: 'number', money: true, show: r => r.empType === 'سعودة' },
      ]],
      ['التأمينات (GOSI)', [
        { k: 'gosi', l: 'مسجل في التأمينات (GOSI)؟', t: 'select', o: 'yesno' },
        { k: 'gosiAmount', l: 'مبلغ اشتراك التأمينات', t: 'number', money: true, show: r => r.gosi === 'نعم' },
      ]],
      ['التأمين الطبي', [
        { k: 'medicalInsurer', l: 'شركة التأمين الطبي', t: 'select', o: 'insurers', help: 'القايمة بتتعدل من الإعدادات' },
        { k: 'medicalClass', l: 'فئة التأمين الطبي', t: 'select', o: 'medicalClass' },
        { k: 'medicalPolicyNo', l: 'رقم البوليصة' },
        { k: 'medicalMemberNo', l: 'رقم كارت العضوية' },
        { k: 'medicalStart', l: 'تاريخ بداية البوليصة', t: 'date', help: 'البوليصة مدتها سنة' },
        { k: 'medicalExpiry', l: 'نهاية البوليصة', t: 'date', alert: 30, calc: r => r.medicalStart ? addDays(addYears(r.medicalStart, 1), -1) : '', help: 'بتتحسب لوحدها: البداية + سنة' },
        { k: 'medicalDependents', l: 'عدد التابعين المؤمن عليهم', t: 'number', help: 'الزوجة والأولاد اللي على نفس البوليصة' },
        { k: 'medicalCost', l: 'تكلفة البوليصة السنوية', t: 'number', money: true, sens: true },
      ]],
      ['الراتب', [
        { k: 'currency', l: 'عملة الراتب', t: 'select', o: 'currency', def: 'ريال' },
        { k: 'basic', l: 'الأساسي', t: 'number', money: true, sens: true },
        { k: 'housing', l: 'بدل سكن', t: 'number', money: true, sens: true },
        { k: 'transport', l: 'بدل تنقلات', t: 'number', money: true, sens: true },
        { k: 'cola', l: 'بدل غلاء معيشة (COLA)', t: 'number', money: true, sens: true },
        { k: 'comms', l: 'بدل اتصالات', t: 'number', money: true, sens: true },
        { k: 'other', l: 'بدلات أخرى', t: 'number', money: true, sens: true },
        { k: 'total', l: 'إجمالي الراتب', money: true, sens: true, table: true, calc: r => empTotal(r) },
        { k: 'payMethod', l: 'طريقة صرف الراتب', t: 'select', o: 'salaryPay', help: 'مدد = بيترفع في ملف البنك' },
        { k: 'iban', l: 'IBAN الراتب', sens: true, v: 'iban' },
        { k: 'bank', l: 'البنك', t: 'select', o: 'banks' },
        { k: 'bankCode', l: 'كود البنك (مدد)', calc: r => BANK_CODES[r.bank] || '' },
      ]],
      ['السلف ونهاية الخدمة', [
        { k: 'advRemaining', l: 'المتبقي من السلف', money: true, sens: true, table: true, calc: r => round2(L.advancesOf(r.code).reduce((s, a) => s + advRemaining(a), 0)), help: 'من صفحة السلف' },
        { k: 'advDeduction', l: 'خصم السلفة الشهري', money: true, sens: true, calc: r => empDeduction(r) },
        { k: 'net', l: 'صافي الراتب', money: true, sens: true, table: true, calc: r => round2(empTotal(r) - empDeduction(r)) },
        { k: 'eos', l: 'مكافأة نهاية الخدمة (تقديري)', money: true, sens: true, help: 'حسب نظام العمل السعودي على إجمالي الراتب',
          calc: r => { const y = yearsSince(r.joinDate), w = empTotal(r); if (!r.joinDate || !w) return ''; return round2(y <= 5 ? w * y / 2 : w * 5 / 2 + w * (y - 5)); } },
      ]],
      ['مسحوب من الشيتات التانية', [
        { k: 'car', l: 'راكب سيارة؟', table: true, calc: r => { const c = L.carOf(r.code); return c.length ? 'نعم: ' + c.map(x => x.plate).join('، ') : 'لا'; } },
        { k: 'laptop', l: 'لابتوب عهدة؟', table: true, calc: r => { const a = L.assetsOf(r.code).filter(x => x.type === 'لابتوب'); return a.length ? 'نعم: ' + a.map(x => [x.brand, x.model, x.ram && x.ram + ' رام'].filter(Boolean).join(' ')).join('، ') : 'لا'; } },
      ]],
    ],
  },

  advances: {
    title: 'السلف', single: 'سلفة', group: 'الموظفين', key: 'code', codePrefix: 'ADV-',
    sections: [['بيانات السلفة', [
      { k: 'code', l: 'رقم السلفة', req: true, unique: true, table: true },
      { k: 'empCode', l: 'الموظف', t: 'emp', req: true, table: true },
      { k: 'loanType', l: 'نوع السلفة', t: 'select', o: 'loanType', def: 'سلفة نقدية', table: true },
      { k: 'date', l: 'تاريخ السلفة', t: 'date', table: true },
      { k: 'amount', l: 'مبلغ السلفة', t: 'number', money: true, req: true, table: true },
      { k: 'months', l: 'عدد شهور التقسيط', t: 'number', req: true, table: true },
      { k: 'monthly', l: 'الخصم الشهري', money: true, table: true, calc: r => advMonthly(r) },
      { k: 'paid', l: 'المدفوع لحد دلوقتي', t: 'number', money: true, table: true },
      { k: 'remaining', l: 'المتبقي', money: true, table: true, calc: r => advRemaining(r) },
      { k: 'notes', l: 'ملاحظات', t: 'textarea' },
    ]]],
  },

  cars: {
    title: 'السيارات', single: 'سيارة', group: 'الإيجارات', key: 'contractNo', codePrefix: 'CAR-',
    sections: [
      ['بيانات السيارة', [
        { k: 'contractNo', l: 'رقم العقد', req: true, unique: true, table: true },
        { k: 'carType', l: 'نوع السيارة', t: 'select', o: 'carType', req: true, table: true },
        { k: 'plate', l: 'رقم السيارة', req: true, table: true },
        { k: 'city', l: 'المدينة', t: 'select', o: 'cities', table: true },
        { k: 'brand', l: 'الماركة', table: true },
        { k: 'model', l: 'الموديل', help: 'مثال: كامري. الصورة بتتجاب بالماركة والموديل' },
        { k: 'year', l: 'سنة الصنع', t: 'number' },
        { k: 'color', l: 'اللون' },
        { k: 'driver', l: 'مين اللي راكبها', t: 'emp', table: true },
      ]],
      ['الإيجار والدفع', [
        { k: 'rentalOffice', l: 'مكتب الإيجار', table: true },
        { k: 'officeIban', l: 'IBAN مكتب الإيجار', v: 'iban' },
        { k: 'price', l: 'الإيجار الشهري', t: 'number', money: true, req: true, table: true },
        { k: 'payPeriod', l: 'مدة الدفع', t: 'select', o: 'payPeriod', def: 'شهري' },
        { k: 'periodAmount', l: 'المبلغ في الفترة', money: true, calc: r => num(r.price) * (PERIOD_MONTHS[r.payPeriod] || 1) },
        { k: 'nextPayment', l: 'ميعاد الدفعة الجاية', t: 'date', alert: 14, table: true },
      ]],
      ['العقد والمستندات', [
        { k: 'startDate', l: 'بداية الإيجار', t: 'date' },
        { k: 'endDate', l: 'نهاية العقد', t: 'date', alert: 30 },
        { k: 'status', l: 'حالة العقد', t: 'select', o: 'contractStatus', def: 'ساري', table: true },
        { k: 'regExpiry', l: 'انتهاء الرخصة (الاستمارة)', t: 'date', alert: 30 },
        { k: 'insuranceExpiry', l: 'انتهاء التأمين', t: 'date', alert: 30 },
        { k: 'contractLink', l: 'رابط صورة العقد', t: 'url' },
      ]],
    ],
  },

  properties: {
    title: 'السكن والمكاتب', single: 'سكن / مكتب', group: 'الإيجارات', key: 'contractNo', codePrefix: 'PR-',
    sections: [
      ['البيانات الأساسية', [
        { k: 'contractNo', l: 'رقم العقد', req: true, unique: true, table: true },
        { k: 'propType', l: 'النوع', t: 'select', o: 'propType', req: true, table: true },
        { k: 'city', l: 'المدينة', t: 'select', o: 'cities', req: true, table: true },
        { k: 'address', l: 'العنوان بالتفصيل', t: 'textarea' },
        { k: 'residents', l: 'الساكنين', t: 'textarea', show: r => r.propType === 'سكن', help: 'أسماء أو أكواد الموظفين' },
      ]],
      ['المؤجر والدفع', [
        { k: 'landlord', l: 'اسم المؤجر', req: true, table: true },
        { k: 'landlordIban', l: 'IBAN المؤجر', v: 'iban' },
        { k: 'price', l: 'الإيجار الشهري', t: 'number', money: true, req: true, table: true },
        { k: 'payPeriod', l: 'مدة الدفع', t: 'select', o: 'payPeriod', req: true, table: true },
        { k: 'periodAmount', l: 'المبلغ اللي بيتدفع في الفترة', money: true, table: true, calc: r => num(r.price) * (PERIOD_MONTHS[r.payPeriod] || 1) },
        { k: 'nextPayment', l: 'ميعاد الدفعة الجاية', t: 'date', alert: 14, table: true },
      ]],
      ['العقد', [
        { k: 'startDate', l: 'بداية العقد', t: 'date' },
        { k: 'endDate', l: 'نهاية العقد', t: 'date', alert: 60 },
        { k: 'status', l: 'حالة العقد', t: 'select', o: 'contractStatus', def: 'ساري', table: true },
        { k: 'contractLink', l: 'رابط صورة العقد', t: 'url' },
      ]],
    ],
  },

  rentPayments: {
    title: 'سجل دفعات الإيجار', single: 'دفعة', group: 'الإيجارات', key: 'code', codePrefix: 'RP-',
    sections: [['بيانات الدفعة', [
      { k: 'code', l: 'رقم الدفعة', req: true, unique: true, table: true },
      { k: 'contractNo', l: 'العقد', t: 'contract', req: true, table: true },
      { k: 'payDate', l: 'تاريخ الدفع', t: 'date', req: true, table: true },
      { k: 'amount', l: 'المبلغ', t: 'number', money: true, req: true, table: true },
      { k: 'from', l: 'الفترة من', t: 'date', table: true },
      { k: 'to', l: 'الفترة إلى', t: 'date', table: true },
      { k: 'method', l: 'طريقة الدفع', t: 'select', o: 'payMethod', table: true },
      { k: 'notes', l: 'ملاحظات', t: 'textarea' },
    ]]],
  },

  bills: {
    title: 'الفواتير', single: 'فاتورة', group: 'الفواتير', key: 'code', codePrefix: 'B-',
    sections: [
      ['نوع الفاتورة', [
        { k: 'frequency', l: 'الفاتورة دي بتتدفع', t: 'choice', o: 'billFreq', def: 'شهري', req: true },
        { k: 'dueDate', l: 'تاريخ الاستحقاق', t: 'date', req: true, help: 'في الفاتورة المتكررة ده أول ميعاد، والمواعيد اللي بعده بتتحسب لوحدها' },
        { k: 'amount', l: 'المبلغ', t: 'number', money: true, req: true, table: true, help: 'لو المبلغ بيتغير اكتب آخر مبلغ، وبيتحدث لوحده لما تسجل دفعة' },
        { k: 'amountType', l: 'المبلغ ثابت ولا بيتغير؟', t: 'select', o: 'amountType' },
      ]],
      ['بيانات الفاتورة', [
        { k: 'code', l: 'كود الفاتورة', req: true, unique: true, table: true },
        { k: 'serviceType', l: 'نوع الخدمة', t: 'select', o: 'serviceTypes', req: true, table: true },
        { k: 'location', l: 'خاصة بإيه', req: true, table: true, help: 'مثال: مكتب الرياض' },
        { k: 'city', l: 'المدينة', t: 'select', o: 'cities', table: true },
        { k: 'linkedContract', l: 'مربوطة بعقد إيجار', t: 'contract' },
        { k: 'provider', l: 'الشركة المقدمة للخدمة', t: 'select', o: 'providers', req: true, table: true },
        { k: 'responsible', l: 'المسؤول عن الدفع', t: 'emp' },
      ]],
      ['بيانات الدفع', [
        { k: 'payMethod', l: 'هتتدفع إزاي؟', t: 'choice', o: 'billPay', def: 'سداد', req: true },
        { k: 'sadad', l: 'رقم المفوتر', show: r => !isTransferBill(r), help: 'رقم الشركة نفسها في سداد' },
        { k: 'accountNo', l: 'رقم السداد', table: true, req: true, show: r => !isTransferBill(r), help: 'الرقم اللي المحاسب بيدخله في سداد (رقم الحساب أو الاشتراك)' },
        { k: 'beneficiary', l: 'اسم المستفيد', req: true, show: isTransferBill, help: 'زي ما هو مكتوب في شهادة الآيبان' },
        { k: 'iban', l: 'رقم الآيبان (IBAN)', v: 'iban', req: true, show: isTransferBill },
        { k: 'ibanCert', l: 'شهادة الآيبان', t: 'files', max: 1, show: isTransferBill, help: 'PDF أو صورة. بتتبعت للمحاسب مع طلب الدفع' },
      ]],
      ['المتابعة', [
        { k: 'thisMonth', l: 'الحالة', table: true, calc: r => billState(r) },
        { k: 'nextDue', l: 'ميعاد الدفع الجاي', t: 'date', alert: 5, table: true, calc: r => nextBillDue(r) },
        { k: 'avg3', l: 'متوسط آخر 3 دفعات', money: true, calc: r => { const p = L.billPays(r.code).slice(0, 3); return p.length ? round2(p.reduce((s, x) => s + num(x.amount), 0) / p.length) : ''; } },
      ]],
      ['المرفقات', [
        { k: 'invoices', l: 'الفواتير', t: 'files', period: true, help: 'ارفع فاتورة كل فترة (PDF أو صورة). كل فاتورة بتترفع على ميعاد استحقاقها، وبتظهر في طلب الدفع بتاعه' },
      ]],
    ],
  },

  billPayments: {
    title: 'سجل الفواتير', single: 'دفعة فاتورة', group: 'الفواتير', key: 'code', codePrefix: 'BP-',
    sections: [['بيانات الدفعة', [
      { k: 'code', l: 'رقم الدفعة', req: true, unique: true, table: true },
      { k: 'billCode', l: 'الفاتورة', t: 'bill', req: true, table: true },
      { k: 'month', l: 'عن شهر', t: 'month', req: true, table: true },
      { k: 'amount', l: 'المبلغ', t: 'number', money: true, req: true, table: true },
      { k: 'payDate', l: 'تاريخ الدفع', t: 'date', table: true },
      { k: 'notes', l: 'ملاحظات', t: 'textarea' },
    ]]],
  },

  assets: {
    title: 'عهد الشركة', single: 'عهدة', group: 'العهد', key: 'code', codePrefix: 'AS-',
    sections: [
      ['بيانات الجهاز', [
        { k: 'code', l: 'كود العهدة', req: true, unique: true, table: true },
        { k: 'type', l: 'نوع العهدة', t: 'select', o: 'assetType', req: true, table: true },
        { k: 'brand', l: 'الماركة', table: true },
        { k: 'model', l: 'الموديل', table: true },
        { k: 'serial', l: 'الرقم التسلسلي' },
      ]],
      ['المواصفات', [
        { k: 'cpu', l: 'المعالج', table: true },
        { k: 'ram', l: 'الرام', table: true, help: 'مثال: 16GB' },
        { k: 'storage', l: 'الهارد' },
        { k: 'screen', l: 'حجم الشاشة' },
      ]],
      ['الشراء والحالة', [
        { k: 'purchaseDate', l: 'تاريخ الشراء', t: 'date' },
        { k: 'price', l: 'السعر', t: 'number', money: true },
        { k: 'warrantyEnd', l: 'انتهاء الضمان', t: 'date', alert: 30 },
        { k: 'condition', l: 'حالة الجهاز', t: 'select', o: 'assetCond', table: true },
      ]],
      ['التسليم', [
        { k: 'place', l: 'مكانه', t: 'select', o: 'assetPlace', table: true, def: 'في المخزن' },
        { k: 'empCode', l: 'مع أي موظف', t: 'emp', table: true, show: r => r.place === 'مع موظف' },
        { k: 'handoverDate', l: 'تاريخ التسليم', t: 'date', show: r => r.place === 'مع موظف' },
        { k: 'formLink', l: 'رابط نموذج الاستلام الموقّع', t: 'url', show: r => r.place === 'مع موظف' },
      ]],
    ],
  },

  assetHistory: {
    title: 'سجل تسليم العهد', single: 'حركة', group: 'العهد', key: 'code', readonly: true,
    sections: [['الحركة', [
      { k: 'code', l: 'رقم الحركة', table: true },
      { k: 'assetCode', l: 'كود العهدة', table: true },
      { k: 'fromEmp', l: 'كانت مع', t: 'emp', table: true },
      { k: 'toEmp', l: 'اتسلمت لـ', t: 'emp', table: true },
      { k: 'date', l: 'التاريخ', t: 'date', table: true },
    ]]],
  },
};

const NAV = [
  ['', [['dashboard', 'لوحة التحكم']]],
  ['الإيجارات', [['cars'], ['properties'], ['rentPayments']]],
  ['الفواتير', [['bills'], ['billPayments']]],
  ['الموظفين', [['employees'], ['advances']]],
  ['العهد', [['assets'], ['assetHistory']]],
  ['', [['settings', 'الإعدادات والقوائم']]],
];

/* ---------- sample data (fictional, for testing only) ---------- */
function sampleData() {
  const t = todayStr(), m = t.slice(0, 7);
  const shift = d => { const x = parseDate(t); x.setDate(x.getDate() + d); return iso(x).slice(0, 10); };
  const bday = (age, day) => { const x = parseDate(t); x.setFullYear(x.getFullYear() - age); x.setDate(Math.min(day, 28)); return iso(x); };
  const prevMonth = k => { const x = parseDate(t); x.setDate(1); x.setMonth(x.getMonth() - k); return iso(x).slice(0, 7); };
  return {
    employees: [
      { code: 'E-001', nameAr: 'موظف تجريبي 1', nameEn: 'Test Employee 1', nationality: 'مصري', dob: bday(34, 6), marital: 'متزوج', dependents: 2, idNumber: '2123456789', iqamaExpiry: shift(40), passportNo: 'A1234567', passportExpiry: shift(400), phone: '0500000001', companyEmail: 'emp1@example.com', jobTitle: 'مدير عمليات', department: 'العمليات', joinDate: '2024-03-01', contractYears: 3, status: 'على رأس العمل', empType: 'دوام كامل', country: 'السعودية', workLocation: 'مكتب الرياض', city: 'الرياض', payMethod: 'مدد', gosi: 'نعم', gosiAmount: 400, medicalClass: 'A', medicalExpiry: shift(120), currency: 'ريال', basic: 9000, housing: 2250, transport: 900, comms: 300, other: 0, iban: 'SA0380000000608010167519', bank: 'مصرف الراجحي' },
      { code: 'E-002', nameAr: 'موظف تجريبي 2', nameEn: 'Test Employee 2', nationality: 'سعودي', marital: 'أعزب', idNumber: '1123456789', phone: '0500000002', jobTitle: 'موظف سعودة', joinDate: '2025-01-15', contractYears: 2, status: 'على رأس العمل', empType: 'سعودة', country: 'السعودية', workLocation: 'لا يداوم', city: 'الرياض', payMethod: 'مدد', iban: 'SA4420000001234567891234', saudizationCompany: 'شركة سعودة (أ)', saudizationFee: 1500, currency: 'ريال', basic: 4000, housing: 1000, transport: 0, comms: 0, other: 0, bank: 'البنك الأهلي السعودي' },
      { code: 'E-003', nameAr: 'سواق تجريبي', nameEn: 'Test Driver', nationality: 'مصري', dob: bday(41, 18), marital: 'متزوج', idNumber: '2223456789', iqamaExpiry: shift(-5), phone: '0500000003', jobTitle: 'سواق ساطحة', department: 'النقل', joinDate: '2025-06-01', contractYears: 2, status: 'على رأس العمل', empType: 'سواق', country: 'السعودية', workLocation: 'مكتب جدة', city: 'جدة', payMethod: 'تحويل', licenseNo: 'DL-555', licenseExpiry: shift(20), currency: 'ريال', basic: 3000, housing: 750, transport: 0, comms: 100, other: 200, bank: 'مصرف الإنماء' },
      { code: 'E-004', nameAr: 'مطور تجريبي', nameEn: 'Test Developer', nationality: 'مصري', marital: 'أعزب', idNumber: '29001011234567', phone: '01000000004', companyEmail: 'dev@example.com', jobTitle: 'مطور برمجيات', department: 'التقنية', joinDate: shift(-320), contractYears: 1, probationEnd: shift(12), status: 'على رأس العمل', empType: 'دوام كامل', country: 'مصر', workLocation: 'مكتب القاهرة', city: 'القاهرة', payMethod: 'تحويل', currency: 'جنيه', basic: 30000, housing: 0, transport: 2000, comms: 500, other: 0, bank: 'البنك التجاري الدولي' },
    ],
    advances: [
      { code: 'ADV-001', empCode: 'E-003', loanType: 'سلفة نقدية', date: shift(-60), amount: 3000, months: 6, paid: 1000 },
    ],
    cars: [
      { contractNo: 'CAR-001', carType: 'ساطحة', plate: 'أ ب ج 1234', city: 'جدة', brand: 'إيسوزو', model: 'NPR', year: 2023, color: 'أبيض', driver: 'E-003', rentalOffice: 'مكتب تأجير تجريبي', price: 4500, payPeriod: 'شهري', nextPayment: shift(9), startDate: '2024-01-01', endDate: shift(200), status: 'ساري', regExpiry: shift(150), insuranceExpiry: shift(25) },
      { contractNo: 'CAR-002', carType: 'ملاكي', plate: 'د هـ و 5678', city: 'الرياض', brand: 'تويوتا', model: 'كامري', year: 2024, color: 'رمادي', driver: 'E-001', rentalOffice: 'مكتب تأجير تجريبي', price: 2800, payPeriod: 'شهري', nextPayment: shift(20), startDate: '2024-05-01', endDate: shift(300), status: 'ساري', regExpiry: shift(260), insuranceExpiry: shift(180) },
    ],
    properties: [
      { contractNo: 'PR-001', propType: 'مكتب', city: 'الرياض', address: 'حي تجريبي، الرياض', landlord: 'مؤجر تجريبي 1', price: 12000, payPeriod: 'كل 6 شهور', nextPayment: shift(45), startDate: '2024-01-01', endDate: shift(50), status: 'ساري' },
      { contractNo: 'PR-002', propType: 'سكن', city: 'جدة', address: 'حي تجريبي، جدة', residents: 'E-003', landlord: 'مؤجر تجريبي 2', price: 3500, payPeriod: 'سنوي', nextPayment: shift(100), startDate: '2025-01-01', endDate: shift(420), status: 'ساري' },
    ],
    rentPayments: [
      { code: 'RP-001', contractNo: 'PR-001', payDate: shift(-135), amount: 72000, from: shift(-135), to: shift(45), method: 'تحويل' },
    ],
    bills: [
      { code: 'B-001', serviceType: 'نت', location: 'مكتب الرياض', city: 'الرياض', linkedContract: 'PR-001', provider: 'stc', frequency: 'شهري', dueDate: shift(5), amountType: 'ثابت', amount: 450, payMethod: 'سداد', responsible: 'E-001' },
      { code: 'B-002', serviceType: 'كهرباء', location: 'سكن جدة', city: 'جدة', linkedContract: 'PR-002', provider: 'الشركة السعودية للكهرباء', frequency: 'شهري', dueDate: shift(12), amountType: 'متغير', amount: 620, payMethod: 'سداد' },
    ],
    billPayments: [
      { code: 'BP-001', billCode: 'B-002', month: prevMonth(2), amount: 540, payDate: shift(-60) },
      { code: 'BP-002', billCode: 'B-002', month: prevMonth(1), amount: 620, payDate: shift(-30) },
      { code: 'BP-003', billCode: 'B-001', month: prevMonth(1), amount: 450, payDate: shift(-28) },
    ],
    assets: [
      { code: 'AS-001', type: 'لابتوب', brand: 'Dell', model: 'Latitude 5440', serial: 'SN-0001', cpu: 'i7', ram: '16GB', storage: '512GB SSD', screen: '14"', purchaseDate: '2024-02-01', price: 5200, warrantyEnd: shift(90), condition: 'كويس', place: 'مع موظف', empCode: 'E-001', handoverDate: '2024-02-05' },
      { code: 'AS-002', type: 'لابتوب', brand: 'Lenovo', model: 'ThinkPad E14', serial: 'SN-0002', cpu: 'i5', ram: '8GB', storage: '256GB SSD', screen: '14"', purchaseDate: '2023-09-01', price: 3600, warrantyEnd: shift(-30), condition: 'محتاج صيانة', place: 'في المخزن' },
    ],
    assetHistory: [],
    payrolls: [],
    lists: { ...JSON.parse(JSON.stringify(DEFAULT_LISTS)), saudizationCompanies: [...DEFAULT_LISTS.saudizationCompaniesSample] },
    settings: { egpToSar: 0.077, showSensitive: true },
  };
}
