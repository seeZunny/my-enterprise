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
    {key:'billing',label:'ใบวางบิล',icon:'billing'},
    {key:'billing-combined',label:'ใบวางบิลรวม',icon:'billings'},
  ]},
  {sec:'จัดการ',items:[
    {key:'customers',label:'ลูกค้า / คู่ค้า',icon:'users'},
    {key:'inventory',label:'คลังสินค้า',icon:'package'},
    {key:'accounting',label:'ภาพรวมการเงิน',icon:'wallet'},
  ]},
  {sec:'ระบบ',items:[
    {key:'companies',label:'บริษัทผู้ออก',icon:'users'},
    {key:'settings',label:'ตั้งค่าระบบ',icon:'settings'},
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
        n.addEventListener('click',()=>{navigate(it.key);closeMobDrawer();});
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
    companies:pgCompanies,
    settings:pgSettings, backup:pgBackup,
  };
  if(pages[page])await pages[page]();
}

// ============================================================
// COMPANIES PAGE — manage issuer companies (multi-company)
// ============================================================
async function pgCompanies(){
  const c=document.getElementById('content');c.innerHTML='';
  c.insertAdjacentHTML('beforeend','<div class="ph"><div><div class="pt">บริษัท<em>ผู้ออก</em></div><div class="ps">จัดการบริษัทผู้ออกเอกสาร — ออกเอกสารในนามบริษัทไหนก็ได้</div></div><div><button class="btn btn-accent" onclick="openCompanyForm()">'+I.plus+' เพิ่มบริษัท</button></div></div>');
  const list=await dbAll('companies');
  if(!list.length){
    c.insertAdjacentHTML('beforeend','<div class="empty"><div class="empty-i">'+I.users+'</div><div class="empty-t">ยังไม่มีบริษัทผู้ออก</div><div class="empty-s">เพิ่มบริษัทแรกของคุณเพื่อเริ่มออกเอกสารในนามนั้น</div></div>');
    return;
  }
  const grid=document.createElement('div');grid.className='dash-grid-eq';
  list.forEach(co=>{
    const card=document.createElement('div');card.className='card';
    card.innerHTML='<div class="card-body">'
      +'<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">'
      +'<div style="width:48px;height:48px;border-radius:11px;background:var(--copper);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-style:italic;font-size:24px;overflow:hidden">'+(co.logo?'<img src="'+esc(co.logo)+'" style="width:100%;height:100%;object-fit:contain;background:#fff">':esc((co.name||'?').charAt(0)))+'</div>'
      +'<div style="min-width:0;flex:1"><div style="font-weight:600;font-size:15px">'+esc(co.name||'-')+'</div>'
      +'<div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">เลขผู้เสียภาษี: '+esc(co.taxId||'-')+'</div></div>'
      +'</div>'
      +'<div style="font-size:12px;color:var(--ink-2);line-height:1.55">'+esc(co.address||'-')+'</div>'
      +'<div style="font-size:11.5px;color:var(--ink-3);margin-top:8px">โทร: '+esc(co.phone||'-')+'  ·  '+esc(co.email||'-')+'</div>'
      +'<div style="display:flex;gap:6px;margin-top:14px">'
      +'<button class="btn btn-ghost" onclick="openCompanyForm('+co.id+')" style="flex:1">'+I.edit+' แก้ไข</button>'
      +'<button class="btn btn-danger-soft" onclick="deleteCompany('+co.id+')">'+I.trash+'</button>'
      +'</div></div>';
    grid.appendChild(card);
  });
  c.appendChild(grid);
}

function openCompanyForm(id){
  (async()=>{
    const co=id?await dbGet('companies',id):{};
    openModal(
      '<div class="mh"><div class="mt"><div class="mt-icon">'+I.users+'</div>'+(id?'แก้ไขบริษัทผู้ออก':'เพิ่มบริษัทผู้ออก')+'</div>'
      +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
      +'<div class="mb">'
      +'<div class="fg"><label class="fl fl-req">ชื่อบริษัท</label><input class="fc" id="co-name" value="'+esc(co.name||'')+'" placeholder="บริษัท XXX จำกัด"></div>'
      +'<div class="fg"><label class="fl">เลขประจำตัวผู้เสียภาษี</label><input class="fc tnum" id="co-tax" value="'+esc(co.taxId||'')+'" placeholder="0000000000000"></div>'
      +'<div class="fg"><label class="fl">ที่อยู่</label><textarea class="fc" id="co-addr" rows="2">'+esc(co.address||'')+'</textarea></div>'
      +'<div class="fr fr2">'
      +'<div class="fg"><label class="fl">โทร</label><input class="fc" id="co-phone" value="'+esc(co.phone||'')+'"></div>'
      +'<div class="fg"><label class="fl">อีเมล</label><input class="fc" id="co-email" value="'+esc(co.email||'')+'"></div>'
      +'</div>'
      +'<div class="fr fr3">'
      +'<div class="fg"><label class="fl">ธนาคาร</label><input class="fc" id="co-bank" value="'+esc(co.bankName||'')+'"></div>'
      +'<div class="fg"><label class="fl">เลขบัญชี</label><input class="fc tnum" id="co-bankno" value="'+esc(co.bankAccount||'')+'"></div>'
      +'<div class="fg"><label class="fl">ชื่อบัญชี</label><input class="fc" id="co-bankname" value="'+esc(co.bankAccountName||'')+'"></div>'
      +'</div>'
      +'<div class="fg"><label class="fl">โลโก้</label>'
      +'<div onclick="document.getElementById(\'co-li\').click()" style="border:2px dashed var(--rule);border-radius:10px;padding:18px;text-align:center;cursor:pointer">'
      +(co.logo?'<img id="co-logo-prev" src="'+esc(co.logo)+'" style="max-height:80px;max-width:200px">':'<div id="co-logo-prev" style="color:var(--ink-3);font-size:12.5px">คลิกเพื่อเลือกโลโก้ (PNG/JPG)</div>')
      +'</div>'
      +'<input type="file" id="co-li" accept="image/*" style="display:none" onchange="onCoLogoSelect(this)"></div>'
      +'</div>'
      +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
      +'<button class="btn btn-accent btn-save" onclick="saveCompany('+(id||'null')+')">'+I.save+' บันทึก</button></div>'
    );
    if(co.logo)window._coLogo=co.logo;else window._coLogo=null;
  })();
}

function onCoLogoSelect(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    window._coLogo=e.target.result;
    const p=document.getElementById('co-logo-prev');
    if(p){p.outerHTML='<img id="co-logo-prev" src="'+e.target.result+'" style="max-height:80px;max-width:200px">';}
  };
  r.readAsDataURL(f);
}

async function saveCompany(id){
  lockSaveBtn();
  try{
    const data={
      name:document.getElementById('co-name').value.trim(),
      taxId:document.getElementById('co-tax').value.trim(),
      address:document.getElementById('co-addr').value.trim(),
      phone:document.getElementById('co-phone').value.trim(),
      email:document.getElementById('co-email').value.trim(),
      bankName:document.getElementById('co-bank').value.trim(),
      bankAccount:document.getElementById('co-bankno').value.trim(),
      bankAccountName:document.getElementById('co-bankname').value.trim(),
      logo:window._coLogo||null,
      createdAt:new Date().toISOString(),
    };
    if(!data.name){toast('กรุณาระบุชื่อบริษัท','err');return;}
    if(id){data.id=id;await dbPut('companies',data);toast('แก้ไขสำเร็จ');}
    else{await dbAdd('companies',data);toast('เพิ่มบริษัทสำเร็จ');}
    closeModal();window._coLogo=null;pgCompanies();
  }catch(e){
    toast('บันทึกล้มเหลว: '+(e.message||e),'err');
  }finally{unlockSaveBtn();}
}

async function deleteCompany(id){
  if(!confirm('ลบบริษัทนี้?\n\nเอกสารที่เคยออกในนามนี้ยังอยู่ครบ (เก็บ snapshot ไว้แล้ว)'))return;
  await dbDel('companies',id);
  toast('ลบเรียบร้อย','warn');
  pgCompanies();
}

// ============================================================
// DASHBOARD
// ============================================================
async function pgDashboard(){
  const[q,inv,rec,bil,custs]=await Promise.all([dbAll('quotations'),dbAll('invoices'),dbAll('receipts'),dbAll('billings'),dbAll('customers')]);
  const tInv=inv.reduce((s,i)=>s+(i.total||0),0);
  const tRec=rec.reduce((s,i)=>s+(i.total||0),0);
  const tQuo=q.reduce((s,i)=>s+(i.total||0),0);
  const pending=bil.filter(b=>!b.paymentDate);
  const tPend=pending.reduce((s,b)=>s+(b.total||0),0);
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
    +'<div class="ps">มีลูกค้าในระบบ <b>'+custs.length+'</b> ราย · เอกสารทั้งหมด <b>'+(q.length+inv.length+rec.length+bil.length)+'</b> ฉบับ</div>'
    +'</div></div>'
  );

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
  const all=[
    ...q.map(d=>({...d,_s:'quotations',_lbl:'ใบเสนอ',_cls:'b-quo',_col:'var(--quo)'})),
    ...inv.map(d=>({...d,_s:'invoices',_lbl:'ใบกำกับ',_cls:'b-inv',_col:'var(--inv)'})),
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
      tr.innerHTML='<td><span class="badge '+d._cls+'">'+d._lbl+'</span></td>'
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
  const{store,title,color,icon,addFn,addLabel,convertActions}=cfg;
  const docs=await dbAll(store);

  const c=document.getElementById('content');c.innerHTML='';
  const ph=document.createElement('div');ph.className='ph';
  ph.innerHTML='<div class="ph-left"><div class="eyebrow">เอกสาร</div><div class="pt" style="margin-top:8px">'+esc(title)+'</div><div class="ps">ทั้งหมด <b>'+docs.length+'</b> รายการในระบบ</div></div>';
  const phAct=document.createElement('div');
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
async function pgBilling(){
  await renderDocList({store:'billings',title:'ใบวางบิล',color:'var(--bil)',icon:'bil',addFn:()=>openBillingForm(),addLabel:'สร้างใบวางบิล',
    convertActions:[{icon:'receipt',label:'รับเงิน',color:'#10b981',bg:'#ecfdf5',fn:async d=>{
      if(d.paymentDate){toast('รับเงินไปแล้วเมื่อ '+thDate(d.paymentDate),'info');return;}
      if(!confirm('ยืนยันรับเงินสำหรับใบวางบิล '+d.docNumber+'?'))return;
      d.paymentDate=todayISO();await dbPut('billings',d);toast('บันทึกรับเงินเรียบร้อย');navigate('billing');
    }}],
  });
}
async function pgBillingCombined(){
  await renderDocList({store:'billing_combined',title:'ใบวางบิลรวม',color:'var(--blc)',icon:'blc',addFn:()=>openBillingCombinedForm(),addLabel:'สร้างใบวางบิลรวม'});
}

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
  info.style.cssText='background:linear-gradient(135deg,var(--accent-soft),#fff);border:1px solid var(--accent);border-radius:var(--r);padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px';
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
      const mk=(h,fn,cl='btn btn-soft btn-sm')=>{const b=document.createElement('button');b.className=cl;b.innerHTML=h;b.addEventListener('click',fn);return b;};
      w.appendChild(mk(I.edit,()=>openCustomerForm(cu.id)));
      w.appendChild(mk(I.trash,()=>deleteDoc('customers',cu.id,pgCustomers),'btn btn-danger-soft btn-sm'));
      tr.querySelector('td:last-child').appendChild(w);
      tbody.appendChild(tr);
    });
  }
  sinp.addEventListener('input',render);render();
}

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
  const ph=document.createElement('div');ph.className='ph';
  ph.innerHTML='<div class="ph-left"><div class="eyebrow">จัดการ</div><div class="pt" style="margin-top:8px">คลัง<em>สินค้า</em></div><div class="ps"><b>'+items.length+'</b> รายการ · ใช้ใน autocomplete ตอนออกเอกสาร</div></div>';
  const ab=document.createElement('button');ab.className='btn btn-accent';ab.innerHTML=I.plus+' เพิ่มสินค้า';
  ab.addEventListener('click',()=>openInventoryForm());
  const phAct=document.createElement('div');phAct.appendChild(ab);ph.appendChild(phAct);
  c.appendChild(ph);
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
    const f=items.slice().reverse().filter(i=>!q||(i.name||'').toLowerCase().includes(q)||(i.sku||'').toLowerCase().includes(q));
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
