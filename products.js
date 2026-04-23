const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
const me = JSON.parse(localStorage.getItem('user')||'{}');
let allProducts=[], editingId=null;

window.addEventListener('DOMContentLoaded',()=>{
  const addBtn=document.getElementById('add-btn');
  if(addBtn&&me.role==='staff')addBtn.style.display='none';
});

function toggleForm(reset){
  const f=document.getElementById('product-form');if(!f)return;
  const show=f.style.display==='none'||f.style.display==='';
  f.style.display=show?'block':'none';
  if(show&&reset!==false){
    clearForm();editingId=null;
    const t=f.querySelector('.card-title');if(t)t.textContent='Add New Product';
    const s=document.getElementById('save-btn');if(s)s.textContent='Save Product';
  }
}

function clearForm(){
  ['p-name','p-category','p-quantity','p-price','p-reorder','p-expiry','p-description'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value=id==='p-reorder'?'10':id==='p-quantity'?'0':'';
  });
  const m=document.getElementById('p-msg');if(m)m.innerHTML='';
}

async function loadProducts(){
  const res=await fetch('/api/products',{headers});
  const data=await res.json();
  allProducts=Array.isArray(data)?data:[];
  const cnt=document.getElementById('prod-count');
  if(cnt)cnt.textContent=`${allProducts.length} products total`;
  renderTable(allProducts);
}

function filterProducts(){
  const q=(document.getElementById('prod-search')?.value||'').toLowerCase();
  renderTable(allProducts.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.category||'').toLowerCase().includes(q)));
}

function renderTable(products){
  const tbody=document.getElementById('products-table');if(!tbody)return;
  if(!products.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px">No products found</td></tr>';return;}
  const canEdit=me.role==='admin'||me.role==='manager';
  tbody.innerHTML=products.map(p=>{
    const qty=Math.max(0,p.quantity||0),price=Math.max(0,p.price||0),ro=p.reorderLevel||10;
    const isLow=qty<=ro;
    const val=(qty*price).toLocaleString('en-IN',{maximumFractionDigits:0});
    const acts=canEdit
      ?`<div style="display:flex;gap:6px"><button class="btn btn-sm btn-outline" onclick="editProduct('${p._id}')">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteProduct('${p._id}','${(p.name||'').replace(/'/g,"\\'")}')">Delete</button></div>`
      :'<span style="font-size:12px;color:var(--text-muted)">View only</span>';
    return `<tr>
      <td><div style="font-weight:600;font-size:13px">${p.name}</div>${p.subCategory?`<div style="font-size:11px;color:var(--text-muted)">${p.subCategory}</div>`:''}</td>
      <td>${p.category||'—'}</td>
      <td><span style="font-weight:600;color:${isLow?'var(--danger)':'var(--text)'}">${qty}</span><span style="font-size:11px;color:var(--text-muted)"> / ${ro}</span></td>
      <td>₹${price.toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
      <td>₹${val}</td>
      <td>${isLow?'<span class="badge badge-red">Low Stock</span>':'<span class="badge badge-green">In Stock</span>'}</td>
      <td>${acts}</td>
    </tr>`;
  }).join('');
}

async function addProduct(){
  const name=(document.getElementById('p-name')?.value||'').trim();
  const cat=(document.getElementById('p-category')?.value||'').trim();
  const qty=parseInt(document.getElementById('p-quantity')?.value||'0');
  const price=parseFloat(document.getElementById('p-price')?.value||'0');
  const ro=parseInt(document.getElementById('p-reorder')?.value||'10');
  const exp=document.getElementById('p-expiry')?.value||'';
  const desc=(document.getElementById('p-description')?.value||'').trim();
  const msgEl=document.getElementById('p-msg');

  if(!name)            {msgEl.innerHTML='<div class="alert alert-danger">Product name required.</div>';return;}
  if(!cat)             {msgEl.innerHTML='<div class="alert alert-danger">Category required.</div>';return;}
  if(isNaN(qty)||qty<0){msgEl.innerHTML='<div class="alert alert-danger">Quantity cannot be negative.</div>';return;}
  if(isNaN(price)||price<0){msgEl.innerHTML='<div class="alert alert-danger">Price cannot be negative.</div>';return;}
  if(isNaN(ro)||ro<0)  {msgEl.innerHTML='<div class="alert alert-danger">Reorder level cannot be negative.</div>';return;}

  const body={name,category:cat,quantity:Math.max(0,qty),price:Math.max(0,price),reorderLevel:Math.max(0,ro),description:desc};
  if(exp)body.expiryDate=exp;

  const url=editingId?`/api/products/${editingId}`:'/api/products';
  const method=editingId?'PUT':'POST';
  const res=await fetch(url,{method,headers,body:JSON.stringify(body)});
  const data=await res.json();
  if(res.ok){
    msgEl.innerHTML=`<div class="alert alert-success">${editingId?'Product updated!':'Product added!'}</div>`;
    editingId=null;
    setTimeout(()=>{toggleForm();loadProducts();},800);
  } else {
    msgEl.innerHTML=`<div class="alert alert-danger">${data.message||'Error saving'}</div>`;
  }
}

async function editProduct(id){
  let prod=allProducts.find(p=>String(p._id)===id);
  if(!prod){const res=await fetch(`/api/products/${id}`,{headers});prod=await res.json();}
  const f=document.getElementById('product-form');
  if(f)f.style.display='block';
  const t=f?.querySelector('.card-title');if(t)t.textContent='Edit Product';
  const s=document.getElementById('save-btn');if(s)s.textContent='Update Product';
  const vals={'p-name':prod.name,'p-category':prod.category,'p-quantity':Math.max(0,prod.quantity||0),'p-price':Math.max(0,prod.price||0),'p-reorder':prod.reorderLevel||10,'p-description':prod.description||''};
  Object.entries(vals).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});
  if(prod.expiryDate){const expEl=document.getElementById('p-expiry');if(expEl)expEl.value=new Date(prod.expiryDate).toISOString().split('T')[0];}
  document.getElementById('p-msg').innerHTML='';
  editingId=id;
  f?.scrollIntoView({behavior:'smooth',block:'start'});
}

async function deleteProduct(id,name){
  if(!confirm(`Delete "${name}"?\nThis cannot be undone.`))return;
  const res=await fetch(`/api/products/${id}`,{method:'DELETE',headers});
  const data=await res.json();
  if(res.ok)loadProducts();else alert(data.message||'Failed to delete');
}

loadProducts();
