// ============================================================
// COMMAND PALETTE — Cmd+K / Ctrl+K
// ============================================================

let _cmdkHL=0, _cmdkActions=[];

function openCmdK(){
  const ov=document.createElement('div');ov.className='cmdk-ov';ov.id='cmdk-ov';
  ov.innerHTML='<div class="cmdk" onclick="event.stopPropagation()">'
    +'<div class="cmdk-search">'+I.search
    +'<input id="cmdk-inp" placeholder="พิมพ์เพื่อค้นหา หรือใช้คำสั่ง...">'
    +'<kbd>ESC</kbd></div>'
    +'<div class="cmdk-list" id="cmdk-list"></div>'
    +'</div>';
  ov.addEventListener('click',e=>{if(e.target===ov)closeCmdK();});
  document.body.appendChild(ov);
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('cmdk-inp').focus(),50);

  const inp=document.getElementById('cmdk-inp');
  inp.addEventListener('input',()=>renderCmdK(inp.value));
  inp.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeCmdK();return;}
    if(e.key==='ArrowDown'){e.preventDefault();_cmdkHL=Math.min(_cmdkHL+1,_cmdkActions.length-1);renderCmdK(inp.value,true);}
    else if(e.key==='ArrowUp'){e.preventDefault();_cmdkHL=Math.max(_cmdkHL-1,0);renderCmdK(inp.value,true);}
    else if(e.key==='Enter'){e.preventDefault();const a=_cmdkActions[_cmdkHL];if(a){closeCmdK();setTimeout(a.fn,50);}}
  });
  renderCmdK('');
}
function closeCmdK(){
  const o=document.getElementById('cmdk-ov');
  if(o){o.style.animation='overlayIn .15s reverse';setTimeout(()=>{try{o.remove();}catch(e){}},140);}
  // unlock body scroll only if no modal is still open
  if(!document.getElementById('ov'))document.body.style.overflow='';
}

async function renderCmdK(q,keepHL){
  const list=document.getElementById('cmdk-list');if(!list)return;
  q=(q||'').toLowerCase().trim();
  // sections: actions + nav + docs (from db when q is non-empty)
  const actions=[
    {sec:'สร้างใหม่',icon:'plus',title:'สร้างใบเสนอราคา',sub:'ออกใบเสนอราคาใหม่',fn:openQuotationForm},
    {sec:'สร้างใหม่',icon:'plus',title:'สร้างใบกำกับภาษี / ใบส่งของ',sub:'INV',fn:openInvoiceForm},
    {sec:'สร้างใหม่',icon:'plus',title:'สร้างใบเสร็จรับเงิน',sub:'RC',fn:openReceiptForm},
    {sec:'สร้างใหม่',icon:'plus',title:'สร้างใบวางบิล',sub:'BL',fn:openBillingForm},
    {sec:'สร้างใหม่',icon:'plus',title:'สร้างใบวางบิลรวม',sub:'BL (รวม)',fn:openBillingCombinedForm},
    {sec:'สร้างใหม่',icon:'user',title:'เพิ่มลูกค้า / คู่ค้า',fn:()=>openCustomerForm()},
    {sec:'สร้างใหม่',icon:'package',title:'เพิ่มสินค้า',fn:()=>openInventoryForm()},
    {sec:'ไปยัง',icon:'dashboard',title:'ภาพรวม (Dashboard)',fn:()=>navigate('dashboard')},
    {sec:'ไปยัง',icon:'docs',title:'เอกสารทั้งหมด',fn:()=>navigate('docs')},
    {sec:'ไปยัง',icon:'quote',title:'ใบเสนอราคา (ทั้งหมด)',fn:()=>navigate('quotation')},
    {sec:'ไปยัง',icon:'invoice',title:'ใบกำกับ (ทั้งหมด)',fn:()=>navigate('invoice')},
    {sec:'ไปยัง',icon:'receipt',title:'ใบเสร็จ (ทั้งหมด)',fn:()=>navigate('receipt')},
    {sec:'ไปยัง',icon:'billing',title:'ใบวางบิล (ทั้งหมด)',fn:()=>navigate('billing')},
    {sec:'ไปยัง',icon:'billings',title:'ใบวางบิลรวม',fn:()=>navigate('billing-combined')},
    {sec:'ไปยัง',icon:'users',title:'ลูกค้า / คู่ค้า',fn:()=>navigate('customers')},
    {sec:'ไปยัง',icon:'package',title:'คลังสินค้า',fn:()=>navigate('inventory')},
    {sec:'ไปยัง',icon:'wallet',title:'ภาพรวมการเงิน',fn:()=>navigate('accounting')},
    {sec:'ระบบ',icon:'settings',title:'ตั้งค่าบริษัท',fn:()=>navigate('settings')},
    {sec:'ระบบ',icon:'database',title:'Backup & Restore',fn:()=>navigate('backup')},
  ];

  let docs=[],customers=[],items=[];
  if(q){
    const stores=['quotations','invoices','receipts','billings','billing_combined'];
    const labels={quotations:'ใบเสนอ',invoices:'ใบกำกับ',receipts:'ใบเสร็จ',billings:'ใบวางบิล',billing_combined:'ใบวางบิลรวม'};
    for(const s of stores){
      const all=await dbAll(s);
      all.forEach(d=>{
        if((d.docNumber||'').toLowerCase().includes(q)||(d.customerName||'').toLowerCase().includes(q)){
          docs.push({
            sec:'เอกสาร',icon:s==='quotations'?'quote':s==='invoices'?'invoice':s==='receipts'?'receipt':s==='billings'?'billing':'billings',
            title:d.docNumber+' · '+(d.customerName||'-'),
            sub:labels[s]+' · ฿'+fmoney(d.total),
            fn:()=>viewDocModal(s,d.id),
          });
        }
      });
    }
    const allCust=await dbAll('customers');
    allCust.forEach(cu=>{
      if((cu.name||'').toLowerCase().includes(q)||(cu.taxId||'').includes(q)||(cu.phone||'').includes(q)){
        customers.push({
          sec:'ลูกค้า',icon:'user',
          title:cu.name||'-',
          sub:(cu.taxId?'เลขผู้เสียภาษี '+cu.taxId:'')+(cu.phone?' · '+cu.phone:''),
          fn:()=>viewCustomerHistory(cu),
        });
      }
    });
    const allInv=await dbAll('inventory');
    allInv.forEach(it=>{
      if((it.name||'').toLowerCase().includes(q)||(it.sku||'').toLowerCase().includes(q)){
        items.push({
          sec:'สินค้า',icon:'package',
          title:it.name||'-',
          sub:(it.sku?it.sku+' · ':'')+'฿'+fmoney(it.price||0)+(it.stock!=null?' · สต็อก '+it.stock:''),
          fn:()=>openInventoryForm(it.id),
        });
      }
    });
  }

  // filter actions
  const filtered=q
    ? actions.filter(a=>a.title.toLowerCase().includes(q)||(a.sub||'').toLowerCase().includes(q))
    : actions;

  _cmdkActions = [...filtered, ...docs, ...customers, ...items];
  if(!keepHL)_cmdkHL=0;
  if(_cmdkHL>=_cmdkActions.length)_cmdkHL=_cmdkActions.length-1;
  if(_cmdkHL<0)_cmdkHL=0;

  list.innerHTML='';
  if(!_cmdkActions.length){
    list.innerHTML='<div class="empty" style="padding:30px"><div class="empty-t">ไม่พบผลลัพธ์</div></div>';
    return;
  }
  let curSec='';
  _cmdkActions.forEach((a,i)=>{
    if(a.sec!==curSec){curSec=a.sec;const h=document.createElement('div');h.className='cmdk-sec';h.textContent=curSec;list.appendChild(h);}
    const it=document.createElement('div');
    it.className='cmdk-item'+(i===_cmdkHL?' hl':'');
    it.dataset.idx=i;
    it.innerHTML='<div class="cmdk-item-i">'+I[a.icon]+'</div>'
      +'<div class="cmdk-item-t"><div>'+esc(a.title)+'</div>'+(a.sub?'<div class="cmdk-item-s">'+esc(a.sub)+'</div>':'')+'</div>';
    // use mousedown so we don't lose the click when mouseenter changes hl class
    it.addEventListener('mousedown',e=>{e.preventDefault();closeCmdK();setTimeout(a.fn,40);});
    // mouseenter only toggles .hl class — does NOT rebuild list (so clicks don't get lost)
    it.addEventListener('mouseenter',()=>{
      _cmdkHL=i;
      list.querySelectorAll('.cmdk-item').forEach(el=>{
        el.classList.toggle('hl', parseInt(el.dataset.idx)===_cmdkHL);
      });
    });
    list.appendChild(it);
  });
}

// global shortcut
document.addEventListener('keydown',e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault();
    if(document.getElementById('cmdk-ov'))closeCmdK();else openCmdK();
  }
  if(e.key==='Escape'){
    if(document.getElementById('cmdk-ov'))closeCmdK();
    else if(document.getElementById('ov'))closeModal();
  }
  // quick create shortcuts (when not in input)
  if(!e.metaKey&&!e.ctrlKey&&!e.altKey&&['INPUT','TEXTAREA','SELECT'].indexOf(e.target.tagName)<0){
    if(e.key==='/'){e.preventDefault();openCmdK();}
  }
});
