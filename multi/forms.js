// ============================================================
// FORMS — items table, product AC, customer prefill, summary
// ============================================================

let _itemIdx=0;

function buildItemRow(tbody,idx,it,products){
  const tr=document.createElement('tr');tr.id='ir-'+idx;

  const tdN=document.createElement('td');
  tdN.className='col-num';tdN.textContent=idx+1;
  tr.appendChild(tdN);

  // description with product autocomplete
  const tdD=document.createElement('td');
  const inp=document.createElement('input');
  inp.type='text';inp.id='id-'+idx;inp.value=it.desc||'';
  inp.placeholder='พิมพ์ชื่อสินค้า/บริการ (มี autocomplete)';
  inp.autocomplete='off';
  attachProductAC(inp,idx,products||[]);
  tdD.appendChild(inp);
  tr.appendChild(tdD);

  // qty
  const tdQ=document.createElement('td');
  const iq=document.createElement('input');
  iq.type='number';iq.id='iq-'+idx;iq.value=it.qty||1;iq.min=0;iq.step='any';
  iq.style.textAlign='right';
  iq.addEventListener('input',()=>calcItemRow(idx));
  tdQ.appendChild(iq);tr.appendChild(tdQ);

  // unit
  const tdU=document.createElement('td');
  const iu=document.createElement('input');
  iu.type='text';iu.id='iu-'+idx;iu.value=it.unit||'ชิ้น';
  iu.style.textAlign='center';
  tdU.appendChild(iu);tr.appendChild(tdU);

  // unit price
  const tdP=document.createElement('td');
  const ip2=document.createElement('input');
  ip2.type='number';ip2.id='ip-'+idx;ip2.value=it.unitPrice||0;ip2.min=0;ip2.step='any';
  ip2.style.textAlign='right';
  ip2.addEventListener('input',()=>calcItemRow(idx));
  tdP.appendChild(ip2);tr.appendChild(tdP);

  // total
  const tdT=document.createElement('td');
  tdT.id='it-'+idx;tdT.className='col-total';
  tdT.textContent=fmoney(it.total||((it.qty||1)*(it.unitPrice||0)));
  tr.appendChild(tdT);

  // delete
  const tdX=document.createElement('td');tdX.style.width='40px';tdX.style.textAlign='center';
  const btn=document.createElement('button');btn.className='del-row';btn.type='button';
  btn.innerHTML=I.trash;
  btn.addEventListener('click',()=>{tr.style.transition='all .2s';tr.style.opacity='0';tr.style.transform='translateX(-10px)';setTimeout(()=>{tr.remove();renumber();calcTotal();},180);});
  tdX.appendChild(btn);tr.appendChild(tdX);

  tbody.appendChild(tr);
}

function renumber(){
  document.querySelectorAll('#items-body tr').forEach((tr,i)=>{
    const num=tr.querySelector('.col-num');
    if(num)num.textContent=i+1;
  });
}

function attachProductAC(inp,idx,products){
  let pop=null, hl=-1, matches=[];
  function close(){if(pop){pop.remove();pop=null;hl=-1;}}
  function show(q){
    matches = q
      ? products.filter(p=>(p.name||'').toLowerCase().includes(q.toLowerCase()))
      : products.slice();
    if(!matches.length){close();return;}
    if(!pop){
      pop=document.createElement('div');pop.className='ac-pop';
      document.body.appendChild(pop);
    }
    const r=inp.getBoundingClientRect();
    pop.style.top=(r.bottom+4)+'px';
    pop.style.left=r.left+'px';
    pop.style.width=Math.max(r.width,260)+'px';
    pop.innerHTML='';
    matches.slice(0,8).forEach((p,i)=>{
      const it=document.createElement('div');
      it.className='ac-item'+(i===hl?' hl':'');
      it.innerHTML='<div><b>'+esc(p.name)+'</b>'+(p.sku?' <span class="ac-meta">'+esc(p.sku)+'</span>':'')+'</div><span class="ac-meta">฿'+fmoney(p.price||0)+'</span>';
      it.addEventListener('mousedown',e=>{e.preventDefault();apply(p);});
      pop.appendChild(it);
    });
  }
  function apply(p){
    inp.value=p.name;
    const u=document.getElementById('iu-'+idx);
    const pr=document.getElementById('ip-'+idx);
    if(u)u.value=p.unit||'ชิ้น';
    if(pr){pr.value=p.price||0;calcItemRow(idx);}
    close();
  }
  inp.addEventListener('input',()=>show(inp.value));
  inp.addEventListener('focus',()=>show(inp.value));
  inp.addEventListener('blur',()=>setTimeout(close,150));
  inp.addEventListener('keydown',e=>{
    if(!pop||!matches.length)return;
    if(e.key==='ArrowDown'){e.preventDefault();hl=Math.min(hl+1,matches.length-1,7);show(inp.value);}
    else if(e.key==='ArrowUp'){e.preventDefault();hl=Math.max(hl-1,0);show(inp.value);}
    else if(e.key==='Enter'&&hl>=0){e.preventDefault();apply(matches[hl]);}
    else if(e.key==='Escape')close();
  });
}

function addItemRow(){
  const tbody=document.getElementById('items-body');if(!tbody)return;
  const products=window._app.prods||[];
  buildItemRow(tbody,_itemIdx++,{},products);
  calcTotal();
}

function calcItemRow(idx){
  const q=parseFloat(document.getElementById('iq-'+idx)?.value)||0;
  const p=parseFloat(document.getElementById('ip-'+idx)?.value)||0;
  const el=document.getElementById('it-'+idx);
  if(el)el.textContent=fmoney(q*p);
  calcTotal();
}

let _calcTimer=null;
function calcTotal(){clearTimeout(_calcTimer);_calcTimer=setTimeout(_doCalc,30);}
function _doCalc(){
  let sub=0;
  document.querySelectorAll('#items-body tr').forEach(row=>{
    const idx=row.id?.replace('ir-','');
    if(idx===undefined||idx==='')return;
    const q=parseFloat(document.getElementById('iq-'+idx)?.value)||0;
    const p=parseFloat(document.getElementById('ip-'+idx)?.value)||0;
    sub+=q*p;
  });
  const vatChk=document.getElementById('f-vat-en');
  const vatEnabled=vatChk?vatChk.checked:false;
  const vatP=vatEnabled?(parseFloat(document.getElementById('f-vatp')?.value)||0):0;
  const dis=parseFloat(document.getElementById('f-dis')?.value)||0;
  const vat=vatEnabled?sub*vatP/100:0;
  const tot=sub+vat-dis;
  const g=id=>document.getElementById(id);
  if(g('s-sub'))g('s-sub').textContent='฿'+fmoney(sub);
  if(g('s-vat'))g('s-vat').textContent='฿'+fmoney(vat);
  if(g('s-dis'))g('s-dis').textContent='-฿'+fmoney(dis);
  if(g('s-tot'))g('s-tot').textContent='฿'+fmoney(tot);
  // toggle VAT row visibility
  const vatRow=g('s-vat-row');
  if(vatRow)vatRow.style.opacity=vatEnabled?'1':'.4';
  const vatPInp=g('f-vatp');
  if(vatPInp)vatPInp.disabled=!vatEnabled;
  window._app.sub=sub;window._app.vat=vat;window._app.tot=tot;
  window._app.vatPercent=vatP;window._app.discount=dis;window._app.vatEnabled=vatEnabled;
}

function getItemsFromDOM(){
  const items=[];
  document.querySelectorAll('#items-body tr').forEach(row=>{
    const idx=row.id?.replace('ir-','');
    if(idx===undefined||idx==='')return;
    const desc=document.getElementById('id-'+idx)?.value||'';
    const qty=parseFloat(document.getElementById('iq-'+idx)?.value)||0;
    const unit=document.getElementById('iu-'+idx)?.value||'';
    const up=parseFloat(document.getElementById('ip-'+idx)?.value)||0;
    if(desc||up>0)items.push({desc,qty,unit,unitPrice:up,total:qty*up});
  });
  return items;
}

function buildItemsSection(container,items,products){
  _itemIdx=0;
  window._app.prods=products;
  const wrap=document.createElement('div');wrap.style.marginBottom='14px';
  const lbl=document.createElement('div');lbl.className='fl';lbl.innerHTML=I.package+' รายการสินค้า / บริการ';
  wrap.appendChild(lbl);
  const tw=document.createElement('div');tw.className='it-wrap';
  const tbl=document.createElement('table');tbl.className='it';
  tbl.innerHTML='<thead><tr><th class="col-num">#</th><th>รายการ</th><th style="width:78px;text-align:right">จำนวน</th><th style="width:70px">หน่วย</th><th style="width:110px;text-align:right">ราคา/หน่วย</th><th style="width:110px;text-align:right">รวม</th><th style="width:40px"></th></tr></thead>';
  const tbody=document.createElement('tbody');tbody.id='items-body';tbl.appendChild(tbody);
  tw.appendChild(tbl);
  const rows=items&&items.length?items:[{desc:'',qty:1,unit:'ชิ้น',unitPrice:0,total:0}];
  rows.forEach((it,i)=>{_itemIdx=i;buildItemRow(tbody,i,it,products);});
  _itemIdx=rows.length;
  const addBtn=document.createElement('button');addBtn.type='button';addBtn.className='it-add';
  addBtn.innerHTML=I.plus+' เพิ่มรายการ';
  addBtn.addEventListener('click',addItemRow);
  tw.appendChild(addBtn);
  wrap.appendChild(tw);
  container.appendChild(wrap);
}

function summaryBlock(vatRate,vatPercent,discount,color,vatEnabled){
  // multi system: VAT off by default (since this is "บิลรวมไม่ VAT")
  const ven=vatEnabled===undefined?false:!!vatEnabled;
  const div=document.createElement('div');div.className='sumbox';
  div.innerHTML=
    '<div class="sumrow"><span class="text-2">ยอดก่อนภาษี</span><span id="s-sub" class="tnum">฿0.00</span></div>'
    +'<div id="s-vat-row" class="sumrow" style="opacity:'+(ven?'1':'.4')+'">'
      +'<span class="text-2"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">'
      +'<input type="checkbox" id="f-vat-en" '+(ven?'checked':'')+' onchange="calcTotal()" style="cursor:pointer"> ภาษีมูลค่าเพิ่ม</label>'
      +' <input type="number" id="f-vatp" value="'+(vatPercent??vatRate??7)+'" min="0" max="100" oninput="calcTotal()" '+(ven?'':'disabled')+'> %</span>'
      +'<span id="s-vat" class="tnum">฿0.00</span></div>'
    +'<div class="sumrow"><span class="text-2">ส่วนลด <input type="number" id="f-dis" value="'+(discount||0)+'" min="0" oninput="calcTotal()"></span><span id="s-dis" class="tnum">-฿0.00</span></div>'
    +'<div class="sumrow tot"><span>ยอดรวมสุทธิ</span><span id="s-tot" class="tnum" style="color:'+color+'">฿0.00</span></div>';
  return div;
}

// company strip at top of modal — multi system: with issuer dropdown
function companyStrip(set,issuerId,docHasBank){
  const d=document.createElement('div');d.className='co-strip';d.id='co-strip-wrap';
  d.innerHTML='<div id="co-strip-inner" style="display:flex;align-items:center;gap:14px;flex:1;min-width:0"></div>';
  // populate async
  (async()=>{
    const cos=await dbAll('companies');
    let chosen=set;
    let chosenId='';
    if(cos.length){
      // pick selected id, or first company, or settings
      const sel=cos.find(c=>String(c.id)===String(issuerId))||cos[0];
      if(sel){chosen=sel;chosenId=String(sel.id);}
    }
    // hidden input to remember chosen id
    const hidden=document.createElement('input');hidden.type='hidden';hidden.id='f-issuer-id';hidden.value=chosenId;
    d.appendChild(hidden);
    _renderCoStrip(chosen);
    // auto-fill bank fields from chosen company (only on initial render of new doc)
    if(!docHasBank&&chosenId)_fillBankFromCompany(chosen);
    // add dropdown if multiple companies exist
    if(cos.length>1){
      const sel=document.createElement('select');
      sel.className='fc';sel.id='f-issuer-sel';
      sel.style.cssText='margin-left:auto;max-width:240px;font-size:12.5px;padding:6px 10px';
      cos.forEach(c=>{
        const o=document.createElement('option');o.value=String(c.id);o.textContent=c.name||'-';
        if(String(c.id)===chosenId)o.selected=true;
        sel.appendChild(o);
      });
      sel.addEventListener('change',()=>{
        const co=cos.find(c=>String(c.id)===sel.value);
        if(co){
          _renderCoStrip(co);
          document.getElementById('f-issuer-id').value=String(co.id);
          _fillBankFromCompany(co); // sync bank fields when issuer changes
        }
      });
      d.appendChild(sel);
    }
  })();
  return d;
}

function _fillBankFromCompany(co){
  const b=document.getElementById('f-bank');
  const bn=document.getElementById('f-bankno');
  const ba=document.getElementById('f-bankname');
  if(b&&co.bankName)b.value=co.bankName;
  if(bn&&co.bankAccount)bn.value=co.bankAccount;
  if(ba&&co.bankAccountName)ba.value=co.bankAccountName;
}

function _renderCoStrip(set){
  const inner=document.getElementById('co-strip-inner');if(!inner)return;
  const logo=set.logo?'<img src="'+esc(set.logo)+'">':'<div style="color:var(--accent);font-weight:700">'+esc((set.name||'M').charAt(0))+'</div>';
  inner.innerHTML='<div class="co-strip-logo">'+logo+'</div><div style="min-width:0;flex:1"><div class="co-strip-name">'+esc(set.name||'')+'</div><div class="co-strip-meta">'+esc(set.address||'')+'</div><div class="co-strip-meta">โทร: '+esc(set.phone||'-')+' · เลขผู้เสียภาษี: '+esc(set.taxId||'-')+'</div></div>';
}

// helper: get current issuer snapshot from form
async function _getIssuerSnapshot(set){
  const idEl=document.getElementById('f-issuer-id');
  const id=idEl?idEl.value:'';
  if(!id)return null; // use default settings
  const co=await dbGet('companies',Number(id));
  if(!co)return null;
  // snapshot only the relevant fields (so future edits don't change historical docs)
  return {
    id:co.id, name:co.name, address:co.address, taxId:co.taxId,
    phone:co.phone, email:co.email,
    bankName:co.bankName, bankAccount:co.bankAccount, bankAccountName:co.bankAccountName,
    logo:co.logo,
  };
}

// customer dropdown
function custOpts(custs,selId){
  return custs.map(c=>'<option value="'+c.id+'" data-name="'+esc(c.name)+'" data-tax="'+esc(c.taxId||'')+'" data-addr="'+esc(c.address||'')+'" data-phone="'+esc(c.phone||'')+'" data-email="'+esc(c.email||'')+'"'+(selId&&selId==c.id?' selected':'')+'>'+esc(c.name)+'</option>').join('');
}

function fillCustomerDropdown(){
  const sel=document.getElementById('f-cust');if(!sel)return;
  const opt=sel.options[sel.selectedIndex];if(!opt?.value)return;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('f-cname',opt.dataset.name);
  set('f-ctax',opt.dataset.tax);
  set('f-caddr',opt.dataset.addr);
  // pulse the customer card
  const bar=document.querySelector('.cust-bar');
  if(bar){bar.style.animation='none';bar.offsetWidth;bar.style.animation='popIn .3s cubic-bezier(.34,1.56,.64,1)';}
}

// ============================================================
// QUOTATION FORM
// ============================================================
async function openQuotationForm(id=null,prefill=null){
  const[custs,prods,set]=await Promise.all([dbAll('customers'),dbAll('inventory'),getSettings()]);
  let doc=prefill||null;
  if(id&&!prefill)doc=await dbGet('quotations',id);
  const docNum=(id&&!prefill)?doc.docNumber:await peekDocNum('quotation');
  openModal(
    '<div class="mh mh-quo"><div class="mt"><div class="mt-icon">'+I.quote+'</div>'+(id&&!prefill?'แก้ไข':'สร้าง')+'ใบเสนอราคา</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb" id="qbody"></div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-doc btn-quo btn-save" onclick="saveQuotation('+(id&&!prefill?id:'null')+')">'+I.save+' บันทึก</button></div>'
  );
  buildDocFormBody('qbody','quotation',doc,custs,prods,set,docNum,prefill);
}

async function saveQuotation(id){
  await saveDocGeneric('quotation','quotations',id,()=>navigate('quotation'));
}

// ============================================================
// INVOICE FORM
// ============================================================
async function openInvoiceForm(id=null,prefill=null){
  const[custs,prods,set]=await Promise.all([dbAll('customers'),dbAll('inventory'),getSettings()]);
  let doc=prefill||null;
  if(id&&!prefill)doc=await dbGet('invoices',id);
  const docNum=(id&&!prefill)?doc.docNumber:await peekDocNum('invoice');
  openModal(
    '<div class="mh mh-inv"><div class="mt"><div class="mt-icon">'+I.invoice+'</div>'+(id&&!prefill?'แก้ไข':'สร้าง')+'ใบกำกับภาษี / ใบส่งของ</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb" id="ibody"></div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-doc btn-inv btn-save" onclick="saveInvoice('+(id&&!prefill?id:'null')+')">'+I.save+' บันทึก</button></div>'
  );
  buildDocFormBody('ibody','invoice',doc,custs,prods,set,docNum,prefill);
}
async function saveInvoice(id){
  await saveDocGeneric('invoice','invoices',id,()=>navigate('invoice'));
}

// ============================================================
// RECEIPT FORM
// ============================================================
async function openReceiptForm(id=null,prefill=null){
  const[custs,prods,set]=await Promise.all([dbAll('customers'),dbAll('inventory'),getSettings()]);
  let doc=prefill||null;
  if(id&&!prefill)doc=await dbGet('receipts',id);
  const docNum=(id&&!prefill)?doc.docNumber:await peekDocNum('receipt');
  openModal(
    '<div class="mh mh-rec"><div class="mt"><div class="mt-icon">'+I.receipt+'</div>'+(id&&!prefill?'แก้ไข':'สร้าง')+'ใบเสร็จรับเงิน</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb" id="rbody"></div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-doc btn-rec btn-save" onclick="saveReceipt('+(id&&!prefill?id:'null')+')">'+I.save+' บันทึก</button></div>'
  );
  buildDocFormBody('rbody','receipt',doc,custs,prods,set,docNum,prefill);
}
async function saveReceipt(id){
  await saveDocGeneric('receipt','receipts',id,()=>navigate('receipt'));
}

// ============================================================
// Generic builder for quotation/invoice/receipt body
// ============================================================
function buildDocFormBody(bodyId,type,doc,custs,prods,set,docNum,prefill){
  const body=document.getElementById(bodyId);
  const color = type==='quotation'?'var(--quo)':type==='invoice'?'var(--inv)':'var(--rec)';
  body.appendChild(companyStrip(set,doc?.issuedBy?.id,!!doc?.bankName));

  body.insertAdjacentHTML('beforeend',
    '<div class="fr fr3">'
    +'<div class="fg"><label class="fl">เลขที่เอกสาร</label><input class="fc tnum" id="f-docnum" value="'+esc(docNum)+'"></div>'
    +'<div class="fg"><label class="fl">วันที่ออกเอกสาร</label><input class="fc" type="date" id="f-docdate" value="'+(doc?doc.docDate:todayISO())+'"></div>'
    +'<div class="fg"><label class="fl">อ้างอิง</label><input class="fc" id="f-ref" placeholder="เลขที่อ้างอิง" value="'+esc(prefill?.docNumber||doc?.ref||'')+'"></div>'
    +'</div>'
  );

  // Customer section
  const cs=document.createElement('div');
  cs.innerHTML='<div class="fl">'+I.user+' ลูกค้า / คู่ค้า <span style="font-weight:400;text-transform:none;color:var(--text-3);margin-left:auto">ระบบจะจดจำที่อยู่อัตโนมัติเมื่อบันทึก</span></div>';
  cs.querySelector('.fl').style.justifyContent='space-between';
  const sel=document.createElement('select');sel.className='fc';sel.id='f-cust';sel.style.marginBottom='10px';
  sel.innerHTML='<option value="">— เลือกลูกค้า / คู่ค้าที่บันทึกไว้ —</option>'+custOpts(custs,doc?.customerId);
  sel.addEventListener('change',fillCustomerDropdown);
  cs.appendChild(sel);
  cs.insertAdjacentHTML('beforeend',
    '<div class="fr fr2">'
    +'<div class="fg"><label class="fl fl-req">ชื่อลูกค้า / บริษัท</label><input class="fc" id="f-cname" value="'+esc(doc?.customerName||'')+'" placeholder="ชื่อบริษัทหรือลูกค้า"></div>'
    +'<div class="fg"><label class="fl">เลขประจำตัวผู้เสียภาษี</label><input class="fc tnum" id="f-ctax" value="'+esc(doc?.customerTax||'')+'" placeholder="0000000000000"></div>'
    +'</div>'
    +'<div class="fg"><label class="fl">ที่อยู่ลูกค้า</label><textarea class="fc" id="f-caddr" rows="2" placeholder="ที่อยู่จัดส่ง / ที่อยู่จดทะเบียน">'+esc(doc?.customerAddress||'')+'</textarea></div>'
  );
  body.appendChild(cs);

  // bank info for receipt
  if(type==='receipt'){
    const bank=document.createElement('div');
    bank.style.cssText='background:var(--rec-bg);border:1px solid var(--rec-soft);border-radius:var(--r);padding:14px;margin-bottom:14px';
    bank.innerHTML='<div class="fl" style="color:var(--rec);margin-bottom:10px">'+I.bank+' ข้อมูลการรับชำระเงิน</div>'
      +'<div class="fr fr3">'
      +'<div class="fg" style="margin-bottom:0"><label class="fl">ธนาคาร</label><input class="fc" id="f-bank" value="'+esc(doc?.bankName||set.bankName)+'"></div>'
      +'<div class="fg" style="margin-bottom:0"><label class="fl">เลขบัญชี</label><input class="fc tnum" id="f-bankno" value="'+esc(doc?.bankAccount||set.bankAccount)+'"></div>'
      +'<div class="fg" style="margin-bottom:0"><label class="fl">ชื่อบัญชี</label><input class="fc" id="f-bankname" value="'+esc(doc?.bankAccountName||set.bankAccountName)+'"></div>'
      +'</div>'
      +'<div class="fg" style="margin:10px 0 0"><label class="fl">วิธีชำระเงิน</label><select class="fc" id="f-paymethod"><option>ผ่านบัญชีธนาคาร</option><option>เงินสด</option><option>เช็ค</option><option>บัตรเครดิต</option><option>QR Promptpay</option></select></div>';
    body.appendChild(bank);
    setTimeout(()=>{
      const psel=document.getElementById('f-paymethod');
      if(psel&&doc?.payMethod){const exists=[...psel.options].some(o=>o.value===doc.payMethod);if(!exists){const o=document.createElement('option');o.textContent=doc.payMethod;o.value=doc.payMethod;psel.insertBefore(o,psel.firstChild);}psel.value=doc.payMethod;}
    },20);
  }

  buildItemsSection(body,doc?.items,prods);

  const sumRow=document.createElement('div');sumRow.className='fr fr2';
  const noteDiv=document.createElement('div');
  noteDiv.innerHTML='<div class="fg"><label class="fl">หมายเหตุ</label><textarea class="fc" id="f-note" rows="3" placeholder="หมายเหตุเพิ่มเติม">'+esc(doc?.note||'')+'</textarea></div>';
  sumRow.appendChild(noteDiv);
  sumRow.appendChild(summaryBlock(set.vatRate,doc?.vatPercent,doc?.discount,color,doc?.vatEnabled));
  body.appendChild(sumRow);
  setTimeout(calcTotal,50);
}

async function saveDocGeneric(type,store,id,after){
  lockSaveBtn();
  try{
    const items=getItemsFromDOM();_doCalc();
    const docNum=id?document.getElementById('f-docnum').value:await nextDocNum(type);
    const data={
      docNumber:docNum,
      docDate:document.getElementById('f-docdate').value,
      ref:document.getElementById('f-ref').value,
      customerId:document.getElementById('f-cust').value,
      customerName:document.getElementById('f-cname').value.trim(),
      customerTax:document.getElementById('f-ctax').value.trim(),
      customerAddress:document.getElementById('f-caddr').value.trim(),
      note:document.getElementById('f-note').value,
      vatPercent:window._app.vatPercent,
      vatEnabled:!!window._app.vatEnabled,
      discount:window._app.discount,
      items,
      subtotal:window._app.sub,
      vat:window._app.vat,
      total:window._app.tot,
      type,
      createdAt:new Date().toISOString(),
    };
    // multi-company: save issuer snapshot if a company is selected
    const issuer=await _getIssuerSnapshot();
    if(issuer)data.issuedBy=issuer;
    if(type==='receipt'){
      data.bankName=document.getElementById('f-bank').value;
      data.bankAccount=document.getElementById('f-bankno').value;
      data.bankAccountName=document.getElementById('f-bankname').value;
      data.payMethod=document.getElementById('f-paymethod').value;
    }
    if(!data.docDate){toast('กรุณาระบุวันที่เอกสาร','err');return;}
    if(!data.customerName){toast('กรุณาระบุชื่อลูกค้า','err');return;}

    // remember customer/partner address
    const newCustId=await rememberCustomer({
      name:data.customerName, taxId:data.customerTax,
      address:data.customerAddress, phone:'', email:'',
    });
    if(!data.customerId&&newCustId)data.customerId=String(newCustId);

    if(id){data.id=id;await dbPut(store,data);toast('แก้ไขเอกสารสำเร็จ');}
    else{await dbAdd(store,data);toast('บันทึกสำเร็จ — '+data.docNumber);}
    _invalidateMaxCache();closeModal();if(after)after();
  }catch(e){
    console.error('saveDocGeneric error',e);
    toast('บันทึกล้มเหลว: '+(e.message||e),'err');
  }finally{
    unlockSaveBtn();
  }
}

// ============================================================
// BILLING FORM (วางบิล - per customer)
// ============================================================
async function openBillingForm(id=null,preInvIds=null,prefillDoc=null){
  const[custs,invDocs,set]=await Promise.all([dbAll('customers'),dbAll('invoices'),getSettings()]);
  let doc=null;if(id)doc=await dbGet('billings',id);
  const docNum=doc?doc.docNumber:await peekDocNum('billing');
  const selIds=doc?doc.invoiceIds:(preInvIds||[]);
  window._app.selInv=new Set(selIds.map(String));
  const preCust={id:doc?.customerId||prefillDoc?.customerId||'',name:doc?.customerName||prefillDoc?.customerName||'',addr:doc?.customerAddress||prefillDoc?.customerAddress||''};

  openModal(
    '<div class="mh mh-bil"><div class="mt"><div class="mt-icon">'+I.billing+'</div>'+(doc?'แก้ไข':'สร้าง')+'ใบวางบิล</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb" id="bbody"></div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-doc btn-bil btn-save" onclick="saveBilling('+(id||'null')+')">'+I.save+' บันทึก</button></div>'
  );
  const body=document.getElementById('bbody');
  body.appendChild(companyStrip(set,doc?.issuedBy?.id,!!doc?.bankName));
  body.insertAdjacentHTML('beforeend',
    '<div class="fr fr3">'
    +'<div class="fg"><label class="fl">เลขที่เอกสาร</label><input class="fc tnum" id="f-docnum" value="'+esc(docNum)+'"></div>'
    +'<div class="fg"><label class="fl">วันที่ออกเอกสาร</label><input class="fc" type="date" id="f-docdate" value="'+(doc?doc.docDate:todayISO())+'"></div>'
    +'<div class="fg"><label class="fl">วันที่รับชำระ <span style="color:var(--text-3);font-weight:400;text-transform:none">(ถ้ามี)</span></label><input class="fc" type="date" id="f-paydate" value="'+(doc?.paymentDate||'')+'"></div>'
    +'</div>'
  );

  const cs=document.createElement('div');
  cs.innerHTML='<div class="fg"><label class="fl">'+I.user+' ลูกค้า / คู่ค้า</label><select class="fc" id="f-cust" onchange="onBilCustChange()"><option value="">— เลือกลูกค้า —</option>'+custOpts(custs,preCust.id)+'</select></div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl fl-req">ชื่อลูกค้า / บริษัท</label><input class="fc" id="f-cname" value="'+esc(preCust.name)+'"></div>'
    +'<div class="fg"><label class="fl">ที่อยู่</label><input class="fc" id="f-caddr" value="'+esc(preCust.addr)+'"></div>'
    +'</div>';
  body.appendChild(cs);

  buildInvoicePicker(body,'bil-list',invDocs,selIds,'calcBilTotal');
  const sum=document.createElement('div');sum.className='sumbox';sum.style.marginTop='14px';
  sum.innerHTML='<div class="sumrow"><span class="text-2" id="bl-count">เลือก 0 ฉบับ</span><span></span></div>'
    +'<div class="sumrow tot"><span>ยอดรวมที่เรียกเก็บ</span><span id="bl-tot" class="tnum" style="color:var(--bil)">฿0.00</span></div>';
  body.appendChild(sum);
  body.insertAdjacentHTML('beforeend','<div class="fg" style="margin-top:14px"><label class="fl">หมายเหตุ</label><textarea class="fc" id="f-note" rows="2">'+esc(doc?.note||'')+'</textarea></div>');
  window._app.bilInvDocs=invDocs;
  setTimeout(()=>{calcBilTotal();if(preCust.id)filterInvoicesByCustomer('bil-list',preCust.id);},50);
}

function onBilCustChange(){
  fillCustomerDropdown();
  // bil form uses different field name for address (single line), so handle separately
  const sel=document.getElementById('f-cust');
  const opt=sel.options[sel.selectedIndex];
  const addr=document.getElementById('f-caddr');
  if(opt?.dataset?.addr&&addr)addr.value=opt.dataset.addr;
  filterInvoicesByCustomer('bil-list',sel.value);
}

function buildInvoicePicker(container,listId,invDocs,selIds,calcFnName){
  const wrap=document.createElement('div');
  const head=document.createElement('div');head.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:6px';
  head.innerHTML='<div class="fl">'+I.invoice+' เลือกใบกำกับที่ต้องการเรียกเก็บ</div>';
  const ctrl=document.createElement('div');ctrl.style.cssText='display:flex;gap:6px';
  const ba=document.createElement('button');ba.type='button';ba.className='btn btn-soft btn-sm';ba.textContent='เลือกทั้งหมดที่แสดง';
  ba.addEventListener('click',()=>{document.querySelectorAll('#'+listId+' .inv-row:not([data-hidden=true])').forEach(r=>{if(!r.classList.contains('checked')){r.classList.add('checked');window._app.selInv.add(r.dataset.id);}});window[calcFnName]();});
  const bn=document.createElement('button');bn.type='button';bn.className='btn btn-soft btn-sm';bn.textContent='ล้าง';
  bn.addEventListener('click',()=>{document.querySelectorAll('#'+listId+' .inv-row').forEach(r=>r.classList.remove('checked'));window._app.selInv.clear();window[calcFnName]();});
  ctrl.appendChild(ba);ctrl.appendChild(bn);head.appendChild(ctrl);
  wrap.appendChild(head);
  const list=document.createElement('div');list.id=listId;list.className='inv-list';
  if(!invDocs.length){
    list.innerHTML='<div class="empty" style="padding:30px"><div class="empty-t">ยังไม่มีใบกำกับในระบบ</div><div class="empty-s">สร้างใบกำกับก่อนแล้วค่อยวางบิล</div></div>';
  } else {
    invDocs.slice().reverse().forEach(inv=>{
      const row=document.createElement('div');
      row.className='inv-row'+(selIds.includes(inv.id)?' checked':'');
      row.dataset.id=String(inv.id);
      row.dataset.custid=String(inv.customerId||'');
      row.innerHTML='<div class="inv-check">'+I.check+'</div>'
        +'<div style="flex:1;min-width:0"><div class="inv-row-num">'+esc(inv.docNumber)+'</div><div class="inv-row-cust">'+esc(inv.customerName||'-')+'</div></div>'
        +'<div class="inv-row-date">'+thDateShort(inv.docDate)+'</div>'
        +'<div class="inv-row-amt tnum">฿'+fmoney(inv.total)+'</div>';
      row.addEventListener('click',()=>{
        const checked=row.classList.toggle('checked');
        if(checked)window._app.selInv.add(row.dataset.id);
        else window._app.selInv.delete(row.dataset.id);
        window[calcFnName]();
      });
      list.appendChild(row);
    });
  }
  wrap.appendChild(list);
  container.appendChild(wrap);
}

function filterInvoicesByCustomer(listId,custId){
  const scope=document.getElementById(listId);if(!scope)return;
  scope.querySelectorAll('.inv-row').forEach(r=>{
    const match=!custId||r.dataset.custid===String(custId)||r.dataset.custid==='';
    r.style.display=match?'':'none';
    r.dataset.hidden=match?'false':'true';
    if(!match&&r.classList.contains('checked')){r.classList.remove('checked');window._app.selInv.delete(r.dataset.id);}
  });
  calcBilTotal();calcBcTotal();
}

function calcBilTotal(){
  let tot=0,cnt=0;
  document.querySelectorAll('#bil-list .inv-row.checked').forEach(r=>{
    const inv=(window._app.bilInvDocs||[]).find(i=>String(i.id)===r.dataset.id);
    if(inv){tot+=inv.total||0;cnt++;}
  });
  const e1=document.getElementById('bl-count');if(e1)e1.textContent='เลือก '+cnt+' ฉบับ';
  const e2=document.getElementById('bl-tot');if(e2)e2.textContent='฿'+fmoney(tot);
  window._app.blTot=tot;
}

async function saveBilling(id){
  lockSaveBtn();
  try{
    const invoiceIds=[...document.querySelectorAll('#bil-list .inv-row.checked')].map(r=>parseInt(r.dataset.id,10));
    calcBilTotal();
    const docNum=id?document.getElementById('f-docnum').value:await nextDocNum('billing');
    const data={
      docNumber:docNum,docDate:document.getElementById('f-docdate').value,
      paymentDate:document.getElementById('f-paydate').value||null,
      customerId:document.getElementById('f-cust').value,
      customerName:document.getElementById('f-cname').value.trim(),
      customerAddress:document.getElementById('f-caddr').value.trim(),
      note:document.getElementById('f-note').value,
      invoiceIds,invoiceCount:invoiceIds.length,
      total:window._app.blTot||0,type:'billing',createdAt:new Date().toISOString(),
    };
    const issuer=await _getIssuerSnapshot();
    if(issuer)data.issuedBy=issuer;
    if(!data.docDate){toast('กรุณาระบุวันที่เอกสาร','err');return;}
    if(!data.customerName){toast('กรุณาระบุชื่อลูกค้า','err');return;}
    if(!invoiceIds.length){toast('กรุณาเลือกใบกำกับอย่างน้อย 1 ฉบับ','err');return;}
    const newCustId=await rememberCustomer({name:data.customerName,address:data.customerAddress});
    if(!data.customerId&&newCustId)data.customerId=String(newCustId);
    if(id){data.id=id;await dbPut('billings',data);toast('แก้ไขสำเร็จ');}
    else{await dbAdd('billings',data);toast('บันทึกสำเร็จ — '+data.docNumber);}
    _invalidateMaxCache();closeModal();navigate('billing');
  }catch(e){
    console.error('saveBilling error',e);
    toast('บันทึกล้มเหลว: '+(e.message||e),'err');
  }finally{
    unlockSaveBtn();
  }
}

// ============================================================
// BILLING COMBINED FORM (วางบิลรวม - หลายลูกค้า)
// ============================================================
async function openBillingCombinedForm(id=null){
  const[custs,invDocs,set]=await Promise.all([dbAll('customers'),dbAll('invoices'),getSettings()]);
  let doc=null;if(id)doc=await dbGet('billing_combined',id);
  const docNum=doc?doc.docNumber:await peekDocNum('billing_combined');
  const selIds=doc?doc.invoiceIds:[];
  window._app.selInv=new Set(selIds.map(String));
  openModal(
    '<div class="mh mh-blc"><div class="mt"><div class="mt-icon">'+I.billings+'</div>'+(doc?'แก้ไข':'สร้าง')+'ใบวางบิลรวม</div>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div>'
    +'<div class="mb" id="bcbody"></div>'
    +'<div class="mf"><button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button>'
    +'<button class="btn btn-doc btn-blc btn-save" onclick="saveBillingCombined('+(id||'null')+')">'+I.save+' บันทึก</button></div>'
  );
  const body=document.getElementById('bcbody');
  body.appendChild(companyStrip(set,doc?.issuedBy?.id,!!doc?.bankName));
  body.insertAdjacentHTML('beforeend',
    '<div class="fr fr3">'
    +'<div class="fg"><label class="fl">เลขที่เอกสาร</label><input class="fc tnum" id="f-docnum" value="'+esc(docNum)+'"></div>'
    +'<div class="fg"><label class="fl">วันที่ออกเอกสาร</label><input class="fc" type="date" id="f-docdate" value="'+(doc?doc.docDate:todayISO())+'"></div>'
    +'<div class="fg"><label class="fl">วันที่รับชำระ</label><input class="fc" type="date" id="f-paydate" value="'+(doc?.paymentDate||'')+'"></div>'
    +'</div>'
    +'<div class="fr fr2">'
    +'<div class="fg"><label class="fl">ลูกค้า / กรุ๊ป</label><select class="fc" id="f-cust" onchange="fillCustomerDropdown()"><option value="">— ไม่ระบุ (รวมจากหลายลูกค้า) —</option>'+custOpts(custs,doc?.customerId)+'</select></div>'
    +'<div class="fg"><label class="fl">ชื่อ / หัวเอกสาร</label><input class="fc" id="f-cname" value="'+esc(doc?.customerName||'')+'" placeholder="เช่น สรุปวางบิลประจำเดือน"></div>'
    +'</div>'
    +'<div class="fg"><label class="fl">ที่อยู่ลูกค้า</label><input class="fc" id="f-caddr" value="'+esc(doc?.customerAddress||'')+'"></div>'
  );
  window._app.bilInvDocs=invDocs;
  buildInvoicePicker(body,'bc-list',invDocs,selIds,'calcBcTotal');
  const sum=document.createElement('div');sum.className='sumbox';sum.style.marginTop='14px';
  sum.innerHTML='<div class="sumrow"><span class="text-2" id="bc-count">เลือก 0 ฉบับ</span><span></span></div>'
    +'<div class="sumrow tot"><span>ยอดรวมที่เรียกเก็บรวม</span><span id="bc-tot" class="tnum" style="color:var(--blc)">฿0.00</span></div>';
  body.appendChild(sum);
  body.insertAdjacentHTML('beforeend','<div class="fg" style="margin-top:14px"><label class="fl">หมายเหตุ</label><textarea class="fc" id="f-note" rows="2">'+esc(doc?.note||'')+'</textarea></div>');
  setTimeout(calcBcTotal,50);
}

function calcBcTotal(){
  let tot=0,cnt=0;
  document.querySelectorAll('#bc-list .inv-row.checked').forEach(r=>{
    const inv=(window._app.bilInvDocs||[]).find(i=>String(i.id)===r.dataset.id);
    if(inv){tot+=inv.total||0;cnt++;}
  });
  const e1=document.getElementById('bc-count');if(e1)e1.textContent='เลือก '+cnt+' ฉบับ';
  const e2=document.getElementById('bc-tot');if(e2)e2.textContent='฿'+fmoney(tot);
  window._app.bcTot=tot;
}

async function saveBillingCombined(id){
  lockSaveBtn();
  try{
    const invoiceIds=[...document.querySelectorAll('#bc-list .inv-row.checked')].map(r=>parseInt(r.dataset.id,10));
    calcBcTotal();
    const docNum=id?document.getElementById('f-docnum').value:await nextDocNum('billing_combined');
    const data={
      docNumber:docNum,docDate:document.getElementById('f-docdate').value,
      paymentDate:document.getElementById('f-paydate').value||null,
      customerId:document.getElementById('f-cust').value,
      customerName:document.getElementById('f-cname').value.trim()||'(วางบิลรวมหลายลูกค้า)',
      customerAddress:document.getElementById('f-caddr').value.trim(),
      note:document.getElementById('f-note').value,
      invoiceIds,invoiceCount:invoiceIds.length,
      total:window._app.bcTot||0,type:'billing_combined',createdAt:new Date().toISOString(),
    };
    const issuer=await _getIssuerSnapshot();
    if(issuer)data.issuedBy=issuer;
    if(!data.docDate){toast('กรุณาระบุวันที่เอกสาร','err');return;}
    if(!invoiceIds.length){toast('กรุณาเลือกใบกำกับอย่างน้อย 1 ฉบับ','err');return;}
    if(id){data.id=id;await dbPut('billing_combined',data);toast('แก้ไขสำเร็จ');}
    else{await dbAdd('billing_combined',data);toast('บันทึกสำเร็จ — '+data.docNumber);}
    _invalidateMaxCache();closeModal();navigate('billing-combined');
  }catch(e){
    console.error('saveBillingCombined error',e);
    toast('บันทึกล้มเหลว: '+(e.message||e),'err');
  }finally{
    unlockSaveBtn();
  }
}
