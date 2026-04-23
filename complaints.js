const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' };
const me = JSON.parse(localStorage.getItem('user')||'{}');
let allComplaints=[], activeFilter='all';

function openNewComplaint() {
  ['c-title','c-description'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['c-category','c-priority'].forEach(id=>{const el=document.getElementById(id);if(el)el.selectedIndex=0;});
  const m=document.getElementById('new-c-msg');if(m)m.innerHTML='';
  document.getElementById('new-complaint-modal').classList.add('open');
}
function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open')); }

async function loadComplaints() {
  try {
    const res=await fetch('/api/complaints',{headers});
    if(!res.ok){document.getElementById('complaints-list').innerHTML='<div class="alert alert-danger">Failed to load.</div>';return;}
    allComplaints=await res.json();
    if(!Array.isArray(allComplaints))allComplaints=[];
    const now=new Date();
    document.getElementById('c-open').textContent       =allComplaints.filter(c=>c.status==='open').length;
    document.getElementById('c-inprogress').textContent =allComplaints.filter(c=>c.status==='in-progress').length;
    document.getElementById('c-resolved').textContent   =allComplaints.filter(c=>c.status==='resolved').length;
    document.getElementById('c-overdue').textContent    =allComplaints.filter(c=>c.status!=='resolved'&&new Date(c.deadline)<now).length;
    renderComplaints();
  } catch(e){document.getElementById('complaints-list').innerHTML='<div class="alert alert-danger">Error loading complaints.</div>';}
}

function setFilter(f,btn) {
  activeFilter=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderComplaints();
}

function renderComplaints() {
  const search=(document.getElementById('c-search')?.value||'').toLowerCase();
  let data=[...allComplaints];
  if(activeFilter!=='all')data=data.filter(c=>c.status===activeFilter);
  if(search)data=data.filter(c=>(c.title||'').toLowerCase().includes(search)||(c.description||'').toLowerCase().includes(search)||(c.raisedByName||'').toLowerCase().includes(search));
  data.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const list=document.getElementById('complaints-list');
  if(!list)return;
  if(!data.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div><p>No complaints found</p></div>';return;}
  list.innerHTML=data.map(c=>{
    const now=new Date(),dl=new Date(c.deadline),days=Math.ceil((dl-now)/86400000);
    const over=c.status!=='resolved'&&dl<now;
    const cls=c.status==='resolved'?'deadline-ok':over?'deadline-over':days<=3?'deadline-warn':'deadline-ok';
    const txt=c.status==='resolved'?'Resolved':over?`Overdue ${Math.abs(days)}d`:`${days}d left`;
    const sb={'open':'<span class="badge badge-orange">Open</span>','in-progress':'<span class="badge badge-blue">In Progress</span>','resolved':'<span class="badge badge-green">Resolved</span>'}[c.status]||'';
    const pb={'high':'<span class="badge badge-red">High</span>','medium':'<span class="badge badge-orange">Medium</span>','low':'<span class="badge badge-gray">Low</span>'}[c.priority]||'';
    const canRes=(me.role==='admin'||me.role==='manager')&&c.status!=='resolved';
    const rb=canRes?`<button class="btn btn-sm btn-primary" onclick="openRespond('${c._id}','${(c.title||'').replace(/'/g,"\\'")}','${c.status}')">Respond</button>`:'';
    const rh=c.response?`<div class="complaint-response"><div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Response by ${c.respondedByName||'Admin'} — ${c.respondedAt?fmtDate(c.respondedAt):''}</div>${c.response}</div>`:'';
    return `<div class="complaint-card">
      <div class="complaint-header">
        <div style="flex:1;min-width:0"><div class="complaint-title">${c.title}</div><div class="complaint-meta">By <strong>${c.raisedByName}</strong> (${c.raisedByRole||'staff'}) &bull; ${c.category} &bull; ${fmtDate(c.createdAt)}</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${pb}${sb}</div>
      </div>
      <div class="complaint-body">${c.description}</div>
      ${rh}
      <div class="complaint-footer"><div class="deadline-badge ${cls}">⏱ Deadline: ${fmtDate(c.deadline)} — <strong>${txt}</strong></div>${rb}</div>
    </div>`;
  }).join('');
}

async function submitComplaint() {
  const title=(document.getElementById('c-title')?.value||'').trim();
  const desc=(document.getElementById('c-description')?.value||'').trim();
  const cat=document.getElementById('c-category')?.value||'Other';
  const pri=document.getElementById('c-priority')?.value||'medium';
  const msg=document.getElementById('new-c-msg');
  if(!title){msg.innerHTML='<div class="alert alert-danger">Title is required.</div>';return;}
  if(!desc) {msg.innerHTML='<div class="alert alert-danger">Description is required.</div>';return;}
  try {
    const res=await fetch('/api/complaints',{method:'POST',headers,body:JSON.stringify({title,description:desc,category:cat,priority:pri})});
    const data=await res.json();
    if(res.ok){
      msg.innerHTML='<div class="alert alert-success">✓ Complaint filed! Will be addressed within 10 days.</div>';
      setTimeout(()=>{closeModals();loadComplaints();},1400);
    } else {
      msg.innerHTML=`<div class="alert alert-danger">${data.message||'Failed to submit'}</div>`;
    }
  } catch(e){msg.innerHTML='<div class="alert alert-danger">Network error. Check server is running.</div>';}
}

function openRespond(id,title,status) {
  const el=document.getElementById('respond-complaint-title');if(el)el.textContent=title;
  const rid=document.getElementById('respond-id');if(rid)rid.value=id;
  const rt=document.getElementById('respond-text');if(rt)rt.value='';
  const rs=document.getElementById('respond-status');if(rs)rs.value=status==='open'?'in-progress':'resolved';
  const rm=document.getElementById('respond-msg');if(rm)rm.innerHTML='';
  document.getElementById('respond-modal').classList.add('open');
}

async function submitResponse() {
  const id=(document.getElementById('respond-id')?.value||'').trim();
  const resp=(document.getElementById('respond-text')?.value||'').trim();
  const sta=document.getElementById('respond-status')?.value||'in-progress';
  const msg=document.getElementById('respond-msg');
  if(!resp){msg.innerHTML='<div class="alert alert-danger">Please enter a response.</div>';return;}
  if(!id)  {msg.innerHTML='<div class="alert alert-danger">Invalid complaint.</div>';return;}
  try {
    const res=await fetch(`/api/complaints/${id}/respond`,{method:'PUT',headers,body:JSON.stringify({response:resp,status:sta})});
    const data=await res.json();
    if(res.ok){msg.innerHTML='<div class="alert alert-success">✓ Response submitted!</div>';setTimeout(()=>{closeModals();loadComplaints();},1200);}
    else{msg.innerHTML=`<div class="alert alert-danger">${data.message||'Failed'}</div>`;}
  } catch(e){msg.innerHTML='<div class="alert alert-danger">Network error.</div>';}
}

loadComplaints();
