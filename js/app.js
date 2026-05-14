// ─────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────

let employees    = [];
let pageHistory  = [];
let editingEmpId = null;

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initPIN();
});

async function initApp() {
  showLoading(true);
  const cached = Cache.getEmployees();
  if (cached) { employees = cached; showLoading(false); showApp(); }

  const res = await Sheets.getEmployees();
  if (res.ok && res.data) {
    employees = res.data;
    Cache.setEmployees(employees);
    if (!cached) { showLoading(false); showApp(); }
    else renderDirectory();
  } else {
    if (!cached) { showLoading(false); showApp(); }
  }
}

function showLoading(on) {
  document.getElementById('loading-screen').classList.toggle('hidden', !on);
}

function showApp() {
  document.getElementById('pin-screen').classList.add('hidden');
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderDirectory();
}

// ─────────────────────────────────────────
//  PIN
// ─────────────────────────────────────────

let pinEntry = '';

function initPIN() {
  if (sessionStorage.getItem('sbk_authed') === '1') { initApp(); return; }
  document.querySelectorAll('.pin-key[data-val]').forEach(btn =>
    btn.addEventListener('click', () => addPinDigit(btn.dataset.val))
  );
  document.getElementById('pin-del').addEventListener('click', delPinDigit);
}

function addPinDigit(d) {
  if (pinEntry.length >= 4) return;
  pinEntry += d;
  updatePinDots();
  if (pinEntry.length === 4) setTimeout(checkPIN, 120);
}

function delPinDigit() {
  pinEntry = pinEntry.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-error').classList.remove('show');
}

function updatePinDots() {
  for (let i = 0; i < 4; i++)
    document.getElementById('d' + i).classList.toggle('filled', i < pinEntry.length);
}

function checkPIN() {
  if (pinEntry === CONFIG.PIN) {
    sessionStorage.setItem('sbk_authed', '1');
    initApp();
  } else {
    document.getElementById('pin-error').classList.add('show');
    pinEntry = '';
    updatePinDots();
    document.querySelectorAll('.dot').forEach(d => {
      d.style.borderColor = 'var(--danger)';
      setTimeout(() => d.style.borderColor = '', 600);
    });
  }
}

// ─────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────

function showPage(id, title, showBack, showAdd, showLeaveAdd) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  const page = document.getElementById('page-' + id);
  page.classList.remove('hidden');
  page.classList.add('active');

  document.getElementById('topbar-title').textContent = title;
  document.getElementById('back-btn').classList.toggle('hidden', !showBack);
  document.getElementById('topbar-add-btn').classList.toggle('hidden', !showAdd);
  document.getElementById('topbar-leave-btn').classList.toggle('hidden', !showLeaveAdd);

  // Bottom nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (id === 'directory' || id === 'profile' || id === 'emp-form') document.getElementById('nav-directory').classList.add('active');
  if (id === 'leave' || id === 'calendar' || id === 'leave-form') document.getElementById('nav-leave').classList.add('active');
}

function goBack() {
  if (pageHistory.length > 0) pageHistory.pop()();
  else showDirectory();
}

// ─────────────────────────────────────────
//  DIRECTORY
// ─────────────────────────────────────────

function showDirectory() {
  pageHistory = [];
  showPage('directory', 'Staff Hub', false, true, false);
  renderDirectory();
}

function renderDirectory(filter = '') {
  const list   = document.getElementById('employee-list');
  const empty  = document.getElementById('empty-state');
  const label  = document.getElementById('dir-section-label');
  const today  = new Date();

  const filtered = employees.filter(e => {
    const q = filter.toLowerCase();
    return e.name.toLowerCase().includes(q) ||
           (e.position || '').toLowerCase().includes(q) ||
           (e.id || '').toLowerCase().includes(q);
  });

  // Stats
  document.getElementById('stat-total').textContent     = employees.length;
  document.getElementById('stat-probation').textContent = employees.filter(e => e.probationEnd && new Date(e.probationEnd) > today).length;
  document.getElementById('stat-new').textContent       = employees.filter(e => e.startDate && monthsDiff(new Date(e.startDate), today) < 1).length;

  label.textContent = filter ? `Results for "${filter}"` : 'All staff';

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const sorted = [...filtered].sort((a, b) => {
    if (a.isManager && !b.isManager) return -1;
    if (!a.isManager && b.isManager) return 1;
    return a.name.localeCompare(b.name);
  });

  list.innerHTML = sorted.map(emp => {
    const initials   = getInitials(emp.name);
    const colorClass = 'av-' + (Math.abs(hashStr(emp.name)) % 8);
    const probation  = emp.probationEnd && new Date(emp.probationEnd) > today;
    const isNew      = emp.startDate && monthsDiff(new Date(emp.startDate), today) < 1;

    let badge = '';
    if (emp.isManager) badge = `<span class="badge badge-manager">Manager</span>`;
    else if (probation) badge = `<span class="badge badge-probation">Probation</span>`;
    else if (isNew)     badge = `<span class="badge badge-new">New</span>`;

    return `<div class="emp-row" onclick="showProfile('${escHtml(emp.id)}')">
      <div class="emp-avatar ${colorClass}">${initials}</div>
      <div class="emp-info">
        <div class="emp-name">${escHtml(emp.name)}</div>
        <div class="emp-role">${escHtml(emp.position || '—')}</div>
      </div>
      <div class="emp-meta">
        <div class="emp-id">${escHtml(emp.id || '')}</div>
        ${badge}
      </div>
    </div>`;
  }).join('');
}

function filterEmployees() {
  const val = document.getElementById('search-input').value;
  document.getElementById('search-clear').classList.toggle('hidden', val.length === 0);
  renderDirectory(val);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.add('hidden');
  renderDirectory('');
}

// ─────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────

function showProfile(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  pageHistory.push(() => showDirectory());

  const today      = new Date();
  const initials   = getInitials(emp.name);
  const colorClass = 'av-' + (Math.abs(hashStr(emp.name)) % 8);
  const probation  = emp.probationEnd && new Date(emp.probationEnd) > today;
  const under6     = emp.startDate && monthsDiff(new Date(emp.startDate), today) < 6;

  let badges = '';
  if (emp.isManager)           badges += `<span class="badge badge-manager">Manager</span>`;
  if (probation)               badges += `<span class="badge badge-probation">On probation</span>`;
  if (!emp.isManager && under6) badges += `<span class="badge badge-under6">&lt; 6 months</span>`;

  const warning = (!emp.isManager && under6) ? `
    <div class="under6-warning">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <div class="under6-warning-text">Has not yet completed 6 months at Subko. Some leave entitlements may not apply.</div>
    </div>` : '';

  document.getElementById('profile-content').innerHTML = `
    ${warning}
    <div class="profile-hero">
      <div class="profile-avatar ${colorClass}">${initials}</div>
      <div>
        <div class="profile-name">${escHtml(emp.name)}</div>
        <div class="profile-role">${escHtml(emp.position || '—')}</div>
        <div class="profile-badges">${badges}</div>
      </div>
    </div>
    <div class="profile-actions">
      <button class="btn btn-accent" onclick="showEditEmployee('${escHtml(emp.id)}')">Edit profile</button>
      <button class="btn btn-danger" onclick="confirmDeleteEmployee('${escHtml(emp.id)}')">Remove</button>
    </div>
    <div class="profile-sections">
      <div class="profile-card">
        <div class="profile-card-title">Employment</div>
        ${fRow('Employee ID', emp.id)}
        ${fRow('Position', emp.position, true)}
        ${fRow('Start date', formatDate(emp.startDate), true)}
        ${fRow('Probation ends', formatDate(emp.probationEnd), true)}
        ${fRow('Service', emp.startDate ? yearsOfService(emp.startDate) : '—', true)}
      </div>
      <div class="profile-card">
        <div class="profile-card-title">Personal</div>
        ${fRow('Date of birth', formatDate(emp.dob), true)}
        ${fRow('Email', emp.email || '—', true)}
      </div>
      <div class="profile-card">
        <div class="profile-card-title">Documents</div>
        ${fRow('Passport no.', emp.passportNo || '—')}
        ${fRow('File number', emp.fileNo || '—')}
        ${fRow('National ID', emp.nationalId || '—')}
      </div>
      ${emp.notes ? `<div class="profile-card"><div class="profile-card-title">Notes</div><div style="padding:11px 14px;font-size:13px;color:var(--text2);line-height:1.6">${escHtml(emp.notes)}</div></div>` : ''}
    </div>`;

  document.getElementById('page-profile').scrollTop = 0;
  showPage('profile', emp.name.split(' ')[0], true, false, false);
}

function fRow(label, value, normal = false) {
  return `<div class="profile-field">
    <div class="field-label">${label}</div>
    <div class="field-value ${normal ? 'normal' : ''}">${value || '—'}</div>
  </div>`;
}

// ─────────────────────────────────────────
//  EMPLOYEE FORM
// ─────────────────────────────────────────

function showAddEmployee() {
  editingEmpId = null;
  pageHistory.push(() => showDirectory());
  renderEmpForm(null);
  document.getElementById('page-emp-form').scrollTop = 0;
  showPage('emp-form', 'Add employee', true, false, false);
}

function showEditEmployee(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  editingEmpId = id;
  pageHistory.push(() => showProfile(id));
  renderEmpForm(emp);
  document.getElementById('page-emp-form').scrollTop = 0;
  showPage('emp-form', 'Edit profile', true, false, false);
}

function renderEmpForm(emp) {
  const isEdit = !!emp;
  document.getElementById('emp-form-container').innerHTML = `
    <div class="form-group">
      <label class="form-label">Full name *</label>
      <input class="form-input" id="f-name" type="text" placeholder="As per passport" value="${emp ? escHtml(emp.name) : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Employee ID</label>
      <input class="form-input" id="f-id" type="text" placeholder="e.g. SBK-049" value="${emp ? escHtml(emp.id || '') : nextEmpId()}" />
    </div>
    <div class="form-group">
      <label class="form-label">Position</label>
      <input class="form-input" id="f-pos" type="text" placeholder="Job title" value="${emp ? escHtml(emp.position || '') : ''}" />
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">Start date</label>
        <input class="form-input" id="f-start" type="date" value="${emp ? (emp.startDate || '') : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Probation end</label>
        <input class="form-input" id="f-prob" type="date" value="${emp ? (emp.probationEnd || '') : ''}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Date of birth</label>
      <input class="form-input" id="f-dob" type="date" value="${emp ? (emp.dob || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-input" id="f-email" type="email" placeholder="name@example.com" value="${emp ? escHtml(emp.email || '') : ''}" />
    </div>
    <div class="form-section-title">Documents</div>
    <div class="form-group">
      <label class="form-label">Passport number</label>
      <input class="form-input" id="f-passport" value="${emp ? escHtml(emp.passportNo || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">File number</label>
      <input class="form-input" id="f-fileno" value="${emp ? escHtml(emp.fileNo || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">National ID</label>
      <input class="form-input" id="f-natid" value="${emp ? escHtml(emp.nationalId || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Role</label>
      <select class="form-select" id="f-ismanager">
        <option value="0" ${emp && !emp.isManager ? 'selected' : ''}>Staff</option>
        <option value="1" ${emp && emp.isManager ? 'selected' : ''}>Manager</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input class="form-input" id="f-notes" placeholder="Optional" value="${emp ? escHtml(emp.notes || '') : ''}" />
    </div>
    <button class="form-save-btn" id="emp-save-btn" onclick="saveEmployee()">${isEdit ? 'Save changes' : 'Add employee'}</button>
  `;
}

async function saveEmployee() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { alert('Name is required.'); return; }

  const btn = document.getElementById('emp-save-btn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  const empData = {
    id:          document.getElementById('f-id').value.trim(),
    name,
    position:    document.getElementById('f-pos').value.trim(),
    startDate:   document.getElementById('f-start').value,
    probationEnd:document.getElementById('f-prob').value,
    dob:         document.getElementById('f-dob').value,
    email:       document.getElementById('f-email').value.trim(),
    passportNo:  document.getElementById('f-passport').value.trim(),
    fileNo:      document.getElementById('f-fileno').value.trim(),
    nationalId:  document.getElementById('f-natid').value.trim(),
    isManager:   document.getElementById('f-ismanager').value === '1',
    notes:       document.getElementById('f-notes').value.trim()
  };

  let res;
  if (editingEmpId) {
    res = await Sheets.updateEmployee(empData);
    if (res.ok) {
      const idx = employees.findIndex(e => e.id === editingEmpId);
      if (idx > -1) employees[idx] = empData;
    }
  } else {
    res = await Sheets.addEmployee(empData);
    if (res.ok) employees.push(empData);
  }

  Cache.setEmployees(employees);
  btn.textContent = 'Saved!';
  setTimeout(() => {
    if (editingEmpId) showProfile(empData.id);
    else showDirectory();
  }, 600);
}

function confirmDeleteEmployee(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  showConfirm(
    `Remove ${emp.name.split(' ')[0]}?`,
    `This will permanently remove ${emp.name} from the directory and cannot be undone.`,
    async () => {
      const res = await Sheets.deleteEmployee(id);
      if (res.ok) {
        employees = employees.filter(e => e.id !== id);
        Cache.setEmployees(employees);
      }
      showDirectory();
    }
  );
}

// ─────────────────────────────────────────
//  CONFIRM DIALOG
// ─────────────────────────────────────────

let confirmCallback = null;

function showConfirm(title, msg, onOk) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent   = msg;
  confirmCallback = onOk;
  document.getElementById('confirm-ok-btn').onclick = () => { closeConfirm(); onOk(); };
  document.getElementById('confirm-overlay').classList.remove('hidden');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.add('hidden');
  confirmCallback = null;
}

// ─────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────

function getInitials(name) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return h;
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthsDiff(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function yearsOfService(startStr) {
  if (!startStr) return '—';
  const months = monthsDiff(new Date(startStr + 'T00:00:00'), new Date());
  if (months < 1)  return 'Less than 1 month';
  if (months < 12) return months + (months === 1 ? ' month' : ' months');
  const y = Math.floor(months / 12), m = months % 12;
  return y + (y === 1 ? ' year' : ' years') + (m ? ', ' + m + (m === 1 ? ' month' : ' months') : '');
}

function nextEmpId() {
  const nums = employees.map(e => parseInt((e.id || '').replace('SBK-', ''))).filter(n => !isNaN(n));
  return 'SBK-' + String((nums.length ? Math.max(...nums) : 48) + 1).padStart(3, '0');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function workingDays(from, to) {
  let count = 0, cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 5 && d !== 6) count++; // Fri/Sat = weekend (UAE)
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
