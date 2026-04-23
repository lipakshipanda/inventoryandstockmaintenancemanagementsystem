const SIDEBAR_USER = JSON.parse(localStorage.getItem('user') || '{}');

function buildSidebar() {
  const role = SIDEBAR_USER.role || 'staff';
  const name = SIDEBAR_USER.name || 'User';
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const avatar = SIDEBAR_USER.avatar
    ? `<img src="${SIDEBAR_USER.avatar}" alt="" style="width:100%;height:100%;object-fit:cover">`
    : initials;
  const cur = window.location.pathname.split('/').pop() || 'index.html';

  function nav(href, icon, label, extra) {
    return `<a href="${href}" class="nav-item ${cur===href?'active':''}">${icon ? `<span class="nav-icon">${icon}</span>` : ''}<span>${label}</span>${extra||''}</a>`;
  }

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="logo-icon">📦</div>
      <div><div class="logo-text">InvenTrack</div><div class="logo-sub">Management System</div></div>
    </div>
    <div class="sidebar-user">
      <div class="u-avatar">${avatar}</div>
      <div class="u-info"><div class="u-name">${name}</div><div class="u-role">${role}</div></div>
    </div>
    <div class="sidebar-section"><div class="sidebar-section-label">Main</div></div>
    <div class="sidebar-nav" style="padding-top:0">
      ${nav('dashboard.html','🏠','Home')}
      ${nav('products.html','📦','Products')}
      ${nav('purchases.html','🛒','Purchases')}
      ${nav('sales.html','💰','Sales')}
      ${nav('complaints.html','📋','Complaints')}
      ${nav('profile.html','👤','My Profile')}
    </div>
    ${role!=='staff'?`
    <div class="sidebar-section"><div class="sidebar-section-label">Analytics</div></div>
    <div class="sidebar-nav" style="padding-top:0">
      ${nav('reports.html','📊','Reports & Analytics')}
      ${nav('alerts.html','🔔','Stock Alerts')}
    </div>`:''}
    ${role==='admin'?`
    <div class="sidebar-section"><div class="sidebar-section-label">Administration</div></div>
    <div class="sidebar-nav" style="padding-top:0">
      ${nav('users.html','👥','User Management')}
    </div>`:''}
    <div style="flex:1"></div>
    <div class="sidebar-footer">
      <a class="nav-item" href="#" onclick="logoutUser()"><span class="nav-icon">🚪</span><span>Logout</span></a>
    </div>`;
}

function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function initSidebarToggle() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle) return;
  toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
  if (overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
}

function requireAuth() {
  if (!localStorage.getItem('token')) { window.location.href = 'index.html'; return false; }
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  buildSidebar();
  initSidebarToggle();
});

function fmtCurrency(v) { return '₹' + Math.max(0,v||0).toLocaleString('en-IN',{maximumFractionDigits:0}); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
