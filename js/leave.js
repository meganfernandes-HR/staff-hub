// ─────────────────────────────────────────
//  LEAVE STATE
// ─────────────────────────────────────────

let leaveRecords   = [];
let calMonth       = new Date().getMonth();
let calYear        = new Date().getFullYear();
let selectedCalDay = null;
let currentFilter  = 'all';
let selectedLeaveId = null;

// ─────────────────────────────────────────
//  LEAVE OVERVIEW
// ─────────────────────────────────────────

async function showLeaveOverview() {
  pageHistory = [];
  showPage('leave', 'Leave', false, false, true);

  const cached = Cache.getLeave();
  if (cached) { leaveRecords = cached; renderLeaveList(); }

  const res = await Sheets.getLeaveRecords();
  if (res.ok && res.data) {
    leaveRecords = res.data;
    Cache.setLeave(leaveRecords);
    renderLeaveList();
  }
}

function filterLeave(f) {
  currentFilter = f;
  document.querySelectorAll('.f-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === f);
  });
  renderLeaveList();
}

function renderLeaveList() {
  const container = document.getElementById('leave-list-container');
  const today = new Date(); today.setHours(0,0,0,0);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  function inRange(rec) {
    const from = new Date(rec.fromDate + 'T00:00:00');
    const to   = new Date(rec.toDate   + 'T00:00:00');
    if (currentFilter === 'today') return from <= today && to >= today;
    if (currentFilter === 'week')  return from <= weekEnd && to >= today;
    if (currentFilter === 'month') return from <= monthEnd && to >= today;
    return true;
  }

  const filtered = leaveRecords.filter(inRange).sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate));

  if (filtered.length === 0) {
    container.innerHTML = `<div class="leave-empty">No leave records for this period</div>`;
    return;
  }

  // Group into sections
  const onNow = [], upcoming = [], later = [];
  filtered.forEach(rec => {
    const from = new Date(rec.fromDate + 'T00:00:00');
    const to   = new Date(rec.toDate   + 'T00:00:00');
    if (from <= today && to >= today) onNow.push(rec);
    else if (from > today && from <= weekEnd) upcoming.push(rec);
    else later.push(rec);
  });

  let html = '';

  if (onNow.length) {
    html += `<div class="leave-section"><div class="leave-section-title">On leave now — ${onNow.length} ${onNow.length === 1 ? 'person' : 'people'}</div>`;
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
  const dateStr    = rec.fromDate === rec.toDate
    ? formatDate(rec.fromDate)
    : `${formatDate(rec.fromDate)} – ${formatDate(rec.toDate)}`;

  return `<div class="leave-section">
    <div class="leave-card" onclick="showLeaveDetail('${escHtml(rec.recordId)}')">
      <div class="emp-avatar ${colorClass}" style="width:36px;height:36px;border-radius:10px;font-size:12px">${initials}</div>
      <div class="leave-info">
        <div class="leave-name">${escHtml(rec.employeeName || '—')}</div>
        <div class="leave-dates">${dateStr}</div>
      </div>
      <div class="leave-right">
        <span class="badge ${badgeClass}">${escHtml(rec.leaveType)}</span>
        <span class="leave-days">${rec.workingDays || '—'} days</span>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────
//  LEAVE DETAIL + DELETE
// ─────────────────────────────────────────

function showLeaveDetail(recordId) {
  const rec = leaveRecords.find(r => r.recordId === recordId);
  if (!rec) return;
  selectedLeaveId = recordId;
  pageHistory.push(() => showLeaveOverview());

  const dateStr = rec.fromDate === rec.toDate
    ? formatDate(rec.fromDate)
    : `${formatDate(rec.fromDate)} – ${formatDate(rec.toDate)}`;

  const initials   = getInitials(rec.employeeName || '?');
  const colorClass = 'av-' + (Math.abs(hashStr(rec.employeeName || '')) % 8);
  const badgeClass = leaveTypeBadge(rec.leaveType);

  // Reuse profile page for leave detail
  document.getElementById('profile-content').innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar ${colorClass}">${initials}</div>
      <div>
        <div class="profile-name">${escHtml(rec.employeeName || '—')}</div>
        <div class="profile-role">${dateStr}</div>
        <div class="profile-badges"><span class="badge ${badgeClass}">${escHtml(rec.leaveType)}</span></div>
      </div>
    </div>
    <div class="profile-sections">
      <div class="profile-card">
        <div class="profile-card-title">Leave details</div>
        ${fRow('Leave type', rec.leaveType, true)}
        ${fRow('From', formatDate(rec.fromDate), true)}
        ${fRow('To', formatDate(rec.toDate), true)}
        ${fRow('Working days', rec.workingDays ? rec.workingDays + ' days' : '—', true)}
        ${rec.notes ? fRow('Notes', rec.notes, true) : ''}
      </div>
      <div class="profile-card">
        <div class="profile-card-title">Record info</div>
        ${fRow('Record ID', rec.recordId)}
        ${fRow('Logged by', rec.loggedBy || '—', true)}
        ${fRow('Logged on', formatDate(rec.loggedOn), true)}
      </div>
    </div>
    <div style="padding: 0 14px 30px;">
      <button class="delete-leave-btn" onclick="confirmDeleteLeave('${escHtml(recordId)}')">
        Delete this leave record
      </button>
    </div>
  `;

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
//  CALENDAR
// ─────────────────────────────────────────

function showCalendar() {
  pageHistory.push(() => showLeaveOverview());
  renderCalendar();
  showPage('calendar', 'Calendar', true, false, true);
}

function renderCalendar() {
  const container = document.getElementById('calendar-container');
  const today = new Date(); today.setHours(0,0,0,0);
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Build days-in-month grid
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth + 1, 0);

  // Adjust for Mon start (UAE)
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0

  // Map leave records to days
  const leaveDays = {};
  leaveRecords.forEach(rec => {
    let cur = new Date(rec.fromDate + 'T00:00:00');
    const end = new Date(rec.toDate + 'T00:00:00');
    while (cur <= end) {
      if (cur.getMonth() === calMonth && cur.getFullYear() === calYear) {
        const key = cur.getDate();
        leaveDays[key] = (leaveDays[key] || 0) + 1;
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  let cells = '';
  // Empty cells
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-d other-month"></div>`;
  // Day cells
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const count = leaveDays[d] || 0;
    let cls = 'cal-d';
    if (isToday) cls += ' today';
    if (count === 1) cls += ' has-leave';
    if (count >= 2) cls += ' multi-leave';
    if (selectedCalDay === d) cls += ' selected';
    const dot = count > 0 ? '<div class="cal-dot"></div>' : '';
    cells += `<div class="${cls}" onclick="selectCalDay(${d})">${d}${dot}</div>`;
  }

  // Detail for selected day
  let detail = '';
  if (selectedCalDay) {
    const sel = new Date(calYear, calMonth, selectedCalDay);
    const dayRecs = leaveRecords.filter(rec => {
      const from = new Date(rec.fromDate + 'T00:00:00');
      const to   = new Date(rec.toDate   + 'T00:00:00');
      return from <= sel && to >= sel;
    });
    detail = `<div class="cal-day-detail">
      <div class="cal-day-detail-title">${selectedCalDay} ${monthNames[calMonth]} — ${dayRecs.length ? dayRecs.length + ' on leave' : 'No leave'}</div>
      ${dayRecs.map(r => leaveCardHtml(r)).join('')}
    </div>`;
  }

  container.innerHTML = `
    <div class="cal-wrap">
      <div class="cal-head">
        <button class="cal-nav" onclick="calNav(-1)">‹</button>
        <div class="cal-month">${monthNames[calMonth]} ${calYear}</div>
        <button class="cal-nav" onclick="calNav(1)">›</button>
      </div>
      <div class="cal-grid">
        <div class="cal-dh">Mon</div><div class="cal-dh">Tue</div><div class="cal-dh">Wed</div>
        <div class="cal-dh">Thu</div><div class="cal-dh">Fri</div><div class="cal-dh">Sat</div><div class="cal-dh">Sun</div>
        ${cells}
      </div>
      <div class="cal-legend">
        <div class="leg-item"><div class="leg-dot" style="background:var(--accent-dim);border:0.5px solid rgba(200,184,130,0.3)"></div>1 person</div>
        <div class="leg-item"><div class="leg-dot" style="background:var(--green-dim);border:0.5px solid rgba(74,124,82,0.3)"></div>2+ people</div>
      </div>
    </div>
    ${detail}
  `;
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

let selectedEmpForLeave = null;

function renderLeaveForm() {
  const today = new Date().toISOString().split('T')[0];
  selectedEmpForLeave = null;

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
        ${LEAVE_TYPES.map(t => `<option value="${t.value}">${t.value}</option>`).join('')}
      </select>
    </div>
    <div class="form-row-2">
      <div class="form-group">
        <label class="form-label">From *</label>
        <input class="form-input" id="lf-from" type="date" value="${today}" oninput="updateDuration()" />
      </div>
      <div class="form-group">
        <label class="form-label">To *</label>
        <input class="form-input" id="lf-to" type="date" value="${today}" oninput="updateDuration()" />
      </div>
    </div>
    <div class="duration-card" id="lf-duration">
      <div class="duration-label">Duration</div>
      <div class="duration-val">1 working day</div>
      <div class="duration-sub">Sun–Thu working week</div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes <span style="font-size:10px;color:var(--text3);text-transform:none;letter-spacing:0">(optional)</span></label>
      <input class="form-input" id="lf-notes" placeholder="e.g. cover arranged with James" />
    </div>
    <button class="form-save-btn" id="lf-save-btn" onclick="saveLeave()">Save leave record</button>
  `;

  updateDuration();
}

function openEmpSearch() {
  filterEmpSearch();
  document.getElementById('emp-search-results').classList.add('open');
}

function filterEmpSearch() {
  const q = document.getElementById('lf-emp-search').value.toLowerCase();
  const results = document.getElementById('emp-search-results');
  const filtered = employees.filter(e => e.name.toLowerCase().includes(q)).slice(0, 8);

  if (filtered.length === 0) {
    results.innerHTML = `<div class="emp-result-item" style="color:var(--text3)">No results</div>`;
  } else {
    results.innerHTML = filtered.map(e => `
      <div class="emp-result-item" onclick="selectEmp('${escHtml(e.id)}','${escHtml(e.name)}')">
        <div>${escHtml(e.name)}</div>
        <div class="emp-result-sub">${escHtml(e.position || e.id)}</div>
      </div>`).join('');
  }
  results.classList.add('open');
}

function selectEmp(id, name) {
  selectedEmpForLeave = { id, name };
  document.getElementById('lf-emp-search').value = name;
  document.getElementById('lf-emp-id').value     = id;
  document.getElementById('lf-emp-name').value   = name;
  document.getElementById('emp-search-results').classList.remove('open');
}

// Close dropdown on outside tap
document.addEventListener('click', e => {
  const wrap = document.getElementById('emp-search-results');
  if (wrap && !wrap.contains(e.target) && e.target.id !== 'lf-emp-search') {
    wrap.classList.remove('open');
  }
});

function updateDuration() {
  const from = document.getElementById('lf-from')?.value;
  const to   = document.getElementById('lf-to')?.value;
  const card = document.getElementById('lf-duration');
  if (!from || !to || !card) return;

  const f = new Date(from + 'T00:00:00');
  const t = new Date(to   + 'T00:00:00');
  if (t < f) { card.querySelector('.duration-val').textContent = 'Invalid range'; return; }

  const days = workingDays(f, t);
  card.querySelector('.duration-val').textContent = `${days} working day${days !== 1 ? 's' : ''}`;
  card.querySelector('.duration-sub').textContent =
    `${f.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} – ${t.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}`;
}

async function saveLeave() {
  const empName = document.getElementById('lf-emp-name').value.trim();
  const empId   = document.getElementById('lf-emp-id').value.trim();
  const type    = document.getElementById('lf-type').value;
  const from    = document.getElementById('lf-from').value;
  const to      = document.getElementById('lf-to').value;

  if (!empName) { alert('Please select an employee.'); return; }
  if (!from || !to) { alert('Please select dates.'); return; }
  if (new Date(to + 'T00:00:00') < new Date(from + 'T00:00:00')) { alert('End date must be after start date.'); return; }

  const btn = document.getElementById('lf-save-btn');
  btn.textContent = 'Saving…'; btn.disabled = true;

  const days = workingDays(new Date(from + 'T00:00:00'), new Date(to + 'T00:00:00'));
  const record = {
    recordId:     'LV-' + Date.now(),
    employeeName: empName,
    employeeId:   empId,
    leaveType:    type,
    fromDate:     from,
    toDate:       to,
    workingDays:  days,
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
