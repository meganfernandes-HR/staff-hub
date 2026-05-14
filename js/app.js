// ── STATE ──
let employees = [];
let currentEmployee = null;
let pageHistory = [];
let editingId = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadEmployees();
  initPIN();
});

function loadEmployees() {
  const saved = localStorage.getItem('sbk_employees');
  employees = saved ? JSON.parse(saved) : [...EMPLOYEES_DEFAULT];
}

function saveEmployees() {
  localStorage.setItem('sbk_employees', JSON.stringify(employees));
}

// ── PIN ──
let pinEntry = '';

function initPIN() {
  const authed = sessionStorage.getItem('sbk_authed');
  if (authed === '1') {
    showApp();
    return;
  }
  document.querySelectorAll('.pin-key[data-val]').forEach(btn => {
    btn.addEventListener('click', () => addPinDigit(btn.dataset.val));
  });
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
  for (let i = 0; i < 4; i++) {
    document.getElementById('d' + i).classList.toggle('filled', i < pinEntry.length);
  }
}

function checkPIN() {
  if (pinEntry === CONFIG.PIN) {
    sessionStorage.setItem('sbk_authed', '1');
    showApp();
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

function showApp() {
  document.getElementById('pin-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderDirectory();
}

// ── NAVIGATION ──
function showPage(id, title, showBack, showAdd) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  const page = document.getElementById('page-' + id);
  page.classList.remove('hidden');
  page.classList.add('active');

  document.getElementById('topbar-title').textContent = title;
  document.getElementById('back-btn').classList.toggle('hidden', !showBack);
  document.getElementById('topbar-action-btn').classList.toggle('hidden', !showAdd);
}

function goBack() {
  if (pageHistory.length > 0) {
    const prev = pageHistory.pop();
    prev();
  } else {
    showDirectory();
  }
}

function showDirectory() {
  pageHistory = [];
  showPage('directory', 'Staff Hub', false, true);
  renderDirectory();
}

// ── DIRECTORY ──
function renderDirectory(filter = '') {
  const list = document.getElementById('employee-list');
  const empty = document.getElementById('empty-state');
  const label = document.getElementById('dir-section-label');
  const today = new Date();

  const active = employees.filter(e => {
    const q = filter.toLowerCase();
    return e.name.toLowerCase().includes(q) || (e.position || '').toLowerCase().includes(q) || (e.id || '').toLowerCase().includes(q);
  });

  // Stats
  const total = employees.length;
  const onProbation = employees.filter(e => e.probationEnd && new Date(e.probationEnd) > today).length;
  const thisMonth = employees.filter(e => {
    if (!e.startDate) return false;
    const s = new Date(e.startDate);
    return s.getMonth() === today.getMonth() && s.getFullYear() === today.getFullYear();
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-probation').textContent = onProbation;
  document.getElementById('stat-new').textContent = thisMonth;

  label.textContent = filter ? `Results for "${filter}"` : 'All staff';

  if (active.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  // Sort: managers first, then alphabetical
  const sorted = [...active].sort((a, b) => {
    if (a.isManager && !b.isManager) return -1;
    if (!a.isManager && b.isManager) return 1;
    return a.name.localeCompare(b.name);
  });

  list.innerHTML = sorted.map(emp => {
    const initials = getInitials(emp.name);
    const colorClass = 'av-' + (Math.abs(hashStr(emp.name)) % 8);
    const probation = emp.probationEnd && new Date(emp.probationEnd) > today;
    const isNew = emp.startDate && monthsDiff(new Date(emp.startDate), today) < 1;
    const under6 = emp.startDate && monthsDiff(new Date(emp.startDate), today) < 6;

    let badge = '';
    if (emp.isManager) badge = `<span class="badge badge-manager">Manager</span>`;
    else if (probation) badge = `<span class="badge badge-probation">Probation</span>`;
    else if (isNew) badge = `<span class="badge badge-new">New</span>`;

    return `
      <div class="emp-row" onclick="showProfile('${emp.id}')">
        <div class="emp-avatar ${colorClass}">${initials}</div>
        <div class="emp-info">
          <div class="emp-name">${emp.name}</div>
          <div class="emp-role">${emp.position || '—'}</div>
        </div>
        <div class="emp-meta">
          <div class="emp-id">${emp.id}</div>
          ${badge}
        </div>
      </div>
    `;
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

// ── PROFILE ──
function showProfile(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  currentEmployee = emp;
  pageHistory.push(() => showDirectory());

  const today = new Date();
  const initials = getInitials(emp.name);
  const colorClass = 'av-' + (Math.abs(hashStr(emp.name)) % 8);
  const probation = emp.probationEnd && new Date(emp.probationEnd) > today;
  const under6 = emp.startDate && monthsDiff(new Date(emp.startDate), today) < 6;

  let badges = '';
  if (emp.isManager) badges += `<span class="badge badge-manager">Manager</span>`;
  if (probation) badges += `<span class="badge badge-probation">On probation</span>`;
  if (!emp.isManager && under6) badges += `<span class="badge badge-under6">&lt; 6 months</span>`;

  const under6Warning = (!emp.isManager && under6) ? `
    <div class="under6-warning">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <div class="under6-warning-text">This employee has not yet completed 6 months at Subko. Some leave entitlements may not apply.</div>
    </div>` : '';

  const content = `
    ${under6Warning}
    <div class="profile-hero">
      <div class="profile-avatar ${colorClass}">${initials}</div>
      <div>
        <div class="profile-name">${emp.name}</div>
        <div class="profile-role">${emp.position || '—'}</div>
        <div class="profile-badges">${badges}</div>
      </div>
    </div>
    <div style="padding: 14px 16px 8px; display: flex; gap: 10px;">
      <button class="btn btn-accent" onclick="showEditEmployee('${emp.id}')">Edit profile</button>
      <button class="btn btn-danger" onclick="confirmDelete('${emp.id}')">Remove</button>
    </div>
    <div class="profile-sections">
      <div class="profile-card">
        <div class="profile-card-title">Employment</div>
        ${fieldRow('Employee ID', emp.id)}
        ${fieldRow('Position', emp.position, true)}
        ${fieldRow('Start date', formatDate(emp.startDate), true)}
        ${fieldRow('Probation ends', formatDate(emp.probationEnd), true)}
        ${fieldRow('Years of service', emp.startDate ? yearsOfService(emp.startDate) : '—', true)}
      </div>
      <div class="profile-card">
        <div class="profile-card-title">Personal</div>
        ${fieldRow('Date of birth', formatDate(emp.dob), true)}
        ${fieldRow('Email', emp.email || '—', true)}
      </div>
      <div class="profile-card">
        <div class="profile-card-title">Documents</div>
        ${fieldRow('Passport no.', emp.passportNo || '—')}
        ${fieldRow('File number', emp.fileNo || '—')}
        ${fieldRow('National ID', emp.nationalId || '—')}
      </div>
      ${emp.notes ? `
      <div class="profile-card">
        <div class="profile-card-title">Notes</div>
        <div style="padding: 12px 16px; font-size: 13px; color: var(--text2); line-height: 1.6;">${emp.notes}</div>
      </div>` : ''}
    </div>
  `;

  document.getElementById('profile-content').innerHTML = content;
  document.getElementById('page-profile').scrollTop = 0;
  showPage('profile', emp.name.split(' ')[0], true, false);
}

function fieldRow(label, value, normal = false) {
  return `
    <div class="profile-field">
      <div class="field-label">${label}</div>
      <div class="field-value ${normal ? 'normal' : ''}">${value || '—'}</div>
    </div>
  `;
}

// ── ADD / EDIT FORM ──
function showAddEmployee() {
  editingId = null;
  pageHistory.push(() => showDirectory());
  renderForm(null);
  showPage('form', 'Add employee', true, false);
  document.getElementById('page-form').scrollTop = 0;
}

function showEditEmployee(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  editingId = id;
  pageHistory.push(() => showProfile(id));
  renderForm(emp);
  showPage('form', 'Edit profile', true, false);
  document.getElementById('page-form').scrollTop = 0;
}

function renderForm(emp) {
  const isEdit = !!emp;
  document.getElementById('form-container').innerHTML = `
    <div class="form-group">
      <label class="form-label">Full name *</label>
      <input class="form-input" id="f-name" type="text" placeholder="As per passport" value="${emp ? emp.name : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Employee ID</label>
      <input class="form-input" id="f-id" type="text" placeholder="e.g. SBK-049" value="${emp ? emp.id : nextId()}" />
    </div>
    <div class="form-group">
      <label class="form-label">Position</label>
      <input class="form-input" id="f-pos" type="text" placeholder="Job title" value="${emp ? (emp.position || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Start date</label>
      <input class="form-input" id="f-start" type="date" value="${emp ? (emp.startDate || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Probation end date</label>
      <input class="form-input" id="f-prob" type="date" value="${emp ? (emp.probationEnd || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Date of birth</label>
      <input class="form-input" id="f-dob" type="date" value="${emp ? (emp.dob || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-input" id="f-email" type="email" placeholder="name@example.com" value="${emp ? (emp.email || '') : ''}" />
    </div>
    <div class="form-section-title">Documents</div>
    <div class="form-group">
      <label class="form-label">Passport number</label>
      <input class="form-input" id="f-passport" type="text" value="${emp ? (emp.passportNo || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">File number</label>
      <input class="form-input" id="f-fileno" type="text" value="${emp ? (emp.fileNo || '') : ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">National ID</label>
      <input class="form-input" id="f-natid" type="text" value="${emp ? (emp.nationalId || '') : ''}" />
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
      <input class="form-input" id="f-notes" type="text" placeholder="Optional" value="${emp ? (emp.notes || '') : ''}" />
    </div>
    <button class="form-save-btn" onclick="saveEmployee()">${isEdit ? 'Save changes' : 'Add employee'}</button>
  `;
}

function saveEmployee() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { alert('Name is required.'); return; }

  const empData = {
    id: document.getElementById('f-id').value.trim(),
    name,
    position: document.getElementById('f-pos').value.trim(),
    startDate: document.getElementById('f-start').value,
    probationEnd: document.getElementById('f-prob').value,
    dob: document.getElementById('f-dob').value,
    email: document.getElementById('f-email').value.trim(),
    passportNo: document.getElementById('f-passport').value.trim(),
    fileNo: document.getElementById('f-fileno').value.trim(),
    nationalId: document.getElementById('f-natid').value.trim(),
    isManager: document.getElementById('f-ismanager').value === '1',
    notes: document.getElementById('f-notes').value.trim()
  };

  if (editingId) {
    const idx = employees.findIndex(e => e.id === editingId);
    if (idx > -1) employees[idx] = empData;
  } else {
    employees.push(empData);
  }

  saveEmployees();

  if (editingId) {
    showProfile(empData.id);
  } else {
    showDirectory();
  }
}

// ── DELETE ──
function confirmDelete(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-sheet">
      <div class="confirm-title">Remove ${emp.name.split(' ')[0]}?</div>
      <div class="confirm-msg">This will permanently remove ${emp.name} from the directory. This cannot be undone.</div>
      <div class="confirm-actions">
        <button class="btn" onclick="this.closest('.confirm-overlay').remove()">Cancel</button>
        <button class="btn btn-danger" onclick="deleteEmployee('${id}')">Remove</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function deleteEmployee(id) {
  employees = employees.filter(e => e.id !== id);
  saveEmployees();
  document.querySelector('.confirm-overlay')?.remove();
  showDirectory();
}

// ── UTILS ──
function getInitials(name) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return hash;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthsDiff(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function yearsOfService(startDateStr) {
  if (!startDateStr) return '—';
  const start = new Date(startDateStr + 'T00:00:00');
  const today = new Date();
  const months = monthsDiff(start, today);
  if (months < 1) return 'Less than 1 month';
  if (months < 12) return months + (months === 1 ? ' month' : ' months');
  const years = Math.floor(months / 12);
  const rem = months % 12;
  let s = years + (years === 1 ? ' year' : ' years');
  if (rem > 0) s += ', ' + rem + (rem === 1 ? ' month' : ' months');
  return s;
}

function nextId() {
  const nums = employees
    .map(e => parseInt((e.id || '').replace('SBK-', '')))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 48;
  return 'SBK-' + String(max + 1).padStart(3, '0');
}
