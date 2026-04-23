const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
const me = JSON.parse(localStorage.getItem('user')||'{}');

async function loadDashboard() {
  const role=me.role||'staff';
  const sub=document.getElementById('topbar-sub');
  if(sub)sub.textContent=`Welcome back, ${me.name||'User'}`;

  if(role==='staff'){
    document.getElementById('admin-view').style.display='none';
    document.getElementById('staff-view').style.display='block';
    const sn=document.getElementById('staff-name');if(sn)sn.textContent=me.name||'Staff';
    loadStaffProducts();loadStaffSales();return;
  }

  // Admin / Manager
  try {
    const res=await fetch('/api/reports/inventory',{headers});
    const data=await res.json();
    if(res.ok){
      document.getElementById('total-products').textContent=(data.totalProducts||0).toLocaleString();
      document.getElementById('total-value').textContent='₹'+(data.totalValue||0).toLocaleString('en-IN',{maximumFractionDigits:0});
      document.getElementById('low-stock').textContent=(data.lowStockCount||0).toString();
    }
  } catch(e){}

  try {
    const res=await fetch('/api/reports/sales',{headers});
    const data=await res.json();
    if(res.ok)document.getElementById('total-sales').textContent=(data.totalSales||0).toLocaleString();
  } catch(e){}

  try {
    const res=await fetch('/api/products/lowstock',{headers});
    const data=await res.json();
    const lbl=document.getElementById('alert-count-label');
    if(lbl)lbl.textContent=`${data.length} items need reorder`;
    const tbody=document.getElementById('low-stock-table');
    if(tbody){
      if(!data.length){
        tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">All stock is healthy ✓</td></tr>';
      } else {
        tbody.innerHTML=data.slice(0,8).map(p=>`<tr>
          <td>${p.name}</td>
          <td><span class="badge badge-red">${p.quantity}</span></td>
          <td>${p.reorderLevel}</td>
          <td><a href="alerts.html" class="btn btn-sm btn-success" style="text-decoration:none">Reorder</a></td>
        </tr>`).join('');
      }
    }
    // Alert dot
    if(data.length>0){
      const btn=document.getElementById('alert-btn');
      if(btn)btn.innerHTML='🔔<span class="notif-dot"></span>';
    }
  } catch(e){}

  // Complaints preview
  try {
    const res=await fetch('/api/complaints',{headers});
    const data=await res.json();
    const open=Array.isArray(data)?data.filter(c=>c.status!=='resolved'):[];
    const preview=document.getElementById('complaints-preview');
    if(preview){
      if(!open.length){
        preview.innerHTML='<div class="empty-state" style="padding:24px"><div class="empty-icon">✅</div><p>No open complaints</p></div>';
      } else {
        preview.innerHTML=open.slice(0,5).map(c=>{
          const dl=new Date(c.deadline),days=Math.ceil((dl-new Date())/86400000);
          const over=days<0;
          return `<div style="padding:12px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:13px;font-weight:600">${c.title}</div>
              <div style="font-size:11px;color:var(--text-muted)">${c.raisedByName} • ${c.category}</div>
            </div>
            <span class="badge ${over?'badge-red':days<=3?'badge-orange':'badge-gray'}">${over?'Overdue':days+'d'}</span>
          </div>`;
        }).join('');
      }
    }
  } catch(e){}
}

async function loadStaffProducts(){
  const res=await fetch('/api/products',{headers});
  const data=await res.json();
  const sel=document.getElementById('staff-product');if(!sel)return;
  const av=data.filter(p=>(p.quantity||0)>0);
  sel.innerHTML=av.map(p=>`<option value="${p._id}">${p.name} (Stock: ${p.quantity})</option>`).join('');
  if(!av.length)sel.innerHTML='<option value="">No products in stock</option>';
}

async function loadStaffSales(){
  const res=await fetch('/api/sales',{headers});
  if(!res.ok)return;
  const sales=await res.json();
  const tbody=document.getElementById('staff-sales-table');
  const mine=[...sales].filter(s=>s.soldByName===me.name||String(s.soldBy)===String(me._id)||String(s.soldBy?._id)===String(me._id)).slice(0,10);
  if(!tbody)return;
  if(!mine.length){tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px">No sales yet — use Quick Sale above</td></tr>';return;}
  tbody.innerHTML=mine.map(s=>`<tr>
    <td>${s.product?.name||s.productName||'—'}</td>
    <td>${Math.max(0,s.quantity||0)}</td>
    <td>₹${Math.max(0,s.totalPrice||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
    <td>${new Date(s.saleDate).toLocaleDateString('en-IN')}</td>
  </tr>`).join('');
}

async function quickSale(){
  const product=document.getElementById('staff-product')?.value;
  const quantity=+document.getElementById('staff-qty')?.value;
  const msgEl=document.getElementById('staff-sale-msg');
  if(!product){msgEl.innerHTML='<div class="alert alert-danger">Select a product.</div>';return;}
  if(quantity<1){msgEl.innerHTML='<div class="alert alert-danger">Quantity must be at least 1.</div>';return;}
  const res=await fetch('/api/sales',{method:'POST',headers,body:JSON.stringify({product,quantity})});
  const data=await res.json();
  if(res.ok){
    msgEl.innerHTML=`<div class="alert alert-success">✓ Sale recorded! Total: ₹${(data.totalPrice||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</div>`;
    document.getElementById('staff-qty').value='1';
    loadStaffProducts();loadStaffSales();
    setTimeout(()=>msgEl.innerHTML='',4000);
  } else {
    msgEl.innerHTML=`<div class="alert alert-danger">${data.message}</div>`;
  }
}

loadDashboard();
