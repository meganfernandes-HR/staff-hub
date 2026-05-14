// ─────────────────────────────────────────
//  GOOGLE SHEETS API LAYER
// ─────────────────────────────────────────

const Sheets = {

  async call(action, payload = {}) {
    const url = CONFIG.SCRIPT_URL;
    if (!url || url === 'YOUR_APPS_SCRIPT_URL_HERE') {
      console.warn('Apps Script URL not configured');
      return { ok: false, error: 'Not configured' };
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...payload })
      });
      return await res.json();
    } catch (e) {
      console.error('Sheets error:', e);
      return { ok: false, error: e.message };
    }
  },

  // ── EMPLOYEES ──

  async getEmployees() {
    return await this.call('getEmployees');
  },

  async addEmployee(emp) {
    return await this.call('addEmployee', { employee: emp });
  },

  async updateEmployee(emp) {
    return await this.call('updateEmployee', { employee: emp });
  },

  async deleteEmployee(employeeId) {
    return await this.call('deleteEmployee', { employeeId });
  },

  // ── LEAVE RECORDS ──

  async getLeaveRecords() {
    return await this.call('getLeaveRecords');
  },

  async addLeaveRecord(record) {
    return await this.call('addLeaveRecord', { record });
  },

  async deleteLeaveRecord(recordId) {
    return await this.call('deleteLeaveRecord', { recordId });
  }
};

// ─────────────────────────────────────────
//  LOCAL CACHE — keeps app snappy
// ─────────────────────────────────────────

const Cache = {
  _emp: null,
  _leave: null,

  setEmployees(data)    { this._emp   = data; localStorage.setItem('sbk_emp_cache',   JSON.stringify(data)); },
  setLeave(data)        { this._leave = data; localStorage.setItem('sbk_leave_cache', JSON.stringify(data)); },

  getEmployees()  {
    if (this._emp) return this._emp;
    const s = localStorage.getItem('sbk_emp_cache');
    return s ? JSON.parse(s) : null;
  },
  getLeave() {
    if (this._leave) return this._leave;
    const s = localStorage.getItem('sbk_leave_cache');
    return s ? JSON.parse(s) : null;
  },

  clearAll() {
    this._emp = null; this._leave = null;
    localStorage.removeItem('sbk_emp_cache');
    localStorage.removeItem('sbk_leave_cache');
  }
};
