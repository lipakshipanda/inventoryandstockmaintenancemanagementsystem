const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
const me = JSON.parse(localStorage.getItem('user')||'{}');

function switchTab(name,btn) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('tab-'+name);if(el)el.classList.add('active');
  if(btn)btn.classList.add('active');
}

function getInitials(name){return(name||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);}

async function loadProfile(){
  const res=await fetch('/api/profile',{headers});
  if(!res.ok){console.error('Profile load failed');return;}
  const user=await res.json();

  const nm=document.getElementById('profile-name-display');if(nm)nm.textContent=user.name||'—';
  const ini=document.getElementById('avatar-initials');if(ini)ini.textContent=getInitials(user.name);
  const badge=document.getElementById('profile-role-badge');
  if(badge){badge.textContent=user.role;badge.className='badge '+(user.role==='admin'?'badge-green':user.role==='manager'?'badge-orange':'badge-red');}

  const fields={'edit-name':user.name,'edit-email':user.email,'edit-address':user.address||'','edit-phone':user.phone||'','edit-department':user.department||''};
  Object.entries(fields).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});

  const sal=user.salary||0;
  const sd=document.getElementById('salary-display');if(sd)sd.textContent='₹'+sal.toLocaleString('en-IN');
  const sn=document.getElementById('salary-note');if(sn)sn.textContent=sal>0?'Per month (gross)':'Not set — contact admin';

  const ms=document.getElementById('member-since');
  if(ms)ms.textContent=user.createdAt?new Date(user.createdAt).toLocaleDateString('en-IN',{month:'long',year:'numeric'}):'—';

  if(user.avatar){
    const img=document.getElementById('avatar-img');
    if(img){img.src=user.avatar;img.style.display='block';}
    const ini2=document.getElementById('avatar-initials');if(ini2)ini2.style.display='none';
  }
  loadActivity(user._id);
}

async function loadActivity(userId){
  try {
    const res=await fetch('/api/sales',{headers});
    if(!res.ok)return;
    const sales=await res.json();
    const mine=sales.filter(s=>s.soldByName===me.name||String(s.soldBy)===String(userId)||String(s.soldBy?._id)===String(userId));
    const rev=mine.reduce((s,x)=>s+(x.totalPrice||0),0);
    const sc=document.getElementById('my-sales-count');if(sc)sc.textContent=mine.length.toLocaleString();
    const sr=document.getElementById('my-revenue');if(sr)sr.textContent='₹'+rev.toLocaleString('en-IN',{maximumFractionDigits:0});
  } catch(e){}
}

async function saveProfile(){
  const body={
    name:(document.getElementById('edit-name')?.value||'').trim(),
    email:(document.getElementById('edit-email')?.value||'').trim(),
    address:(document.getElementById('edit-address')?.value||'').trim(),
    phone:(document.getElementById('edit-phone')?.value||'').trim(),
    department:(document.getElementById('edit-department')?.value||'').trim()
  };
  const msgEl=document.getElementById('info-msg');
  if(!body.name||!body.email){msgEl.innerHTML='<span style="color:var(--danger)">Name and email required.</span>';return;}
  const res=await fetch('/api/profile',{method:'PUT',headers,body:JSON.stringify(body)});
  const data=await res.json();
  if(res.ok){
    msgEl.innerHTML='<span style="color:var(--success)">✓ Profile updated!</span>';
    const stored=JSON.parse(localStorage.getItem('user')||'{}');
    stored.name=body.name;stored.email=body.email;
    localStorage.setItem('user',JSON.stringify(stored));
    const nm=document.getElementById('profile-name-display');if(nm)nm.textContent=body.name;
    const ini=document.getElementById('avatar-initials');if(ini)ini.textContent=getInitials(body.name);
  } else {
    msgEl.innerHTML=`<span style="color:var(--danger)">${data.message}</span>`;
  }
}

async function changePassword(){
  const current=document.getElementById('current-password')?.value||'';
  const newPwd=document.getElementById('new-password')?.value||'';
  const confirm=document.getElementById('confirm-password')?.value||'';
  const msgEl=document.getElementById('pwd-msg');
  if(!current||!newPwd||!confirm){msgEl.innerHTML='<span style="color:var(--danger)">Fill in all fields.</span>';return;}
  if(newPwd.length<4){msgEl.innerHTML='<span style="color:var(--danger)">Min 4 characters.</span>';return;}
  if(newPwd!==confirm){msgEl.innerHTML='<span style="color:var(--danger)">Passwords do not match.</span>';return;}
  const res=await fetch('/api/profile/password',{method:'PUT',headers,body:JSON.stringify({currentPassword:current,newPassword:newPwd})});
  const data=await res.json();
  if(res.ok){
    msgEl.innerHTML='<span style="color:var(--success)">✓ Password changed!</span>';
    ['current-password','new-password','confirm-password'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  } else {
    msgEl.innerHTML=`<span style="color:var(--danger)">${data.message}</span>`;
  }
}

function uploadAvatar(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    const avatar=e.target.result;
    const res=await fetch('/api/profile',{method:'PUT',headers,body:JSON.stringify({avatar})});
    if(res.ok){
      const img=document.getElementById('avatar-img');
      if(img){img.src=avatar;img.style.display='block';}
      const ini=document.getElementById('avatar-initials');if(ini)ini.style.display='none';
    }
  };
  reader.readAsDataURL(file);
}

loadProfile();
