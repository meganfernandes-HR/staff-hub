// ─────────────────────────────────────────
//  LEAVE STATE
// ─────────────────────────────────────────

let leaveRecords    = [];
let calMonth        = new Date().getMonth();
let calYear         = new Date().getFullYear();
let selectedCalDay  = null;
let currentFilter   = 'all';
let leaveActiveTab  = 'list';

// ─────────────────────────────────────────
//  DATE HELPERS — English only, no timezone
// ─────────────────────────────────────────

function parseDate(str) {
  if (!str) return new Date(0);
  const s = (typeof str === 'string' ? str : str.toISOString()).split('T')[0].split(' ')[0];
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0,0,0,0);
  return dt;
}

function fmtLeaveDate(str) {
  if (!str) return '—';
  const s = (typeof str === 'string' ? str : str.toISOString()).split('T')[0].split(' ')[0];
  const [y, m, d] = s.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[m-1]} ${y}`;
}

function fmtDateRange(from, to) {
  if (!from) return '—';
  const f = fmtLeaveDate(from);
  const t = fmtLeaveDate(to);
  if (!to || from === to) return f;
  return `${f} – ${t}`;
}

// ─────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────

async function showLeaveOverview() {
  pageHistory = [];
  showPage('leave', 'Leave', false, false, true);

  const cached = Cache.getLeave();
  if (cached) { leaveRecords = cached; renderLeaveSection(); }

  const res = await Sheets.getLeaveRecords();
  if (res.ok && res.data) {
    leaveRecords = res.data;
    Cache.setLeave(leaveRecords);
    renderLeaveSection();
  }
}

function renderLeaveSection() {
  if (leaveActiveTab === 'list') renderLeaveList();
  else renderCalendar();
}

// ─────────────────────────────────────────
//  TAB BAR
// ─────────────────────────────────────────

function getLeaveTabBar() {
  return `<div class="leave-tab-bar">
    <button class="leave-tab ${leaveActiveTab==='list'?'active':''}" onclick="switchLeaveTab('list')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      List
    </button>
    <button class="leave-tab ${leaveActiveTab==='calendar'?'active':''}" onclick="switchLeaveTab('calendar')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Calendar
    </button>
  </div>`;
}

function switchLeaveTab(tab) {
  leaveActiveTab = tab;
  if (leaveRecords.length === 0) {
    const cached = Cache.getLeave();
    if (cached) leaveRecords = cached;
  }
  renderLeaveSection();
}

// ─────────────────────────────────────────
//  LIST VIEW
// ─────────────────────────────────────────

function filterLeave(f) {
  currentFilter = f;
  renderLeaveList();
}

function renderLeaveList() {
  const container = document.getElementById('leave-list-container');
  const today     = new Date(); today.setHours(0,0,0,0);
  const weekEnd   = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const monthEnd  = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  function inRange(rec) {
    const from = parseDate(rec.fromDate);
    const to   = parseDate(rec.toDate);
    if (currentFilter === 'today') return from <= today && to >= today;
    if (currentFilter === 'week')  return from <= weekEnd && to >= today;
    if (currentFilter === 'month') return from <= monthEnd && to >= today;
    return true;
  }

  const filtered = leaveRecords.filter(inRange)
    .sort((a,b) => parseDate(a.fromDate) - parseDate(b.fromDate));

  const onNow = [], upcoming = [], later = [];
  filtered.forEach(rec => {
    const from = parseDate(rec.fromDate);
    const to   = parseDate(rec.toDate);
    if (from <= today && to >= today)         onNow.push(rec);
    else if (from > today && from <= weekEnd) upcoming.push(rec);
    else                                       later.push(rec);
  });

  let html = getLeaveTabBar();
  html += `<div class="filter-row">
    <button class="f-pill ${currentFilter==='all'?'active':''}" data-filter="all" onclick="filterLeave('all')">All</button>
    <button class="f-pill ${currentFilter==='today'?'active':''}" data-filter="today" onclick="filterLeave('today')">Today</button>
    <button class="f-pill ${currentFilter==='week'?'active':''}" data-filter="week" onclick="filterLeave('week')">This week</button>
    <button class="f-pill ${currentFilter==='month'?'active':''}" data-filter="month" onclick="filterLeave('month')">This month</button>
  </div>`;

  if (filtered.length === 0) {
    html += `<div class="leave-empty">No leave records for this period</div>`;
    container.innerHTML = html; return;
  }

  if (onNow.length) {
    html += `<div class="leave-section"><div class="leave-section-title">On leave now — ${onNow.length} ${onNow.length===1?'person':'people'}</div>`;
    onNow.forEach(r => { html += leaveCardHtml(r); });
    html += '</div>';
  }
  if (upcoming.length) {
    html += `<div class="leave-section"><div class="leave-section-title">Coming up — next 7 days</div>`;
    upcoming.forEach(r => { html += leaveCardHtml(r); });
    html += '</div>';
  }
  if (later.length) {
    html += `<div class="leave-section"><div class="leave-section-title">Later</div>`;
    later.forEach(r => { html += leaveCardHtml(r); });
    html += '</div>';
  }

  container.innerHTML = html;
}

function leaveCardHtml(rec) {
  const initials   = getInitials(rec.employeeName || '?');
  const colorClass = 'av-' + (Math.abs(hashStr(rec.employeeName || '')) % 8);
  const badgeClass = leaveTypeBadge(rec.leaveType);
  const dateStr    = fmtDateRange(rec.fromDate, rec.toDate);

  return `<div class="leave-card" onclick="showLeaveDetail('${escHtml(rec.recordId)}')">
    <div class="emp-avatar ${colorClass}" style="width:36px;height:36px;border-radius:10px;font-size:12px;flex-shrink:0">${initials}</div>
    <div class="leave-info">
      <div class="leave-name">${escHtml(rec.employeeName || '—')}</div>
      <div class="leave-dates">${dateStr}</div>
    </div>
    <div class="leave-right">
      <span class="badge ${badgeClass}">${escHtml(rec.leaveType)}</span>
    </div>
  </div>`;
}

// ─────────────────────────────────────────
//  LEAVE DETAIL + DELETE
// ─────────────────────────────────────────

function showLeaveDetail(recordId) {
  const rec = leaveRecords.find(r => r.recordId === recordId);
  if (!rec) return;
  pageHistory.push(() => showLeaveOverview());

  const initials   = getInitials(rec.employeeName || '?');
  const colorClass = 'av-' + (Math.abs(hashStr(rec.employeeName || '')) % 8);
  const badgeClass = leaveTypeBadge(rec.leaveType);

  document.getElementById('profile-content').innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar ${colorClass}">${initials}</div>
      <div>
        <div class="profile-name">${escHtml(rec.employeeName || '—')}</div>
        <div class="profile-role">${fmtDateRange(rec.fromDate, rec.toDate)}</div>
        <div class="profile-badges"><span class="badge ${badgeClass}">${escHtml(rec.leaveType)}</span></div>
      </div>
    </div>
    <div class="profile-sections">
      <div class="profile-card">
        <div class="profile-card-title">Leave details</div>
        ${fRow('Leave type', rec.leaveType, true)}
        ${fRow('From', fmtLeaveDate(rec.fromDate), true)}
        ${fRow('To', fmtLeaveDate(rec.toDate), true)}
        ${rec.notes ? fRow('Notes', rec.notes, true) : ''}
      </div>
      <div class="profile-card">
        <div class="profile-card-title">Record info</div>
        ${fRow('Record ID', rec.recordId)}
        ${fRow('Logged by', rec.loggedBy || '—', true)}
        ${fRow('Logged on', fmtLeaveDate(rec.loggedOn), true)}
      </div>
    </div>
    <div style="padding:0 14px 30px;">
      <button class="delete-leave-btn" onclick="confirmDeleteLeave('${escHtml(recordId)}')">
        Delete this leave record
      </button>
    </div>`;

  document.getElementById('page-profile').scrollTop = 0;
  showPage('profile', rec.employeeName ? rec.employeeName.split(' ')[0] : 'Leave', true, false, false);
}

function confirmDeleteLeave(recordId) {
  const rec = leaveRecords.find(r => r.recordId === recordId);
  if (!rec) return;
  showConfirm(
    'Delete leave record?',
    `This will permanently delete the ${rec.leaveType} record for ${rec.employeeName}. This cannot be undone.`,
    async () => {
      const res = await Sheets.deleteLeaveRecord(recordId);
      if (res.ok) {
        leaveRecords = leaveRecords.filter(r => r.recordId !== recordId);
        Cache.setLeave(leaveRecords);
      }
      showLeaveOverview();
    }
  );
}

// ─────────────────────────────────────────
//  CALENDAR VIEW
// ─────────────────────────────────────────

function renderCalendar() {
  const container = document.getElementById('leave-list-container');
  const today  = new Date(); today.setHours(0,0,0,0);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);
  let startDow   = firstDay.getDay();
  startDow       = startDow === 0 ? 6 : startDow - 1;

  const leaveDays = {};
  leaveRecords.forEach(rec => {
    let cur = parseDate(rec.fromDate);
    const end = parseDate(rec.toDate);
    while (cur <= end) {
      if (cur.getMonth() === calMonth && cur.getFullYear() === calYear) {
        const k = cur.getDate();
        if (!leaveDays[k]) leaveDays[k] = [];
        leaveDays[k].push(rec);
      }
      cur = new Date(cur.getTime()); cur.setDate(cur.getDate() + 1);
    }
  });

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-d"></div>`;
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const count   = (leaveDays[d] || []).length;
    let cls = 'cal-d';
    if (isToday)       cls += ' today';
    if (count === 1)   cls += ' has-leave';
    if (count >= 2)    cls += ' multi-leave';
    if (selectedCalDay === d) cls += ' selected';
    const dot = count > 0 ? '<div class="cal-dot"></div>' : '';
    cells += `<div class="${cls}" onclick="selectCalDay(${d})">${d}${dot}</div>`;
  }

  let detail = '';
  if (selectedCalDay !== null) {
    const sel  = new Date(calYear, calMonth, selectedCalDay); sel.setHours(0,0,0,0);
    const recs = leaveRecords.filter(rec => {
      const from = parseDate(rec.fromDate);
      const to   = parseDate(rec.toDate);
      return from <= sel && to >= sel;
    });
    detail = `<div style="padding:0 14px;">
      <div class="leave-section-title" style="margin-bottom:8px">
        ${selectedCalDay} ${MONTHS[calMonth]} — ${recs.length ? recs.length + ' on leave' : 'No leave logged'}
      </div>
      ${recs.length ? recs.map(r => leaveCardHtml(r)).join('') : `<div style="color:var(--text3);font-size:13px;padding:16px 0">No leave on this day</div>`}
    </div>`;
  }

  container.innerHTML = `
    ${getLeaveTabBar()}
    <div style="padding:12px 14px 0">
      <div class="cal-head">
        <button class="cal-nav" onclick="calNav(-1)">‹</button>
        <div class="cal-month">${MONTHS[calMonth]} ${calYear}</div>
        <button class="cal-nav" onclick="calNav(1)">›</button>
      </div>
      <div class="cal-grid">
        ${DAYS.map(d=>`<div class="cal-dh">${d}</div>`).join('')}
        ${cells}
      </div>
      <div class="cal-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--accent-dim);border:0.5px solid rgba(200,184,130,0.3)"></div>1 person</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--green-dim);border:0.5px solid rgba(74,124,82,0.3)"></div>2+ people</div>
      </div>
    </div>
    <div style="height:14px"></div>
    ${detail}`;
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  selectedCalDay = null;
  renderCalendar();
}

function selectCalDay(d) {
  selectedCalDay = selectedCalDay === d ? null : d;
  renderCalendar();
}

// ─────────────────────────────────────────
//  ADD LEAVE FORM
// ─────────────────────────────────────────

function showAddLeave() {
  pageHistory.push(() => showLeaveOverview());
  renderLeaveForm();
  document.getElementById('page-leave-form').scrollTop = 0;
  showPage('leave-form', 'Log leave', true, false, false);
}

function renderLeaveForm() {
  const today = new Date().toISOString().split('T')[0];

  document.getElementById('leave-form-container').innerHTML = `
    <div class="form-group">
      <label class="form-label">Employee *</label>
      <div class="emp-search-wrap">
        <svg class="emp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" id="lf-emp-search" placeholder="Search by name…" oninput="filterEmpSearch()" onfocus="openEmpSearch()" autocomplete="off" />
      </div>
      <div class="emp-search-results" id="emp-search-results"></div>
      <input type="hidden" id="lf-emp-id" />
      <input type="hidden" id="lf-emp-name" />
    </div>
    <div class="form-group">
      <label class="form-label">Leave type *</label>
      <select class="form-select" id="lf-type">
        ${LEAVE_TYPES.map(t=>`<option value="${t.value}">${t.value}</option>`).join('')}
      </select>
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">From *</label>
        <input class="form-input" id="lf-from" type="date" value="${today}" />
      </div>
      <div class="form-group">
        <label class="form-label">To *</label>
        <input class="form-input" id="lf-to" type="date" value="${today}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes <span style="font-size:10px;color:var(--text3);text-transform:none;letter-spacing:0">(optional)</span></label>
      <input class="form-input" id="lf-notes" placeholder="e.g. cover arranged with James" />
    </div>
    <button class="form-save-btn" id="lf-save-btn" onclick="saveLeave()">Save leave record</button>`;
}

function openEmpSearch() {
  filterEmpSearch();
  document.getElementById('emp-search-results').classList.add('open');
}

function filterEmpSearch() {
  const q       = document.getElementById('lf-emp-search').value.toLowerCase();
  const results = document.getElementById('emp-search-results');
  const filtered = employees.filter(e => e.name.toLowerCase().includes(q)).slice(0, 8);
  results.innerHTML = filtered.length
    ? filtered.map(e=>`<div class="emp-result-item" onclick="selectEmp('${escHtml(e.id)}','${escHtml(e.name)}')">
        <div>${escHtml(e.name)}</div>
        <div class="emp-result-sub">${escHtml(e.position||e.id)}</div>
      </div>`).join('')
    : `<div class="emp-result-item" style="color:var(--text3)">No results</div>`;
  results.classList.add('open');
}

function selectEmp(id, name) {
  document.getElementById('lf-emp-search').value = name;
  document.getElementById('lf-emp-id').value     = id;
  document.getElementById('lf-emp-name').value   = name;
  document.getElementById('emp-search-results').classList.remove('open');
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('emp-search-results');
  if (wrap && !wrap.contains(e.target) && e.target.id !== 'lf-emp-search')
    wrap.classList.remove('open');
});

async function saveLeave() {
  const empName = document.getElementById('lf-emp-name').value.trim();
  const empId   = document.getElementById('lf-emp-id').value.trim();
  const type    = document.getElementById('lf-type').value;
  const from    = document.getElementById('lf-from').value;
  const to      = document.getElementById('lf-to').value;

  if (!empName) { alert('Please select an employee.'); return; }
  if (!from || !to) { alert('Please select dates.'); return; }
  if (new Date(to+'T00:00:00') < new Date(from+'T00:00:00')) { alert('End date must be after start date.'); return; }

  const btn = document.getElementById('lf-save-btn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  const record = {
    recordId:     'LV-' + Date.now(),
    employeeName: empName,
    employeeId:   empId,
    leaveType:    type,
    fromDate:     from,
    toDate:       to,
    workingDays:  '',
    notes:        document.getElementById('lf-notes').value.trim(),
    loggedBy:     'Manager',
    loggedOn:     new Date().toISOString().split('T')[0]
  };

  const res = await Sheets.addLeaveRecord(record);
  if (res.ok) {
    leaveRecords.push(record);
    Cache.setLeave(leaveRecords);
    btn.textContent = 'Saved!';
    setTimeout(() => showLeaveOverview(), 600);
  } else {
    btn.textContent = 'Error — try again';
    btn.disabled = false;
  }
}
