const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
const me = JSON.parse(localStorage.getItem('user')||'{}');
let productsCache = [];

window.addEventListener('DOMContentLoaded', () => {
  if (me.role==='staff') {
    const fc = document.getElementById('purchase-form-card');
    if (fc) fc.innerHTML='<div class="alert alert-danger" style="margin:0">&#9940; Staff cannot record purchases. Only Managers and Admins.</div>';
  } else {
    loadProducts();
  }
  loadPurchases();
});

async function loadProducts() {
  const res  = await fetch('/api/products', { headers });
  const data = await res.json();
  productsCache = data;
  const sel = document.getElementById('purchase-product');
  if (!sel) return;
  sel.innerHTML = data.map(p =>
    `<option value="${p._id}" data-qty="${p.quantity||0}" data-price="${p.price||0}">${p.name} — Stock: ${p.quantity||0}</option>`
  ).join('');
  sel.addEventListener('change', () => {
    const opt = sel.options[sel.selectedIndex];
    const price = opt?.getAttribute('data-price');
    if (price) document.getElementById('purchase-cost').value = parseFloat(price).toFixed(2);
    updatePreview();
  });
  if (sel.options.length>0) {
    const opt = sel.options[0];
    const price = opt?.getAttribute('data-price');
    if (price) document.getElementById('purchase-cost').value = parseFloat(price).toFixed(2);
    updatePreview();
  }
  document.getElementById('purchase-qty')?.addEventListener('input', updatePreview);
}

function updatePreview() {
  const sel   = document.getElementById('purchase-product');
  const qtyEl = document.getElementById('purchase-qty');
  const prev  = document.getElementById('stock-preview');
  if (!sel||!qtyEl||!prev) return;
  const opt     = sel.options[sel.selectedIndex];
  const current = parseInt(opt?.getAttribute('data-qty')||'0');
  const adding  = Math.max(0,parseInt(qtyEl.value)||0);
  const after   = current + adding;
  // FIX: Show only current stock and after purchase total
  document.getElementById('prev-current').textContent = current.toLocaleString();
  document.getElementById('prev-after').textContent   = after.toLocaleString();
  prev.style.display='block';
}

async function loadPurchases() {
  const res  = await fetch('/api/purchases', { headers });
  if (!res.ok) {
    document.getElementById('purchases-table').innerHTML=
      '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">No purchases yet</td></tr>';
    return;
  }
  const data = await res.json();
  const cnt = document.getElementById('purchase-count');
  if (cnt) cnt.textContent = `${data.length} purchase${data.length!==1?'s':''} recorded`;
  const tbody = document.getElementById('purchases-table');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">No purchases recorded yet</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.productName||'—'}</td>
      <td><span class="badge badge-green">+${p.quantity}</span></td>
      <td>${fmtCurrency(p.costPrice)}</td>
      <td>${fmtCurrency(p.costPrice*p.quantity)}</td>
      <td>${p.supplierName||'—'}</td>
      <td>${fmtDate(p.purchaseDate)}</td>
      <td>${p.purchasedByName||'—'}</td>
    </tr>`).join('');
}

async function recordPurchase() {
  const sel       = document.getElementById('purchase-product');
  const productId = sel?.value;
  const quantity  = Math.max(1,parseInt(document.getElementById('purchase-qty')?.value||'1'));
  const costPrice = Math.max(0,parseFloat(document.getElementById('purchase-cost')?.value||'0'));
  const supplier  = (document.getElementById('purchase-supplier-name')?.value||'').trim();
  const msgEl     = document.getElementById('purchase-msg');

  if (!productId) { msgEl.innerHTML='<span style="color:var(--danger)">Please select a product.</span>'; return; }
  if (quantity<1) { msgEl.innerHTML='<span style="color:var(--danger)">Quantity must be at least 1.</span>'; return; }

  const opt = sel.options[sel.selectedIndex];
  const productName = (opt?.text||'').split(' — ')[0];

  const res  = await fetch('/api/purchases', {
    method:'POST', headers,
    body:JSON.stringify({ product:productId, productName, quantity, costPrice, supplierName:supplier, purchasedByName:me.name })
  });
  const data = await res.json();
  if (res.ok) {
    msgEl.innerHTML=`<span style="color:var(--success)">&#10003; Purchase recorded! ${quantity} units added. Total: ${fmtCurrency(quantity*costPrice)}</span>`;
    document.getElementById('purchase-qty').value='1';
    document.getElementById('purchase-supplier-name').value='';
    await loadProducts();
    await loadPurchases();
    updatePreview();
    setTimeout(()=>msgEl.innerHTML='',5000);
  } else {
    msgEl.innerHTML=`<span style="color:var(--danger)">${data.message}</span>`;
  }
}

function logoutUser() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='index.html'; }
