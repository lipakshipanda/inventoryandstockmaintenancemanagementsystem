const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
const me = JSON.parse(localStorage.getItem('user')||'{}');
if (me.role!=='admin') { alert('Access denied. Admins only.'); window.location.href='dashboard.html'; }

function toggleForm() {
  const f=document.getElementById('user-form');
  f.style.display=f.style.display==='none'||f.style.display===''?'block':'none';
}

async function loadUsers() {
  const res   = await fetch('/api/users', { headers });
  const users = await res.json();
  if (!res.ok) { console.error(users.message); return; }
  const cnt = document.getElementById('user-count');
  if (cnt) cnt.textContent=`${users.length} members`;
  const tbody = document.getElementById('users-table');
  if (!users.length) { tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">No users found</td></tr>'; return; }

  tbody.innerHTML = users.map(u => {
    const isActive = u.active !== false;
    const initials = (u.name||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const avatar   = u.avatar
      ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : initials;
    return `<tr style="${!isActive?'opacity:0.6':''}" id="user-row-${u._id}">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:600;flex-shrink:0;overflow:hidden">${avatar}</div>
          <div><div style="font-size:13px;font-weight:600">${u.name}</div><div style="font-size:11px;color:var(--text-muted)">${u.email}</div></div>
        </div>
      </td>
      <td><span class="badge ${u.role==='admin'?'badge-green':u.role==='manager'?'badge-orange':'badge-red'}">${u.role}</span></td>
      <td>${u.createdAt?new Date(u.createdAt).toLocaleDateString('en-IN'):'—'}</td>
      <td>&#x20B9;${(u.salary||0).toLocaleString('en-IN')}</td>
      <td>
        <span class="badge ${isActive?'badge-green':'badge-red'}">${isActive?'Active':'Inactive'}</span>
      </td>
      <td>
        ${u.role==='admin'?'<span style="color:var(--text-muted);font-size:12px">Protected</span>'
          :`<select onchange="changeRole('${u._id}',this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);font-size:12px;font-family:var(--font)">
              <option value="staff"   ${u.role==='staff'  ?'selected':''}>Staff</option>
              <option value="manager" ${u.role==='manager'?'selected':''}>Manager</option>
            </select>`}
      </td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="showPasswordModal('${u._id}','${(u.name||'').replace(/'/g,"\\'")}')">Pwd</button>
          <button class="btn btn-sm" style="background:var(--purple);color:white" onclick="showSalaryModal('${u._id}','${(u.name||'').replace(/'/g,"\\'")}',${u.salary||0})">&#x20B9;</button>
          ${u.role!=='admin'?`
          <button class="btn btn-sm ${isActive?'btn-warning':'btn-success'}" onclick="toggleActive('${u._id}','${isActive}')">${isActive?'Deactivate':'Activate'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${u._id}','${(u.name||'').replace(/'/g,"\\'")}')">Del</button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function showPasswordModal(id,name) {
  document.getElementById('modal-username').textContent=name;
  document.getElementById('modal-user-id').value=id;
  document.getElementById('modal-new-password').value='';
  document.getElementById('modal-msg').innerHTML='';
  document.getElementById('password-modal').classList.add('open');
}

function showSalaryModal(id,name,current) {
  document.getElementById('salary-username').textContent=name;
  document.getElementById('salary-user-id').value=id;
  document.getElementById('salary-amount').value=current;
  document.getElementById('salary-msg').innerHTML='';
  document.getElementById('salary-modal').classList.add('open');
}

function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open'));
}

async function savePassword() {
  const id=document.getElementById('modal-user-id').value;
  const pw=document.getElementById('modal-new-password').value.trim();
  const msg=document.getElementById('modal-msg');
  if(!pw||pw.length<4){msg.innerHTML='<span style="color:var(--danger)">Min 4 characters.</span>';return;}
  const res=await fetch(`/api/users/${id}/password`,{method:'PUT',headers,body:JSON.stringify({newPassword:pw})});
  const data=await res.json();
  if(res.ok){msg.innerHTML='<span style="color:var(--success)">&#10003; Updated!</span>';setTimeout(closeModal,1500);}
  else{msg.innerHTML=`<span style="color:var(--danger)">${data.message}</span>`;}
}

async function saveSalary() {
  const id=document.getElementById('salary-user-id').value;
  const salary=document.getElementById('salary-amount').value;
  const msg=document.getElementById('salary-msg');
  const res=await fetch(`/api/users/${id}/salary`,{method:'PUT',headers,body:JSON.stringify({salary})});
  const data=await res.json();
  if(res.ok){msg.innerHTML='<span style="color:var(--success)">&#10003; Salary updated!</span>';setTimeout(()=>{closeModal();loadUsers();},1200);}
  else{msg.innerHTML=`<span style="color:var(--danger)">${data.message}</span>`;}
}

async function changeRole(id,role) {
  const res=await fetch(`/api/users/${id}/role`,{method:'PUT',headers,body:JSON.stringify({role})});
  const data=await res.json();
  if(!res.ok) alert(data.message);
  loadUsers();
}

async function toggleActive(id, currentlyActive) {
  const isActive = currentlyActive==='true'||currentlyActive===true;
  const action   = isActive?'deactivate':'activate';
  if(!confirm(`${action.charAt(0).toUpperCase()+action.slice(1)} this user?`)) return;
  const res=await fetch(`/api/users/${id}/toggle`,{method:'PUT',headers});
  const data=await res.json();
  if(res.ok) loadUsers();
  else alert(data.message);
}

async function deleteUser(id,name) {
  if(!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  const res=await fetch(`/api/users/${id}`,{method:'DELETE',headers});
  const data=await res.json();
  if(res.ok) loadUsers();
  else alert(data.message);
}

async function addUser() {
  const name=document.getElementById('u-name').value.trim();
  const email=document.getElementById('u-email').value.trim();
  const password=document.getElementById('u-password').value.trim();
  const role=document.getElementById('u-role').value;
  const msg=document.getElementById('form-msg');
  if(!name||!email||!password){msg.innerHTML='<div class="alert alert-danger">All fields required.</div>';return;}
  const res=await fetch('/api/auth/register',{method:'POST',headers,body:JSON.stringify({name,email,password,role})});
  const data=await res.json();
  if(res.ok){
    msg.innerHTML='<div class="alert alert-success">User created!</div>';
    document.getElementById('u-name').value=document.getElementById('u-email').value=document.getElementById('u-password').value='';
    loadUsers();
  } else {
    msg.innerHTML=`<div class="alert alert-danger">${data.message}</div>`;
  }
}

function logoutUser() { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='index.html'; }
loadUsers();
