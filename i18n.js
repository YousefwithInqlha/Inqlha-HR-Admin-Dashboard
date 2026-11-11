/* =====================================================================
   Arabic / English switch.
   The app is written in Arabic; in English mode every text node and
   label attribute is translated on the fly (MutationObserver), so all
   screens, drawers, menus and toasts switch without touching the data.
   Stored values (e.g. "السعودية") stay Arabic; only their display changes.
   ===================================================================== */
const LANG = localStorage.getItem('inqlha-lang') === 'en' ? 'en' : 'ar';
document.documentElement.lang = LANG;
document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl';
const nameOf = e => (e && ((LANG === 'en' && e.nameEn) || e.nameAr)) || '';

const EN = {
  /* navigation & pages */
  'الرئيسية': 'Home', 'الإدارة': 'Management', 'الموظفين': 'Employees', 'الإيجارات': 'Rentals', 'الفواتير': 'Bills', 'العهد': 'Assets', 'التنبيهات': 'Alerts', 'الإعدادات': 'Settings',
  'لوحة التحكم': 'Dashboard', 'لوحة الإدارة': 'Admin Panel', 'القائمة الرئيسية': 'Main menu', 'القائمة': 'Menu', 'المدير': 'Admin', 'مدير النظام': 'System admin', 'م': 'A', 'إنقلها': 'INQLHA',
  'الإعدادات والقوائم': 'Settings & lists',
  'بيانات الموظفين والرواتب والسلف': 'Employee records, salaries and advances',
  'السيارات والسكن والمكاتب ودفعاتها': 'Cars, housing, offices and their payments',
  'الخدمات الشهرية: نت، كهرباء، مية، موبايلات': 'Monthly services: internet, electricity, water, mobiles',
  'أجهزة الشركة ومع مين': 'Company devices and who has them',
  'كل حاجة قرب ميعادها أو عدّى': 'Everything that is due soon or overdue',
  'القوائم المنسدلة وإدارة البيانات': 'Dropdown lists and data management',
  'القوائم المنسدلة اللي بتظهر في الفورمز، وإدارة البيانات': 'Dropdown lists used in forms, and data management',
  'سجل الرواتب': 'Payroll history', 'السلف': 'Advances', 'السيارات': 'Cars', 'السكن والمكاتب': 'Housing & offices', 'دفعات الإيجار': 'Rent payments', 'سجل الدفعات': 'Payment log', 'الأجهزة': 'Devices', 'سجل التسليم': 'Handover log',
  'بيانات الموظفين': 'Employee records', 'سجل دفعات الإيجار': 'Rent payment log', 'سجل الفواتير': 'Bill payments', 'عهد الشركة': 'Company assets', 'سجل تسليم العهد': 'Asset handover log',
  /* top bar */
  'ابحث عن موظف، سيارة، فاتورة، جهاز...': 'Search employees, cars, bills, devices...', 'ابحث عن موظف، سيارة، فاتورة، جهاز': 'Search employees, cars, bills, devices',
  'إظهار الرواتب والبيانات الحساسة': 'Show salaries and sensitive data', 'إظهار/إخفاء الرواتب والبيانات الحساسة': 'Show/hide salaries and sensitive data',
  'الرواتب والبيانات الحساسة ظاهرة': 'Salaries and sensitive data are visible', 'الرواتب والبيانات الحساسة مخفية': 'Salaries and sensitive data are hidden',
  'دوّر على موظف، رقم سيارة، فاتورة، جهاز، صفحة...': 'Find an employee, plate number, bill, device, page...',
  'الصفحات': 'Pages', 'إجراءات': 'Actions', 'تنقّل': 'Navigate', 'فتح': 'Open',
  /* common actions */
  'إضافة': 'Add', 'إضافة جديد': 'Add new', 'تعديل': 'Edit', 'حذف': 'Delete', 'حفظ': 'Save', 'إلغاء': 'Cancel', 'إغلاق': 'Close', 'رجوع': 'Back', 'تم': 'Done', 'تراجع': 'Undo', 'خيارات': 'Options',
  'عرض التفاصيل': 'View details', 'حفظ وإضافة جديد': 'Save & add another', 'تصدير Excel': 'Export Excel', 'تصدير كل البيانات': 'Export all data', 'مسح الفلاتر': 'Clear filters',
  'طريقة العرض': 'View', 'كروت': 'Cards', 'جدول': 'Table', 'بحث في': 'Search', 'الكل': 'All', 'اختار...': 'Select...', 'اختار': 'Select', 'كمّل': 'Complete', 'فتح الرابط': 'Open link',
  'اتحفظت التعديلات': 'Changes saved', 'اتحفظ': 'Saved', 'اتضاف': 'Added', 'اتحذف': 'Deleted', 'رجع تاني': 'Restored', 'اتمسحت البيانات': 'Data cleared', 'اتسترجعت النسخة': 'Backup restored', 'رجعت البيانات التجريبية': 'Sample data restored',
  'اتصدّر ملف Excel': 'Excel file exported', 'مفيش نتايج': 'No results', 'جرّب تغيّر البحث أو الفلاتر': 'Try changing the search or filters', 'لا توجد بيانات': 'No data', 'غير محدد': 'Not set',
  /* home */
  'صباح الخير': 'Good morning', 'مساء الخير': 'Good evening', 'ده ملخص الموظفين النهارده': "Here's today's employee summary", 'ده ملخص الشركة النهارده': "Here's today's company summary",
  'محتاج انتباهك': 'Needs your attention', 'كله تمام': 'All good', 'مفيش حاجة قربت ميعادها': 'Nothing is due soon',
  'إصدار ملف الرواتب': 'Generate payroll files', 'ملفات الرواتب': 'Payroll files',
  'يوم باقي على ملفات الرواتب': 'days left until payroll files', 'يوم واحد باقي على ملفات الرواتب': 'day left until payroll files', 'النهارده ميعاد ملفات الرواتب': 'Payroll files are due today', 'يوم تأخير على ملفات الرواتب': 'days overdue for payroll files',
  'الوقت لحد ميعاد الرواتب': 'Time until payroll is due', 'بيانات الرواتب كاملة لكل الموظفين': 'Payroll data is complete for all employees',
  'الموظفين على رأس العمل': 'Active employees', 'موظفين السعودة': 'Saudization employees', 'انضموا الشهر ده': 'Joined this month', 'محدش ساب الشهر ده': 'No one left this month', 'فترة التجربة بتخلص': 'Probation ending',
  'مستندات الموظفين اللي قربت تخلص': 'Employee documents expiring soon', 'كل المستندات سارية': 'All documents are valid', 'إقامات وجوازات وعقود وتأمين': 'Iqamas, passports, contracts and insurance',
  'بيانات ناقصة قبل الرواتب': 'Missing data before payroll', 'كل البيانات كاملة': 'All data is complete', 'IBAN وأرقام الهوية وطرق الصرف موجودة': 'IBANs, IDs and payment methods are present',
  'سلف بتتخصم الشهر ده': 'Advances deducted this month', 'مفيش سلف مفتوحة': 'No open advances', 'أعياد ميلاد الشهر': "This month's birthdays", 'مفيش أعياد ميلاد الشهر ده': 'No birthdays this month', 'ضيف تاريخ الميلاد في بيانات الموظف': 'Add birth dates to employee records',
  'الموظفين حسب مكان الدوام': 'Employees by work location', 'مفيش دفعات قريبة': 'No upcoming payments', 'التكلفة الشهرية': 'Monthly cost', 'تقسيم التكلفة': 'Cost breakdown',
  'الرواتب': 'Salaries', 'رسوم السعودة': 'Saudization fees', 'سكن ومكتب': 'housing & offices', 'فاتورة': 'Bill', 'جهاز': 'Device', 'سيارة': 'Car', 'مع موظفين': 'with employees', 'سلفة مفتوحة': 'open advance',
  'محدش': 'No one', 'كل المواعيد تمام': 'All dates are fine', 'مفيش تنبيهات': 'No alerts', 'المواعيد اللي قربت أو عدّت': 'Dates that are near or past',
  'متأخر أو منتهي': 'Overdue or expired', 'خلال أسبوع': 'Within a week', 'خلال الشهر': 'Within the month',
  /* entities (single) */
  'موظف': 'Employee', 'سلفة': 'advance', 'سكن / مكتب': 'housing / office', 'دفعة': 'payment', 'دفعة فاتورة': 'bill payment', 'عهدة': 'asset', 'حركة': 'movement',
  /* field labels */
  'صورة الموظف': 'Employee photo', 'كود الموظف': 'Employee code', 'الاسم بالعربي': 'Name (Arabic)', 'الاسم بالإنجليزي': 'Name (English)', 'الجنسية': 'Nationality', 'تاريخ الميلاد': 'Date of birth', 'الحالة الاجتماعية': 'Marital status', 'عدد التابعين': 'Dependents',
  'رقم الهوية / الإقامة': 'ID / Iqama number', 'تاريخ انتهاء الإقامة': 'Iqama expiry', 'رقم الجواز': 'Passport number', 'تاريخ انتهاء الجواز': 'Passport expiry', 'الموبايل': 'Mobile', 'الإيميل الرسمي للشركة': 'Company email', 'الإيميل الشخصي': 'Personal email',
  'اسم للطوارئ': 'Emergency contact', 'صلة القرابة': 'Relationship', 'رقم الطوارئ': 'Emergency phone', 'المسمى الوظيفي': 'Job title', 'القسم': 'Department', 'المدير المباشر': 'Direct manager', 'تاريخ الانضمام للشركة': 'Join date',
  'مدة العقد (سنين)': 'Contract length (years)', 'تاريخ نهاية العقد': 'Contract end date', 'نهاية فترة التجربة': 'Probation end', 'مدة الخدمة (سنين)': 'Years of service', 'حالة الموظف': 'Employee status', 'آخر يوم عمل': 'Last working day',
  'نوع التوظيف': 'Employment type', 'الدولة': 'Country', 'مكان الدوام': 'Work location', 'مدينة الموظف': 'Employee city', 'شركة السعودة': 'Saudization company', 'رسوم شركة السعودة الشهرية': 'Monthly Saudization fee',
  'مسجل في التأمينات (GOSI)؟': 'Registered in GOSI?', 'مسجل في التأمينات': 'Registered in GOSI', 'مبلغ اشتراك التأمينات': 'GOSI contribution', 'فئة التأمين الطبي': 'Medical insurance class', 'انتهاء التأمين الطبي': 'Medical insurance expiry',
  'عملة الراتب': 'Salary currency', 'الأساسي': 'Basic', 'بدل سكن': 'Housing allowance', 'بدل تنقلات': 'Transport allowance', 'بدل غلاء معيشة (COLA)': 'Cost of living allowance (COLA)', 'بدل غلاء معيشة': 'Cost of living allowance', 'بدل اتصالات': 'Telecom allowance', 'بدلات أخرى': 'Other allowances',
  'إجمالي الراتب': 'Total salary', 'طريقة صرف الراتب': 'Salary payment method', 'IBAN الراتب': 'Salary IBAN', 'البنك': 'Bank', 'كود البنك (مدد)': 'Bank code (Mudad)',
  'المتبقي من السلف': 'Remaining advances', 'خصم السلفة الشهري': 'Monthly advance deduction', 'صافي الراتب': 'Net salary', 'مكافأة نهاية الخدمة (تقديري)': 'End of service (estimate)',
  'رقم رخصة القيادة': 'Driving licence no.', 'انتهاء رخصة القيادة': 'Driving licence expiry', 'راكب سيارة؟': 'Has a car?', 'لابتوب عهدة؟': 'Company laptop?',
  'رقم السلفة': 'Advance no.', 'الموظف': 'Employee', 'نوع السلفة': 'Advance type', 'تاريخ السلفة': 'Advance date', 'مبلغ السلفة': 'Advance amount', 'عدد شهور التقسيط': 'Installment months', 'الخصم الشهري': 'Monthly deduction', 'المدفوع لحد دلوقتي': 'Paid so far', 'المتبقي': 'Remaining', 'ملاحظات': 'Notes',
  'رقم العقد': 'Contract no.', 'نوع السيارة': 'Car type', 'رقم السيارة': 'Plate number', 'المدينة': 'City', 'الماركة': 'Brand', 'الموديل': 'Model', 'اللون': 'Color', 'مين اللي راكبها': 'Driven by',
  'مكتب الإيجار': 'Rental office', 'IBAN مكتب الإيجار': 'Rental office IBAN', 'الإيجار الشهري': 'Monthly rent', 'مدة الدفع': 'Payment period', 'المبلغ في الفترة': 'Amount per period', 'ميعاد الدفعة الجاية': 'Next payment date',
  'بداية الإيجار': 'Rent start', 'نهاية العقد': 'Contract end', 'حالة العقد': 'Contract status', 'انتهاء الرخصة (الاستمارة)': 'Registration expiry', 'انتهاء التأمين': 'Insurance expiry', 'رابط صورة العقد': 'Contract copy link',
  'النوع': 'Type', 'العنوان بالتفصيل': 'Full address', 'الساكنين': 'Residents', 'اسم المؤجر': 'Landlord name', 'IBAN المؤجر': 'Landlord IBAN', 'المبلغ اللي بيتدفع في الفترة': 'Amount paid per period', 'بداية العقد': 'Contract start',
  'رقم الدفعة': 'Payment no.', 'العقد': 'Contract', 'تاريخ الدفع': 'Payment date', 'المبلغ': 'Amount', 'الفترة من': 'Period from', 'الفترة إلى': 'Period to', 'طريقة الدفع': 'Payment method',
  'كود الفاتورة': 'Bill code', 'نوع الخدمة': 'Service type', 'خاصة بإيه': 'For', 'مربوطة بعقد إيجار': 'Linked rental contract', 'الشركة المقدمة للخدمة': 'Provider', 'رقم الحساب / الاشتراك': 'Account / subscription no.', 'رقم المفوتر (سداد)': 'SADAD biller no.',
  'دورية الفاتورة': 'Billing cycle', 'ميعاد الدفع (يوم في الشهر)': 'Due day (of month)', 'نوع المبلغ': 'Amount type', 'آخر مبلغ': 'Last amount', 'متوسط آخر 3 شهور': '3-month average', 'المسؤول عن الدفع': 'Responsible', 'حالة الشهر ده': "This month's status", 'ميعاد الدفع الجاي': 'Next due date',
  'الفاتورة': 'Bill', 'عن شهر': 'For month',
  'كود العهدة': 'Asset code', 'نوع العهدة': 'Asset type', 'الرقم التسلسلي': 'Serial number', 'المعالج': 'Processor', 'الرام': 'RAM', 'الهارد': 'Storage', 'حجم الشاشة': 'Screen size', 'تاريخ الشراء': 'Purchase date', 'السعر': 'Price',
  'انتهاء الضمان': 'Warranty end', 'حالة الجهاز': 'Condition', 'مكانه': 'Location', 'مع أي موظف': 'Assigned to', 'تاريخ التسليم': 'Handover date', 'رابط نموذج الاستلام الموقّع': 'Signed handover form link',
  'رقم الحركة': 'Movement no.', 'كانت مع': 'Was with', 'اتسلمت لـ': 'Handed to', 'التاريخ': 'Date', 'الجهاز': 'Device', 'السيارة': 'Car', 'العقار': 'Property', 'المواصفات': 'Specs', 'الفترة': 'Period', 'نسبة السداد': 'Repaid',
  /* sections */
  'التأمينات (GOSI)': 'Social insurance (GOSI)', 'التأمين الطبي': 'Medical insurance', 'شركة التأمين الطبي': 'Medical insurer', 'رقم البوليصة': 'Policy no.', 'رقم كارت العضوية': 'Member card no.', 'تاريخ بداية البوليصة': 'Policy start date', 'نهاية البوليصة': 'Policy end date', 'عدد التابعين المؤمن عليهم': 'Insured dependents', 'تكلفة البوليصة السنوية': 'Annual policy cost', 'شركات التأمين الطبي': 'Medical insurers',
  'البيانات الشخصية': 'Personal details', 'الوظيفة والعقد': 'Job & contract', 'التوظيف ومكان الدوام': 'Employment & location', 'التأمينات والتأمين الطبي': 'GOSI & medical insurance', 'الراتب': 'Salary', 'السلف ونهاية الخدمة': 'Advances & end of service',
  'السواقين': 'Drivers', 'مسحوب من الشيتات التانية': 'From other sheets', 'بيانات السيارة': 'Car details', 'الإيجار والدفع': 'Rent & payment', 'العقد والمستندات': 'Contract & documents', 'البيانات الأساسية': 'Basic details',
  'المؤجر والدفع': 'Landlord & payment', 'بيانات الدفعة': 'Payment details', 'بيانات الفاتورة': 'Bill details', 'الدفع': 'Payment', 'بيانات الجهاز': 'Device details', 'الشراء والحالة': 'Purchase & condition', 'التسليم': 'Handover', 'بيانات السلفة': 'Advance details', 'الحركة': 'Movement',
  /* helps */
  'بيتحسب أوتوماتيك': 'Calculated automatically', 'بيتحسب لوحده': 'Calculated automatically', 'بيُستخدم في حساب راتب آخر شهر': "Used to calculate the final month's salary", 'بتظهر كعنوان في ملف مدد': 'Shown as the address in the Mudad file',
  'حسب نظام العمل السعودي على إجمالي الراتب': 'Per Saudi labor law, on total salary', 'من صفحة السلف': 'From the advances page', 'مدد = بيترفع في ملف البنك': 'Mudad = included in the bank file',
  'مثال: مكتب الرياض': 'e.g. Riyadh office', 'بيتحدث لوحده لما تسجل دفعة': 'Updates automatically when you log a payment', 'أسماء أو أكواد الموظفين': 'Employee names or codes', 'مثال: 16GB': 'e.g. 16GB',
  'الخانات اللي عليها': 'Fields marked', 'مطلوبة، والباقي تقدر تكمله بعدين': 'are required; you can complete the rest later',
  'كل الخانات المطلوبة متعبية': 'All required fields are filled', 'رفع صورة': 'Upload photo', 'تغيير الصورة': 'Change photo', 'إزالة': 'Remove', 'JPG أو PNG · بتتصغر لوحدها': 'JPG or PNG · resized automatically',
  /* validation */
  'الخانة دي مطلوبة': 'This field is required', 'الكود ده مستخدم قبل كده': 'This code is already used', 'الرقم لازم يكون موجب': 'Must be a positive number',
  '10 أرقام للهوية/الإقامة السعودية، أو 14 رقم للرقم القومي المصري': '10 digits for a Saudi ID/Iqama, or 14 digits for an Egyptian national ID',
  'IBAN سعودي: SA و22 رقم': 'Saudi IBAN: SA + 22 digits', 'مصري: EG و27 رقم': 'Egyptian: EG + 27 digits', 'الإيميل مكتوب غلط': 'Invalid email', 'اكتب يوم من 1 لـ 31': 'Enter a day from 1 to 31',
  'أقل حاجة شهر واحد': 'At least one month', 'المدفوع أكبر من مبلغ السلفة': 'Paid is more than the advance amount', 'اختار الموظف اللي معاه الجهاز': 'Select the employee who has the device', 'نهاية العقد قبل بدايته': 'Contract ends before it starts', 'نهاية الفترة قبل بدايتها': 'Period ends before it starts',
  'فيه تعديلات مش محفوظة. تقفل من غير حفظ؟': 'You have unsaved changes. Close without saving?', 'اختار ملف صورة': 'Choose an image file', 'مقدرتش أقرا الصورة دي': "Couldn't read this image",
  /* values: lists & statics */
  'الرياض': 'Riyadh', 'جدة': 'Jeddah', 'الدمام': 'Dammam', 'مكة': 'Makkah', 'المدينة المنورة': 'Madinah', 'الخبر': 'Khobar', 'القاهرة': 'Cairo', 'الإسكندرية': 'Alexandria',
  'مكتب الرياض': 'Riyadh office', 'مكتب جدة': 'Jeddah office', 'مكتب القاهرة': 'Cairo office', 'لا يداوم': 'Remote / not in office',
  'الموارد البشرية': 'HR', 'المالية': 'Finance', 'العمليات': 'Operations', 'المبيعات': 'Sales', 'التقنية': 'Technology', 'النقل': 'Transport',
  'مصرف الراجحي': 'Al Rajhi Bank', 'البنك الأهلي السعودي': 'Saudi National Bank', 'بنك الرياض': 'Riyad Bank', 'مصرف الإنماء': 'Alinma Bank', 'بنك البلاد': 'Bank Albilad', 'البنك السعودي الأول': 'SAB', 'البنك السعودي الفرنسي': 'Banque Saudi Fransi', 'البنك العربي الوطني': 'Arab National Bank', 'بنك الجزيرة': 'Bank AlJazira', 'البنك السعودي للاستثمار': 'Saudi Investment Bank', 'البنك الأهلي المصري': 'National Bank of Egypt', 'بنك مصر': 'Banque Misr', 'البنك التجاري الدولي': 'CIB',
  'شركة سعودة (أ)': 'Saudization Co. (A)', 'شركة سعودة (ب)': 'Saudization Co. (B)', 'شركة سعودة': 'Saudization company',
  'نت': 'Internet', 'كهرباء': 'Electricity', 'مية': 'Water', 'موبايل': 'Mobile', 'خط أرضي': 'Landline', 'أخرى': 'Other',
  'موبايلي': 'Mobily', 'زين': 'Zain', 'الشركة السعودية للكهرباء': 'Saudi Electricity Co.', 'شركة المياه الوطنية': 'National Water Co.',
  'سعودي': 'Saudi', 'مصري': 'Egyptian', 'أعزب': 'Single', 'متزوج': 'Married', 'مطلق': 'Divorced', 'أرمل': 'Widowed',
  'دوام كامل': 'Full time', 'سعودة': 'Saudization', 'سواق': 'Driver', 'السعودية': 'Saudi Arabia', 'مصر': 'Egypt',
  'على رأس العمل': 'Active', 'إجازة طويلة': 'Long leave', 'مستقيل': 'Resigned', 'منتهي عقده': 'Contract ended',
  'ريال': 'SAR', 'جنيه': 'EGP', 'مدد': 'Mudad', 'تحويل': 'Transfer', 'سلفة نقدية': 'Cash loan', 'سلفة سكن': 'Housing loan', 'نعم': 'Yes', 'لا': 'No',
  'ملاكي': 'Private', 'ساطحة': 'Tow truck', 'ساري': 'Active', 'متجدد': 'Renewed', 'منتهي': 'Expired', 'شهري': 'Monthly', 'كل 3 شهور': 'Every 3 months', 'كل 6 شهور': 'Every 6 months', 'سنوي': 'Yearly',
  'سكن': 'Housing', 'مكتب': 'Office', 'كاش': 'Cash', 'شيك': 'Cheque', 'سداد': 'SADAD', 'خصم تلقائي': 'Direct debit', 'ثابت': 'Fixed', 'متغير': 'Variable',
  'لابتوب': 'Laptop', 'شاشة': 'Monitor', 'شريحة': 'SIM card', 'تابلت': 'Tablet', 'جديد': 'New', 'كويس': 'Good', 'محتاج صيانة': 'Needs repair', 'عطلان': 'Broken',
  'مع موظف': 'With employee', 'في المخزن': 'In storage', 'في الصيانة': 'In repair', 'مدفوعة': 'Paid', 'مش مدفوعة': 'Unpaid',
  'المدن': 'Cities', 'أماكن الدوام': 'Work locations', 'الأقسام': 'Departments', 'البنوك': 'Banks', 'شركات السعودة': 'Saudization companies', 'أنواع الخدمات (الفواتير)': 'Service types (bills)', 'مقدمي الخدمات': 'Service providers', 'الجنسيات': 'Nationalities',
  'السعودة': 'Saudization', '10 أو 14 رقم': '10 or 14 digits',
  'موظف ولا سواق؟': 'Employee or driver?', 'السيارة اللي بيسوقها': 'Car driven', 'من صفحة السيارات': 'From the cars page', 'لو العربية مع حد تاني هتتنقل للسواق ده': 'if the car is with someone else it moves to this driver', 'فاضية': 'Unassigned', 'العربية': 'Car', 'اتسلمت للسواق': 'assigned to the driver',
  'لسه مفيش موظفين': 'No employees yet', 'ابدأ بإضافة أول موظف': 'Start by adding the first employee',
  'المفوتر': 'Biller', 'استيراد من Google Form': 'Import from Google Form', 'الموظفين اللي ملوا فورم البيانات': 'Employees who filled in the details form', 'نزّل الردود من Google': 'Download the responses from Google',
  'افتح': 'Open', 'شيت الردود': 'the responses sheet', 'بتاع الفورم': 'of the form', 'اختار الملف هنا': 'Choose the file here', 'اختار ملف الردود': 'Choose the responses file', 'Excel (.xlsx) أو CSV': 'Excel (.xlsx) or CSV', 'ملف تاني': 'Another file', 'موجود قبل كده': 'Already in the system',
  'الاسم بالعربي ناقص': 'Arabic name missing', 'رقم الهوية مش مظبوط': 'ID number looks wrong', 'الـ IBAN مش مظبوط': 'IBAN looks wrong', 'كل موظف هياخد كود لوحده.': 'Each employee gets their own code.', 'بعد الاستيراد كمّل بياناته': 'After importing, complete their details',
  'الملف ده مش شبه ردود فورم الموظفين. اتأكد إنك نزّلت شيت الردود.': 'This file does not look like the employee form responses. Make sure you downloaded the responses sheet.', 'الملف مفيهوش ردود لسه.': 'The file has no responses yet.', 'مقدرتش أقرا الملف. نزّله تاني كـ Excel (.xlsx) وجرّب.': 'Could not read the file. Download it again as Excel (.xlsx) and try.', 'تسجيل الدخول': 'Sign in', 'لوحة إدارة إنقلها': 'INQLHA admin panel', 'الإيميل': 'Email', 'كلمة السر': 'Password', 'دخول': 'Sign in', 'نسيت كلمة السر؟': 'Forgot password?', 'خروج': 'Sign out', 'تخرج من السيستم؟': 'Sign out of the system?',
  'كلمة سر جديدة': 'New password', 'اختار كلمة سر قوية، 10 حروف على الأقل.': 'Choose a strong password, at least 10 characters.', 'كلمة السر الجديدة': 'New password', 'اكتبها تاني': 'Type it again', 'حفظ كلمة السر': 'Save password',
  'كلمة السر لازم تكون 10 حروف على الأقل': 'The password must be at least 10 characters', 'الكلمتين مش زي بعض': 'The two passwords do not match', 'الإيميل أو كلمة السر غلط': 'Wrong email or password', 'اكتب إيميلك الأول': 'Type your email first', 'لو الإيميل متسجل، هيوصلك لينك تغيير كلمة السر.': 'If the email is registered, a reset link is on its way.',
  'محاولات كتير. استنى دقيقة وجرّب تاني': 'Too many attempts. Wait a minute and try again', 'اختار كلمة سر مختلفة عن القديمة': 'Choose a password different from the old one', 'كلمة السر ضعيفة. اختار كلمة أطول': 'Weak password. Choose a longer one', 'مش قادر يوصل للسيرفر. اتأكد من النت': 'Cannot reach the server. Check your connection',
  'مش قادر يوصل للسيرفر': 'Cannot reach the server', 'اتأكد إن النت شغال وجرّب تاني.': 'Check your internet connection and try again.', 'جرّب تاني': 'Try again', 'مكتبة Supabase متحملتش': 'The Supabase library did not load', 'بيفتح...': 'Opening...', 'بيحمّل البيانات...': 'Loading data...', 'بيحمّل...': 'Loading...',
  'الحساب ده مش مسموحله': 'This account is not allowed', 'مش متسجل كـ admin في السيستم.': 'is not registered as an admin.', 'اتحفظ': 'Saved', 'بيتحفظ...': 'Saving...', 'مش متحفظ · بيحاول تاني': 'Not saved · retrying', 'اتحدثت البيانات من جهاز تاني': 'Data updated from another device', 'اتنقلت البيانات للسيرفر': 'Data moved to the server',
  'النسخ المحفوظة على السيرفر': 'Saved versions on the server', 'آخر 20 حفظ': 'Last 20 saves', 'رجّع دي': 'Restore this', 'رجعت النسخة': 'Version restored', 'لسه مفيش نسخ قديمة. كل حفظ بيعمل نسخة هنا.': 'No older versions yet. Every save keeps one here.', 'انقل بيانات المتصفح للسيرفر': 'Move this browser\'s data to the server',
  'البيانات متخزنة على السيرفر، وكل حفظ بيتعمله نسخة في السجل.': 'Data is stored on the server, and every save is kept in the history.', 'مرة واحدة': 'One-time', 'فاتورة مرة واحدة': 'One-time bill', 'تاريخ الاستحقاق': 'Due date', 'اعمل طلب دفع': 'Create payment request',
  'اختار "مرة واحدة" لفاتورة بتتدفع مرة وخلاص': 'Pick "One-time" for a bill paid just once', 'بيتحدث لوحده لما تسجل دفعة · في الفاتورة اللي مرة واحدة ده مبلغها': 'Updates itself when you record a payment · for a one-time bill this is its amount',
  'طلب دفع': 'Payment request', 'طلب دفع جديد': 'New payment request', 'طلبات الدفع': 'Payment requests', 'رقم السداد': 'SADAD payment no.', 'رقم المفوتر (سداد)': 'SADAD biller no.', 'رقم المفوتر': 'Biller no.', 'بيانات السداد': 'SADAD details',
  'الرقم اللي المحاسب بيدخله في سداد عشان يدفع (رقم الحساب أو الاشتراك عند الشركة)': 'The number the accountant enters in SADAD to pay (account / subscription no. with the provider)', 'رقم الشركة نفسها في سداد': 'The provider\'s own number in SADAD',
  'الخدمات الشهرية، وطلبات الدفع اللي بتتبعت للمحاسب': 'Monthly services, and payment requests sent to the accountant', 'لسه مفيش طلبات دفع': 'No payment requests yet', 'اختار الفواتير والإيجارات اللي ميعادها قرب، واعمل منها طلب واحد تبعته للمحاسب': 'Pick the bills and rents that are due soon and turn them into one request for the accountant',
  'علّم على اللي عايز تدفعه، وكل واحدة هتبقى بند في الطلب': 'Tick what you want paid; each one becomes a line in the request', 'اعرض اللي ميعاده خلال': 'Show what is due within', 'اختار الكل': 'Select all', 'متأخرة': 'Overdue', 'خلال 7 أيام': 'Within 7 days', 'بعد كده': 'Later',
  'ملاحظة للمحاسب (اختياري)': 'Note to the accountant (optional)', 'مثال: محتاجين ندفعهم قبل يوم 25': 'e.g. needs to be paid before the 25th', 'اعمل الطلب': 'Create request', 'بند': 'items', 'البنود': 'Items', 'الطلب': 'Request', 'اتبعت': 'Sent', 'الإجمالي': 'Total',
  'مسودة': 'Draft', 'اتبعت للمحاسب': 'Sent to accountant', 'اتدفع جزء': 'Partly paid', 'اتدفع': 'Paid', 'ملغي': 'Cancelled', 'فاضل': 'Remaining', 'إجمالي الطلب': 'Request total', 'ابعت للمحاسب': 'Send to the accountant',
  'واتساب': 'WhatsApp', 'إيميل': 'Email', 'نسخ النص': 'Copy text', 'تلزقه في أي مكان': 'Paste it anywhere', 'للطباعة أو الإرفاق': 'To print or attach', 'بكل أرقام السداد': 'With all payment numbers', 'ضيف رقمه من الإعدادات': 'Add their number in Settings', 'ضيف إيميله من الإعدادات': 'Add their email in Settings',
  'تسجيل اللي اتعلّم عليه كمدفوع': 'Mark ticked lines as paid', 'بنود تانية': 'More lines', 'إلغاء الطلب': 'Cancel request', 'إلغاء تسجيل الدفع': 'Undo payment', 'حذف الطلب': 'Delete request', 'تم': 'Done', 'تاريخ الدفع': 'Payment date',
  'سداد': 'SADAD', 'تحويل': 'Transfer', 'الجهة': 'Payee', 'الاستحقاق': 'Due', 'ملاحظة': 'Note', 'طلبه': 'Requested by', 'اعتمده': 'Approved by', 'المحاسب': 'Accountant', 'البند': 'Item', 'طريقة الدفع': 'Payment method', 'المبلغ (ر.س)': 'Amount (SAR)', 'الحالة': 'Status', 'مستني الدفع': 'Awaiting payment', 'التاريخ': 'Date',
  'ناقص رقم السداد': 'Payment no. missing', 'ناقص الـ IBAN': 'IBAN missing', 'طريقة الدفع': 'Payment method', 'طلبات الدفع بتتبعتله على الواتساب أو الإيميل ده': 'Payment requests are sent to this WhatsApp or email', 'الاسم': 'Name', 'رقم الواتساب: 05xxxxxxxx': 'WhatsApp: 05xxxxxxxx', 'الإيميل': 'Email', 'اتحفظت بيانات المحاسب': 'Accountant details saved',
  'اتنسخ نص الطلب': 'Request text copied', 'اتسجل الدفع': 'Payment recorded', 'اتلغى الطلب': 'Request cancelled', 'اتلغى تسجيل الدفع': 'Payment undone', 'اتحذف الطلب': 'Request deleted', 'اتضاف البند': 'Line added',
  'ر.س': 'SAR', 'ج.م': 'EGP', 'رام': 'RAM', 'إيجار': 'Rent',
  'نوع الفاتورة': 'Bill type', 'الفاتورة دي بتتدفع': 'This bill is paid', 'كل 6 شهور': 'Every 6 months', 'تاريخ الاستحقاق': 'Due date', 'في الفاتورة المتكررة ده أول ميعاد، والمواعيد اللي بعده بتتحسب لوحدها': 'For a recurring bill this is the first due date; the next ones are calculated', 'المبلغ ثابت ولا بيتغير؟': 'Fixed or variable amount?', 'بيانات الدفع': 'Payment details', 'هتتدفع إزاي؟': 'How is it paid?', 'تحويل بنكي': 'Bank transfer', 'رقم المفوتر': 'Biller no.', 'اسم المستفيد': 'Beneficiary name', 'زي ما هو مكتوب في شهادة الآيبان': 'As written on the IBAN certificate', 'رقم الآيبان (IBAN)': 'IBAN', 'شهادة الآيبان': 'IBAN certificate', 'المتابعة': 'Tracking', 'المرفقات': 'Attachments', 'الفواتير': 'Invoices', 'متأخرة': 'Overdue', 'لسه مجاش ميعادها': 'Not due yet', 'متوسط آخر 3 دفعات': 'Average of last 3 payments', 'مرفق': 'Attachment', 'الفاتورة': 'Invoice', 'صفحة': 'Page', 'ناقص الفاتورة': 'Invoice missing', 'ناقص شهادة الآيبان': 'IBAN certificate missing', 'ارفع الفاتورة': 'Upload invoice', 'فاتورة تانية': 'Another invoice', 'ارفع فاتورة': 'Upload invoice', 'ارفع ملف': 'Upload file', 'غيّر الملف': 'Replace file', 'مشاركة بالمرفقات': 'Share with attachments', 'تنزيل المرفقات': 'Download attachments', 'مقدرتش أحط الملف ده هنا': 'Could not include this file', 'الملف فيه صفحات أكتر، افتحه من السيستم': 'The file has more pages; open it in the system',
  /* sample data */
  'موظف تجريبي 1': 'Test Employee 1', 'موظف تجريبي 2': 'Test Employee 2', 'سواق تجريبي': 'Test Driver', 'مطور تجريبي': 'Test Developer', 'موظف تجريبي': 'Test Employee',
  'مدير عمليات': 'Operations Manager', 'موظف سعودة': 'Saudization employee', 'سواق ساطحة': 'Tow truck driver', 'مطور برمجيات': 'Software developer',
  'مكتب تأجير تجريبي': 'Sample rental office', 'مؤجر تجريبي 1': 'Sample landlord 1', 'مؤجر تجريبي 2': 'Sample landlord 2', 'حي تجريبي، الرياض': 'Sample district, Riyadh', 'حي تجريبي، جدة': 'Sample district, Jeddah',
  'إيسوزو': 'Isuzu', 'تويوتا': 'Toyota', 'كامري 2024': 'Camry 2024', 'أبيض': 'White', 'رمادي': 'Grey', 'سكن جدة': 'Jeddah housing',
  /* settings */
  'سعر تحويل الجنيه للريال': 'EGP to SAR rate', 'بيُستخدم عشان رواتب مصر تتجمع مع رواتب السعودية في الرئيسية': 'Used to add Egypt salaries to Saudi salaries on the home page',
  'البيانات': 'Data', 'البيانات متخزنة في المتصفح ده بس. خد نسخة احتياطية كل فترة.': 'Data is stored in this browser only. Take a backup regularly.',
  'نسخة احتياطية': 'Backup', 'استرجاع نسخة': 'Restore backup', 'البيانات التجريبية': 'Sample data', 'مسح الكل': 'Clear all', 'إضافة عنصر جديد': 'Add a new item', 'اللغة': 'Language',
  'ده هيمسح بياناتك الحالية ويرجّع البيانات التجريبية. متأكد؟': 'This will erase your current data and restore the sample data. Are you sure?',
  'ده هيمسح كل البيانات (الموظفين والإيجارات والفواتير والعهد). القوائم هتفضل. متأكد؟': 'This will erase all data (employees, rentals, bills and assets). Lists will stay. Are you sure?',
  'الملف ده مش نسخة احتياطية صحيحة': 'This file is not a valid backup',
  'مكتبة Excel محتاجة نت عشان تشتغل. اتأكد إنك متصل وجرّب تاني.': 'The Excel library needs an internet connection. Check your connection and try again.',
  /* detail drawer */
  'إضافة سلفة': 'Add advance', 'تسجيل دفعة': 'Log payment', 'استلام للمخزن': 'Return to storage', 'تسليم لموظف': 'Hand to employee', 'الجهاز رجع المخزن': 'Device returned to storage',
  'السيارات اللي معاه': 'Cars assigned', 'العهد اللي معاه': 'Assets assigned', 'الفواتير المربوطة': 'Linked bills', 'اللابتوب': 'Laptop', 'السواق': 'Driver', 'الدفعة الجاية': 'Next payment', 'الدفع الجاي': 'Next due',
  'مفيش سيارة': 'No car', 'مفيش لابتوب': 'No laptop', 'عليه سلفة': 'Has an advance', 'السجل ده بيتملى لوحده لما العهدة تتنقل من موظف لموظف': 'This log fills automatically when an asset moves between employees',
  /* payroll */
  'الفئة والشهر': 'Category & month', 'مراجعة الرواتب': 'Review salaries', 'التأكيد والملفات': 'Confirm & files', 'اختار الفئة والشهر، راجع، وأكّد': 'Pick the category and month, review, and confirm',
  'اختار الفئة': 'Choose the category', 'الشهر وتاريخ الصرف': 'Month & payment date', 'شهر الرواتب': 'Payroll month', 'تاريخ الصرف': 'Payment date',
  'موظفين المكتب': 'Office employees', 'موظفين مصر': 'Egypt employees', 'موظفين السعودية غير السعودة': 'Saudi employees (non-Saudization)', 'رواتب بالجنيه · تحويل بنكي': 'Salaries in EGP · bank transfer', 'موظفين شركات السعودة': 'Saudization company employees',
  'ملف مدد': 'Mudad file', 'مفيش موظفين في الفئة دي للشهر ده.': 'No employees in this category for this month.', 'تقدر تفتحها وتنزّل ملفاتها.': 'You can open it and download its files.', 'هتكمل منها.': "You'll continue from it.",
  'فتح الرواتب المؤكدة': 'Open confirmed payroll', 'الموظفين': 'Employees', 'إجمالي المستحقات': 'Total earnings', 'إجمالي الخصومات': 'Total deductions', 'عليهم خصم': 'With deductions', 'صافي الرواتب': 'Net payroll',
  'الإضافي والخصومات والسبب بيتعدلوا من الجدول. خصم الحضور بيتحسب لوحده لو الموظف بدأ أو ساب في نص الشهر (على أساس 30 يوم).': 'Overtime, deductions and reasons are editable in the table. Attendance deduction is calculated automatically when an employee starts or leaves mid-month (30-day basis).',
  'الإجمالي': 'Total', 'إضافي': 'Overtime', 'خصم حضور': 'Attendance ded.', 'خصم آخر': 'Other ded.', 'سبب الخصم': 'Deduction reason', 'الصافي': 'Net', 'الصرف': 'Payment',
  'مفيش خصم': 'No deduction', 'مثال: غياب يومين': 'e.g. 2 days absence', 'ضمن الرواتب': 'Include in payroll', 'حفظ مسودة': 'Save draft', 'التأكيد': 'Confirm', 'اتحفظت المسودة': 'Draft saved', 'اختار موظف واحد على الأقل': 'Select at least one employee',
  'ترجع للخطوة الأولى؟ التعديلات هتفضل لحد ما تقفل.': 'Go back to step one? Your edits stay until you close.',
  'فيه تعديلات على الرواتب مش محفوظة. تقفل من غير حفظ؟': 'You have unsaved payroll edits. Close without saving?',
  'رواتب مدد': 'Mudad salaries', 'رواتب تحويل': 'Transfer salaries', 'الخصومات': 'Deductions', 'كل البيانات المطلوبة لملف البنك موجودة.': 'All data required for the bank file is present.',
  'الموظفين اللي عليهم خصم': 'Employees with deductions', 'راجعت الرواتب وموافق عليها': 'I reviewed and approve these salaries', 'تأكيد الرواتب': 'Confirm salaries', 'رجوع للمراجعة': 'Back to review', 'اتأكدت الرواتب': 'Salaries confirmed',
  'ملف الملخص (Summary)': 'Summary file', 'بتصميم إنقلها · كل البدلات والخصومات وأسبابها': 'INQLHA design · all allowances, deductions and reasons', 'اختار الصيغة:': 'Choose a format:',
  'موظفين مصر مش بيترفعوا على مدد. استخدم ملف الملخص.': "Egypt employees aren't uploaded to Mudad. Use the summary file.",
  'إلغاء التأكيد': 'Undo confirmation', 'اتلغى التأكيد': 'Confirmation undone', 'إلغاء التأكيد هيرجّع أقساط السلف اللي اتخصمت، والرواتب ترجع مسودة. متأكد؟': 'Undoing will restore the deducted advance installments and set the payroll back to draft. Are you sure?',
  'ناقص IBAN': 'Missing IBAN', 'البنك مش معروف كوده': 'Unknown bank code', 'ناقص رقم الهوية/الإقامة': 'Missing ID/Iqama', 'الصافي بالسالب': 'Negative net',
  'لسه مفيش رواتب متصدرة': 'No payroll generated yet', 'اضغط "إصدار ملف الرواتب" عشان تبدأ أول شهر': 'Click "Generate payroll files" to start the first month',
  'الشهر': 'Month', 'الفئة': 'Category', 'الحالة': 'Status', 'مؤكد': 'Confirmed', 'مسودة': 'Draft', 'مؤكدة': 'Confirmed', 'لسه متعملتش': 'Not started',
  'اتنزل ملف مدد': 'Mudad file downloaded', 'اتنزل ملف مدد CSV': 'Mudad CSV downloaded', 'اتنزل الملخص Excel': 'Summary Excel downloaded', 'اتنزل الملخص CSV': 'Summary CSV downloaded',
  'اختار "Save as PDF" من نافذة الطباعة': 'Choose "Save as PDF" in the print window', 'مقدرتش أفتح الطباعة. جرّب من متصفح تاني.': "Couldn't open printing. Try another browser.",
  'مكتبة Excel محتاجة نت. جرّب CSV أو اتأكد من الاتصال.': 'The Excel library needs internet. Try CSV or check your connection.', 'مكتبة Excel محتاجة نت. جرّب CSV أو PDF.': 'The Excel library needs internet. Try CSV or PDF.',
  'مفيش موظفين بطريقة صرف "مدد" في الشهر ده': 'No employees paid via "Mudad" this month',
  /* months */
  'يناير': 'January', 'فبراير': 'February', 'مارس': 'March', 'أبريل': 'April', 'مايو': 'May', 'يونيو': 'June', 'يوليو': 'July', 'أغسطس': 'August', 'سبتمبر': 'September', 'أكتوبر': 'October', 'نوفمبر': 'November', 'ديسمبر': 'December',
  /* small words used inside sentences */
  'النهارده': 'today', 'بكرة': 'tomorrow', 'بعد يومين': 'in 2 days', 'متأخر': 'Overdue', 'تنبيه': 'alert', 'الدفعة': 'payment', 'شهرياً': 'monthly', 'متبقي': 'remaining', 'قسط': 'Installment',
  'خصم': 'Deduction', 'المتبقي من': 'Remaining of', 'عن': 'for', 'من': 'from', 'مع': 'with', 'و': 'and', 'أو': 'or', 'في': 'in', 'كل': 'every', 'فيه': 'There are', 'يوم': 'days', 'أيام': 'days', 'شهور': 'months',
  'تحميل ملخص': 'Download summary', 'ملخص إيجارات السيارات': 'Car rentals summary', 'ملخص إيجارات السكن والمكاتب': 'Housing & offices rent summary', 'ملخص دفعات الإيجار': 'Rent payments summary',
  'عدد السيارات': 'Cars', 'عدد العقارات': 'Properties', 'عدد الدفعات': 'Payments', 'إجمالي الإيجار الشهري': 'Total monthly rent', 'أقرب دفعة': 'Next payment', 'دفعات السيارات': 'Car payments', 'دفعات السكن والمكاتب': 'Housing & office payments',
  'المعرض / مكتب الإيجار': 'Rental office', 'آخر دفعة': 'Last payment', 'مفيش صورة': 'No photo', 'سنة الصنع': 'Year', 'ارفع صورة': 'Upload photo', 'دوّر تاني': 'Find another', 'صورة العربية نفسها': 'Photo of the actual car', 'صورة عامة للموديل من ويكيبيديا، ممكن لونها يختلف': 'Generic model photo from Wikipedia; color may differ',
  'الشهر ده': 'This month', 'آخر 3 شهور': 'Last 3 months', 'السنة دي': 'This year', 'كل الدفعات': 'All payments', 'من تاريخ لتاريخ': 'Date range', 'تحميل الملخص': 'Download summary', 'اختار الفترة': 'Choose the period', 'متأخرة': 'Overdue',
  'اتدفعت': 'Paid', 'الرواتب مؤكدة': 'Payroll confirmed', 'الميعاد': 'Due', 'سجل': 'Log', 'إضافة سريعة': 'Quick add', '؟': '?', '،': ',',
};

/* sentences with numbers or names inside */
const trDays = s => {
  let m;
  if (s === 'النهارده') return 'today';
  if (s === 'بكرة') return 'tomorrow';
  if (s === 'بعد يومين') return 'in 2 days';
  if ((m = s.match(/^بعد (\d+) (?:أيام|يوم)$/))) return `in ${m[1]} days`;
  return null;
};
const PATTERNS = [
  [/^(ينتهي|مستحق) (.+)$/, (a, b) => { const d = trDays(b); return d && `${a === 'ينتهي' ? 'Expires' : 'Due'} ${d}`; }],
  [/^انتهى من (\d+) (?:أيام|يوم)$/, n => `Expired ${n} days ago`], [/^انتهى من يومين$/, () => 'Expired 2 days ago'], [/^انتهى من يوم$/, () => 'Expired 1 day ago'],
  [/^متأخر (\d+) يوم$/, n => `${n} days overdue`],
  [/^إيجار سيارة (.+)$/, p => `Car rent ${p}`], [/^إيجار (.+)$/, p => `Rent: ${tr(p)}`],
  [/^ضيف (\d+) موظف$/, n => `Add ${n} employees`], [/^(.+) · (\d+) رد$/, (f, n) => `${f} · ${n} responses`], [/^صاحب الحساب "(.+)" مش زي اسم الموظف$/, n => `Account holder "${n}" does not match the employee name`],
  [/^اتضاف (\d+) موظف \((.+)\) · كمّل الراتب والعقد$/, (n, c) => `Added ${n} employees (${c}) · complete salary and contract`],
  [/^طلب دفع (PQ-\d+)$/, c => `Payment request ${c}`], [/^في طلب (PQ-\d+)$/, c => `In request ${c}`], [/^اتعمل طلب الدفع (PQ-\d+)$/, c => `Payment request ${c} created`],
  [/^اتبعت للمحاسب (.+)$/, x => `Sent to the accountant ${tr(x)}`], [/^الاستحقاق (.+)$/, x => `Due ${tr(x)}`], [/^اتدفع (.+)$/, x => `Paid ${tr(x)}`], [/^مفيش دفعات خلال (\d+) يوم$/, n => `No payments due within ${n} days`], [/^(\d+) يوم$/, n => `${n} days`],
  [/^بعد (\d+) (?:أيام|يوم)$/, n => `in ${n} days`],
  [/^(\d+) من (\d+)$/, (a, b) => `${a} of ${b}`],
  [/^(\d+) موظف$/, n => `${n} employee${n === '1' ? '' : 's'}`],
  [/^(\d+) تنبيه$/, n => `${n} alert${n === '1' ? '' : 's'}`],
  [/^(\d+) سجل$/, n => `${n} records`],
  [/^(\d+) حركة \(بتتسجل أوتوماتيك لما العهدة تتنقل\)$/, n => `${n} movements (logged automatically when an asset moves)`],
  [/^فاضل (\d+) خانة مطلوبة$/, n => `${n} required field${n === '1' ? '' : 's'} left`],
  [/^فيه (\d+) (?:أخطاء|خطأ)، صلّحهم الأول$/, n => `${n} error${n === '1' ? '' : 's'}, fix them first`],
  [/^لسه مفيش (.+)$/, x => `No ${tr(x).toLowerCase()} yet`],
  [/^مفيش (.+) لسه$/, x => `No ${tr(x).toLowerCase()} yet`],
  [/^ابدأ بإضافة أول (.+)$/, x => `Start by adding the first ${tr(x)}`],
  [/^مفيش نتايج لـ "(.*)"$/, x => `No results for "${x}"`],
  [/^اتحذف "(.*)"$/, x => `Deleted "${tr(x)}"`],
  [/^اتضاف (.+)$/, x => `${cap(tr(x))} added`],
  [/^(إضافة|تعديل) (.+?)(?:: (.+))?$/, (a, b, c) => `${a === 'إضافة' ? 'Add' : 'Edit'} ${tr(b)}${c ? ': ' + tr(c) : ''}`],
  [/^فتح (.+)$/, x => `Open ${tr(x)}`],
  [/^بحث في (.+)\.\.\.$/, x => `Search ${tr(x).toLowerCase()}...`],
  [/^(.+): الكل$/, x => `${tr(x)}: All`],
  [/^عليه خصم ([\d,.]+) (.+)$/, (n, c) => `Deduction ${n} ${tr(c)}`],
  [/^اشتغل (\d+) يوم$/, n => `Worked ${n} days`],
  [/^قسط (.+)$/, x => `Installment ${x}`], [/^متبقي (.+)$/, x => `Remaining ${x}`], [/^المتبقي (.+)$/, x => `Remaining ${x}`],
  [/^خصم (.+) شهرياً$/, x => `${x} monthly deduction`],
  [/^خلال الـ (\d+) يوم الجايين$/, n => `Within the next ${n} days`],
  [/^دفعات الـ (\d+) يوم الجايين$/, n => `Payments in the next ${n} days`],
  [/^الميعاد يوم (\d+) من كل شهر$/, n => `Due on day ${n} of every month`],
  [/^(\d+) موظف ناقصهم بيانات للرواتب$/, n => `${n} employee${n === '1' ? '' : 's'} missing payroll data`],
  [/^راجعهم قبل يوم (\d+)$/, n => `review before day ${n}`],
  [/^سابوا الشهر ده: (\d+)$/, n => `Left this month: ${n}`],
  [/^(\d+) شركة سعودة$/, n => `${n} Saudization compan${n === '1' ? 'y' : 'ies'}`],
  [/^(\d+) سواق$/, n => `${n} driver${n === '1' ? '' : 's'}`],
  [/^(\d+) (ملاكي|ساطحة|سكن|مكتب|سيارة|فاتورة|جهاز|سكن ومكتب|مع موظفين|في المخزن|سلفة مفتوحة|موظف سعودة)$/, (n, w) => `${n} ${(n !== '1' && PLURAL[w]) || tr(w).toLowerCase()}`],
  [/^(\d+) موظف في (.+)$/, (n, x) => `${n} employees in ${tr(x)}`, true],
  [/^رواتب (.+) اتأكدت قبل كده\.$/, x => `Payroll for ${tr(x)} was already confirmed.`, true],
  [/^فيه مسودة محفوظة لـ (.+)\.$/, x => `There is a saved draft for ${tr(x)}.`, true],
  [/^فيه (\d+) ملاحظة محتاجة مراجعة:$/, n => `${n} note${n === '1' ? '' : 's'} need review:`],
  [/^بعد التأكيد: الرواتب هتتقفل، وأقساط السلف \((.+)\) هتتخصم من المتبقي على الموظفين، وتقدر تنزّل الملفات\.$/, x => `After confirming: payroll is locked, advance installments (${tr(x)}) are deducted from employee balances, and you can download the files.`],
  [/^اللي عليهم خصم بس \((\d+)\)$/, n => `With deductions only (${n})`],
  [/^الكل \((\d+)\)$/, n => `All (${n})`],
  [/^(.+) \((\d+)\)$/, (x, n) => { const t = tr(x); return t !== x ? `${t} (${n})` : null; }],
  [/^سلفة ([\d,.]+) (.+)$/, (n, c) => `Advance ${n} ${tr(c)}`],
  [/^سلفة (.+)$/, x => `Advance: ${tr(x)}`],
  [/^العربية (.+) اتنقلت من (.+)$/, (p, x) => `Car ${p} moved from ${tr(x)}`], [/^العربية (.+) اتسلمت للسواق$/, p => `Car ${p} assigned to the driver`],
  [/^مع (.+)$/, x => `With ${tr(x)}`],
  [/^اتسلمت لـ (.+)$/, x => `Handed to ${tr(x)}`], [/^رجعت المخزن من (.+)$/, x => `Returned to storage from ${tr(x)}`],
  [/^اتدفعت (.+)$/, x => `Paid ${x}`], [/^الصرف: (.+)$/, x => `Payment: ${tr(x)}`], [/^عن (.+)$/, x => `For ${tr(x)}`],
  [/^إيجار (.+)$/, x => `${tr(x)} rent`], [/^سيارة (.+)$/, x => `Car ${x}`],
  [/^نعم: (.+)$/, x => `Yes: ${tr(x)}`],
  [/^الدفعة \((.+)\)$/, x => `Payment (${tr(x)})`],
  [/^ملفات الرواتب$/, () => 'Payroll files'],
  [/^اتسدد (\d+)%$/, n => `${n}% repaid`],
  [/^للرفع على البنك$/, () => 'For bank upload'],
  [/^نفس شكل ملف مدد بالظبط: (.+)$/, x => `Exactly like the Mudad file: ${x}`],
  [/^(.+): (.+) ر\.س$/, (a, b) => `${tr(a)}: ${b} SAR`],
];
const PLURAL = { 'سيارة': 'cars', 'فاتورة': 'bills', 'جهاز': 'devices', 'سلفة مفتوحة': 'open advances', 'موظف سعودة': 'Saudization employees', 'مع موظفين': 'with employees', 'سكن': 'housing', 'مكتب': 'offices' };
/* phrases that appear inside longer sentences (alert tooltips, banners) */
const INLINE = [
  [/(ينتهي|مستحق) (النهارده|بكرة|بعد يومين|بعد (\d+) (?:أيام|يوم))/g, (_, a, b) => `${a === 'ينتهي' ? 'expires' : 'due'} ${trDays(b)}`],
  [/انتهى من (\d+) (?:أيام|يوم)/g, (_, n) => `expired ${n} days ago`], [/انتهى من يومين/g, () => 'expired 2 days ago'], [/انتهى من يوم/g, () => 'expired 1 day ago'],
  [/متأخر (\d+) يوم/g, (_, n) => `${n} days overdue`],
  [/(\d+) رقم/g, (_, n) => `${n} digits`],
];
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const PHRASE_KEYS = Object.keys(EN).filter(k => k.length > 1).sort((a, b) => b.length - a.length);
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PHRASE_RE = new RegExp(`(?<![\\u0600-\\u06FF])(${PHRASE_KEYS.map(escRe).join('|')})(?![\\u0600-\\u06FF])`, 'g');
const AR = /[؀-ۿ]/;

function trCore(t) {
  if (EN[t] !== undefined) return EN[t];
  for (const [re, fn, whole] of PATTERNS) { if (!whole && t.includes(' · ')) continue; const m = t.match(re); if (m) { const r = fn(...m.slice(1)); if (r) return r; } }
  if (t.includes(' · ')) return t.split(' · ').map(x => trCore(x.trim())).join(' · ');
  if (t.includes('\n')) return t.split('\n').map(x => x.trim() ? trCore(x.trim()) : x).join('\n');
  for (const [re, fn] of INLINE) t = t.replace(re, fn);
  return t.replace(PHRASE_RE, k => EN[k]);
}
function tr(s) {
  if (LANG !== 'en' || s == null) return s;
  s = String(s);
  if (!AR.test(s)) return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
  return lead + trCore(s.trim()) + trail;
}

/* ---------- live translation of the DOM ---------- */
const ICON_SWAP = { 'ti-chevron-left': 'ti-chevron-right', 'ti-arrow-left': 'ti-arrow-right', 'ti-arrow-right': 'ti-arrow-left', 'ti-arrow-up-left': 'ti-arrow-up-right', 'ti-arrow-down-right': 'ti-arrow-down-left' };
function translateTree(root) {
  if (LANG !== 'en' || !root) return;
  if (root.nodeType === 3) { if (AR.test(root.nodeValue)) root.nodeValue = tr(root.nodeValue); return; }
  if (root.nodeType !== 1) return;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = root;
  while (n) {
    if (n.nodeType === 3) {
      const p = n.parentNode && n.parentNode.nodeName;
      if (p !== 'SCRIPT' && p !== 'STYLE' && p !== 'TEXTAREA' && AR.test(n.nodeValue)) n.nodeValue = tr(n.nodeValue);
    } else {
      for (const a of ['placeholder', 'title', 'aria-label', 'alt']) { const v = n.getAttribute(a); if (v && AR.test(v)) n.setAttribute(a, tr(v)); }
      if (n.nodeName === 'I' && n.classList.contains('ti') && !n.dataset.swapped) {
        for (const [from, to] of Object.entries(ICON_SWAP)) if (n.classList.contains(from)) { n.classList.replace(from, to); n.dataset.swapped = '1'; break; }
      }
    }
    n = walk.nextNode();
  }
}
if (LANG === 'en') {
  const _confirm = window.confirm.bind(window), _alert = window.alert.bind(window);
  window.confirm = m => _confirm(tr(m));
  window.alert = m => _alert(tr(m));
  new MutationObserver(muts => { for (const m of muts) m.addedNodes.forEach(translateTree); }).observe(document.documentElement, { childList: true, subtree: true });
}
addEventListener('DOMContentLoaded', () => {
  if (LANG === 'en') {
    MONTHS.splice(0, 12, ...['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
    translateTree(document.body); document.title = tr(document.title);
  }
  const b = document.getElementById('lang-btn');
  if (b) {
    b.textContent = LANG === 'en' ? 'ع' : 'EN';
    b.title = LANG === 'en' ? 'التحويل للعربي' : 'Switch to English';
    b.setAttribute('aria-label', b.title);
    b.onclick = () => { localStorage.setItem('inqlha-lang', LANG === 'en' ? 'ar' : 'en'); location.reload(); };
  }
});
