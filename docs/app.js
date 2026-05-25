// ============================================================
// MAIN APP — router, sidebar, command palette, all pages
// ============================================================

const PAGE_TITLES={
  dashboard:'ภาพรวม',
  docs:'เอกสารทั้งหมด',
  search:'ค้นหาเอกสาร',
  quotation:'ใบเสนอราคา',
  invoice:'ใบกำกับภาษี / ใบส่งของ',
  receipt:'ใบเสร็จรับเงิน',
  billing:'ใบวางบิล',
  'billing-combined':'ใบวางบิลรวม',
  customers:'ลูกค้า / คู่ค้า',
  inventory:'คลังสินค้า',
  accounting:'ภาพรวมการเงิน',
  settings:'ตั้งค่าบริษัท',
  backup:'สำรอง / กู้คืนข้อมูล',
};

const NAV=[
  {sec:'หลัก',items:[
    {key:'dashboard',label:'ภาพรวม',icon:'dashboard'},
    {key:'docs',label:'เอกสารทั้งหมด',icon:'docs'},
    {key:'search',label:'ค้นหา',icon:'search'},
  ]},
  {sec:'ออกเอกสาร',items:[
    {key:'quotation',label:'ใบเสนอราคา',icon:'quote'},
    {key:'invoice',label:'ใบกำกับ / ใบส่งของ',icon:'invoice'},
    {key:'receipt',label:'ใบเสร็จรับเงิน',icon:'receipt'},
    {key:'billing',label:'ใบวางบิล (ทั้งหมด)',icon:'billing'},
    {key:'print-billing-summary',label:'พิมพ์สรุปยอด',icon:'print',action:()=>printBillingSummary(null)},
  ]},
  {sec:'จัดการ',items:[
    {key:'customers',label:'ลูกค้า / คู่ค้า',icon:'users'},
    {key:'inventory',label:'คลังสินค้า',icon:'package'},
    {key:'accounting',label:'ภาพรวมการเงิน',icon:'wallet'},
  ]},
  {sec:'ระบบ',items:[
    {key:'settings',label:'ตั้งค่าบริษัท',icon:'settings'},
    {key:'backup',label:'Backup & Restore',icon:'database'},
  ]},
];

// Primary horizontal nav — condensed list of most-used pages
// (full list is in mobile drawer / cmdk)
const PRIMARY_NAV=['dashboard','docs','customers','inventory','accounting','settings'];

function renderSidebar(counts={}){
  // Top-nav (desktop)
  const tn=document.getElementById('tn-nav');
  if(tn){
    tn.innerHTML='';
    PRIMARY_NAV.forEach(key=>{
      const it=NAV.flatMap(g=>g.items).find(x=>x.key===key);
      if(!it)return;
      const n=document.createElement('div');n.className='tn-item';n.dataset.page=it.key;
      const c=counts[it.key];
      n.innerHTML=I[it.icon]+'<span>'+esc(it.label)+'</span>'+(c!=null&&c>0?'<span class="tn-count">'+c+'</span>':'');
      n.addEventListener('click',()=>navigate(it.key));
      tn.appendChild(n);
    });
  }
  // Mobile drawer (full list)
  const md=document.getElementById('md-nav');
  if(md){
    md.innerHTML='';
    NAV.forEach(g=>{
      const sec=document.createElement('div');sec.className='md-sec';sec.textContent=g.sec;md.appendChild(sec);
      g.items.forEach(it=>{
        const n=document.createElement('div');n.className='md-item';n.dataset.page=it.key;
        const c=counts[it.key];
        n.innerHTML=I[it.icon]+'<span style="flex:1">'+esc(it.label)+'</span>'+(c!=null&&c>0?'<span style="font-size:11px;color:var(--ink-3)">'+c+'</span>':'');
        n.addEventListener('click',()=>{
          closeMobDrawer();
          if(typeof it.action==='function')setTimeout(it.action,150);
          else navigate(it.key);
        });
        md.appendChild(n);
      });
    });
  }
  highlightNav(window._app.page);
}
function highlightNav(key){
  document.querySelectorAll('.tn-item').forEach(n=>n.classList.toggle('active',n.dataset.page===key));
  document.querySelectorAll('.md-item').forEach(n=>n.classList.toggle('active',n.dataset.page===key));
}

async function refreshNavCounts(){
  const[q,inv,rec,bil,blc]=await Promise.all([dbAll('quotations'),dbAll('invoices'),dbAll('receipts'),dbAll('billings'),dbAll('billing_combined')]);
  renderSidebar({
    docs:q.length+inv.length+rec.length+bil.length+blc.length,
    quotation:q.length,invoice:inv.length,receipt:rec.length,billing:bil.length,'billing-combined':blc.length,
  });
}

// Legacy aliases — keep older callers working
function toggleSidebar(){if(typeof toggleMobDrawer==='function')toggleMobDrawer();}
function closeSidebar(){if(typeof closeMobDrawer==='function')closeMobDrawer();}

async function navigate(page){
  window._app.page=page;
  highlightNav(page);
  // legacy: clear if these old containers still exist
  const a=document.getElementById('tb-actions');if(a)a.innerHTML='';
  const c=document.getElementById('content');
  c.innerHTML='';
  c.style.animation='none';c.offsetWidth;c.style.animation='pageIn .42s cubic-bezier(.4,0,.2,1)';
  const pages={
    dashboard:pgDashboard, docs:pgDocs, search:pgSearch,
    quotation:pgQuotation, invoice:pgInvoice, receipt:pgReceipt,
    billing:pgBilling, 'billing-combined':pgBillingCombined,
    customers:pgCustomers, inventory:pgInventory, accounting:pgAccounting,
    settings:pgSettings, backup:pgBackup,
  };
  if(pages[page])await pages[page]();
}

// ============================================================
// DASHBOARD
// ============================================================
// monthly sparkline: returns inline SVG showing trend over the last 6 months
function monthlySalesChart(docs,w=520,h=80,color='var(--inv)'){
  const now=new Date();
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const ym=d.toISOString().slice(0,7);
    const lbl=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][d.getMonth()];
    months.push({ym,lbl,total:0});
  }
  docs.forEach(doc=>{
    const ym=(doc.docDate||doc.createdAt||'').slice(0,7);
    const m=months.find(x=>x.ym===ym);if(m)m.total+=Number(doc.total||0);
  });
  const max=Math.max(...months.map(x=>x.total),1);
  const padX=20,padY=14;
  const innerW=w-padX*2,innerH=h-padY*2;
  const pts=months.map((m,i)=>{
    const x=padX+(months.length===1?innerW/2:(i*innerW/(months.length-1)));
    const y=padY+innerH-(m.total/max)*innerH;
    return {x,y,...m};
  });
  // smooth-ish polyline
  const path=pts.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
  const areaPath=path+' L'+pts[pts.length-1].x.toFixed(1)+','+(h-padY)+' L'+pts[0].x.toFixed(1)+','+(h-padY)+' Z';
  const dots=pts.map(p=>'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3" fill="#fff" stroke="'+color+'" stroke-width="2"><title>'+p.lbl+': ฿'+fmoney(p.total)+'</title></circle>').join('');
  const labels=pts.map(p=>'<text x="'+p.x.toFixed(1)+'" y="'+(h-2)+'" text-anchor="middle" font-size="9.5" fill="var(--ink-3)" font-weight="500">'+p.lbl+'</text>').join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="display:block;width:100%;height:'+h+'px">'
    +'<defs><linearGradient id="spkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="'+color+'" stop-opacity=".18"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'
    +'<path d="'+areaPath+'" fill="url(#spkg)"/>'
    +'<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    +dots+labels
    +'</svg>';
}

async function pgDashboard(){
  const[q,inv,rec,bil,custs]=await Promise.all([dbAll('quotations'),dbAll('invoices'),dbAll('receipts'),dbAll('billings'),dbAll('customers')]);
  const tInv=inv.reduce((s,i)=>s+(i.total||0),0);
  const tRec=rec.reduce((s,i)=>s+(i.total||0),0);
  const tQuo=q.reduce((s,i)=>s+(i.total||0),0);
  const pending=bil.filter(b=>!b.paymentDate);
  const tPend=pending.reduce((s,b)=>s+(b.total||0),0);
  const totalDocs=q.length+inv.length+rec.length+bil.length;
  const recent=[
    ...q.slice(-3).map(d=>({...d,_s:'quotations',_lbl:'ใบเสนอ',_cls:'b-quo',_col:'var(--quo)'})),
    ...inv.slice(-4).map(d=>({...d,_s:'invoices',_lbl:'ใบกำกับ',_cls:'b-inv',_col:'var(--inv)'})),
    ...rec.slice(-3).map(d=>({...d,_s:'receipts',_lbl:'ใบเสร็จ',_cls:'b-rec',_col:'var(--rec)'})),
    ...bil.slice(-3).map(d=>({...d,_s:'billings',_lbl:'ใบวางบิล',_cls:'b-bil',_col:'var(--bil)'})),
  ].sort((a,b)=>b.id-a.id).slice(0,8);

  const c=document.getElementById('content');c.innerHTML='';

  const hour=new Date().getHours();
  const greet=hour<12?'สวัสดี<em>ตอนเช้า</em>':hour<18?'สวัสดี<em>ตอนบ่าย</em>':'สวัสดี<em>ตอนเย็น</em>';

  c.insertAdjacentHTML('beforeend',
    '<div class="ph">'
    +'<div class="ph-left">'
    +'<div class="eyebrow">'+thDate()+' · ภาพรวม</div>'
    +'<div class="pt" style="margin-top:8px">'+greet+'</div>'
    +'<div class="ps">มีลูกค้าในระบบ <b>'+custs.length+'</b> ราย · เอกสารทั้งหมด <b>'+totalDocs+'</b> ฉบับ</div>'
    +'</div></div>'
  );

  // EMPTY STATE — first-run welcome with 3 CTAs (only when no docs yet)
  if(totalDocs===0){
    const empty=document.createElement('div');
    empty.className='card';empty.style.cssText='margin-bottom:24px;padding:36px 32px';
    empty.innerHTML='<div style="display:flex;align-items:center;gap:18px;margin-bottom:22px;flex-wrap:wrap">'
      +'<div style="width:56px;height:56px;border-radius:14px;background:#fdecd6;color:#c2740a;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">👋</div>'
      +'<div style="flex:1;min-width:200px">'
      +'<div style="font-family:var(--font-display);font-size:28px;font-weight:600;letter-spacing:-.02em;line-height:1.15">ยินดี<em style="color:var(--copper)">ต้อนรับ</em></div>'
      +'<div style="color:var(--ink-2);font-size:14px;margin-top:4px;line-height:1.5">เริ่มใช้งานใน 3 ขั้น — ตั้งค่าบริษัท เพิ่มลูกค้า แล้วออกเอกสารแรก</div>'
      +'</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">'
      +'<button class="card" style="text-align:left;padding:18px;border:1px solid var(--rule);background:var(--paper-2);cursor:pointer;border-radius:var(--r-lg);transition:all var(--t-fast)" onmouseover="this.style.background=\'var(--paper-3)\'" onmouseout="this.style.background=\'var(--paper-2)\'" onclick="navigate(\'settings\')">'
      +'<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:8px"><span style="width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px">1</span>ขั้นแรก</div>'
      +'<div style="font-weight:600;font-size:15px">ตั้งค่าบริษัท</div>'
      +'<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px;line-height:1.5">ใส่ชื่อ ที่อยู่ เลขผู้เสียภาษี ข้อมูลบัญชี + อัปโลโก้</div>'
      +'</button>'
      +'<button class="card" style="text-align:left;padding:18px;border:1px solid var(--rule);background:var(--paper-2);cursor:pointer;border-radius:var(--r-lg);transition:all var(--t-fast)" onmouseover="this.style.background=\'var(--paper-3)\'" onmouseout="this.style.background=\'var(--paper-2)\'" onclick="navigate(\'customers\')">'
      +'<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:8px"><span style="width:20px;height:20px;border-radius:50%;background:var(--ink);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px">2</span>เพิ่ม</div>'
      +'<div style="font-weight:600;font-size:15px">เพิ่มลูกค้า</div>'
      +'<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px;line-height:1.5">ใส่ลูกค้าหลัก (ระบบจดจำที่อยู่อัตโนมัติเมื่อออกเอกสาร)</div>'
      +'</button>'
      +'<button class="card" style="text-align:left;padding:18px;border:1px solid var(--copper);background:var(--paper);cursor:pointer;border-radius:var(--r-lg);transition:all var(--t-fast)" onmouseover="this.style.background=\'var(--paper-3)\'" onmouseout="this.style.background=\'var(--paper)\'" onclick="openQuotationForm()">'
      +'<div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--copper);text-transform:uppercase;letter-spacing:.08em;font-weight:600;margin-bottom:8px"><span style="width:20px;height:20px;border-radius:50%;background:var(--copper);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px">3</span>ออกเอกสาร</div>'
      +'<div style="font-weight:600;font-size:15px">ใบเสนอราคาแรก</div>'
      +'<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px;line-height:1.5">ลองออกใบจริง → แปลงเป็นใบกำกับ → ใบเสร็จ ในคลิกเดียว</div>'
      +'</button>'
      +'</div>';
    c.appendChild(empty);
  }

  // STATS
  const sg=document.createElement('div');sg.className='stats';
  const formatMoney=v=>'฿'+Math.round(v).toLocaleString('th-TH');
  sg.innerHTML=
    '<div class="stat s-quo"><div class="stat-row"><div class="stat-lbl">ใบเสนอราคา</div><div class="stat-icon">'+I.quote+'</div></div><div class="stat-val tnum" data-money="'+tQuo+'"><span class="currency">฿</span>0</div><div class="stat-meta"><b>'+q.length+'</b> ฉบับ</div></div>'
    +'<div class="stat s-inv"><div class="stat-row"><div class="stat-lbl">ยอดขาย</div><div class="stat-icon">'+I.invoice+'</div></div><div class="stat-val tnum" data-money="'+tInv+'"><span class="currency">฿</span>0</div><div class="stat-meta"><b>'+inv.length+'</b> ใบกำกับ</div></div>'
    +'<div class="stat s-rec"><div class="stat-row"><div class="stat-lbl">รับเงินแล้ว</div><div class="stat-icon">'+I.receipt+'</div></div><div class="stat-val tnum" data-money="'+tRec+'"><span class="currency">฿</span>0</div><div class="stat-meta"><b>'+rec.length+'</b> ใบเสร็จ</div></div>'
    +'<div class="stat s-bil"><div class="stat-row"><div class="stat-lbl">รอเรียกเก็บ</div><div class="stat-icon">'+I.billing+'</div></div><div class="stat-val tnum" data-money="'+tPend+'"><span class="currency">฿</span>0</div><div class="stat-meta"><b>'+pending.length+'</b> ค้างชำระ</div></div>';
  c.appendChild(sg);
  setTimeout(()=>{
    sg.querySelectorAll('.stat-val[data-money]').forEach(el=>{
      const t=parseFloat(el.dataset.money)||0;
      const cur=el.querySelector('.currency');
      animateNumber(el,0,t,900,v=>{el.innerHTML=(cur?'<span class="currency">฿</span>':'')+Math.round(v).toLocaleString('th-TH');});
    });
  },80);

  // SPARKLINE — monthly sales trend (only show if there are invoices)
  if(inv.length){
    const trend=document.createElement('div');trend.className='card';trend.style.cssText='margin-bottom:24px;padding:18px 22px';
    const totalLastMonth=inv.filter(d=>{
      const ym=(d.docDate||d.createdAt||'').slice(0,7);
      const last=new Date();last.setMonth(last.getMonth()-1);
      return ym===last.toISOString().slice(0,7);
    }).reduce((s,d)=>s+Number(d.total||0),0);
    const totalThisMonth=inv.filter(d=>{
      const ym=(d.docDate||d.createdAt||'').slice(0,7);
      return ym===new Date().toISOString().slice(0,7);
    }).reduce((s,d)=>s+Number(d.total||0),0);
    const delta=totalLastMonth>0?((totalThisMonth-totalLastMonth)/totalLastMonth)*100:0;
    const deltaStr=totalLastMonth>0?(delta>=0?'+':'')+delta.toFixed(0)+'%':'—';
    const deltaColor=delta>=0?'var(--success)':'var(--danger)';
    trend.innerHTML='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;flex-wrap:wrap;gap:8px">'
      +'<div><div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.08em;font-weight:600">ยอดขาย 6 เดือนล่าสุด</div>'
      +'<div style="font-size:13px;color:var(--ink-2);margin-top:2px">เดือนนี้ <b>฿'+fmoney(totalThisMonth)+'</b> · <span style="color:'+deltaColor+'">'+deltaStr+'</span> เทียบเดือนก่อน</div></div>'
      +'</div>'
      +monthlySalesChart(inv,520,80,'#0066cc');
    c.appendChild(trend);
  }

  // RECENT + PENDING grid
  const grid=document.createElement('div');grid.className='dash-grid';

  const recCard=document.createElement('div');recCard.className='card';
  recCard.innerHTML='<div class="card-header"><div><div class="card-title">เอกสาร<em style="font-family:var(--font-display);font-style:italic;font-weight:400"> ล่าสุด</em></div><div class="card-sub">8 รายการล่าสุด · คลิกเพื่อดูพรีวิว</div></div><button class="btn btn-ghost btn-sm" onclick="navigate(\'docs\')">ทั้งหมด '+I.arrowRight+'</button></div>';
  const recBody=document.createElement('div');
  if(!recent.length){recBody.innerHTML='<div class="empty"><div class="empty-i">'+I.docs+'</div><div class="empty-t">ยังไม่มีเอกสาร</div><div class="empty-s">สร้างเอกสารแรกของคุณได้เลย</div></div>';}
  else recent.forEach((d,i)=>{
    const row=document.createElement('div');
    row.style.cssText='padding:13px 24px;border-bottom:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;transition:background var(--t-fast);animation:fadeIn .3s ease '+(i*30)+'ms both';
    row.onmouseover=()=>row.style.background='var(--paper-2)';row.onmouseout=()=>row.style.background='';
    row.onclick=()=>viewDocModal(d._s,d.id);
    row.innerHTML='<div style="min-width:0;flex:1"><div style="display:flex;align-items:center;gap:10px"><span class="badge '+d._cls+'">'+d._lbl+'</span><b class="tnum" style="color:'+d._col+';font-size:13px">'+esc(d.docNumber||'')+'</b></div><div style="font-size:12px;color:var(--ink-3);margin-top:4px;margin-left:0">'+esc(d.customerName||'-')+' · '+thDateShort(d.docDate)+'</div></div>'
      +'<div style="text-align:right;flex-shrink:0"><div class="display tnum" style="font-size:18px;color:var(--headline)">฿'+fmoney(d.total)+'</div></div>';
    recBody.appendChild(row);
  });
  recCard.appendChild(recBody);
  grid.appendChild(recCard);

  const pendCard=document.createElement('div');pendCard.className='card';
  pendCard.innerHTML='<div class="card-header"><div><div class="card-title">รอ<em style="font-family:var(--font-display);font-style:italic;font-weight:400">เรียกเก็บเงิน</em></div><div class="card-sub">ใบวางบิลที่ยังไม่ได้รับชำระ</div></div></div>';
  const pendBody=document.createElement('div');
  if(!pending.length){pendBody.innerHTML='<div class="empty"><div class="empty-i" style="background:var(--rec-soft);color:var(--rec)">'+I.check+'</div><div class="empty-t">ไม่มีค้างชำระ</div><div class="empty-s">ทุกอย่างเรียบร้อย</div></div>';}
  else pending.slice(0,6).forEach((b,i)=>{
    const row=document.createElement('div');
    row.style.cssText='padding:13px 24px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;align-items:center;gap:14px;animation:fadeIn .3s ease '+(i*30)+'ms both';
    row.innerHTML='<div style="min-width:0;flex:1"><div style="font-weight:600;color:var(--bil);font-size:13px;font-variant-numeric:tabular-nums">'+esc(b.docNumber)+'</div><div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">'+esc(b.customerName)+'</div></div>'
      +'<div class="display tnum" style="font-size:18px;color:var(--bil)">฿'+fmoney(b.total)+'</div>';
    pendBody.appendChild(row);
  });
  pendCard.appendChild(pendBody);
  grid.appendChild(pendCard);
  c.appendChild(grid);

  // editorial tip card
  const tip=document.createElement('div');
  tip.style.cssText='margin-top:24px;background:var(--ink);color:var(--paper);border-radius:var(--r-lg);padding:28px 32px;display:flex;align-items:center;gap:24px;position:relative;overflow:hidden';
  tip.innerHTML='<div style="position:absolute;right:-60px;top:-60px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(168,71,42,.3) 0%,transparent 65%);pointer-events:none"></div>'
    +'<div style="flex:1;min-width:0;position:relative">'
    +'<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--copper);font-weight:600;margin-bottom:8px">เคล็ดลับ</div>'
    +'<div style="font-family:var(--font-display);font-size:26px;font-style:italic;line-height:1.2;letter-spacing:-.01em;margin-bottom:8px">ใช้ <b style="font-style:normal;font-family:var(--font);font-weight:600;font-size:16px;background:rgba(255,255,255,.1);padding:2px 10px;border-radius:6px;vertical-align:middle">⌘ K</b> เพื่อสร้างเอกสารแบบรวดเร็ว</div>'
    +'<div style="font-size:13px;color:rgba(255,255,255,.65)">ค้นหาเอกสารเก่า สร้างเอกสารใหม่ หรือไปยังหน้าใดก็ได้ด้วยคีย์ลัดเดียว</div>'
    +'</div>'
    +'<button class="btn btn-accent" style="position:relative;flex-shrink:0" onclick="openCmdK()">เปิดเลย '+I.arrowRight+'</button>';
  c.appendChild(tip);
}

// ============================================================
// ALL DOCS LIST
// ============================================================
async function pgDocs(){
  const[q,inv,rec,bil,blc]=await Promise.all([dbAll('quotations'),dbAll('invoices'),dbAll('receipts'),dbAll('billings'),dbAll('billing_combined')]);
  // payment linkage: build set of invoice IDs that have a receipt against them
  const paidInvIds=new Set(rec.filter(r=>r.linkedInvoiceId).map(r=>Number(r.linkedInvoiceId)));
  const all=[
    ...q.map(d=>({...d,_s:'quotations',_lbl:'ใบเสนอ',_cls:'b-quo',_col:'var(--quo)'})),
    ...inv.map(d=>({...d,_s:'invoices',_lbl:'ใบกำกับ',_cls:'b-inv',_col:'var(--inv)',_paid:paidInvIds.has(Number(d.id))})),
    ...rec.map(d=>({...d,_s:'receipts',_lbl:'ใบเสร็จ',_cls:'b-rec',_col:'var(--rec)'})),
    ...bil.map(d=>({...d,_s:'billings',_lbl:'ใบวางบิล',_cls:'b-bil',_col:'var(--bil)'})),
    ...blc.map(d=>({...d,_s:'billing_combined',_lbl:'ใบวางบิลรวม',_cls:'b-blc',_col:'var(--blc)'})),
  ].sort((a,b)=>b.id-a.id);

  const c=document.getElementById('content');
  c.innerHTML='';
  c.insertAdjacentHTML('beforeend','<div class="ph"><div><div class="pt">เอกสารทั้งหมด</div><div class="ps">รวม '+all.length+' ฉบับในระบบ</div></div></div>');

  let cur='all';
  const chips=document.createElement('div');chips.className='chips';
  const opts=[{k:'all',l:'ทั้งหมด',n:all.length},{k:'quotations',l:'ใบเสนอ',n:q.length},{k:'invoices',l:'ใบกำกับ',n:inv.length},{k:'receipts',l:'ใบเสร็จ',n:rec.length},{k:'billings',l:'ใบวางบิล',n:bil.length},{k:'billing_combined',l:'ใบวางบิลรวม',n:blc.length}];
  opts.forEach(o=>{
    const ch=document.createElement('div');ch.className='chip'+(o.k==='all'?' active':'');
    ch.innerHTML=esc(o.l)+' <span style="opacity:.6;margin-left:4px">'+o.n+'</span>';
    ch.addEventListener('click',()=>{cur=o.k;chips.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));ch.classList.add('active');render();});
    chips.appendChild(ch);
  });
  c.appendChild(chips);

  const card=document.createElement('div');card.className='card';
  const head=document.createElement('div');head.className='card-header';
  const sbar=document.createElement('div');sbar.className='sbar';sbar.style.width='320px';
  sbar.innerHTML=I.search;
  const sinp=document.createElement('input');sinp.placeholder='ค้นหาเลขที่เอกสาร หรือลูกค้า...';sinp.addEventListener('input',render);
  sbar.appendChild(sinp);head.appendChild(sbar);card.appendChild(head);
  const tw=document.createElement('div');tw.className='tw';
  const tbl=document.createElement('table');
  tbl.innerHTML='<thead><tr><th>ประเภท</th><th>เลขที่เอกสาร</th><th>วันที่</th><th>ลูกค้า</th><th style="text-align:right">ยอดรวม</th><th style="text-align:center;width:240px">จัดการ</th></tr></thead>';
  const tbody=document.createElement('tbody');tbl.appendChild(tbody);tw.appendChild(tbl);card.appendChild(tw);c.appendChild(card);

  function render(){
    const q2=sinp.value.toLowerCase();tbody.innerHTML='';
    const f=all.filter(d=>(cur==='all'||d._s===cur)&&(!q2||(d.docNumber||'').toLowerCase().includes(q2)||(d.customerName||'').toLowerCase().includes(q2)));
    if(!f.length){tbody.innerHTML='<tr><td colspan="6"><div class="empty"><div class="empty-i">'+I.docs+'</div><div class="empty-t">ไม่พบเอกสาร</div></div></td></tr>';return;}
    f.forEach(d=>{
      const tr=document.createElement('tr');
      const paidBadge=d._paid?' <span class="badge" style="background:var(--rec-soft);color:var(--rec);border-color:rgba(29,138,78,.22);font-size:9.5px">✓ จ่ายแล้ว</span>':'';
      tr.innerHTML='<td><span class="badge '+d._cls+'">'+d._lbl+'</span>'+paidBadge+'</td>'
        +'<td><b class="tnum" style="color:'+d._col+'">'+esc(d.docNumber||'')+'</b></td>'
        +'<td style="color:var(--text-2)">'+thDate(d.docDate)+'</td>'
        +'<td>'+esc(d.customerName||'-')+'</td>'
        +'<td style="text-align:right" class="tnum"><b>฿'+fmoney(d.total)+'</b></td>'
        +'<td></td>';
      const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:4px;justify-content:center';
      const mk=(html,fn,cls='btn btn-soft btn-sm')=>{const b=document.createElement('button');b.className=cls;b.innerHTML=html;b.addEventListener('click',fn);return b;};
      wrap.appendChild(mk(I.eye,()=>viewDocModal(d._s,d.id)));
      wrap.appendChild(mk(I.edit,()=>editDoc(d._s,d.id)));
      wrap.appendChild(mk(I.print,()=>printDoc(d._s,d.id)));
      wrap.appendChild(mk(I.trash,()=>deleteDoc(d._s,d.id,()=>navigate('docs')),'btn btn-danger-soft btn-sm'));
      tr.querySelector('td:last-child').appendChild(wrap);
      tbody.appendChild(tr);
    });
  }
  render();
}

// ============================================================
// GENERIC PER-TYPE LIST
// ============================================================
async function renderDocList(cfg){
  const{store,title,color,icon,addFn,addLabel,convertActions,extraHeaderBtn}=cfg;
  const docs=await dbAll(store);

  const c=document.getElementById('content');c.innerHTML='';
  const ph=document.createElement('div');ph.className='ph';
  ph.innerHTML='<div class="ph-left"><div class="eyebrow">เอกสาร</div><div class="pt" style="margin-top:8px">'+esc(title)+'</div><div class="ps">ทั้งหมด <b>'+docs.length+'</b> รายการในระบบ</div></div>';
  const phAct=document.createElement('div');phAct.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  if(extraHeaderBtn){
    const eb=document.createElement('button');eb.className='btn btn-soft';
    eb.innerHTML=(extraHeaderBtn.icon?I[extraHeaderBtn.icon]+' ':'')+extraHeaderBtn.label;
    eb.addEventListener('click',extraHeaderBtn.fn);
    phAct.appendChild(eb);
  }
  const ab=document.createElement('button');ab.className='btn btn-doc btn-'+icon;
  ab.innerHTML=I.plus+' '+(addLabel||('สร้าง'+title));
  ab.addEventListener('click',addFn);
  phAct.appendChild(ab);ph.appendChild(phAct);
  c.appendChild(ph);

  const card=document.createElement('div');card.className='card';
  const head=document.createElement('div');head.className='card-header';
  const sbar=document.createElement('div');sbar.className='sbar';sbar.style.width='320px';
  sbar.innerHTML=I.search;
  const sinp=document.createElement('input');sinp.placeholder='ค้นหา...';sbar.appendChild(sinp);
  head.appendChild(sbar);card.appendChild(head);
  const tw=document.createElement('div');tw.className='tw';
  const tbl=document.createElement('table');
  tbl.innerHTML='<thead><tr><th>เลขที่เอกสาร</th><th>วันที่</th><th>ลูกค้า</th><th style="text-align:right">ยอดรวม</th><th style="text-align:center;width:280px">จัดการ</th></tr></thead>';
  const tbody=document.createElement('tbody');tbl.appendChild(tbody);tw.appendChild(tbl);card.appendChild(tw);c.appendChild(card);

  function render(){
    const q=sinp.value.toLowerCase();tbody.innerHTML='';
    const f=docs.slice().reverse().filter(d=>!q||(d.docNumber||'').toLowerCase().includes(q)||(d.customerName||'').toLowerCase().includes(q));
    if(!f.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty"><div class="empty-i">'+I[icon]+'</div><div class="empty-t">ยังไม่มีเอกสาร</div><div class="empty-s">คลิกปุ่ม "'+(addLabel||('สร้าง'+title))+'" ด้านบนเพื่อเริ่มต้น</div></div></td></tr>';return;}
    f.forEach(d=>{
      const tr=document.createElement('tr');
      tr.innerHTML='<td><b class="tnum" style="color:'+color+'">'+esc(d.docNumber||'')+'</b></td>'
        +'<td style="color:var(--text-2)">'+thDate(d.docDate)+'</td>'
        +'<td>'+esc(d.customerName||'-')+(d.invoiceCount?'<span style="color:var(--text-3);font-size:11px;margin-left:6px">· '+d.invoiceCount+' ใบ</span>':'')+'</td>'
        +'<td style="text-align:right" class="tnum"><b>฿'+fmoney(d.total)+'</b></td>'
        +'<td></td>';
      const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:4px;justify-content:center;flex-wrap:wrap';
      const mk=(html,fn,cls='btn btn-soft btn-sm',title)=>{const b=document.createElement('button');b.className=cls;b.innerHTML=html;b.title=title||'';b.addEventListener('click',fn);return b;};
      wrap.appendChild(mk(I.eye,()=>viewDocModal(store,d.id),'btn btn-soft btn-sm','ดูพรีวิว'));
      wrap.appendChild(mk(I.edit,()=>editDoc(store,d.id),'btn btn-soft btn-sm','แก้ไข'));
      wrap.appendChild(mk(I.copy,()=>duplicateDoc(store,d.id),'btn btn-soft btn-sm','คัดลอก'));
      if(convertActions){
        convertActions.forEach(act=>{
          const b=mk(I[act.icon]+' '+act.label,()=>act.fn(d),'btn btn-sm');
          b.style.cssText='color:'+act.color+';background:'+(act.bg||'transparent')+';border:1px solid '+act.color+'33';
          wrap.appendChild(b);
        });
      }
      wrap.appendChild(mk(I.print,()=>printDoc(store,d.id),'btn btn-soft btn-sm','พิมพ์'));
      wrap.appendChild(mk(I.trash,()=>deleteDoc(store,d.id,()=>navigate(window._app.page)),'btn btn-danger-soft btn-sm','ลบ'));
      tr.querySelector('td:last-child').appendChild(wrap);
      tbody.appendChild(tr);
    });
  }
  sinp.addEventListener('input',render);render();
}

async function pgQuotation(){
  await renderDocList({
    store:'quotations',title:'ใบเสนอราคา',color:'var(--quo)',icon:'quo',
    addFn:()=>openQuotationForm(),addLabel:'สร้างใบเสนอราคา',
    convertActions:[
      {icon:'invoice',label:'→ ใบกำกับ',color:'#6366f1',bg:'#eef2ff',fn:d=>openInvoiceForm(null,d)},
      {icon:'receipt',label:'→ ใบเสร็จ',color:'#10b981',bg:'#ecfdf5',fn:d=>openReceiptForm(null,d)},
    ],
  });
}
async function pgInvoice(){
  await renderDocList({
    store:'invoices',title:'ใบกำกับภาษี / ใบส่งของ',color:'var(--inv)',icon:'inv',
    addFn:()=>openInvoiceForm(),addLabel:'สร้างใบกำกับ',
    convertActions:[
      {icon:'receipt',label:'→ ใบเสร็จ',color:'#10b981',bg:'#ecfdf5',fn:d=>openReceiptForm(null,d)},
      {icon:'billing',label:'→ ใบวางบิล',color:'#0ea5e9',bg:'#f0f9ff',fn:d=>openBillingForm(null,[d.id],d)},
    ],
  });
}
async function pgReceipt(){
  await renderDocList({store:'receipts',title:'ใบเสร็จรับเงิน',color:'var(--rec)',icon:'rec',addFn:()=>openReceiptForm(),addLabel:'สร้างใบเสร็จ'});
}
// Unified billing list — shows both 'billings' and 'billing_combined' together
async function pgBilling(){
  const[bil,blc]=await Promise.all([dbAll('billings'),dbAll('billing_combined')]);
  const all=[
    ...bil.map(d=>({...d,_s:'billings',_lbl:'ใบวางบิล',_cls:'b-bil',_col:'var(--bil)'})),
    ...blc.map(d=>({...d,_s:'billing_combined',_lbl:'ใบวางบิลรวม',_cls:'b-blc',_col:'var(--blc)'})),
  ].sort((a,b)=>(b.docDate||'').localeCompare(a.docDate||''));

  const c=document.getElementById('content');c.innerHTML='';
  const ph=document.createElement('div');ph.className='ph';
  ph.innerHTML='<div class="ph-left"><div class="eyebrow">เอกสาร</div><div class="pt" style="margin-top:8px">ใบวางบิล <em>(ทั้งหมด)</em></div><div class="ps">ใบวางบิล <b>'+bil.length+'</b> + ใบวางบิลรวม <b>'+blc.length+'</b> = <b>'+all.length+'</b> ฉบับ</div></div>';
  const phAct=document.createElement('div');phAct.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  const ab1=document.createElement('button');ab1.className='btn btn-doc btn-bil';
  ab1.innerHTML=I.plus+' ใบวางบิล';
  ab1.addEventListener('click',()=>openBillingForm());
  const ab2=document.createElement('button');ab2.className='btn btn-doc btn-blc';
  ab2.innerHTML=I.plus+' ใบวางบิลรวม';
  ab2.addEventListener('click',()=>openBillingCombinedForm());
  phAct.appendChild(ab1);phAct.appendChild(ab2);ph.appendChild(phAct);
  c.appendChild(ph);

  // total + pending summary chips
  const total=all.reduce((s,d)=>s+Number(d.total||0),0);
  const paidTot=all.filter(d=>d.paymentDate).reduce((s,d)=>s+Number(d.total||0),0);
  const pendTot=total-paidTot;
  const sum=document.createElement('div');
  sum.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px';
  sum.innerHTML='<div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--r);padding:14px 16px"><div style="font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">ยอดรวม</div><div style="font-size:22px;font-weight:600;margin-top:4px">฿'+fmoney(total)+'</div></div>'
    +'<div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--r);padding:14px 16px"><div style="font-size:10.5px;color:var(--success);text-transform:uppercase;letter-spacing:.06em;font-weight:600">รับชำระแล้ว</div><div style="font-size:22px;font-weight:600;margin-top:4px;color:var(--success)">฿'+fmoney(paidTot)+'</div></div>'
    +'<div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--r);padding:14px 16px"><div style="font-size:10.5px;color:var(--warning);text-transform:uppercase;letter-spacing:.06em;font-weight:600">ค้างชำระ</div><div style="font-size:22px;font-weight:600;margin-top:4px;color:var(--warning)">฿'+fmoney(pendTot)+'</div></div>';
  c.appendChild(sum);

  // search + table
  const card=document.createElement('div');card.className='card';
  const head=document.createElement('div');head.className='card-header';
  const sbar=document.createElement('div');sbar.className='sbar';sbar.style.width='320px';
  sbar.innerHTML=I.search;
  const sinp=document.createElement('input');sinp.placeholder='ค้นหา...';sbar.appendChild(sinp);
  // filter chip
  let typeFilter='all';
  const chips=document.createElement('div');chips.style.cssText='display:flex;gap:6px;margin-left:auto';
  ['all','billings','billing_combined'].forEach((k,i)=>{
    const ch=document.createElement('button');ch.className='btn btn-soft';
    if(k==='all')ch.classList.add('btn-accent');
    ch.style.cssText='padding:6px 12px;font-size:12px';
    ch.textContent=k==='all'?'ทั้งหมด':k==='billings'?'ใบวางบิล':'ใบวางบิลรวม';
    ch.dataset.k=k;
    ch.addEventListener('click',()=>{typeFilter=k;chips.querySelectorAll('button').forEach(b=>{b.classList.toggle('btn-accent',b.dataset.k===k);b.classList.toggle('btn-soft',b.dataset.k!==k);});render();});
    chips.appendChild(ch);
  });
  head.appendChild(sbar);head.appendChild(chips);card.appendChild(head);

  const tw=document.createElement('div');tw.className='tw';
  const tbl=document.createElement('table');
  tbl.innerHTML='<thead><tr><th>ประเภท</th><th>เลขที่</th><th>วันที่</th><th>ลูกค้า</th><th style="text-align:right">ยอดรวม</th><th style="text-align:center">สถานะ</th><th style="text-align:center;width:240px">จัดการ</th></tr></thead>';
  const tbody=document.createElement('tbody');tbl.appendChild(tbody);tw.appendChild(tbl);card.appendChild(tw);c.appendChild(card);

  function render(){
    const q=sinp.value.toLowerCase();tbody.innerHTML='';
    let f=all.filter(d=>(typeFilter==='all'||d._s===typeFilter)&&(!q||(d.docNumber||'').toLowerCase().includes(q)||(d.customerName||'').toLowerCase().includes(q)));
    if(!f.length){tbody.innerHTML='<tr><td colspan="7"><div class="empty"><div class="empty-i">'+I.billing+'</div><div class="empty-t">ยังไม่มีใบวางบิล</div><div class="empty-s">กดปุ่ม "+ ใบวางบิล" หรือ "+ ใบวางบิลรวม" ด้านบน</div></div></td></tr>';return;}
    f.forEach(d=>{
      const tr=document.createElement('tr');
      const paidBadge=d.paymentDate?'<span class="badge" style="background:var(--rec-soft);color:var(--rec);border-color:rgba(29,138,78,.22)">รับแล้ว '+thDateShort(d.paymentDate)+'</span>':'<span class="badge" style="background:#fff5e6;color:var(--warning);border-color:rgba(178,80,0,.22)">ค้างชำระ</span>';
      tr.innerHTML='<td><span class="badge '+d._cls+'">'+d._lbl+'</span></td>'
        +'<td><b class="tnum" style="color:'+d._col+'">'+esc(d.docNumber||'')+'</b></td>'
        +'<td style="color:var(--text-2)">'+thDate(d.docDate)+'</td>'
        +'<td>'+esc(d.customerName||'-')+(d.invoiceCount?'<span style="color:var(--text-3);font-size:11px;margin-left:6px">· '+d.invoiceCount+' ใบ</span>':'')+'</td>'
        +'<td style="text-align:right" class="tnum"><b>฿'+fmoney(d.total)+'</b></td>'
        +'<td style="text-align:center">'+paidBadge+'</td>'
        +'<td></td>';
      const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:4px;justify-content:center;flex-wrap:wrap';
      const mk=(html,fn,cls='btn btn-soft btn-sm')=>{const b=document.createElement('button');b.className=cls;b.innerHTML=html;b.addEventListener('click',fn);return b;};
      wrap.appendChild(mk(I.eye,()=>viewDocModal(d._s,d.id)));
      if(d._s==='billings'&&!d.paymentDate){
        wrap.appendChild(mk(I.receipt+' รับเงิน',async()=>{
          if(!confirm('ยืนยันรับเงินสำหรับ '+d.docNumber+'?'))return;
          d.paymentDate=todayISO();await dbPut('billings',d);toast('บันทึกรับเงินเรียบร้อย');navigate('billing');
        },'btn btn-success btn-sm'));
      }
      wrap.appendChild(mk(I.edit,()=>editDoc(d._s,d.id)));
      wrap.appendChild(mk(I.print,()=>printDoc(d._s,d.id)));
      wrap.appendChild(mk(I.trash,()=>deleteDoc(d._s,d.id,()=>navigate('billing')),'btn btn-danger-soft btn-sm'));
      tr.querySelector('td:last-child').appendChild(wrap);
      tbody.appendChild(tr);
    });
  }
  sinp.addEventListener('input',render);render();
}

// Kept for cmdk / legacy URLs — still accessible if someone navigates here directly
async function pgBillingCombined(){
  await renderDocList({store:'billing_combined',title:'ใบวางบิลรวม',color:'var(--blc)',icon:'blc',addFn:()=>openBillingCombinedForm(),addLabel:'สร้างใบวางบิลรวม'});
}

// ============================================================
// BILLING SUMMARY REPORT — printable list with totals
// ============================================================
// store === null -> include both 'billings' AND 'billing_combined'
async function printBillingSummary(store){
  let preview;
  if(store===null||store==='all'){
    const[bil,blc]=await Promise.all([dbAll('billings'),dbAll('billing_combined')]);
    preview=bil.length+blc.length;
  }else{
    preview=(await dbAll(store)).length;
  }
  if(!preview){toast('ยังไม่มีเอกสารให้พิมพ์','info');return;}

  const today=new Date();
  const firstOfMonth=new Date(today.getFullYear(),today.getMonth(),1).toISOString().slice(0,10);
  const todayStr=today.toISOString().slice(0,10);
  const titleLabel=store===null||store==='all'?'ใบวางบิล (รวมทั้ง 2 ประเภท)':store==='billings'?'ใบวางบิล':'ใบวางบิลรวม';
  const storeArg=store===null?'null':"'"+store+"'";
  openModal(
    '<div class="mh"><div class="mt"><div class="mt-icon">'+I.print+'</div>พิมพ์สรุปยอด '+titleLabel+'</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb">'
    +'<div class="ps" style="margin-bottom:18px">เลือกช่วงวันที่ — ถ้าไม่เลือก จะรวมทั้งหมด</div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl">ตั้งแต่วันที่</label><input type="date" class="fc" id="sm-from" value="'+firstOfMonth+'"></div>'
    +'<div class="fg"><label class="fl">ถึงวันที่</label><input type="date" class="fc" id="sm-to" value="'+todayStr+'"></div>'
    +'</div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="sm-onlypaid"> เฉพาะที่รับเงินแล้ว</label></div>'
    +'<div class="fg"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" id="sm-onlypending"> เฉพาะที่ค้างชำระ</label></div>'
    +'</div>'
    +'</div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-soft" onclick="_runBillingSummary('+storeArg+',true)">'+I.print+' ทั้งหมด (ไม่กรอง)</button>'
    +'<button class="btn btn-accent" onclick="_runBillingSummary('+storeArg+',false)">'+I.print+' พิมพ์ตามตัวเลือก</button></div>'
  );
}

async function _runBillingSummary(store,all){
  const from=document.getElementById('sm-from')?.value;
  const to=document.getElementById('sm-to')?.value;
  const onlyPaid=document.getElementById('sm-onlypaid')?.checked;
  const onlyPending=document.getElementById('sm-onlypending')?.checked;
  closeModal();
  let docs;
  if(store===null||store==='all'){
    const[bil,blc]=await Promise.all([dbAll('billings'),dbAll('billing_combined')]);
    docs=[
      ...bil.map(d=>({...d,_type:'ใบวางบิล'})),
      ...blc.map(d=>({...d,_type:'ใบวางบิลรวม'})),
    ];
  }else{
    docs=(await dbAll(store)).map(d=>({...d,_type:store==='billings'?'ใบวางบิล':'ใบวางบิลรวม'}));
  }
  const [invAll,set]=await Promise.all([dbAll('invoices'),getSettings()]);
  const invMap={};invAll.forEach(i=>{invMap[i.id]=i;});
  let list=docs.slice();
  if(!all){
    if(from)list=list.filter(d=>(d.docDate||d.createdAt||'')>=from);
    if(to)list=list.filter(d=>(d.docDate||d.createdAt||'')<=to);
    if(onlyPaid)list=list.filter(d=>d.paymentDate);
    if(onlyPending)list=list.filter(d=>!d.paymentDate);
  }
  list.sort((a,b)=>(a.docDate||'').localeCompare(b.docDate||''));
  if(!list.length){toast('ไม่มีเอกสารตามตัวเลือก','info');return;}

  const title=store===null||store==='all'?'สรุปยอดใบวางบิล (ทั้ง 2 ประเภท)':store==='billings'?'สรุปยอดใบวางบิล':'สรุปยอดใบวางบิลรวม';
  const period=all?'ทั้งหมด':(from?thDate(from):'ต้นเรื่อง')+' — '+(to?thDate(to):'ปัจจุบัน');
  const total=list.reduce((s,d)=>s+Number(d.total||0),0);
  const paidTotal=list.filter(d=>d.paymentDate).reduce((s,d)=>s+Number(d.total||0),0);
  const pendingTotal=total-paidTotal;

  const showType=(store===null||store==='all');
  const rows=list.map((d,i)=>{
    const invNums=(d.invoiceIds||[]).map(iid=>invMap[iid]?.docNumber||'').filter(Boolean).join(', ');
    const typeCell=showType?'<td style="padding:8px 10px;font-size:10.5px;border-bottom:1px solid #f1f5f9"><span style="background:'+(d._type==='ใบวางบิลรวม'?'#f3ddf7;color:#a23bb8':'#e3e3f8;color:#5856d6')+';padding:2px 7px;border-radius:999px;font-weight:600">'+d._type+'</span></td>':'';
    return '<tr>'
      +'<td style="text-align:center;padding:8px 6px;color:#64748b;font-size:11px;border-bottom:1px solid #f1f5f9">'+(i+1)+'</td>'
      +typeCell
      +'<td style="padding:8px 10px;font-family:monospace;font-size:12px;border-bottom:1px solid #f1f5f9">'+esc(d.docNumber||'-')+'</td>'
      +'<td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #f1f5f9;color:#475569">'+thDateShort(d.docDate)+'</td>'
      +'<td style="padding:8px 10px;font-size:12px;border-bottom:1px solid #f1f5f9">'+esc(d.customerName||'-')+'</td>'
      +'<td style="padding:8px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;color:#64748b;max-width:180px;word-break:break-all">'+esc(invNums||'-')+'</td>'
      +'<td style="text-align:right;padding:8px 10px;font-size:12px;border-bottom:1px solid #f1f5f9;font-variant-numeric:tabular-nums">฿'+fmoney(d.total)+'</td>'
      +'<td style="text-align:center;padding:8px 10px;font-size:11px;border-bottom:1px solid #f1f5f9">'+(d.paymentDate?'<span style="background:#d6efe0;color:#1d8a4e;padding:2px 7px;border-radius:999px;font-weight:600">จ่าย '+thDateShort(d.paymentDate)+'</span>':'<span style="background:#fff5e6;color:#b25000;padding:2px 7px;border-radius:999px;font-weight:600">ค้าง</span>')+'</td>'
      +'</tr>';
  }).join('');
  const typeTh=showType?'<th style="padding:8px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:90px;border-bottom:2px solid #cbd5e1">ประเภท</th>':'';
  const footColspan=showType?6:5;

  const win=window.open('','_blank','width=900,height=1100');
  win.document.write('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>'+esc(title)+' — '+set.name+'</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">'
    +'<style>*{margin:0;padding:0;box-sizing:border-box}'
    +'body{font-family:-apple-system,\'IBM Plex Sans Thai\',sans-serif;background:#94a3b8;color:#0f172a;-webkit-font-smoothing:antialiased}'
    +'.wrap{max-width:210mm;margin:0 auto;padding:24px 0}'
    +'.a4{width:210mm;min-height:297mm;background:#fff;padding:16mm 14mm;box-shadow:0 18px 36px rgba(15,23,42,.25);position:relative}'
    +'@page{size:A4;margin:0}'
    +'@media print{html,body{margin:0!important;padding:0!important;background:#fff}.wrap{padding:0;max-width:none}.a4{box-shadow:none;width:210mm;min-height:297mm}.no-print{display:none!important}}'
    +'.pbtn{position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;border:none;border-radius:10px;padding:12px 22px;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;z-index:99;box-shadow:0 8px 24px rgba(15,23,42,.3)}'
    +'.phint{position:fixed;bottom:24px;left:24px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:11.5px;color:#475569;max-width:300px;line-height:1.5;box-shadow:0 4px 12px rgba(15,23,42,.08)}'
    +'</style></head><body><div class="wrap"><div class="a4">'
    +'<div style="height:5px;background:linear-gradient(90deg,#2a5a78 0%,#2a5a78aa 50%,transparent 100%);border-radius:3px;margin-bottom:14px"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;gap:20px">'
    +'<div style="flex:1"><div style="font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.02em">'+esc(set.name)+'</div>'
    +'<div style="font-size:11px;color:#475569;line-height:1.6;margin-top:4px">'+esc(set.address||'')+'</div>'
    +'<div style="font-size:11px;color:#475569;margin-top:2px">โทร: '+esc(set.phone||'-')+' · เลขผู้เสียภาษี: '+esc(set.taxId||'-')+'</div></div>'
    +'<div style="text-align:right;flex-shrink:0">'
    +'<div style="font-size:18px;font-weight:800;color:#2a5a78">'+title+'</div>'
    +'<div style="font-size:11px;color:#475569;margin-top:6px;line-height:1.6">ช่วง: '+period+'</div>'
    +'<div style="font-size:11px;color:#475569">รายการ: '+list.length+' ฉบับ</div>'
    +'</div></div>'
    // summary boxes
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0 18px">'
    +'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600">ยอดรวม</div><div style="font-size:18px;font-weight:700;color:#0f172a;margin-top:2px">฿'+fmoney(total)+'</div></div>'
    +'<div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:#059669;text-transform:uppercase;letter-spacing:.06em;font-weight:600">รับชำระแล้ว</div><div style="font-size:18px;font-weight:700;color:#1d8a4e;margin-top:2px">฿'+fmoney(paidTotal)+'</div></div>'
    +'<div style="background:#fff5e6;border:1px solid #fbbf24;border-radius:8px;padding:10px 12px"><div style="font-size:10px;color:#b25000;text-transform:uppercase;letter-spacing:.06em;font-weight:600">ค้างชำระ</div><div style="font-size:18px;font-weight:700;color:#b25000;margin-top:2px">฿'+fmoney(pendingTotal)+'</div></div>'
    +'</div>'
    // table
    +'<table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="background:#f1f5f9">'
    +'<th style="padding:8px 6px;text-align:center;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:30px;border-bottom:2px solid #cbd5e1">#</th>'
    +typeTh
    +'<th style="padding:8px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-bottom:2px solid #cbd5e1">เลขที่</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:75px;border-bottom:2px solid #cbd5e1">วันที่</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-bottom:2px solid #cbd5e1">ลูกค้า</th>'
    +'<th style="padding:8px 10px;text-align:left;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-bottom:2px solid #cbd5e1">ใบกำกับ</th>'
    +'<th style="padding:8px 10px;text-align:right;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:90px;border-bottom:2px solid #cbd5e1">ยอด</th>'
    +'<th style="padding:8px 10px;text-align:center;font-size:10px;color:#475569;font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:110px;border-bottom:2px solid #cbd5e1">สถานะ</th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'<tfoot><tr><td colspan="'+footColspan+'" style="padding:14px 10px;text-align:right;font-size:13px;font-weight:600;border-top:2px solid #0f172a">รวมทั้งสิ้น</td>'
    +'<td style="padding:14px 10px;text-align:right;font-size:15px;font-weight:800;border-top:2px solid #0f172a;color:#2a5a78">฿'+fmoney(total)+'</td>'
    +'<td style="border-top:2px solid #0f172a"></td></tr></tfoot>'
    +'</table>'
    +'<div style="margin-top:24px;font-size:10.5px;color:#94a3b8;text-align:center">พิมพ์เมื่อ '+thDate()+' · '+esc(set.name)+'</div>'
    +'</div></div>'
    +'<div class="phint no-print">💡 ใน Chrome กด <b>More settings</b> → ปิด <b>Headers and footers</b></div>'
    +'<button class="pbtn no-print" onclick="window.print()">🖨 พิมพ์ / Save PDF</button>'
    +'</body></html>');
  win.document.close();
  setTimeout(()=>{try{win.focus();}catch(e){}},200);
}
window.printBillingSummary=printBillingSummary;
window._runBillingSummary=_runBillingSummary;

// fix: icons must match css btn-{key}
const _BTN_FIX={quo:'btn-quo',inv:'btn-inv',rec:'btn-rec',bil:'btn-bil',blc:'btn-blc',quote:'btn-quo',invoice:'btn-inv',receipt:'btn-rec',billing:'btn-bil',billings:'btn-blc'};

// ============================================================
// SEARCH
// ============================================================
async function pgSearch(){
  const c=document.getElementById('content');c.innerHTML='';
  c.insertAdjacentHTML('beforeend',
    '<div class="ph"><div class="ph-left"><div class="eyebrow">ค้นหา</div><div class="pt" style="margin-top:8px">ค้นหา<em>เอกสาร</em></div><div class="ps">ค้นจากเลขที่เอกสาร หรือชื่อลูกค้า</div></div></div>'
    +'<div class="card" style="margin-bottom:20px"><div class="card-body"><div class="sbar" style="max-width:680px;padding:4px 16px">'
    +'<div style="width:18px;height:18px;color:var(--text-3)">'+I.search+'</div>'
    +'<input id="gsearch" placeholder="พิมพ์เลขที่เอกสาร หรือชื่อลูกค้า..." style="font-size:15px;padding:12px 0"></div></div></div>'
    +'<div id="sresults"><div class="empty"><div class="empty-i">'+I.search+'</div><div class="empty-t">พิมพ์เพื่อค้นหา</div><div class="empty-s">ค้นได้ทุกประเภทเอกสารพร้อมกัน</div></div></div>'
  );
  document.getElementById('gsearch').addEventListener('input',doSearch);
  document.getElementById('gsearch').focus();
}

async function doSearch(){
  const q=(document.getElementById('gsearch')?.value||'').toLowerCase().trim();
  const res=document.getElementById('sresults');
  if(!q){res.innerHTML='<div class="empty"><div class="empty-i">'+I.search+'</div><div class="empty-t">พิมพ์เพื่อค้นหา</div></div>';return;}
  const stores=['quotations','invoices','receipts','billings','billing_combined'];
  const labels={quotations:'ใบเสนอ',invoices:'ใบกำกับ',receipts:'ใบเสร็จ',billings:'ใบวางบิล',billing_combined:'ใบวางบิลรวม'};
  const cls={quotations:'b-quo',invoices:'b-inv',receipts:'b-rec',billings:'b-bil',billing_combined:'b-blc'};
  let all=[];
  for(const s of stores){
    const docs=await dbAll(s);
    docs.forEach(d=>{
      if((d.docNumber||'').toLowerCase().includes(q)||(d.customerName||'').toLowerCase().includes(q))all.push({...d,_s:s});
    });
  }
  all.sort((a,b)=>b.id-a.id);
  if(!all.length){res.innerHTML='<div class="empty"><div class="empty-i">'+I.search+'</div><div class="empty-t">ไม่พบเอกสาร</div><div class="empty-s">ลองคำค้นอื่น</div></div>';return;}
  const card=document.createElement('div');card.className='card';
  card.innerHTML='<div class="card-header"><div class="card-title">ผลลัพธ์ '+all.length+' รายการ</div></div>';
  const tw=document.createElement('div');tw.className='tw';
  const tbl=document.createElement('table');
  tbl.innerHTML='<thead><tr><th>ประเภท</th><th>เลขที่</th><th>วันที่</th><th>ลูกค้า</th><th style="text-align:right">ยอด</th><th style="text-align:center">จัดการ</th></tr></thead>';
  const tbody=document.createElement('tbody');
  all.forEach(d=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td><span class="badge '+cls[d._s]+'">'+labels[d._s]+'</span></td>'
      +'<td><b class="tnum">'+esc(d.docNumber||'')+'</b></td>'
      +'<td style="color:var(--text-2)">'+thDate(d.docDate)+'</td>'
      +'<td>'+esc(d.customerName||'-')+'</td>'
      +'<td style="text-align:right" class="tnum"><b>฿'+fmoney(d.total)+'</b></td>'
      +'<td></td>';
    const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:4px;justify-content:center';
    const mk=(h,fn,cl='btn btn-soft btn-sm')=>{const b=document.createElement('button');b.className=cl;b.innerHTML=h;b.addEventListener('click',fn);return b;};
    wrap.appendChild(mk(I.eye,()=>viewDocModal(d._s,d.id)));
    wrap.appendChild(mk(I.edit,()=>editDoc(d._s,d.id)));
    wrap.appendChild(mk(I.print,()=>printDoc(d._s,d.id)));
    tr.querySelector('td:last-child').appendChild(wrap);
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody);tw.appendChild(tbl);card.appendChild(tw);
  res.innerHTML='';res.appendChild(card);
}

// ============================================================
// CUSTOMERS
// ============================================================
async function pgCustomers(){
  const custs=await dbAll('customers');
  const c=document.getElementById('content');c.innerHTML='';
  const ph=document.createElement('div');ph.className='ph';
  ph.innerHTML='<div class="ph-left"><div class="eyebrow">จัดการ</div><div class="pt" style="margin-top:8px">ลูกค้า <em>/ คู่ค้า</em></div><div class="ps">ทั้งหมด <b>'+custs.length+'</b> ราย · ระบบจดจำที่อยู่อัตโนมัติเมื่อออกเอกสาร</div></div>';
  const ab=document.createElement('button');ab.className='btn btn-accent';ab.innerHTML=I.plus+' เพิ่มลูกค้า';
  ab.addEventListener('click',()=>openCustomerForm());
  const phAct=document.createElement('div');phAct.appendChild(ab);ph.appendChild(phAct);
  c.appendChild(ph);

  // info banner
  const info=document.createElement('div');
  info.style.cssText='background:linear-gradient(135deg,var(--accent-soft),var(--paper));border:1px solid var(--accent);border-radius:var(--r);padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px';
  info.innerHTML='<div style="width:36px;height:36px;background:var(--accent);color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+I.zap+'</div>'
    +'<div style="flex:1"><div style="font-weight:600;font-size:13.5px;color:var(--text)">ระบบจดจำที่อยู่อัตโนมัติ</div><div style="font-size:12.5px;color:var(--text-2);margin-top:2px">ทุกครั้งที่คุณออกเอกสารให้ลูกค้าใหม่ ระบบจะบันทึกชื่อ, ที่อยู่, เลขผู้เสียภาษีไว้ที่นี่อัตโนมัติ ครั้งต่อไปเลือกจาก dropdown ได้เลย</div></div>';
  c.appendChild(info);

  const card=document.createElement('div');card.className='card';
  const head=document.createElement('div');head.className='card-header';
  const sbar=document.createElement('div');sbar.className='sbar';sbar.style.width='320px';
  sbar.innerHTML=I.search;
  const sinp=document.createElement('input');sinp.placeholder='ค้นหาชื่อ, เลขผู้เสียภาษี...';sbar.appendChild(sinp);
  head.appendChild(sbar);card.appendChild(head);

  const tw=document.createElement('div');tw.className='tw';
  const tbl=document.createElement('table');
  tbl.innerHTML='<thead><tr><th>ชื่อ / บริษัท</th><th>เลขผู้เสียภาษี</th><th>โทรศัพท์</th><th>อีเมล</th><th style="text-align:center">จัดการ</th></tr></thead>';
  const tbody=document.createElement('tbody');tbl.appendChild(tbody);tw.appendChild(tbl);card.appendChild(tw);c.appendChild(card);

  function render(){
    const q=sinp.value.toLowerCase();tbody.innerHTML='';
    const f=custs.slice().reverse().filter(cu=>!q||(cu.name||'').toLowerCase().includes(q)||(cu.taxId||'').includes(q));
    if(!f.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty"><div class="empty-i">'+I.users+'</div><div class="empty-t">ยังไม่มีลูกค้า</div><div class="empty-s">เพิ่มเองหรือออกเอกสารใหม่แล้วระบบจะจดจำให้</div></div></td></tr>';return;}
    f.forEach(cu=>{
      const tr=document.createElement('tr');
      const initials=(cu.name||'').trim().charAt(0);
      tr.innerHTML='<td><div style="display:flex;align-items:center;gap:10px">'
        +'<div style="width:34px;height:34px;border-radius:10px;background:var(--accent-soft);color:var(--accent-2);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">'+esc(initials)+'</div>'
        +'<div style="min-width:0"><b style="display:block">'+esc(cu.name)+(cu.autoCreated?' <span style="font-size:10px;color:var(--text-3);font-weight:400">(สร้างอัตโนมัติ)</span>':'')+'</b><div style="font-size:11.5px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px">'+esc(cu.address||'—')+'</div></div></div></td>'
        +'<td class="tnum" style="color:var(--text-2)">'+esc(cu.taxId||'—')+'</td>'
        +'<td style="color:var(--text-2)">'+esc(cu.phone||'—')+'</td>'
        +'<td style="color:var(--text-2)">'+esc(cu.email||'—')+'</td>'
        +'<td></td>';
      const w=document.createElement('div');w.style.cssText='display:flex;gap:4px;justify-content:center';
      const mk=(h,fn,cl='btn btn-soft btn-sm',title='')=>{const b=document.createElement('button');b.className=cl;b.innerHTML=h;b.title=title;b.addEventListener('click',fn);return b;};
      w.appendChild(mk(I.clock,()=>viewCustomerHistory(cu),'btn btn-soft btn-sm','ดูประวัติเอกสาร'));
      w.appendChild(mk(I.edit,()=>openCustomerForm(cu.id),'btn btn-soft btn-sm','แก้ไข'));
      w.appendChild(mk(I.trash,()=>deleteDoc('customers',cu.id,pgCustomers),'btn btn-danger-soft btn-sm','ลบ'));
      tr.querySelector('td:last-child').appendChild(w);
      // make customer name area clickable for quick history
      const nameCell=tr.querySelector('td:first-child');
      if(nameCell){nameCell.style.cursor='pointer';nameCell.addEventListener('click',()=>viewCustomerHistory(cu));}
      tbody.appendChild(tr);
    });
  }
  sinp.addEventListener('input',render);render();
}

// ============================================================
// CUSTOMER HISTORY — all docs from one customer
// ============================================================
async function viewCustomerHistory(cu){
  const cuId=String(cu.id||'');
  const cuName=(cu.name||'').trim().toLowerCase();
  const matches=(d)=>{
    if(cuId&&String(d.customerId||'')===cuId)return true;
    if(cuName&&(d.customerName||'').trim().toLowerCase()===cuName)return true;
    return false;
  };
  const STORES=[
    {s:'quotations',lbl:'ใบเสนอราคา',cls:'b-quo'},
    {s:'invoices',lbl:'ใบกำกับ',cls:'b-inv'},
    {s:'receipts',lbl:'ใบเสร็จ',cls:'b-rec'},
    {s:'billings',lbl:'ใบวางบิล',cls:'b-bil'},
    {s:'billing_combined',lbl:'ใบวางบิลรวม',cls:'b-blc'},
  ];
  const all=await Promise.all(STORES.map(x=>dbAll(x.s)));
  let docs=[];
  STORES.forEach((x,i)=>{
    all[i].filter(matches).forEach(d=>docs.push({...d,_s:x.s,_lbl:x.lbl,_cls:x.cls}));
  });
  docs.sort((a,b)=>(b.docDate||b.createdAt||'').localeCompare(a.docDate||a.createdAt||''));

  // summary stats
  const cnt={quotations:0,invoices:0,receipts:0,billings:0,billing_combined:0};
  let totSales=0,totReceived=0,totPending=0;
  docs.forEach(d=>{
    cnt[d._s]=(cnt[d._s]||0)+1;
    if(d._s==='invoices')totSales+=Number(d.total||0);
    if(d._s==='receipts')totReceived+=Number(d.total||0);
    if(d._s==='billings'&&!d.paymentDate)totPending+=Number(d.total||0);
  });

  const rows=docs.length?docs.map(d=>
    '<tr style="cursor:pointer" onclick="viewDocModal(\''+d._s+'\','+d.id+')">'
    +'<td style="padding:10px"><span class="badge '+d._cls+'">'+esc(d._lbl)+'</span></td>'
    +'<td style="padding:10px;font-family:var(--font-mono);font-size:12px">'+esc(d.docNumber||'-')+'</td>'
    +'<td style="padding:10px;color:var(--ink-2);font-size:12.5px">'+thDate(d.docDate||d.createdAt)+'</td>'
    +'<td style="padding:10px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">฿'+fmoney(d.total||0)+'</td>'
    +'</tr>'
  ).join(''):'<tr><td colspan="4"><div class="empty" style="padding:30px 10px"><div class="empty-t">ยังไม่มีเอกสาร</div><div class="empty-s">ลูกค้านี้ยังไม่เคยมีการออกเอกสาร</div></div></td></tr>';

  openModal(
    '<div class="mh"><div class="mt"><div class="mt-icon">'+I.clock+'</div>ประวัติ — '+esc(cu.name)+'</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb">'
    // customer info
    +'<div style="background:var(--paper-2);border-radius:var(--r);padding:14px 16px;margin-bottom:18px;font-size:12.5px;line-height:1.7">'
    +'<div style="color:var(--ink-2)"><b style="color:var(--ink)">'+esc(cu.name)+'</b></div>'
    +(cu.taxId?'<div style="color:var(--ink-3)">เลขผู้เสียภาษี: '+esc(cu.taxId)+'</div>':'')
    +(cu.address?'<div style="color:var(--ink-3)">'+esc(cu.address)+'</div>':'')
    +(cu.phone||cu.email?'<div style="color:var(--ink-3);margin-top:4px">'+esc(cu.phone||'')+(cu.phone&&cu.email?' · ':'')+esc(cu.email||'')+'</div>':'')
    +'</div>'
    // stats
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px">'
    +'<div style="background:var(--paper-2);border:1px solid var(--rule);border-radius:var(--r);padding:12px 14px"><div style="font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">เอกสารทั้งหมด</div><div style="font-size:22px;font-weight:600;margin-top:4px">'+docs.length+'</div></div>'
    +'<div style="background:var(--paper-2);border:1px solid var(--rule);border-radius:var(--r);padding:12px 14px"><div style="font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">ยอดขาย</div><div style="font-size:18px;font-weight:600;margin-top:4px;color:var(--inv)">฿'+fmoney(totSales)+'</div></div>'
    +'<div style="background:var(--paper-2);border:1px solid var(--rule);border-radius:var(--r);padding:12px 14px"><div style="font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">รับเงินแล้ว</div><div style="font-size:18px;font-weight:600;margin-top:4px;color:var(--rec)">฿'+fmoney(totReceived)+'</div></div>'
    +'<div style="background:var(--paper-2);border:1px solid var(--rule);border-radius:var(--r);padding:12px 14px"><div style="font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">ค้างชำระ</div><div style="font-size:18px;font-weight:600;margin-top:4px;color:var(--warning)">฿'+fmoney(totPending)+'</div></div>'
    +'</div>'
    +'<div style="border:1px solid var(--rule);border-radius:var(--r);overflow:hidden">'
    +'<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:var(--paper-2);color:var(--ink-2);font-size:11px;text-transform:uppercase;letter-spacing:.06em">'
    +'<th style="padding:10px;text-align:left">ประเภท</th><th style="padding:10px;text-align:left">เลขที่</th><th style="padding:10px;text-align:left">วันที่</th><th style="padding:10px;text-align:right">ยอด</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>'
    +'</div>'
    +'</div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ปิด</button></div>'
  );
}
window.viewCustomerHistory=viewCustomerHistory;

async function openCustomerForm(id=null){
  let cu=null;if(id)cu=await dbGet('customers',id);
  openModal(
    '<div class="mh"><div class="mt"><div class="mt-icon" style="background:var(--accent);color:#fff">'+I.user+'</div>'+(cu?'แก้ไข':'เพิ่ม')+'ลูกค้า / คู่ค้า</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb">'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl fl-req">ชื่อ / บริษัท</label><input class="fc" id="cu-n" value="'+esc(cu?.name||'')+'"></div>'
    +'<div class="fg"><label class="fl">เลขผู้เสียภาษี</label><input class="fc tnum" id="cu-t" value="'+esc(cu?.taxId||'')+'"></div>'
    +'</div>'
    +'<div class="fg"><label class="fl">ที่อยู่</label><textarea class="fc" id="cu-a" rows="2">'+esc(cu?.address||'')+'</textarea></div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl">โทรศัพท์</label><input class="fc" id="cu-p" value="'+esc(cu?.phone||'')+'"></div>'
    +'<div class="fg"><label class="fl">อีเมล</label><input class="fc" type="email" id="cu-e" value="'+esc(cu?.email||'')+'"></div>'
    +'</div>'
    +'<div class="fg"><label class="fl">หมายเหตุ</label><input class="fc" id="cu-no" value="'+esc(cu?.note||'')+'"></div>'
    +'</div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-accent btn-save" onclick="saveCustomer('+(id||'null')+')">'+I.save+' บันทึก</button></div>'
  );
}
async function saveCustomer(id){
  const name=document.getElementById('cu-n').value.trim();
  if(!name){toast('กรุณาระบุชื่อ','err');return;}
  lockSaveBtn();
  const data={
    name,
    taxId:document.getElementById('cu-t').value.trim(),
    address:document.getElementById('cu-a').value.trim(),
    phone:document.getElementById('cu-p').value.trim(),
    email:document.getElementById('cu-e').value.trim(),
    note:document.getElementById('cu-no').value.trim(),
    createdAt:new Date().toISOString(),
  };
  if(id){data.id=id;await dbPut('customers',data);toast('แก้ไขเรียบร้อย');}
  else{await dbAdd('customers',data);toast('เพิ่มลูกค้าเรียบร้อย');}
  closeModal();pgCustomers();
}

// ============================================================
// INVENTORY
// ============================================================
async function pgInventory(){
  const items=await dbAll('inventory');
  const c=document.getElementById('content');c.innerHTML='';
  // Stock health: classify tracked items only (skip 'unlimited' ~ stock >= 100, typically services)
  const TRACKED=(it)=>Number(it.stock||0)<100;
  const lowItems=items.filter(it=>TRACKED(it)&&Number(it.stock||0)>0&&Number(it.stock||0)<=5);
  const outItems=items.filter(it=>TRACKED(it)&&Number(it.stock||0)<=0);
  const ph=document.createElement('div');ph.className='ph';
  ph.innerHTML='<div class="ph-left"><div class="eyebrow">จัดการ</div><div class="pt" style="margin-top:8px">คลัง<em>สินค้า</em></div><div class="ps"><b>'+items.length+'</b> รายการ · ใช้ใน autocomplete ตอนออกเอกสาร</div></div>';
  const ab=document.createElement('button');ab.className='btn btn-accent';ab.innerHTML=I.plus+' เพิ่มสินค้า';
  ab.addEventListener('click',()=>openInventoryForm());
  const phAct=document.createElement('div');phAct.appendChild(ab);ph.appendChild(phAct);
  c.appendChild(ph);

  // Low-stock alert banner — show only when something needs attention
  let lowFilter=false;
  if(outItems.length||lowItems.length){
    const banner=document.createElement('div');
    banner.style.cssText='background:linear-gradient(135deg,var(--paper-3),var(--paper));border:1px solid var(--warning);border-radius:var(--r);padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap';
    banner.innerHTML='<div style="width:36px;height:36px;background:var(--warning);color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px">⚠</div>'
      +'<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px;color:var(--text)">มีสินค้าต้องดูแล</div>'
      +'<div style="font-size:12.5px;color:var(--text-2);margin-top:2px">'
      +(outItems.length?'<b style="color:var(--danger)">'+outItems.length+'</b> รายการ <b>หมดสต็อก</b>':'')
      +(outItems.length&&lowItems.length?' · ':'')
      +(lowItems.length?'<b style="color:var(--warning)">'+lowItems.length+'</b> รายการ <b>เหลือ ≤ 5</b>':'')
      +'</div></div>';
    const fbtn=document.createElement('button');fbtn.className='btn btn-soft';fbtn.id='inv-low-toggle';fbtn.textContent='ดูเฉพาะที่ต้องดูแล';
    fbtn.onclick=()=>{lowFilter=!lowFilter;fbtn.textContent=lowFilter?'แสดงทั้งหมด':'ดูเฉพาะที่ต้องดูแล';fbtn.classList.toggle('btn-accent',lowFilter);fbtn.classList.toggle('btn-soft',!lowFilter);render();};
    banner.appendChild(fbtn);
    c.appendChild(banner);
  }

  const card=document.createElement('div');card.className='card';
  const head=document.createElement('div');head.className='card-header';
  const sbar=document.createElement('div');sbar.className='sbar';sbar.style.width='320px';
  sbar.innerHTML=I.search;
  const sinp=document.createElement('input');sinp.placeholder='ค้นหาสินค้า...';sbar.appendChild(sinp);
  head.appendChild(sbar);card.appendChild(head);
  const tw=document.createElement('div');tw.className='tw';
  const tbl=document.createElement('table');
  tbl.innerHTML='<thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>หมวด</th><th>หน่วย</th><th style="text-align:right">ราคาขาย</th><th style="text-align:center">สต็อก</th><th style="text-align:center">จัดการ</th></tr></thead>';
  const tbody=document.createElement('tbody');tbl.appendChild(tbody);tw.appendChild(tbl);card.appendChild(tw);c.appendChild(card);
  function render(){
    const q=sinp.value.toLowerCase();tbody.innerHTML='';
    let f=items.slice().filter(i=>!q||(i.name||'').toLowerCase().includes(q)||(i.sku||'').toLowerCase().includes(q));
    if(lowFilter)f=f.filter(it=>TRACKED(it)&&Number(it.stock||0)<=5);
    // sort: out-of-stock first, then low, then by id desc
    f.sort((a,b)=>{
      const sa=Number(a.stock||0),sb=Number(b.stock||0);
      const ta=TRACKED(a),tb=TRACKED(b);
      const wa=ta&&sa<=0?0:ta&&sa<=5?1:2;
      const wb=tb&&sb<=0?0:tb&&sb<=5?1:2;
      if(wa!==wb)return wa-wb;
      return (b.id||0)-(a.id||0);
    });
    if(!f.length){tbody.innerHTML='<tr><td colspan="7"><div class="empty"><div class="empty-i">'+I.package+'</div><div class="empty-t">ยังไม่มีสินค้า</div></div></td></tr>';return;}
    f.forEach(it=>{
      const tr=document.createElement('tr');
      const sc=it.stock<=0?'b-err':it.stock<=5?'b-warn':'b-ok';
      tr.innerHTML='<td><code class="code">'+esc(it.sku||'—')+'</code></td>'
        +'<td><b>'+esc(it.name)+'</b><div style="font-size:11.5px;color:var(--text-3)">'+esc(it.description||'')+'</div></td>'
        +'<td style="color:var(--text-2)">'+esc(it.category||'—')+'</td>'
        +'<td style="color:var(--text-2)">'+esc(it.unit||'—')+'</td>'
        +'<td style="text-align:right" class="tnum"><b>฿'+fmoney(it.price)+'</b></td>'
        +'<td style="text-align:center"><span class="badge '+sc+'">'+(it.stock||0)+'</span></td>'
        +'<td></td>';
      const w=document.createElement('div');w.style.cssText='display:flex;gap:4px;justify-content:center';
      const mk=(h,fn,cl='btn btn-soft btn-sm')=>{const b=document.createElement('button');b.className=cl;b.innerHTML=h;b.addEventListener('click',fn);return b;};
      w.appendChild(mk(I.edit,()=>openInventoryForm(it.id)));
      w.appendChild(mk(I.trash,()=>deleteDoc('inventory',it.id,pgInventory),'btn btn-danger-soft btn-sm'));
      tr.querySelector('td:last-child').appendChild(w);tbody.appendChild(tr);
    });
  }
  sinp.addEventListener('input',render);render();
}

async function openInventoryForm(id=null){
  let it=null;if(id)it=await dbGet('inventory',id);
  openModal(
    '<div class="mh"><div class="mt"><div class="mt-icon" style="background:var(--accent);color:#fff">'+I.package+'</div>'+(it?'แก้ไข':'เพิ่ม')+'สินค้า</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb">'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl fl-req">ชื่อสินค้า</label><input class="fc" id="pn" value="'+esc(it?.name||'')+'"></div>'
    +'<div class="fg"><label class="fl">รหัส (SKU)</label><input class="fc" id="ps" value="'+esc(it?.sku||'')+'"></div>'
    +'</div>'
    +'<div class="fr fr3">'
    +'<div class="fg"><label class="fl">หมวดหมู่</label><input class="fc" id="pc" value="'+esc(it?.category||'')+'"></div>'
    +'<div class="fg"><label class="fl">หน่วย</label><input class="fc" id="pu" value="'+esc(it?.unit||'ชิ้น')+'"></div>'
    +'<div class="fg"><label class="fl">สต็อก</label><input class="fc" type="number" id="pst" value="'+(it?.stock||0)+'" min="0"></div>'
    +'</div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl fl-req">ราคาขาย (บาท)</label><input class="fc" type="number" id="pp" value="'+(it?.price||0)+'" min="0" step="any"></div>'
    +'<div class="fg"><label class="fl">ราคาทุน (บาท)</label><input class="fc" type="number" id="pco" value="'+(it?.cost||0)+'" min="0" step="any"></div>'
    +'</div>'
    +'<div class="fg"><label class="fl">รายละเอียด</label><textarea class="fc" id="pd" rows="2">'+esc(it?.description||'')+'</textarea></div>'
    +'</div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-accent btn-save" onclick="saveInventory('+(id||'null')+')">'+I.save+' บันทึก</button></div>'
  );
}
async function saveInventory(id){
  const name=document.getElementById('pn').value.trim();
  if(!name){toast('กรุณาระบุชื่อสินค้า','err');return;}
  lockSaveBtn();
  const data={
    name,sku:document.getElementById('ps').value.trim(),
    category:document.getElementById('pc').value.trim(),
    unit:document.getElementById('pu').value.trim(),
    stock:parseFloat(document.getElementById('pst').value)||0,
    price:parseFloat(document.getElementById('pp').value)||0,
    cost:parseFloat(document.getElementById('pco').value)||0,
    description:document.getElementById('pd').value.trim(),
    createdAt:new Date().toISOString(),
  };
  if(id){data.id=id;await dbPut('inventory',data);toast('แก้ไขเรียบร้อย');}
  else{await dbAdd('inventory',data);toast('เพิ่มสินค้าเรียบร้อย');}
  closeModal();pgInventory();
}

// ============================================================
// ACCOUNTING
// ============================================================
async function pgAccounting(){
  const[inv,rec,bil]=await Promise.all([dbAll('invoices'),dbAll('receipts'),dbAll('billings')]);
  const tInv=inv.reduce((s,i)=>s+(i.total||0),0);
  const tRec=rec.reduce((s,i)=>s+(i.total||0),0);
  const pending=bil.filter(b=>!b.paymentDate);
  const paid=bil.filter(b=>b.paymentDate);
  const tPend=pending.reduce((s,b)=>s+(b.total||0),0);
  const tPaid=paid.reduce((s,b)=>s+(b.total||0),0);

  const c=document.getElementById('content');c.innerHTML='';
  c.insertAdjacentHTML('beforeend','<div class="ph"><div><div class="pt">ภาพรวมการเงิน</div><div class="ps">สรุปรายรับ ใบกำกับ และยอดค้างชำระ</div></div></div>');

  const sg=document.createElement('div');sg.className='stats';
  sg.innerHTML=
    '<div class="stat s-inv"><div class="stat-icon">'+I.invoice+'</div><div class="stat-lbl">ยอดขาย (ใบกำกับ)</div><div class="stat-val tnum" data-money="'+tInv+'">฿0</div><div class="stat-meta">'+inv.length+' ใบ</div></div>'
    +'<div class="stat s-rec"><div class="stat-icon">'+I.receipt+'</div><div class="stat-lbl">รับเงินแล้ว</div><div class="stat-val tnum" data-money="'+tRec+'">฿0</div><div class="stat-meta">'+rec.length+' ใบเสร็จ</div></div>'
    +'<div class="stat" style="border-left:4px solid var(--warning)"><div class="stat-icon" style="background:var(--quo-soft);color:var(--warning)">'+I.clock+'</div><div class="stat-lbl">รอเก็บเงิน</div><div class="stat-val tnum" data-money="'+tPend+'" style="color:var(--warning)">฿0</div><div class="stat-meta">'+pending.length+' ใบ</div></div>'
    +'<div class="stat" style="border-left:4px solid var(--success)"><div class="stat-icon" style="background:var(--rec-soft);color:var(--rec)">'+I.check+'</div><div class="stat-lbl">เก็บเงินแล้ว</div><div class="stat-val tnum" data-money="'+tPaid+'" style="color:var(--success)">฿0</div><div class="stat-meta">'+paid.length+' ใบ</div></div>';
  c.appendChild(sg);
  setTimeout(()=>{
    sg.querySelectorAll('.stat-val[data-money]').forEach(el=>{
      const t=parseFloat(el.dataset.money)||0;
      animateNumber(el,0,t,800,v=>'฿'+Math.round(v).toLocaleString('th-TH'));
    });
  },80);

  // pending list
  const card=document.createElement('div');card.className='card';
  card.innerHTML='<div class="card-header"><div><div class="card-title">ใบวางบิลค้างชำระ</div><div class="card-sub">คลิก "รับเงิน" เพื่อบันทึก</div></div></div>';
  const body=document.createElement('div');
  if(!pending.length){body.innerHTML='<div class="empty"><div class="empty-i" style="background:var(--rec-soft);color:var(--rec)">'+I.check+'</div><div class="empty-t">ทุกอย่างเรียบร้อย</div><div class="empty-s">ไม่มีค้างชำระ</div></div>';}
  else{
    const tbl=document.createElement('table');
    tbl.innerHTML='<thead><tr><th>เลขที่</th><th>วันที่</th><th>ลูกค้า</th><th>อายุ</th><th style="text-align:right">ยอด</th><th style="text-align:center">การชำระ</th></tr></thead>';
    const tbody=document.createElement('tbody');
    pending.sort((a,b)=>new Date(a.docDate)-new Date(b.docDate)).forEach(b=>{
      const days=Math.floor((new Date()-new Date(b.docDate))/86400000);
      const ageCls=days>30?'b-err':days>14?'b-warn':'b-neu';
      const tr=document.createElement('tr');
      tr.innerHTML='<td><b class="tnum" style="color:var(--bil)">'+esc(b.docNumber)+'</b></td>'
        +'<td style="color:var(--text-2)">'+thDateShort(b.docDate)+'</td>'
        +'<td>'+esc(b.customerName)+'</td>'
        +'<td><span class="badge '+ageCls+'">'+days+' วัน</span></td>'
        +'<td style="text-align:right" class="tnum"><b>฿'+fmoney(b.total)+'</b></td>'
        +'<td style="text-align:center"></td>';
      const btn=document.createElement('button');btn.className='btn btn-success btn-sm';btn.innerHTML=I.check+' รับเงินวันนี้';
      btn.addEventListener('click',async()=>{b.paymentDate=todayISO();await dbPut('billings',b);toast('บันทึกการรับเงิน');pgAccounting();});
      tr.querySelector('td:last-child').appendChild(btn);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    const tw=document.createElement('div');tw.className='tw';tw.appendChild(tbl);
    body.appendChild(tw);
  }
  card.appendChild(body);c.appendChild(card);
}

// ============================================================
// SETTINGS
// ============================================================
async function pgSettings(){
  const s=await getSettings();
  const c=document.getElementById('content');c.innerHTML='';
  c.insertAdjacentHTML('beforeend','<div class="ph"><div><div class="pt">ตั้งค่าบริษัท</div><div class="ps">ข้อมูลจะแสดงบนเอกสารทุกประเภท</div></div></div>');
  const grid=document.createElement('div');grid.className='dash-grid-eq';

  const c1=document.createElement('div');c1.className='card';
  c1.innerHTML='<div class="card-header"><div class="card-title">ข้อมูลบริษัท</div></div><div class="card-body">'
    +'<div style="text-align:center;margin-bottom:18px">'
    +'<div id="logo-prev" style="width:120px;height:120px;background:var(--surface-2);border:2px dashed var(--border);border-radius:18px;display:flex;align-items:center;justify-content:center;margin:0 auto;cursor:pointer;overflow:hidden;transition:all var(--t-fast)" onclick="document.getElementById(\'li\').click()">'
    +(s.logo?'<img src="'+esc(s.logo)+'" style="width:100%;height:100%;object-fit:contain">':'<div style="color:var(--text-3);font-size:13px;text-align:center;padding:10px"><div style="margin-bottom:6px">'+I.upload+'</div>เลือกโลโก้</div>')
    +'</div><input type="file" id="li" accept="image/*" style="display:none" onchange="previewLogo(this)">'
    +'<div style="font-size:12px;color:var(--text-3);margin-top:8px">PNG, JPG, SVG · สูงสุด 2MB</div></div>'
    +'<div class="fg"><label class="fl fl-req">ชื่อบริษัท</label><input class="fc" id="sn" value="'+esc(s.name)+'"></div>'
    +'<div class="fg"><label class="fl">ที่อยู่</label><textarea class="fc" id="sa" rows="3">'+esc(s.address)+'</textarea></div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl">เลขผู้เสียภาษี</label><input class="fc tnum" id="st" value="'+esc(s.taxId)+'"></div>'
    +'<div class="fg"><label class="fl">โทรศัพท์</label><input class="fc tnum" id="sp" value="'+esc(s.phone)+'"></div>'
    +'</div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl">อีเมล</label><input class="fc" id="sem" value="'+esc(s.email||'')+'"></div>'
    +'<div class="fg"><label class="fl">VAT (%)</label><input class="fc tnum" type="number" id="sv" value="'+s.vatRate+'" min="0" max="100"></div>'
    +'</div>'
    +'</div>';

  const c2=document.createElement('div');c2.className='card';
  c2.innerHTML='<div class="card-header"><div class="card-title">ข้อมูลธนาคาร</div><div style="font-size:11.5px;color:var(--text-3)">แสดงในใบเสร็จ</div></div><div class="card-body">'
    +'<div class="fg"><label class="fl">'+I.bank+' ชื่อธนาคาร</label><input class="fc" id="sbn" value="'+esc(s.bankName)+'"></div>'
    +'<div class="fg"><label class="fl">เลขบัญชี</label><input class="fc tnum" id="sbno" value="'+esc(s.bankAccount)+'"></div>'
    +'<div class="fg"><label class="fl">ชื่อบัญชี</label><input class="fc" id="sban" value="'+esc(s.bankAccountName)+'"></div>'
    +'<div class="divider"></div>'
    +'<div style="padding:14px;background:var(--surface-2);border-radius:var(--r);border-left:3px solid var(--accent)">'
    +'<div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">ตัวอย่างหัวเอกสาร</div>'
    +'<div style="font-size:13.5px;font-weight:700;color:var(--text)" id="pv-name">'+esc(s.name)+'</div>'
    +'<div style="font-size:11.5px;color:var(--text-2);margin-top:2px" id="pv-addr">'+esc(s.address)+'</div>'
    +'<div style="font-size:11px;color:var(--text-3);margin-top:4px">เลขผู้เสียภาษี: <span id="pv-tax">'+esc(s.taxId)+'</span> · โทร: <span id="pv-ph">'+esc(s.phone)+'</span></div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-top:16px">'
    +'<button class="btn btn-accent" style="flex:1" onclick="saveSettings()">'+I.save+' บันทึก</button>'
    +'<button class="btn btn-ghost" onclick="resetSettings()">'+I.refresh+' รีเซ็ต</button>'
    +'</div>'
    +'</div>';
  grid.appendChild(c1);grid.appendChild(c2);c.appendChild(grid);

  ['sn','sa','st','sp'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input',()=>{
      const g=x=>document.getElementById(x);
      if(g('pv-name'))g('pv-name').textContent=g('sn')?.value||'';
      if(g('pv-addr'))g('pv-addr').textContent=g('sa')?.value||'';
      if(g('pv-tax'))g('pv-tax').textContent=g('st')?.value||'';
      if(g('pv-ph'))g('pv-ph').textContent=g('sp')?.value||'';
    });
  });
}

window.previewLogo=function(inp){
  const f=inp.files[0];if(!f)return;
  if(f.size>2*1024*1024){toast('รูปต้องไม่เกิน 2MB','err');inp.value='';return;}
  const r=new FileReader();
  r.onload=e=>{const p=document.getElementById('logo-prev');if(p){p.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:contain">';window._logo=e.target.result;}};
  r.readAsDataURL(f);
};

async function saveSettings(){
  invalidateSettings();
  const set=await getSettings();
  const data={
    id:'company',
    name:document.getElementById('sn').value.trim(),
    address:document.getElementById('sa').value.trim(),
    taxId:document.getElementById('st').value.trim(),
    phone:document.getElementById('sp').value.trim(),
    email:document.getElementById('sem').value.trim(),
    vatRate:parseFloat(document.getElementById('sv').value)||7,
    bankName:document.getElementById('sbn').value.trim(),
    bankAccount:document.getElementById('sbno').value.trim(),
    bankAccountName:document.getElementById('sban').value.trim(),
    logo:window._logo||set.logo||null,
  };
  if(!data.name){toast('กรุณาระบุชื่อบริษัท','err');return;}
  await dbPut('settings',data);
  invalidateSettings();
  // refresh topnav brand mark + name (logo, initial)
  if(window.applyBrandMark)applyBrandMark(data);
  const tn=document.getElementById('tn-brand-name');if(tn)tn.textContent=data.name;
  const mn=document.getElementById('md-name');if(mn)mn.textContent=data.name;
  toast('บันทึกเรียบร้อย');
}
async function resetSettings(){
  if(!confirm('รีเซ็ตข้อมูลบริษัทเป็นค่าเริ่มต้น?'))return;
  await dbPut('settings',DEF_SET);invalidateSettings();window._logo=null;
  toast('รีเซ็ตเรียบร้อย','warn');pgSettings();
}

// ============================================================
// BACKUP
// ============================================================
async function pgBackup(){
  const c=document.getElementById('content');c.innerHTML='';
  c.insertAdjacentHTML('beforeend','<div class="ph"><div><div class="pt">Backup & Restore</div><div class="ps">สำรองข้อมูลและกู้คืน</div></div></div>');

  // EXCEL EXPORT (รายเดือน)
  const now=new Date();
  const defaultMonth=now.toISOString().slice(0,7); // YYYY-MM
  const xc=document.createElement('div');xc.className='card';xc.style.cssText='margin-bottom:20px';
  xc.innerHTML='<div class="card-header"><div class="card-title">'+I.download+' Export Excel รายเดือน</div></div><div class="card-body">'
    +'<p style="color:var(--text-2);margin-bottom:18px;line-height:1.7;font-size:13px">ดาวน์โหลดเอกสารเป็นไฟล์ <code class="code">.xlsx</code> เปิดใน Excel / Google Sheets ได้ — เหมาะสำหรับส่งบัญชี/ทำรายงาน</p>'
    +'<div style="display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:end">'
    +'<div><div style="font-size:12px;color:var(--text-2);margin-bottom:6px;font-weight:500">เดือน</div>'
    +'<input type="month" id="ex-month" value="'+defaultMonth+'" class="fc"></div>'
    +'<div><div style="font-size:12px;color:var(--text-2);margin-bottom:8px;font-weight:500">เอกสารที่จะ export</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:14px;font-size:13px">'
    +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="ex-type" value="quotations" checked> ใบเสนอราคา</label>'
    +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="ex-type" value="invoices" checked> ใบกำกับ/ใบส่งของ</label>'
    +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="ex-type" value="receipts" checked> ใบเสร็จ</label>'
    +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="ex-type" value="billings" checked> ใบวางบิล</label>'
    +'<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" class="ex-type" value="billing_combined" checked> ใบวางบิลรวม</label>'
    +'</div></div>'
    +'</div>'
    +'<button class="btn btn-accent btn-lg" onclick="exportExcelMonth()" style="margin-top:18px;width:100%">'+I.download+' ดาวน์โหลด Excel</button>'
    +'<div id="ex-info" style="margin-top:12px;padding:12px;background:var(--surface-2);border-radius:var(--r-sm);font-size:12.5px;color:var(--text-3)">เลือกเดือน + ประเภทเอกสาร แล้วกดดาวน์โหลด</div>'
    +'</div>';
  c.appendChild(xc);

  const grid=document.createElement('div');grid.className='dash-grid-eq';

  const c1=document.createElement('div');c1.className='card';
  c1.innerHTML='<div class="card-header"><div class="card-title">'+I.download+' Backup ข้อมูล</div></div><div class="card-body">'
    +'<p style="color:var(--text-2);margin-bottom:18px;line-height:1.7;font-size:13px">รวบรวมข้อมูลทั้งหมดในระบบ (เอกสาร, ลูกค้า, สินค้า, ตั้งค่า) เป็นไฟล์ <code class="code">.json</code> เก็บไว้ในที่ปลอดภัย</p>'
    +'<button class="btn btn-accent btn-lg" onclick="backupData()" style="width:100%">'+I.download+' ดาวน์โหลด Backup</button>'
    +'<div id="bk-info" style="margin-top:14px;padding:12px;background:var(--surface-2);border-radius:var(--r-sm);font-size:12.5px;color:var(--text-3)">คลิกปุ่มเพื่อเริ่ม backup</div>'
    +'</div>';

  const c2=document.createElement('div');c2.className='card';
  c2.innerHTML='<div class="card-header"><div class="card-title">'+I.upload+' Restore ข้อมูล</div></div><div class="card-body">'
    +'<p style="color:var(--text-2);margin-bottom:18px;line-height:1.7;font-size:13px"><b style="color:var(--danger)">⚠ คำเตือน:</b> การ Restore จะแทนที่ข้อมูลทั้งหมด ระบบจะ Backup อัตโนมัติก่อน</p>'
    +'<div onclick="document.getElementById(\'rfile\').click()" style="border:2px dashed var(--border);border-radius:var(--r);padding:30px 20px;text-align:center;cursor:pointer;transition:all var(--t-fast)" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.background=\'var(--accent-soft)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.background=\'\'">'
    +'<div style="width:44px;height:44px;border-radius:12px;background:var(--surface-3);color:var(--text-2);display:flex;align-items:center;justify-content:center;margin:0 auto 10px">'+I.upload+'</div>'
    +'<div style="font-weight:600;font-size:13.5px">เลือกไฟล์ Backup</div>'
    +'<div style="font-size:11.5px;color:var(--text-3);margin-top:2px">รองรับ .json เท่านั้น</div>'
    +'</div>'
    +'<input type="file" id="rfile" accept=".json" style="display:none" onchange="restoreData(this)">'
    +'<div id="rs-status" style="margin-top:12px"></div>'
    +'</div>';
  grid.appendChild(c1);grid.appendChild(c2);c.appendChild(grid);

  // danger zone
  const dz=document.createElement('div');dz.className='card';
  dz.style.cssText='margin-top:20px;border:1px solid #fecaca';
  dz.innerHTML='<div class="card-header" style="background:#fef2f2"><div class="card-title" style="color:var(--danger)">'+I.alert+' ลบข้อมูล (Danger Zone)</div></div><div class="card-body">'
    +'<p style="color:var(--text-2);margin-bottom:16px;font-size:13px"><b style="color:var(--danger)">⚠ ลบแล้วกู้คืนไม่ได้</b> — แนะนำให้ Backup ก่อนทุกครั้ง</p>'
    +'<div class="fr fr2">'
    +'<div style="border:1px solid #fecaca;border-radius:var(--r);padding:16px">'
    +'<b style="font-size:13.5px">เอกสารทั้งหมด</b>'
    +'<div style="font-size:12px;color:var(--text-3);margin:6px 0 12px">ใบเสนอราคา, ใบกำกับ, ใบเสร็จ, ใบวางบิล, ใบวางบิลรวม</div>'
    +'<button class="btn btn-danger-soft" style="width:100%" onclick="clearDocuments()">'+I.trash+' ลบเอกสารทั้งหมด</button>'
    +'</div>'
    +'<div style="border:1px solid #fecaca;border-radius:var(--r);padding:16px">'
    +'<b style="font-size:13.5px">คลังสินค้า</b>'
    +'<div style="font-size:12px;color:var(--text-3);margin:6px 0 12px">รายการสินค้าทั้งหมด (ไม่กระทบเอกสาร)</div>'
    +'<button class="btn btn-danger-soft" style="width:100%" onclick="clearInventory()">'+I.trash+' ลบคลังสินค้า</button>'
    +'</div>'
    +'</div>'
    +'<div id="clear-status" style="margin-top:12px"></div>'
    +'</div>';
  c.appendChild(dz);
}

async function backupData(){
  const stores=['settings','customers','inventory','quotations','invoices','receipts','billings','billing_combined','doc_counters'];
  const bk={version:3,timestamp:new Date().toISOString(),data:{}};
  for(const s of stores)bk.data[s]=await dbAll(s);
  const blob=new Blob([JSON.stringify(bk,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='docs-backup-'+todayISO()+'.json';a.click();
  URL.revokeObjectURL(url);
  const info=document.getElementById('bk-info');
  if(info)info.innerHTML='<b style="color:var(--success)">'+I.check+' Backup สำเร็จ</b><br><span style="font-size:11.5px;color:var(--text-3)">เวลา: '+thDate()+'</span>';
  toast('Backup สำเร็จ');
}

// ============================================================
// EXCEL EXPORT — รายเดือน, .xlsx จริง (ไม่ใช่ CSV)
// ============================================================
const _STORE_LABEL={
  quotations:'ใบเสนอราคา',
  invoices:'ใบกำกับ-ใบส่งของ',
  receipts:'ใบเสร็จ',
  billings:'ใบวางบิล',
  billing_combined:'ใบวางบิลรวม',
};

function _docInMonth(d,ym){
  const dt=d.docDate||d.createdAt;
  if(!dt)return false;
  return String(dt).slice(0,7)===ym;
}

function _docToRow(d){
  return {
    'เลขที่เอกสาร':d.docNumber||'',
    'วันที่':d.docDate||'',
    'ลูกค้า':d.customerName||'',
    'เลขผู้เสียภาษี':d.customerTax||'',
    'ที่อยู่':d.customerAddress||'',
    'จำนวนรายการ':(d.items||[]).length,
    'ยอดก่อนภาษี':Number(d.subtotal||0),
    'ภาษี (VAT)':Number(d.vat||0),
    'ยอดสุทธิ':Number(d.total||0),
    'หมายเหตุ':d.notes||d.note||'',
    'อ้างอิง':d.ref||'',
    'สร้างเมื่อ':d.createdAt||'',
  };
}

function _itemRows(d){
  return (d.items||[]).map((it,i)=>({
    'เลขที่เอกสาร':d.docNumber||'',
    'วันที่':d.docDate||'',
    'ลูกค้า':d.customerName||'',
    'ลำดับ':i+1,
    'รายการ':it.desc||'',
    'จำนวน':Number(it.qty||0),
    'หน่วย':it.unit||'',
    'ราคา/หน่วย':Number(it.unitPrice||0),
    'รวม':Number(it.total||(it.qty||0)*(it.unitPrice||0)),
  }));
}

async function exportExcelMonth(){
  const ym=document.getElementById('ex-month').value; // YYYY-MM
  const info=document.getElementById('ex-info');
  if(!ym){info.innerHTML='<span style="color:var(--danger)">กรุณาเลือกเดือน</span>';return;}
  const types=Array.from(document.querySelectorAll('.ex-type:checked')).map(c=>c.value);
  if(!types.length){info.innerHTML='<span style="color:var(--danger)">กรุณาเลือกประเภทเอกสารอย่างน้อย 1 ประเภท</span>';return;}
  if(!window.XLSX){toast('Library .xlsx โหลดไม่สำเร็จ — เช็คอินเทอร์เน็ต','err');return;}

  info.innerHTML='<span class="spin"></span> กำลังรวบรวมข้อมูล...';
  const wb=XLSX.utils.book_new();
  const summary=[];
  let grandTotal=0,grandCount=0;

  for(const t of types){
    const all=await dbAll(t);
    const docs=all.filter(d=>_docInMonth(d,ym)).sort((a,b)=>(a.docDate||'').localeCompare(b.docDate||''));
    const rows=docs.map(_docToRow);
    const total=docs.reduce((s,d)=>s+Number(d.total||0),0);
    summary.push({
      'ประเภทเอกสาร':_STORE_LABEL[t]||t,
      'จำนวน':docs.length,
      'ยอดรวม':total,
    });
    grandCount+=docs.length;grandTotal+=total;

    // sheet หลัก
    const ws=XLSX.utils.json_to_sheet(rows.length?rows:[{'เลขที่เอกสาร':'(ไม่มีเอกสารในเดือนนี้)'}]);
    ws['!cols']=[{wch:18},{wch:12},{wch:32},{wch:16},{wch:40},{wch:10},{wch:14},{wch:12},{wch:14},{wch:24},{wch:14},{wch:20}];
    const sheetName=(_STORE_LABEL[t]||t).slice(0,31);
    XLSX.utils.book_append_sheet(wb,ws,sheetName);

    // sheet รายการสินค้า/บริการ (line items)
    if(docs.length){
      const items=docs.flatMap(_itemRows);
      if(items.length){
        const wsi=XLSX.utils.json_to_sheet(items);
        wsi['!cols']=[{wch:18},{wch:12},{wch:32},{wch:8},{wch:40},{wch:10},{wch:10},{wch:14},{wch:14}];
        XLSX.utils.book_append_sheet(wb,wsi,(sheetName+' — รายการ').slice(0,31));
      }
    }
  }

  // sheet สรุป (อันแรก)
  summary.push({});
  summary.push({'ประเภทเอกสาร':'รวมทั้งสิ้น','จำนวน':grandCount,'ยอดรวม':grandTotal});
  const wss=XLSX.utils.json_to_sheet(summary);
  wss['!cols']=[{wch:24},{wch:12},{wch:18}];
  // แทรก sheet สรุปไว้หน้าสุด
  wb.SheetNames.unshift('สรุป');
  wb.Sheets['สรุป']=wss;

  // header info
  XLSX.utils.sheet_add_aoa(wss,[
    ['รายงาน Export เอกสาร'],
    ['เดือน',ym],
    ['สร้างเมื่อ',new Date().toLocaleString('th-TH')],
    [],
  ],{origin:'E1'});

  const fname='เอกสาร-'+ym+'.xlsx';
  XLSX.writeFile(wb,fname);

  info.innerHTML='<b style="color:var(--success)">'+I.check+' ดาวน์โหลดเสร็จ</b> — '+esc(fname)+' · '+grandCount+' เอกสาร · ยอดรวม ฿'+fmoney(grandTotal);
  toast('Export Excel สำเร็จ — '+grandCount+' เอกสาร');
}

async function restoreData(inp){
  const f=inp.files[0];if(!f)return;
  const st=document.getElementById('rs-status');
  if(!confirm('Restore จากไฟล์ "'+f.name+'" ?\n\nระบบจะ Backup อัตโนมัติก่อน แล้วจึง Restore'))
    {inp.value='';return;}
  if(st)st.innerHTML='<span style="color:var(--warning)"><span class="spin"></span> กำลัง Backup อัตโนมัติ...</span>';
  await backupData();
  try{
    const bk=JSON.parse(await f.text());
    if(!bk.data)throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
    if(st)st.innerHTML='<span style="color:var(--warning)"><span class="spin"></span> กำลัง Restore...</span>';
    for(const s of Object.keys(bk.data)){
      const items=bk.data[s];if(!Array.isArray(items))continue;
      await dbClear(s);
      for(const it of items)await dbPut(s,it);
    }
    invalidateSettings();
    toast('Restore สำเร็จ 🎉');
    if(st)st.innerHTML='<span style="color:var(--success)">'+I.check+' สำเร็จ — โหลดใหม่...</span>';
    setTimeout(()=>navigate('dashboard'),1200);
  }catch(e){
    toast('Restore ล้มเหลว: '+e.message,'err');
    if(st)st.innerHTML='<span style="color:var(--danger)">'+I.alert+' '+esc(e.message)+'</span>';
  }
  inp.value='';
}

async function clearDocuments(){
  if(!confirm('ลบเอกสารทั้งหมด?\n\n• ใบเสนอราคา\n• ใบกำกับภาษี\n• ใบเสร็จ\n• ใบวางบิล\n• ใบวางบิลรวม\n\nกู้คืนไม่ได้! แนะนำ Backup ก่อน'))return;
  for(const s of['quotations','invoices','receipts','billings','billing_combined','doc_counters'])await dbClear(s);
  _invalidateMaxCache();
  toast('ลบเอกสารทั้งหมดเรียบร้อย','warn');
  document.getElementById('clear-status').innerHTML='<span style="color:var(--success)">'+I.check+' ลบเรียบร้อย</span>';
}
async function clearInventory(){
  if(!confirm('ลบสินค้าทั้งหมด? กู้คืนไม่ได้'))return;
  await dbClear('inventory');
  toast('ลบคลังสินค้าเรียบร้อย','warn');
  document.getElementById('clear-status').innerHTML='<span style="color:var(--success)">'+I.check+' ลบเรียบร้อย</span>';
}
