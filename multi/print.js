// ============================================================
// PRINT / PREVIEW — A4 document HTML generator
// ============================================================
const DOC_LABEL={quotations:'ใบเสนอราคา', invoices:'ใบกำกับภาษี / ใบส่งของ', receipts:'ใบเสร็จรับเงิน', billings:'ใบวางบิล', billing_combined:'ใบวางบิลรวม'};
// /multi/ system — unified indigo palette (vs /docs/ which uses varied accent colors)
const DOC_COLOR={quotations:'#5b6cb8', invoices:'#3b3f6b', receipts:'#4a5784', billings:'#2a2e52', billing_combined:'#1f2240'};
const DOC_SOFT={quotations:'#e6e9f3', invoices:'#dee0ed', receipts:'#e3e6ef', billings:'#d4d7e6', billing_combined:'#cdd0df'};

function buildDocHTML(doc,set,store,invRefs){
  const color=DOC_COLOR[store]||'#0f172a';
  const soft=DOC_SOFT[store]||'#f1f5f9';
  const title=DOC_LABEL[store]||'เอกสาร';
  const isBilGroup=store==='billings'||store==='billing_combined';
  const copies=store==='receipts'?[{label:'เอกสารสำคัญ'}]:[{label:'ต้นฉบับ'},{label:'สำเนา'}];

  const logoHTML = set.logo
    ? '<img src="'+esc(set.logo)+'" style="max-height:60px;max-width:140px;object-fit:contain">'
    : '<div style="width:54px;height:54px;border-radius:12px;background:linear-gradient(135deg,#3b3f6b,#2a2e52);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;letter-spacing:-.02em">'+esc((set.name||'M').charAt(0))+'</div>';

  function pageHTML(label){
    let bodyHTML='';

    if(!isBilGroup){
      const rows=(doc.items||[]).map((it,i)=>
        '<tr>'
        +'<td style="text-align:center;padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">'+(i+1)+'</td>'
        +'<td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px">'+esc(it.desc||'')+'</td>'
        +'<td style="text-align:center;padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:12.5px">'+(it.qty||0)+'</td>'
        +'<td style="text-align:center;padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:12.5px;color:#475569">'+esc(it.unit||'')+'</td>'
        +'<td style="text-align:right;padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px">'+fmoney(it.unitPrice)+'</td>'
        +'<td style="text-align:right;padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px;font-weight:600">'+fmoney(it.total)+'</td>'
        +'</tr>'
      ).join('');

      const bankInfo = store==='receipts' ? (
        '<div style="margin-top:14px;background:#eef0f7;border:1px solid #c7cce0;border-radius:10px;padding:12px 14px;font-size:11.5px">'
        +'<div style="font-weight:700;color:#3b3f6b;margin-bottom:6px;letter-spacing:.02em;text-transform:uppercase;font-size:10.5px">รายละเอียดการรับชำระ</div>'
        +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;color:#1e293b">'
        +'<div><div style="color:#64748b;font-size:10px">ธนาคาร</div><b>'+esc(doc.bankName||'-')+'</b></div>'
        +'<div><div style="color:#64748b;font-size:10px">เลขบัญชี</div><b>'+esc(doc.bankAccount||'-')+'</b></div>'
        +'<div><div style="color:#64748b;font-size:10px">ชื่อบัญชี</div><b>'+esc(doc.bankAccountName||'-')+'</b></div>'
        +'</div>'
        +'<div style="margin-top:8px;color:#1e293b">วิธีชำระ: <b>'+esc(doc.payMethod||'-')+'</b></div>'
        +'</div>'
      ) : '';

      bodyHTML='<table style="width:100%;border-collapse:collapse;margin-top:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">'
        +'<thead><tr style="background:'+soft+'">'
        +'<th style="padding:10px 8px;text-align:center;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:36px">#</th>'
        +'<th style="padding:10px 10px;text-align:left;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase">รายการ</th>'
        +'<th style="padding:10px 8px;text-align:center;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:60px">จำนวน</th>'
        +'<th style="padding:10px 8px;text-align:center;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:60px">หน่วย</th>'
        +'<th style="padding:10px 10px;text-align:right;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:90px">ราคา</th>'
        +'<th style="padding:10px 10px;text-align:right;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:100px">รวม (บาท)</th>'
        +'</tr></thead><tbody>'+rows+'</tbody></table>'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px;gap:20px">'
        +'<div style="flex:1;font-size:11px;color:#64748b">'
        +(doc.note?'<div style="background:#f8fafc;border-left:3px solid '+color+';padding:8px 12px;border-radius:0 6px 6px 0"><div style="font-weight:600;color:#475569;margin-bottom:2px">หมายเหตุ</div>'+esc(doc.note)+'</div>':'')
        +'</div>'
        +'<div style="width:260px;font-size:12px">'
        +'<div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569"><span>ราคารวม</span><span>'+fmoney(doc.subtotal)+'</span></div>'
        +(doc.vatEnabled!==false&&(doc.vat>0||doc.vatPercent>0)?'<div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569"><span>ภาษีมูลค่าเพิ่ม '+(doc.vatPercent||0)+'%</span><span>'+fmoney(doc.vat)+'</span></div>':'')
        +(doc.discount>0?'<div style="display:flex;justify-content:space-between;padding:4px 0;color:#475569"><span>ส่วนลด</span><span>-'+fmoney(doc.discount)+'</span></div>':'')
        +'<div style="display:flex;justify-content:space-between;padding:10px 0 4px;margin-top:4px;border-top:2px solid '+color+';font-size:14.5px;font-weight:700;color:'+color+'"><span>ยอดสุทธิ</span><span>'+fmoney(doc.total)+'</span></div>'
        +'<div style="font-size:10.5px;color:#64748b;font-style:italic;margin-top:2px">('+numToThai(doc.total||0)+')</div>'
        +'</div></div>'
        +bankInfo;
    } else {
      const invRows = invRefs.length ? invRefs.map((inv,i)=>
        '<tr>'
        +'<td style="text-align:center;padding:9px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">'+(i+1)+'</td>'
        +'<td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px;color:'+color+';font-weight:600">'+esc(inv.docNumber)+'</td>'
        +'<td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px">'+thDate(inv.docDate)+'</td>'
        +'<td style="padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px">'+esc(inv.customerName||'')+'</td>'
        +'<td style="text-align:right;padding:9px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px;font-weight:600">'+fmoney(inv.total)+'</td>'
        +'</tr>'
      ).join('') : '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;font-size:12px">ไม่มีรายการ</td></tr>';

      bodyHTML='<table style="width:100%;border-collapse:collapse;margin-top:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">'
        +'<thead><tr style="background:'+soft+'">'
        +'<th style="padding:10px 8px;text-align:center;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:36px">#</th>'
        +'<th style="padding:10px 10px;text-align:left;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase">เลขที่ใบกำกับ</th>'
        +'<th style="padding:10px 10px;text-align:left;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:140px">วันที่</th>'
        +'<th style="padding:10px 10px;text-align:left;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase">ลูกค้า</th>'
        +'<th style="padding:10px 10px;text-align:right;font-size:10.5px;color:'+color+';font-weight:700;letter-spacing:.04em;text-transform:uppercase;width:120px">จำนวนเงิน</th>'
        +'</tr></thead><tbody>'+invRows+'</tbody></table>'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px;gap:20px">'
        +'<div style="flex:1;font-size:11px;color:#64748b">'
        +'<div>รวม <b style="color:'+color+';font-size:13px">'+invRefs.length+'</b> ฉบับ</div>'
        +(doc.note?'<div style="margin-top:8px;background:#f8fafc;border-left:3px solid '+color+';padding:8px 12px;border-radius:0 6px 6px 0"><div style="font-weight:600;color:#475569;margin-bottom:2px">หมายเหตุ</div>'+esc(doc.note)+'</div>':'')
        +'</div>'
        +'<div style="width:260px;font-size:12px">'
        +'<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:2px solid '+color+';font-size:14.5px;font-weight:700;color:'+color+'"><span>รวมทั้งสิ้น</span><span>'+fmoney(doc.total)+'</span></div>'
        +'<div style="font-size:10.5px;color:#64748b;font-style:italic;margin-top:-2px">('+numToThai(doc.total||0)+')</div>'
        +'</div></div>'
        +(doc.paymentDate
          ? '<div style="margin-top:14px;padding:10px 14px;background:'+soft+';border-radius:8px;font-size:12px;border-left:3px solid '+color+'"><b>วันที่รับชำระเงิน:</b> '+thDate(doc.paymentDate)+'</div>'
          : '<div style="margin-top:14px;padding:10px 14px;border:1px dashed #cbd5e1;border-radius:8px;font-size:11.5px;color:#94a3b8">วันที่รับชำระเงิน: ____________________________</div>');
    }

    const stampHTML = label==='สำเนา'
      ? '<div style="position:absolute;top:42px;right:38px;transform:rotate(-12deg);font-size:54px;font-weight:900;color:rgba(59,63,107,.14);letter-spacing:.04em;pointer-events:none;border:6px solid rgba(59,63,107,.14);padding:8px 24px;border-radius:14px">COPY</div>'
      : '';

    return '<div class="a4">'
      +stampHTML
      // ribbon — multi: dual-tone indigo bar
      +'<div style="height:6px;background:linear-gradient(90deg,'+color+' 0%, #3b3f6b 60%, transparent 100%);border-radius:3px;margin-bottom:6px"></div>'
      +'<div style="font-size:9.5px;color:#7a6f63;letter-spacing:.18em;text-transform:uppercase;font-weight:600;margin-bottom:14px">Multi Documents</div>'
      // header
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;gap:20px">'
      +'<div style="display:flex;align-items:flex-start;gap:14px;flex:1">'
      +'<div style="flex-shrink:0">'+logoHTML+'</div>'
      +'<div style="flex:1"><div style="font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-.02em;line-height:1.3">'+esc(set.name)+'</div>'
      +'<div style="font-size:11px;color:#475569;line-height:1.6;margin-top:4px">'+esc(set.address)+'</div>'
      +'<div style="font-size:11px;color:#475569;margin-top:2px">โทร: '+esc(set.phone)+' · เลขผู้เสียภาษี: '+esc(set.taxId)+'</div></div></div>'
      +'<div style="text-align:right;flex-shrink:0">'
      +'<div style="font-size:18px;font-weight:800;color:'+color+';letter-spacing:-.01em">'+title+'</div>'
      +'<div style="display:inline-block;font-size:10.5px;padding:3px 10px;background:'+soft+';color:'+color+';border-radius:999px;font-weight:600;margin-top:4px;letter-spacing:.04em">'+esc(label)+'</div>'
      +'<div style="margin-top:10px;font-size:11px;color:#475569;text-align:right;line-height:1.7">'
      +'<div><span style="color:#94a3b8">เลขที่:</span> <b style="color:#0f172a">'+esc(doc.docNumber)+'</b></div>'
      +'<div><span style="color:#94a3b8">วันที่:</span> '+thDate(doc.docDate)+'</div>'
      +(doc.ref?'<div><span style="color:#94a3b8">อ้างอิง:</span> '+esc(doc.ref)+'</div>':'')
      +'</div></div></div>'
      // customer box
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px">'
      +'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">'
      +'<div style="font-size:10px;color:'+color+';text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:4px">ลูกค้า / Customer</div>'
      +'<div style="font-size:13px;font-weight:700;color:#0f172a">'+esc(doc.customerName||'-')+'</div>'
      +(doc.customerTax?'<div style="font-size:11px;color:#475569;margin-top:2px">เลขผู้เสียภาษี: '+esc(doc.customerTax)+'</div>':'')
      +(doc.customerAddress?'<div style="font-size:11px;color:#475569;margin-top:3px;line-height:1.5">'+esc(doc.customerAddress)+'</div>':'')
      +'</div>'
      +'<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px">'
      +'<div style="font-size:10px;color:'+color+';text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:4px">รายละเอียดเอกสาร</div>'
      +'<div style="font-size:11px;color:#475569;line-height:1.7">'
      +'<div>ออกโดย: <b style="color:#0f172a">'+esc(set.name)+'</b></div>'
      +'<div>วันที่ออก: '+thDate(doc.docDate)+'</div>'
      +(doc.paymentDate?'<div>วันที่รับเงิน: <b style="color:#10b981">'+thDate(doc.paymentDate)+'</b></div>':'')
      +'</div></div></div>'
      // body
      +bodyHTML
      // footer signatures
      +'<div style="display:flex;justify-content:space-between;margin-top:36px;gap:30px">'
      +'<div style="flex:1;text-align:center">'
      +'<div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:11px;color:#64748b">ผู้รับเอกสาร / Customer Signature</div>'
      +'<div style="font-size:10.5px;color:#94a3b8;margin-top:14px">วันที่ ____________________</div></div>'
      +'<div style="flex:1;text-align:center">'
      +'<div style="border-top:1px solid #cbd5e1;padding-top:8px;font-size:11px;color:#64748b">ผู้มีอำนาจลงนาม / Authorized</div>'
      +'<div style="font-size:11px;color:#0f172a;margin-top:14px;font-weight:600">'+esc(set.name)+'</div></div>'
      +'</div>'
      +'<div style="position:absolute;bottom:14mm;left:15mm;right:15mm;text-align:center;border-top:1px solid '+soft+';padding-top:8px;font-size:9.5px;color:#94a3b8;letter-spacing:.02em">'
      +esc(set.name)+' · '+esc(set.phone)+' · เลขผู้เสียภาษี '+esc(set.taxId)
      +'</div>'
      +'</div>';
  }
  return copies.map(c=>pageHTML(c.label)).join('');
}

async function viewDocModal(store,id){
  const[doc,set]=await Promise.all([dbGet(store,id),getSettings()]);
  if(!doc){toast('ไม่พบเอกสาร','err');return;}
  let invRefs=[];
  if(doc.invoiceIds?.length){
    const all=await dbAll('invoices');
    // keep ordering from doc.invoiceIds
    invRefs = doc.invoiceIds.map(iid=>all.find(i=>i.id===iid)).filter(Boolean);
  }
  const html=buildDocHTML(doc,set,store,invRefs);
  const previewHTML=html.replace(/<div class="a4">/g,'<div class="a4-prev" style="position:relative;min-height:auto;page-break-after:auto;margin-bottom:18px">');
  openModal(
    '<div class="mh"><div class="mt"><div class="mt-icon" style="background:'+DOC_COLOR[store]+';color:#fff">'+I.eye+'</div>พรีวิว — '+esc(doc.docNumber)+'</div>'
    +'<div style="display:flex;gap:8px;align-items:center">'
    +'<button class="btn btn-doc" style="background:'+DOC_COLOR[store]+'" onclick="printDoc(\''+store+'\','+id+')">'+I.print+' พิมพ์ / Save PDF</button>'
    +'<button class="mc" onclick="closeModal()">'+I.x+'</button></div></div>'
    +'<div class="mb" style="padding:14px;background:var(--surface-2)">'
    +'<div class="doc-viewer">'+previewHTML+'</div>'
    +'</div>'
  );
}

async function printDoc(store,id){
  const[doc,settings]=await Promise.all([dbGet(store,id),getSettings()]);
  if(!doc){toast('ไม่พบเอกสาร','err');return;}
  // multi-company: use saved issuer snapshot if present, else fall back to settings
  const set=doc.issuedBy?{...settings,...doc.issuedBy}:settings;
  let invRefs=[];
  if(doc.invoiceIds?.length){
    const all=await dbAll('invoices');
    invRefs = doc.invoiceIds.map(iid=>all.find(i=>i.id===iid)).filter(Boolean);
  }
  const html=buildDocHTML(doc,set,store,invRefs);
  const win=window.open('','_blank','width=900,height=1100');
  win.document.write('<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>'+esc(doc.docNumber)+' — '+esc(DOC_LABEL[store])+'</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">'
    +'<style>*{margin:0;padding:0;box-sizing:border-box}'
    +'body{font-family:\'Inter\',\'IBM Plex Sans Thai\',\'Sarabun\',sans-serif;background:#94a3b8;-webkit-font-smoothing:antialiased}'
    +'.wrap{max-width:210mm;margin:0 auto;padding:24px 0;display:flex;flex-direction:column;gap:18px}'
    +'.a4{width:210mm;min-height:297mm;background:#fff;padding:18mm 15mm 18mm;box-shadow:0 18px 36px rgba(15,23,42,.25);position:relative;page-break-after:always}'
    +'@page{size:A4;margin:0}'
    +'@media print{html,body{margin:0!important;padding:0!important;background:#fff}.wrap{padding:0;gap:0;max-width:none}.a4{box-shadow:none;margin:0;width:210mm;min-height:297mm}.no-print{display:none!important}}'
    +'.pbtn{position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;border:none;border-radius:10px;padding:12px 22px;font-size:13.5px;font-weight:600;font-family:inherit;cursor:pointer;z-index:99;box-shadow:0 8px 24px rgba(15,23,42,.3);display:flex;align-items:center;gap:8px}'
    +'.pbtn:hover{background:#1e293b}'
    +'.phint{position:fixed;bottom:24px;left:24px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:11.5px;color:#475569;max-width:300px;line-height:1.5;box-shadow:0 4px 12px rgba(15,23,42,.08);z-index:99}'
    +'.phint b{color:#0f172a}'
    +'</style></head><body>'
    +'<div class="wrap">'+html+'</div>'
    +'<div class="phint no-print">💡 ถ้ามี <b>วันที่/ชื่อเอกสาร/URL</b> เด้งบนกระดาษ — ในหน้าต่างพิมพ์ของ Chrome กด <b>"More settings"</b> → ปิด <b>"Headers and footers"</b></div>'
    +'<button class="pbtn no-print" onclick="window.print()">🖨 พิมพ์ / Save PDF</button>'
    +'</body></html>');
  win.document.close();
  setTimeout(()=>{try{win.focus();}catch(e){}},200);
}

// edit/delete dispatcher
async function editDoc(store,id){
  const map={quotations:openQuotationForm,invoices:openInvoiceForm,receipts:openReceiptForm,billings:openBillingForm,billing_combined:openBillingCombinedForm};
  if(map[store])await map[store](id);
}
async function deleteDoc(store,id,after){
  if(!confirm('ยืนยันการลบเอกสารนี้?\n\n⚠️ การกระทำนี้ไม่สามารถย้อนกลับได้'))return;
  const numId=typeof id==='string'?parseInt(id,10):id;
  try{
    await dbDel(store,numId);
    _invalidateMaxCache();
    toast('ลบเอกสารเรียบร้อย','warn');
    if(after)after();
  }catch(e){toast('ลบไม่สำเร็จ: '+e.message,'err');}
}

// duplicate doc — create as new with new number
async function duplicateDoc(store,id){
  const doc=await dbGet(store,id);if(!doc)return;
  const typeMap={quotations:'quotation',invoices:'invoice',receipts:'receipt',billings:'billing',billing_combined:'billing_combined'};
  const newNum=await nextDocNum(typeMap[store]);
  const copy={...doc,docNumber:newNum,docDate:todayISO(),createdAt:new Date().toISOString()};
  delete copy.id;
  await dbAdd(store,copy);
  _invalidateMaxCache();
  toast('คัดลอกเป็น '+newNum,'ok');
  navigate(window._app.page);
}
