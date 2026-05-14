// ─────────────────────────────────────────
//  CONFIGURATION — edit these values
// ─────────────────────────────────────────

const CONFIG = {
  PIN: '1234',                      // Change this PIN before going live
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx6MfE6LumBNy2MD4Fl6rqM2QLqaBt7Ik_LsXvsngVmYLQn6CUPTOEUz8BE1XeKVBVELw/exec',  // Paste your Apps Script Web App URL here after deploying
  APP_NAME: 'Subko Staff Hub',
  COMPANY:  'Subko Coffee'
};

// Leave type definitions
const LEAVE_TYPES = [
  { value: 'Annual Leave',    badge: 'badge-annual'  },
  { value: 'Sick Leave',      badge: 'badge-sick'    },
  { value: 'Bereavement',     badge: 'badge-bv'      },
  { value: 'Study Leave',     badge: 'badge-study'   },
  { value: 'Public Holiday',  badge: 'badge-ph'      },
  { value: 'Unpaid Leave',    badge: 'badge-unpaid'  },
];

function leaveTypeBadge(type) {
  const t = LEAVE_TYPES.find(l => l.value === type);
  return t ? t.badge : 'badge-annual';
}
