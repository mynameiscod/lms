import axios from 'axios';

/**
 * Employees, daily activity and expenses. Four server areas, one client file:
 *   employeesApi  /api/v1/employees          admin: directory, profile, pay history, logins, lists
 *   activityApi   /api/v1/employee-activity  reviewers and managers: board, review, monthly report
 *   expensesApi   /api/v1/employee-expenses  approvers and accounts: queue, approve, pay, export
 *   portalApi     /api/v1/employee-portal    an employee's own profile, day and expenses
 */
const API = '/api/v1';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;
export const empErr = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

// ── Types ────────────────────────────────────────────────────────────────────

export type EmployeeStatus = 'active' | 'probation' | 'on_notice' | 'on_leave' | 'exited';
export type WorkMode = 'office' | 'remote' | 'hybrid';
export type DayMode = 'office' | 'remote' | 'field' | 'leave' | 'holiday';

export interface Address { line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string }

export interface EmployeeRow {
  _id: string; employeeCode: string; name: string; firstName: string; lastName?: string; workEmail?: string; phone?: string;
  department?: string; designation?: string; employmentType?: string; workMode?: WorkMode; workLocation?: string;
  status: EmployeeStatus; joiningDate?: string; managerName: string; hasLogin: boolean; photoFileId?: string | null;
}

export interface SensitiveFields {
  pan?: string; aadhaar?: string; uan?: string; pfNumber?: string; esiNumber?: string;
  bankAccountHolder?: string; bankName?: string; bankAccountNumber?: string; bankIfsc?: string; bankBranch?: string;
}

export interface RoleHistoryEntry { effectiveFrom: string; type: string; designation?: string; department?: string; grade?: string; note?: string; createdAt?: string }
export interface CompensationEntry { effectiveFrom: string; type: string; ctc: number; previousCtc: number; hikePercent: number; note?: string; createdAt?: string }

export interface Employee {
  _id: string; employeeCode: string; name: string; firstName: string; lastName?: string;
  userId?: string | null; hasLogin: boolean; portalOnly?: boolean;
  workEmail?: string; personalEmail?: string; phone?: string; altPhone?: string;
  dob?: string; gender?: string; maritalStatus?: string; bloodGroup?: string; nationality?: string;
  currentAddress?: Address; permanentAddress?: Address;
  emergencyContacts?: { name: string; relation: string; phone: string }[];
  education?: { degree: string; institution: string; year: string; grade: string }[];
  experience?: { company: string; role: string; from?: string; to?: string; note?: string }[];
  skills?: string[];
  department?: string; designation?: string; grade?: string; employmentType?: string; workMode?: WorkMode; workLocation?: string;
  reportingManagerId?: string | null; joiningDate?: string; probationEndDate?: string; confirmationDate?: string; noticePeriodDays?: number;
  status: EmployeeStatus; exitDate?: string; exitReason?: string;
  roleHistory?: RoleHistoryEntry[];
  // Present only for people allowed to see pay and identity numbers
  currentCtc?: number; payFrequency?: 'monthly' | 'annual'; compensationHistory?: CompensationEntry[]; sensitive?: SensitiveFields;
  documents?: { fileId: string; name: string; kind: string; uploadedAt: string }[];
  assets?: { name: string; tag?: string; issuedOn?: string; returnedOn?: string; note?: string }[];
  photoFileId?: string | null;
  hrNotes?: { text: string; byName: string; at: string }[];
  customFields?: Record<string, string>;
  createdAt?: string;
}

export interface ExpenseCategory { name: string; dailyLimit: number; receiptRequiredAbove: number; active: boolean }
export interface EmployeeConfig {
  departments: string[]; designations: string[]; employmentTypes: string[]; workLocations: string[]; documentTypes: string[];
  expenseCategories: ExpenseCategory[]; activityCategories: string[];
  companyCategories: CompanyCategory[];
  companyPolicy: { allowSelfApproval: boolean; invoiceRequiredAbove: number };
  customFields: { key: string; label: string; required?: boolean }[];
  codePrefix: string;
  expensePolicy: { approvalMode: 'reporting_manager' | 'approvers' | 'manager_then_approver'; receiptRequiredAbove: number; dailyLimit: number; monthlyLimit: number; autoApproveBelow: number; maxBackdateDays: number };
  activityPolicy: { expectedHours: number; workingDays: number[]; lateCheckInAfter: string; requireCheckIn: boolean; requireEodSubmit: boolean; reviewMode: 'manager' | 'reviewers' | 'none'; editableDays: number };
}

export interface EmployeeSummary {
  headcount: number; byStatus: Record<string, number>; byDepartment: { name: string; count: number }[]; byType: { name: string; count: number }[];
  newJoiners: { _id: string; name: string; designation?: string; joiningDate: string }[];
  probationEnding: { _id: string; name: string; designation?: string; probationEndDate: string }[];
  recentExits: { _id: string; name: string; exitDate: string; exitReason?: string }[];
  birthdays: { _id: string; name: string; date: string; inDays: number }[];
  anniversaries: { _id: string; name: string; date: string; inDays: number; years?: number }[];
}

export interface ChangeInput { type?: string; effectiveFrom?: string; newCtc?: number; designation?: string; department?: string; grade?: string; reportingManagerId?: string | null; note?: string }

export interface Task { title: string; category?: string; hours: number; status: 'done' | 'in_progress' | 'blocked'; note?: string }
export type LogStatus = 'open' | 'submitted' | 'approved' | 'returned';
export interface DailyLog {
  _id?: string; date: string; status: LogStatus; workMode: DayMode; checkInAt?: string; checkOutAt?: string; late?: boolean;
  tasks: Task[]; totalHours: number; blockers?: string; tomorrowPlan?: string; summary?: string;
  reviewerName?: string; reviewedAt?: string; reviewNote?: string; submittedAt?: string;
}
export interface HistoryRow { date: string; status: LogStatus | 'missing' | 'none'; workMode: string; totalHours: number; taskCount: number; checkInAt?: string; checkOutAt?: string; late?: boolean; reviewNote?: string; summary?: string }

export interface BoardRow { employeeId: string; name: string; code: string; department?: string; designation?: string; state: 'not_started' | 'checked_in' | 'checked_out' | 'open' | 'submitted' | 'approved' | 'returned'; workMode: string; checkInAt?: string; checkOutAt?: string; late: boolean; totalHours: number; taskCount: number; logId: string | null }
export interface ReviewRow extends DailyLog { _id: string; employeeId: string; employeeName: string; employeeCode?: string; department?: string; designation?: string }
export interface MonthReport {
  month: string; workingDays: number; expectedHours: number;
  rows: { employeeId: string; name: string; code: string; department?: string; designation?: string; daysLogged: number; daysApproved: number; daysPending: number; daysReturned: number; daysOnLeave: number; remoteDays: number; fieldDays: number; lateDays: number; missingDays: number; totalHours: number; avgHours: number }[];
}

export type ExpenseStatus = 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled';
export interface Expense {
  _id: string; employeeId: string; date: string; month: string; category: string; amount: number; merchant?: string; description?: string; workMode?: string;
  receipts: { fileId: string; name: string }[]; status: ExpenseStatus; stage: 'manager' | 'approver' | 'done'; flags: string[];
  trail: { action: string; byName?: string; at: string; note?: string }[];
  rejectionReason?: string; approvedAt?: string; paidAt?: string; paymentMode?: string; paymentRef?: string;
}
export interface QueueExpense extends Expense { employeeName: string; employeeCode?: string; department?: string; canAct: boolean; canPay: boolean }
export interface ExpenseQuery { tab?: 'mine' | 'all'; status?: string; employeeId?: string; month?: string; category?: string; department?: string; from?: string; to?: string; stage?: string }
export interface ExpenseSummary {
  month: string; pendingApprovals: number; byStatus: Record<string, { total: number; count: number }>;
  byCategory: { category: string; total: number; count: number }[]; byEmployee: { employeeId: string; name: string; code?: string; department?: string; total: number; count: number }[];
}
export interface ExpenseInput { date: string; category: string; amount: number; merchant?: string; description?: string; workMode?: string; receipts?: { fileId: string; name?: string }[] }

export interface PortalMe {
  employee: Employee; managerName: string; today: DailyLog; todayDate: string;
  config: { expenseCategories: ExpenseCategory[]; activityCategories: string[]; expensePolicy: EmployeeConfig['expensePolicy']; activityPolicy: EmployeeConfig['activityPolicy'] };
}
export interface UploadedFile { fileId: string; name: string; mime: string; size: number }

const qs = (o?: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(o || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
const form = (file: File, extra: Record<string, string> = {}) => {
  const f = new FormData();
  f.append('file', file);
  Object.entries(extra).forEach(([k, v]) => f.append(k, v));
  return f;
};

/** A stored file as a blob URL for <img>, <a> or <iframe> (the files need the sign-in header, so a plain URL will not do). */
export async function fileObjectUrl(fileId: string): Promise<string> {
  const r = await axios.get(`${API}/employees/files/${fileId}`, { ...h(), responseType: 'blob' });
  return URL.createObjectURL(r.data);
}

// ── Admin: employees ─────────────────────────────────────────────────────────

export const employeesApi = {
  config: () => axios.get(`${API}/employees/config`, h()).then(d) as Promise<EmployeeConfig>,
  saveConfig: (c: Partial<EmployeeConfig>) => axios.put(`${API}/employees/config`, c, h()).then(d) as Promise<EmployeeConfig>,
  summary: () => axios.get(`${API}/employees/summary`, h()).then(d) as Promise<EmployeeSummary>,
  pick: () => axios.get(`${API}/employees/pick`, h()).then(d) as Promise<{ _id: string; name: string; code: string; designation: string }[]>,
  unlinkedUsers: (search?: string) => axios.get(`${API}/employees/unlinked-users${qs({ search })}`, h()).then(d) as Promise<{ _id: string; name: string; email: string; role: string }[]>,
  list: (q?: { search?: string; department?: string; status?: string; designation?: string; managerId?: string; page?: number; limit?: number }) =>
    axios.get(`${API}/employees${qs(q)}`, h()).then(d) as Promise<{ rows: EmployeeRow[]; total: number; page: number; limit: number }>,
  create: (body: Partial<Employee> & { sensitive?: SensitiveFields }) => axios.post(`${API}/employees`, body, h()).then(d) as Promise<Employee>,
  get: (id: string) => axios.get(`${API}/employees/${id}`, h()).then(d) as Promise<Employee>,
  update: (id: string, body: Partial<Employee> & { sensitive?: SensitiveFields; deactivateLogin?: boolean }) => axios.put(`${API}/employees/${id}`, body, h()).then(d) as Promise<Employee>,
  remove: (id: string) => axios.delete(`${API}/employees/${id}`, h()).then(d),
  change: (id: string, body: ChangeInput) => axios.post(`${API}/employees/${id}/change`, body, h()).then(d) as Promise<Employee>,
  addNote: (id: string, text: string) => axios.post(`${API}/employees/${id}/notes`, { text }, h()).then(d),
  createLogin: (id: string, email?: string) => axios.post(`${API}/employees/${id}/login`, { email }, h()).then(d) as Promise<{ emailSent: boolean; emailError?: string; setupLink?: string }>,
  linkUser: (id: string, userId: string) => axios.post(`${API}/employees/${id}/link`, { userId }, h()).then(d),
  removeLogin: (id: string, deactivate = false) => axios.delete(`${API}/employees/${id}/login${qs({ deactivate })}`, h()).then(d),
  uploadFile: (id: string, file: File, kind: 'document' | 'photo', documentType?: string) =>
    axios.post(`${API}/employees/${id}/files`, form(file, { kind, ...(documentType ? { documentType } : {}) }), h()).then(d) as Promise<UploadedFile>,
  removeDocument: (id: string, fileId: string) => axios.delete(`${API}/employees/${id}/documents/${fileId}`, h()).then(d),
};

// ── Reviewers: daily activity ────────────────────────────────────────────────

export const activityApi = {
  board: (date?: string) => axios.get(`${API}/employee-activity/board${qs({ date })}`, h()).then(d) as Promise<BoardRow[]>,
  list: (q?: { from?: string; to?: string; status?: string; employeeId?: string; department?: string }) => axios.get(`${API}/employee-activity/list${qs(q)}`, h()).then(d) as Promise<ReviewRow[]>,
  report: (month: string, department?: string) => axios.get(`${API}/employee-activity/report${qs({ month, department })}`, h()).then(d) as Promise<MonthReport>,
  log: (id: string) => axios.get(`${API}/employee-activity/logs/${id}`, h()).then(d) as Promise<ReviewRow & { canReview: boolean }>,
  review: (id: string, action: 'approve' | 'return', note?: string) => axios.post(`${API}/employee-activity/logs/${id}/review`, { action, note }, h()).then(d) as Promise<DailyLog>,
  reopen: (id: string, note?: string) => axios.post(`${API}/employee-activity/logs/${id}/reopen`, { note }, h()).then(d) as Promise<DailyLog>,
};

// ── Approvers and accounts: expenses ─────────────────────────────────────────

export const expensesApi = {
  queue: (q?: ExpenseQuery) => axios.get(`${API}/employee-expenses/queue${qs(q)}`, h()).then(d) as Promise<{ rows: QueueExpense[]; totals: { submitted: number; approved: number; paid: number; rejected: number } }>,
  summary: (month?: string) => axios.get(`${API}/employee-expenses/summary${qs({ month })}`, h()).then(d) as Promise<ExpenseSummary>,
  detail: (id: string) => axios.get(`${API}/employee-expenses/${id}`, h()).then(d) as Promise<{ expense: Expense; employee: { _id: string; name: string; employeeCode: string; department?: string } | null }>,
  act: (id: string, action: 'approve' | 'reject', note?: string) => axios.post(`${API}/employee-expenses/${id}/act`, { action, note }, h()).then(d) as Promise<Expense>,
  pay: (ids: string[], paymentMode?: string, paymentRef?: string) => axios.post(`${API}/employee-expenses/pay`, { ids, paymentMode, paymentRef }, h()).then(d) as Promise<{ paid: number }>,
  unpay: (id: string) => axios.post(`${API}/employee-expenses/${id}/unpay`, {}, h()).then(d),
  /** Downloads the CSV through the browser. */
  exportCsv: async (q?: ExpenseQuery) => {
    const r = await axios.get(`${API}/employee-expenses/export${qs(q)}`, { ...h(), responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = `expenses-${q?.month || 'all'}.csv`; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
};

// ── The employee themselves ──────────────────────────────────────────────────

export const portalApi = {
  exists: () => axios.get(`${API}/employee-portal/exists`, h()).then(d) as Promise<{ isEmployee: boolean; portalOnly?: boolean; name?: string; hasTeam?: boolean }>,
  me: () => axios.get(`${API}/employee-portal/me`, h()).then(d) as Promise<PortalMe>,
  saveMe: (body: Partial<Employee> & { sensitive?: SensitiveFields }) => axios.put(`${API}/employee-portal/me`, body, h()).then(d) as Promise<Employee>,
  uploadPhoto: (file: File) => axios.post(`${API}/employee-portal/photo`, form(file), h()).then(d) as Promise<UploadedFile>,
  checkIn: (workMode: DayMode) => axios.post(`${API}/employee-portal/checkin`, { workMode }, h()).then(d) as Promise<DailyLog>,
  checkOut: () => axios.post(`${API}/employee-portal/checkout`, {}, h()).then(d) as Promise<DailyLog>,
  history: (from?: string, to?: string) => axios.get(`${API}/employee-portal/history${qs({ from, to })}`, h()).then(d) as Promise<HistoryRow[]>,
  day: (date: string) => axios.get(`${API}/employee-portal/day/${date}`, h()).then(d) as Promise<DailyLog>,
  saveDay: (date: string, body: Partial<DailyLog>) => axios.put(`${API}/employee-portal/day/${date}`, body, h()).then(d) as Promise<DailyLog>,
  submitDay: (date: string) => axios.post(`${API}/employee-portal/day/${date}/submit`, {}, h()).then(d) as Promise<DailyLog>,
  expenses: (q?: { month?: string; status?: string }) => axios.get(`${API}/employee-portal/expenses${qs(q)}`, h()).then(d) as Promise<{ rows: Expense[]; totals: { pending: number; approved: number; paid: number; rejected: number } }>,
  uploadReceipt: (file: File) => axios.post(`${API}/employee-portal/expenses/receipt`, form(file), h()).then(d) as Promise<UploadedFile>,
  createExpense: (body: ExpenseInput) => axios.post(`${API}/employee-portal/expenses`, body, h()).then(d) as Promise<Expense>,
  updateExpense: (id: string, body: Partial<ExpenseInput>) => axios.put(`${API}/employee-portal/expenses/${id}`, body, h()).then(d) as Promise<Expense>,
  cancelExpense: (id: string) => axios.post(`${API}/employee-portal/expenses/${id}/cancel`, {}, h()).then(d),
};

// ── The company expense ledger ───────────────────────────────────────────────

export type LedgerKind = 'bill' | 'recurring' | 'salary' | 'reimbursement';
export type LedgerStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export interface CompanyCategory { name: string; skipApproval: boolean; active: boolean }
export interface TrailEntry { action: string; byName?: string; at: string; note?: string }

export interface LedgerRow {
  _id: string; kind: LedgerKind; date: string; month: string; dueDate?: string; category: string; title?: string; vendor?: string; description?: string;
  amount: number; gst?: number; invoiceNumber?: string; invoices: { fileId: string; name: string }[];
  status: LedgerStatus; paidOn?: string; paymentMode?: string; paymentRef?: string;
  employeeId?: string; employeeName?: string; employeeCode?: string; recurringId?: string; sourceExpenseId?: string;
  trail?: TrailEntry[];
  /** The day it should be paid by (a bill's due date, or the day a recurring or salary line falls). */
  dueOn?: string; overdue: boolean; daysOverdue: number;
  // What the signed-in person may do with this line
  canApprove: boolean; canPay: boolean; canEdit: boolean;
}

export interface LedgerQuery { overdue?: boolean; month?: string; from?: string; to?: string; category?: string; kind?: LedgerKind | ''; status?: LedgerStatus | ''; search?: string; employeeId?: string }
export interface LedgerResult { rows: LedgerRow[]; totals: Record<LedgerStatus, number>; hiddenSalaryLines: boolean }

export interface BillInput {
  date: string; category: string; title?: string; vendor?: string; description?: string; amount: number; gst?: number; invoiceNumber?: string; dueDate?: string; paymentMode?: string;
  invoices?: { fileId: string; name?: string }[];
  /** The money has already gone out: approve and pay in one step (needs approve permission). */
  recordAsPaid?: boolean; paidOn?: string; paymentRef?: string;
}

export interface CompanySummary {
  month: string; label: string; pendingApprovals: number; recurringNotYetAdded: number; spent: number; salaryLinesHidden: boolean;
  /** Unpaid lines whose day has passed, across all months; and unpaid bills due in the next 7 days. */
  overdue: { count: number; total: number }; dueSoon: { count: number; total: number };
  byStatus: Partial<Record<'pending' | 'approved' | 'paid', { total: number; count: number }>>;
  byCategory: { category: string; total: number; count: number }[];
  byKind: { kind: LedgerKind; total: number; count: number }[];
  topVendors: { vendor: string; total: number; count: number }[];
  trend: { month: string; label: string; total: number }[];
}

export interface RecurringItem {
  _id: string; title: string; category: string; vendor?: string; amount: number; gst?: number; dayOfMonth: number;
  /** 1 = every month; 4 = one payment every four months (and so on: 2, 3, 6, 12). */
  everyMonths: number;
  startMonth: string; endMonth?: string; paymentMode?: string; notes?: string; active: boolean;
}
export type RecurringInput = Omit<RecurringItem, '_id'>;

export interface SalaryPreview {
  month: string; label: string; toAdd: number; total: number;
  rows: { employeeId: string; name: string; code: string; department?: string; designation?: string; amount: number; alreadyAdded: boolean; existingStatus?: LedgerStatus }[];
}

export const companyApi = {
  ledger: (q?: LedgerQuery) => axios.get(`${API}/company-expenses/ledger${qs(q as Record<string, any>)}`, h()).then(d) as Promise<LedgerResult>,
  summary: (month?: string) => axios.get(`${API}/company-expenses/summary${qs({ month })}`, h()).then(d) as Promise<CompanySummary>,
  vendors: () => axios.get(`${API}/company-expenses/vendors`, h()).then(d) as Promise<string[]>,
  detail: (id: string) => axios.get(`${API}/company-expenses/${id}`, h()).then(d) as Promise<LedgerRow>,
  create: (body: BillInput) => axios.post(`${API}/company-expenses`, body, h()).then(d) as Promise<LedgerRow>,
  update: (id: string, body: Partial<BillInput>) => axios.put(`${API}/company-expenses/${id}`, body, h()).then(d) as Promise<LedgerRow>,
  cancel: (id: string, note?: string) => axios.delete(`${API}/company-expenses/${id}`, { ...h(), data: { note } }).then(d),
  act: (id: string, action: 'approve' | 'reject', note?: string) => axios.post(`${API}/company-expenses/${id}/act`, { action, note }, h()).then(d) as Promise<LedgerRow>,
  pay: (ids: string[], input: { paymentMode?: string; paymentRef?: string; paidOn?: string }) => axios.post(`${API}/company-expenses/pay`, { ids, ...input }, h()).then(d) as Promise<{ paid: number }>,
  unpay: (id: string) => axios.post(`${API}/company-expenses/${id}/unpay`, {}, h()).then(d),
  uploadInvoice: (file: File) => axios.post(`${API}/company-expenses/invoice`, form(file), h()).then(d) as Promise<UploadedFile>,
  recurring: () => axios.get(`${API}/company-expenses/recurring`, h()).then(d) as Promise<RecurringItem[]>,
  createRecurring: (body: Partial<RecurringInput>) => axios.post(`${API}/company-expenses/recurring`, body, h()).then(d) as Promise<RecurringItem>,
  updateRecurring: (id: string, body: Partial<RecurringInput>) => axios.put(`${API}/company-expenses/recurring/${id}`, body, h()).then(d) as Promise<RecurringItem>,
  deleteRecurring: (id: string) => axios.delete(`${API}/company-expenses/recurring/${id}`, h()).then(d),
  payAhead: (id: string, input: { periods: number; paymentMode?: string; paymentRef?: string; paidOn?: string }) => axios.post(`${API}/company-expenses/recurring/${id}/pay-ahead`, input, h()).then(d) as Promise<{ covered: string[]; labels: string[] }>,
  generateRecurring: (month?: string) => axios.post(`${API}/company-expenses/recurring/generate`, { month }, h()).then(d) as Promise<{ month: string; added: number }>,
  salaryPreview: (month?: string) => axios.get(`${API}/company-expenses/salaries/preview${qs({ month })}`, h()).then(d) as Promise<SalaryPreview>,
  generateSalaries: (input: { month?: string; employeeIds?: string[]; amounts?: Record<string, number> }) => axios.post(`${API}/company-expenses/salaries/generate`, input, h()).then(d) as Promise<{ month: string; added: number }>,
  exportCsv: async (q?: LedgerQuery) => {
    const r = await axios.get(`${API}/company-expenses/export${qs(q as Record<string, any>)}`, { ...h(), responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = `company-expenses-${q?.month || 'all'}.csv`; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },
};
