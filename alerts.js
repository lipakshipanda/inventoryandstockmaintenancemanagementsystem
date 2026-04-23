const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}` };
const me = JSON.parse(localStorage.getItem('user')||'{}');
if (me.role==='staff') { alert('Access denied.'); window.location.href='dashboard.html'; }

let allAlerts=[], allProducts=[], activeFilter='all';
// FIX: Track which product is being reordered
let reorderProductId = null;
let reorderProductName = '';

async function loadAlerts() {
  const [lowRes, invRes] = await Promise.all([
    fetch('/api/products/lowstock',{headers}),
    fetch('/api/reports/inventory',{headers})
  ]);
  allAlerts   = await lowRes.json();
  const inv   = await invRes.json();
  allProducts = inv.products||[];

  const critical = allAlerts.filter(p=>(p.quantity||0)===0);
  const warning  = allAlerts.filter(p=>(p.quantity||0)>0);
  const healthy  = allProducts.length - allAlerts.length;

  document.getElementById('count-critical').textContent = critical.length;
  document.getElementById('count-warning').textContent  = warning.length;
  document.getElementById('count-healthy').textContent  = Math.max(0,healthy);
  document.getElementById('count-total').textContent    = allProducts.length;
  renderTable();
}

function setFilter(f,btn) {
  activeFilter=f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderTable();
}

function renderTable() {
  const search=(document.getElementById('alert-search')?.value||'').toLowerCase();
  let data=[...allAlerts];
  if(activeFilter==='critical') data=data.filter(p=>(p.quantity||0)===0);
  if(activeFilter==='low')      data=data.filter(p=>(p.quantity||0)>0);
  if(search) data=data.filter(p=>(p.name||'').toLowerCase().includes(search)||(p.category||'').toLowerCase().includes(search));
  data.sort((a,b)=>(a.quantity||0)-(b.quantity||0));

  const tbody=document.getElementById('alerts-table');
  if(!data.length){
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">No alerts found</td></tr>';
    return;
  }
  tbody.innerHTML=data.map(p=>{
    const qty=p.quantity||0;
    const ro=p.reorderLevel||10;
    const short=Math.max(0,ro-qty);
    const isCrit=qty===0;
    return `<tr style="${isCrit?'background:#fef2f2':''}">
      <td><strong>${p.name}</strong></td>
      <td>${p.category||'—'}</td>
      <td><span class="badge ${isCrit?'badge-red':'badge-orange'}">${qty}</span></td>
      <td>${ro}</td>
      <td style="color:var(--danger);font-weight:600">-${short}</td>
      <td>${isCrit?'<span class="badge badge-red">Critical</span>':'<span class="badge badge-orange">Low stock</span>'}</td>
      <td><button class="btn btn-success btn-sm" onclick="openReorder('${p._id}','${(p.name||'').replace(/'/g,"\\'")}',${ro})">+ Reorder</button></td>
    </tr>`;
  }).join('');
}

// FIX: Reorder opens inline form on same page
function openReorder(id, name, suggestedQty) {
  reorderProductId   = id;
  reorderProductName = name;
  document.getElementById('ro-product-name').textContent = name;
  document.getElementById('ro-qty').value     = suggestedQty || 10;
  document.getElementById('ro-cost').value    = '';
  document.getElementById('ro-supplier').value= '';
  document.getElementById('ro-msg').innerHTML = '';
  document.getElementById('reorder-modal').classList.add('open');
}

function closeReorderModal() {
  document.getElementById('reorder-modal').classList.remove('open');
}

async function submitReorder() {
  const quantity  = Math.max(1,parseInt(document.getElementById('ro-qty')?.value||'1'));
  const costPrice = Math.max(0,parseFloat(document.getElementById('ro-cost')?.value||'0'));
  const supplier  = (document.getElementById('ro-supplier')?.value||'').trim();
  const msgEl     = document.getElementById('ro-msg');

  if (!reorderProductId) { msgEl.innerHTML='<div class="alert alert-danger">No product selected.</div>'; return; }
  if (quantity<1)        { msgEl.innerHTML='<div class="alert alert-danger">Quantity must be at least 1.</div>'; return; }

  const hdrs = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
  const res  = await fetch('/api/purchases', {
    method:'POST', headers:hdrs,
    body:JSON.stringify({
      product:      reorderProductId,
      productName:  reorderProductName,
      quantity,
      costPrice,
      supplierName: supplier || 'Reorder',
      purchasedByName: me.name || 'Admin'
    })
  });
  const data = await res.json();
  if (res.ok) {
    msgEl.innerHTML=`<div class="alert alert-success">&#10003; Reorder recorded! ${quantity} units added to stock.</div>`;
    setTimeout(()=>{ closeReorderModal(); loadAlerts(); },1500);
  } else {
    msgEl.innerHTML=`<div class="alert alert-danger">${data.message}</div>`;
  }
}

function logoutUser() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='index.html'; }
loadAlerts();
