const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
const me = JSON.parse(localStorage.getItem('user')||'{}');

window.addEventListener('DOMContentLoaded', () => {
  // All roles can record sales now
  loadProducts();
  loadSales();
});

async function loadProducts() {
  const res  = await fetch('/api/products', { headers });
  const data = await res.json();
  const sel  = document.getElementById('sale-product');
  if (!sel) return;
  const available = data.filter(p => (p.quantity||0) > 0);
  sel.innerHTML = available.map(p =>
    `<option value="${p._id}">${p.name} (Stock: ${p.quantity})</option>`
  ).join('');
  if (!available.length) {
    sel.innerHTML = '<option value="">No products in stock</option>';
  }
}

async function loadSales() {
  const res = await fetch('/api/sales', { headers });
  if (!res.ok) {
    document.getElementById('sales-table').innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">Could not load sales.</td></tr>';
    return;
  }
  const sales = await res.json();
  const lbl = document.getElementById('sales-total-label');
  if (lbl) lbl.textContent = `${sales.length} total sales`;
  const tbody = document.getElementById('sales-table');
  if (!tbody) return;
  if (!sales.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No sales recorded yet</td></tr>';
    return;
  }
  tbody.innerHTML = sales.slice(0,50).map(s => `
    <tr>
      <td>${s.product?.name || s.productName || '—'}</td>
      <td>${Math.max(0,s.quantity||0)}</td>
      <td>${fmtCurrency(s.unitPrice||s.product?.price||0)}</td>
      <td>${fmtCurrency(s.totalPrice)}</td>
      <td>${fmtDate(s.saleDate)}</td>
      <td>${s.soldByName||s.soldBy?.name||'—'}</td>
    </tr>`).join('');
}

async function recordSale() {
  const product  = document.getElementById('sale-product')?.value;
  const quantity = +document.getElementById('sale-qty')?.value;
  const msgEl    = document.getElementById('sale-msg');
  if (!product)    { msgEl.innerHTML='<div class="alert alert-danger">Please select a product.</div>'; return; }
  if (quantity<1)  { msgEl.innerHTML='<div class="alert alert-danger">Quantity must be at least 1.</div>'; return; }
  const res  = await fetch('/api/sales', { method:'POST', headers, body:JSON.stringify({product,quantity}) });
  const data = await res.json();
  if (res.ok) {
    msgEl.innerHTML=`<div class="alert alert-success">&#10003; Sale recorded! Total: ${fmtCurrency(data.totalPrice)}</div>`;
    document.getElementById('sale-qty').value='1';
    loadProducts(); loadSales();
    setTimeout(()=>msgEl.innerHTML='',4000);
  } else {
    msgEl.innerHTML=`<div class="alert alert-danger">${data.message}</div>`;
  }
}

function logoutUser() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='index.html'; }
