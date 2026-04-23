const token = localStorage.getItem('token');
if (!token) { window.location.href='index.html'; }
const headers = { 'Authorization':`Bearer ${token}` };
const me = JSON.parse(localStorage.getItem('user')||'{}');
if (me.role==='staff') { alert('Reports: Managers and Admins only.'); window.location.href='dashboard.html'; }

// 10 distinct colors for charts
const COLORS=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6'];
let allProducts=[], allSalesData=[], periodCharts={};

function buildTabs() {
  const bar=document.getElementById('tab-bar');
  if(!bar) return;
  const tabs=[
    {id:'overview',label:'Overview',roles:['admin','manager']},
    {id:'period',label:'Sales Report',roles:['admin','manager']},
    {id:'inventory',label:'Inventory',roles:['admin','manager']},
    {id:'tables',label:'Data Tables',roles:['admin','manager']},
    {id:'manager-logs',label:'Manager Logs',roles:['admin']}
  ];
  let first=true;
  tabs.forEach(t=>{
    if(!t.roles.includes(me.role)) return;
    const btn=document.createElement('button');
    btn.className='tab-btn'+(first?' active':'');
    btn.textContent=t.label;
    btn.onclick=e=>switchTab(t.id,e.target);
    bar.appendChild(btn);
    if(first){const el=document.getElementById('tab-'+t.id);if(el)el.classList.add('active');first=false;}
  });
}

function switchTab(name,btn) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById('tab-'+name);if(el)el.classList.add('active');
  if(btn)btn.classList.add('active');
  if(name==='manager-logs')loadManagerLogs();
}

async function loadReports() {
  buildTabs();
  const upd=document.getElementById('last-updated');
  if(upd)upd.textContent='Updated: '+new Date().toLocaleString();

  const [invRes,salesRes,purchRes,lowRes]=await Promise.all([
    fetch('/api/reports/inventory',{headers}),
    fetch('/api/reports/sales',{headers}),
    fetch('/api/reports/purchases',{headers}),
    fetch('/api/products/lowstock',{headers})
  ]);
  const inv=await invRes.json(), sales=await salesRes.json();
  const purch=await purchRes.json(), low=await lowRes.json();

  allProducts=inv.products||[];
  allSalesData=sales.sales||[];

  // FIX: Use COGS-based profit from API (computed in reportController)
  // sales.totalCOGS = cost of goods sold (from purchase records or 70% fallback)
  // sales.grossProfit = totalRevenue - totalCOGS
  // purch.totalCost = total amount spent on restocking (purchase orders)
  const totalRevenue  = Math.max(0, sales.totalRevenue  || 0);
  const totalCOGS     = Math.max(0, sales.totalCOGS     || 0);  // cost of goods actually sold
  const grossProfit   = Math.max(0, sales.grossProfit   || 0);  // revenue - COGS
  const purchaseCost  = Math.max(0, purch.totalCost     || 0);  // total procurement spend

  const S=id=>document.getElementById(id);
  const T=(id,v)=>{const el=S(id);if(el)el.textContent=v;};
  T('a-revenue','₹'+fmt(totalRevenue));
  T('a-revenue-sub','From '+(sales.totalSales||0).toLocaleString()+' sales');
  T('a-products',(inv.totalProducts||0).toLocaleString());
  T('a-products-sub','Worth ₹'+fmt(inv.totalValue));
  T('a-sales-count',(sales.totalSales||0).toLocaleString());
  T('a-sales-sub','Avg ₹'+(sales.totalSales?Math.round(totalRevenue/sales.totalSales).toLocaleString('en-IN'):'0'));
  T('a-lowstock',(low.length||0).toString());
  T('a-lowstock-sub','Need reordering');
  T('a-purchases',(purch.totalPurchases||0).toLocaleString());
  T('a-purchases-sub','Cost ₹'+fmt(purchaseCost));
  T('a-profit','₹'+fmt(grossProfit));
  T('a-profit-sub',grossProfit>=0?'Gross Profit (Revenue − COGS)':'Loss');

  // Category map — normalize category names
  const catMap={};
  allProducts.forEach(p=>{
    const raw=p.category||'Uncategorized';
    const cat=raw.trim().split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
    if(!catMap[cat])catMap[cat]={count:0,qty:0,value:0};
    catMap[cat].count++;
    catMap[cat].qty+=Math.max(0,p.quantity||0);
    catMap[cat].value+=Math.max(0,p.quantity||0)*Math.max(0,p.price||0);
  });
  const cats=Object.keys(catMap);
  const totalVal=cats.reduce((s,c)=>s+catMap[c].value,0);

  // FIX: Revenue vs COGS vs Gross Profit bar chart
  // Previously: used purch.totalCost (procurement cost, not COGS) making chart wrong
  // Now: Revenue = total sales, COGS = cost of goods sold, Profit = Revenue - COGS
  renderChart('revenueChart',{
    type:'bar',
    data:{labels:['Total Revenue','Cost of Goods Sold','Gross Profit'],
      datasets:[{
        data:[totalRevenue, totalCOGS, grossProfit],
        backgroundColor:['#10b981','#ef4444','#3b82f6'],
        borderRadius:8,borderSkipped:false
      }]
    },
    options:{responsive:true,plugins:{
      legend:{display:false},
      tooltip:{callbacks:{label:ctx=>' ₹'+Number(ctx.parsed.y).toLocaleString('en-IN',{maximumFractionDigits:0})}}
    },
    scales:{y:{beginAtZero:true,ticks:{callback:v=>'₹'+Number(v).toLocaleString('en-IN')}}}}
  });

  // Stock by category pie chart
  const catLabels=cats.sort((a,b)=>catMap[b].qty-catMap[a].qty);
  const catData=catLabels.map(c=>catMap[c].qty);
  const totalQty=catData.reduce((a,b)=>a+b,0);
  renderChart('categoryChart',{
    type:'pie',
    data:{labels:catLabels,datasets:[{
      data:catData,
      backgroundColor:COLORS.slice(0,catLabels.length),
      borderWidth:3,borderColor:'#fff',hoverOffset:12
    }]},
    options:{responsive:true,
      plugins:{
        legend:{position:'bottom',labels:{font:{size:11},padding:12,usePointStyle:true,boxWidth:10}},
        tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${ctx.parsed.toLocaleString()} units (${totalQty>0?((ctx.parsed/totalQty)*100).toFixed(1):0}%)`}}
      }
    }
  });

  // Low stock horizontal bar
  const top10=[...low].sort((a,b)=>a.quantity-b.quantity).slice(0,10);
  renderChart('lowStockChart',{
    type:'bar',
    data:{labels:top10.map(p=>p.name.length>18?p.name.slice(0,18)+'…':p.name),
      datasets:[
        {label:'Current',data:top10.map(p=>Math.max(0,p.quantity||0)),backgroundColor:'#ef4444',borderRadius:4},
        {label:'Reorder',data:top10.map(p=>p.reorderLevel||10),backgroundColor:'#f59e0b',borderRadius:4}
      ]},
    options:{indexAxis:'y',responsive:true,plugins:{legend:{position:'bottom'}},scales:{x:{beginAtZero:true}}}
  });

  // Inventory value bar
  const sortedCats=[...cats].sort((a,b)=>catMap[b].value-catMap[a].value);
  renderChart('invValueChart',{
    type:'bar',
    data:{labels:sortedCats,datasets:[{label:'Value',data:sortedCats.map(c=>Math.max(0,catMap[c].value)),backgroundColor:COLORS.slice(0,sortedCats.length),borderRadius:6}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>'₹'+Number(v).toLocaleString('en-IN')}}}}
  });

  // Category table
  const ctbody=document.getElementById('category-table');
  if(ctbody)ctbody.innerHTML=sortedCats.map(c=>{
    const pct=totalVal?((catMap[c].value/totalVal)*100).toFixed(1):0;
    return `<tr><td>${c}</td><td>${catMap[c].count}</td><td>${catMap[c].qty.toLocaleString()}</td>
      <td>₹${Math.max(0,catMap[c].value).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span style="font-size:12px;min-width:36px">${pct}%</span>
      </div></td></tr>`;
  }).join('');

  // Sales table
  const sortedSales=[...allSalesData].sort((a,b)=>new Date(b.saleDate)-new Date(a.saleDate)).slice(0,50);
  const slbl=document.getElementById('sales-count-label');
  if(slbl)slbl.textContent=`Showing 50 of ${(sales.totalSales||0).toLocaleString()}`;
  const stbody=document.getElementById('sales-table');
  if(stbody)stbody.innerHTML=sortedSales.length
    ?sortedSales.map(s=>`<tr>
        <td>${s.productName||s.product?.name||'—'}</td>
        <td>${Math.max(0,s.quantity||0)}</td>
        <td>₹${Math.max(0,s.totalPrice||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
        <td>${fmtDate(s.saleDate)}</td>
        <td>${s.soldByName||s.soldBy?.name||'—'}</td></tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">No sales recorded</td></tr>';

  renderProductsTable(allProducts);
  loadPeriod('weekly',document.querySelector('.period-btn.active'));
}

async function loadPeriod(period,btn) {
  document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const res=await fetch(`/api/reports/sales/period?period=${period}`,{headers});
  if(!res.ok)return;
  const data=await res.json();

  const T=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  T('p-revenue','₹'+fmt(data.totalRevenue));
  T('p-count',(data.totalSales||0).toLocaleString());
  T('p-qty',(data.totalQty||0).toLocaleString());
  T('p-avg',data.totalSales?'₹'+Math.round(data.totalRevenue/data.totalSales).toLocaleString('en-IN'):'₹0');
  T('p-period-label',period.charAt(0).toUpperCase()+period.slice(1)+' report');
  T('period-chart-title','Sales Trend — '+period.charAt(0).toUpperCase()+period.slice(1));

  const daily=data.daily||[];
  if(periodCharts.trend){periodCharts.trend.destroy();periodCharts.trend=null;}
  const tCtx=document.getElementById('periodTrendChart');
  if(tCtx){
    if(daily.length>0){
      periodCharts.trend=new Chart(tCtx,{
        type:'line',
        data:{labels:daily.map(d=>d.date),datasets:[{label:'Revenue',data:daily.map(d=>Math.max(0,d.revenue||0)),
          borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.08)',borderWidth:2.5,
          pointBackgroundColor:'#3b82f6',pointRadius:5,fill:true,tension:0.4}]},
        options:{responsive:true,plugins:{legend:{display:false},
          tooltip:{callbacks:{label:ctx=>' ₹'+Number(ctx.parsed.y).toLocaleString('en-IN',{maximumFractionDigits:0})}}},
          scales:{x:{ticks:{maxRotation:45}},y:{beginAtZero:true,ticks:{callback:v=>'₹'+Number(v).toLocaleString('en-IN')}}}}
      });
    } else {
      tCtx.parentElement.innerHTML='<h3>Sales Trend</h3><div class="empty-state" style="padding:24px"><div class="empty-icon">📈</div><p>No sales data for this period</p></div>';
    }
  }

  if(periodCharts.top){periodCharts.top.destroy();periodCharts.top=null;}
  const topCtx=document.getElementById('periodTopChart');
  const top5=data.topProducts||[];
  if(topCtx){
    if(top5.length>0){
      periodCharts.top=new Chart(topCtx,{
        type:'pie',
        data:{labels:top5.map(p=>p.name.length>20?p.name.slice(0,20)+'…':p.name),
          datasets:[{data:top5.map(p=>Math.max(0,p.revenue||0)),backgroundColor:COLORS.slice(0,top5.length),borderWidth:3,borderColor:'#fff',hoverOffset:8}]},
        options:{responsive:true,plugins:{
          legend:{position:'bottom',labels:{font:{size:11},padding:10,usePointStyle:true}},
          tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ₹${Number(ctx.parsed).toLocaleString('en-IN',{maximumFractionDigits:0})}`}}
        }}
      });
    } else {
      if(topCtx.parentElement)topCtx.parentElement.innerHTML='<h3>Top 5 Products</h3><div class="empty-state" style="padding:24px"><div class="empty-icon">📦</div><p>No sales in this period</p></div>';
    }
  }

  const ptbody=document.getElementById('period-sales-table');
  const ps=[...(data.sales||[])].sort((a,b)=>new Date(b.saleDate)-new Date(a.saleDate)).slice(0,30);
  if(ptbody)ptbody.innerHTML=ps.length
    ?ps.map(s=>`<tr><td style="font-size:12px">${s.productName||'—'}</td><td style="font-size:12px">${Math.max(0,s.quantity||0)}</td>
        <td style="font-size:12px">₹${Math.max(0,s.totalPrice||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
        <td style="font-size:12px">${fmtDate(s.saleDate)}</td><td style="font-size:12px">${s.soldByName||'—'}</td></tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px">No sales in this period</td></tr>';
}

async function loadManagerLogs() {
  const res=await fetch('/api/reports/manager-reports',{headers});
  if(!res.ok)return;
  const logs=await res.json();
  const tbody=document.getElementById('log-table');
  if(!tbody)return;
  tbody.innerHTML=logs.length
    ?logs.map(l=>`<tr><td>${l.generatedBy}</td><td><span class="badge ${l.role==='admin'?'badge-green':'badge-orange'}">${l.role}</span></td><td>${l.reportType}</td><td><span class="badge badge-blue">${l.period}</span></td><td>${new Date(l.generatedAt).toLocaleString('en-IN')}</td></tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">No logs yet</td></tr>';
}

function filterProducts(){const q=(document.getElementById('search-box')?.value||'').toLowerCase();renderProductsTable(allProducts.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.category||'').toLowerCase().includes(q)));}
function renderProductsTable(products){
  const tbody=document.getElementById('products-table');if(!tbody)return;
  tbody.innerHTML=products.slice(0,100).map(p=>{const qty=Math.max(0,p.quantity||0),val=Math.max(0,qty*(p.price||0));
    return `<tr><td>${p.name}</td><td>${p.category}</td><td>${qty}</td><td>₹${Math.max(0,p.price||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</td><td>₹${val.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
      <td>${qty<=(p.reorderLevel||10)?'<span class="badge badge-red">Low Stock</span>':'<span class="badge badge-green">In Stock</span>'}</td></tr>`;}).join('');
}

function renderChart(id,config){const el=document.getElementById(id);if(!el)return;const ex=Chart.getChart(el);if(ex)ex.destroy();new Chart(el,config);}
function fmt(v){return Math.max(0,v||0).toLocaleString('en-IN',{maximumFractionDigits:0});}
loadReports();
