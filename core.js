// ============================================================
// DB — IndexedDB layer + customer/partner address memory
// ============================================================
const DB_NAME='AtelierDocsDB', DB_VER=3;
let db;

function initDB(){
  return new Promise((ok,fail)=>{
    const r=indexedDB.open(DB_NAME,DB_VER);
    r.onerror=()=>fail(r.error);
    r.onsuccess=()=>{db=r.result;ok(db);};
    r.onupgradeneeded=e=>{
      const d=e.target.result;
      [
        {name:'settings',key:'id'},
        {name:'customers',key:'id',ai:true},
        {name:'inventory',key:'id',ai:true},
        {name:'quotations',key:'id',ai:true},
        {name:'invoices',key:'id',ai:true},
        {name:'receipts',key:'id',ai:true},
        {name:'billings',key:'id',ai:true},
        {name:'billing_combined',key:'id',ai:true},
        {name:'doc_counters',key:'type'},
        {name:'address_book',key:'id',ai:true}, // จดจำที่อยู่ลูกค้า/คู่ค้า
      ].forEach(s=>{
        if(!d.objectStoreNames.contains(s.name))
          d.createObjectStore(s.name,{keyPath:s.key,autoIncrement:!!s.ai});
      });
    };
  });
}

const dbGet=(s,k)=>new Promise((ok,fail)=>{const t=db.transaction(s,'readonly'),r=t.objectStore(s).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});
const dbAll=(s)=>new Promise((ok,fail)=>{const t=db.transaction(s,'readonly'),r=t.objectStore(s).getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>fail(r.error);});
const dbPut=(s,d)=>new Promise((ok,fail)=>{const t=db.transaction(s,'readwrite'),r=t.objectStore(s).put(d);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});
const dbAdd=(s,d)=>new Promise((ok,fail)=>{const t=db.transaction(s,'readwrite'),r=t.objectStore(s).add(d);r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);});
const dbDel=(s,k)=>new Promise((ok,fail)=>{const t=db.transaction(s,'readwrite'),r=t.objectStore(s).delete(k);r.onsuccess=()=>ok();r.onerror=()=>fail(r.error);});
const dbClear=(s)=>new Promise((ok)=>{const t=db.transaction(s,'readwrite');t.objectStore(s).clear();t.oncomplete=ok;});

// ============================================================
// DOC NUMBERING — BL counter shared for billing + billing_combined
// ============================================================
const DOC_PFX={quotation:'QT',invoice:'INV',receipt:'RC',billing:'BL',billing_combined:'BL'};
const DOC_STORE={quotation:'quotations',invoice:'invoices',receipt:'receipts',billing:'billings',billing_combined:'billing_combined'};

const _maxCache={};
function _invalidateMaxCache(){Object.keys(_maxCache).forEach(k=>delete _maxCache[k]);}

async function getMaxDocCount(type,thYear){
  const isBilGroup=(type==='billing'||type==='billing_combined');
  const stores=isBilGroup?['billings','billing_combined']:[DOC_STORE[type]];
  const pfx=DOC_PFX[type]+'-'+thYear+'-';
  const key=type+':'+thYear;
  if(_maxCache[key]!==undefined)return _maxCache[key];
  let max=0;
  for(const s of stores){
    const docs=await dbAll(s);
    docs.forEach(d=>{
      if(d.docNumber&&d.docNumber.startsWith(pfx)){
        const n=parseInt(d.docNumber.replace(pfx,''),10);
        if(!isNaN(n)&&n>max)max=n;
      }
    });
  }
  _maxCache[key]=max;
  return max;
}

async function nextDocNum(type){
  const thYear=new Date().getFullYear()+543;
  const realMax=await getMaxDocCount(type,thYear);
  const next=realMax+1;
  _invalidateMaxCache();
  return DOC_PFX[type]+'-'+thYear+'-'+String(next).padStart(4,'0');
}
async function peekDocNum(type){
  const thYear=new Date().getFullYear()+543;
  const realMax=await getMaxDocCount(type,thYear);
  return DOC_PFX[type]+'-'+thYear+'-'+String(realMax+1).padStart(4,'0');
}

// ============================================================
// SETTINGS
// ============================================================
const DEF_SET={
  id:'company',
  name:'บริษัท ของฉัน เอ็นเตอร์ไพรส์ จำกัด',
  address:'ที่อยู่บริษัท ตำบล อำเภอ จังหวัด รหัสไปรษณีย์',
  taxId:'0000000000000', phone:'0-0000-0000', email:'contact@myco.com',
  bankName:'ธนาคารกรุงเทพ จำกัด (มหาชน)',
  bankAccount:'000-0-00000-0',
  bankAccountName:'บริษัท ของฉัน เอ็นเตอร์ไพรส์ จำกัด',
  logo:null, vatRate:7,
};

let _settings=null;
async function getSettings(){
  if(_settings)return _settings;
  _settings=(await dbGet('settings','company'))||DEF_SET;
  return _settings;
}
function invalidateSettings(){_settings=null;}

// ============================================================
// UTILS
// ============================================================
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmoney(n){return Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});}

function todayISO(){
  const bkk=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Bangkok'}));
  return bkk.toISOString().split('T')[0];
}
function thDate(d){
  if(!d)return'-';
  const dt=new Date(d);
  if(isNaN(dt.getTime()))return'-';
  return dt.toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Bangkok'});
}
function thDateShort(d){
  if(!d)return'-';
  const dt=new Date(d);
  if(isNaN(dt.getTime()))return'-';
  return dt.toLocaleDateString('th-TH',{year:'2-digit',month:'short',day:'numeric',timeZone:'Asia/Bangkok'});
}

function numToThai(amount){
  if(!amount||isNaN(amount)||amount===0)return'ศูนย์บาทถ้วน';
  if(amount<0)return'ลบ'+numToThai(-amount);
  const u=['','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
  const p=['','สิบ','ร้อย','พัน','หมื่น','แสน','ล้าน'];
  const[ip,dp]=Number(amount).toFixed(2).split('.');
  let r='';
  const digs=[...ip].reverse();
  digs.forEach((ch,i)=>{
    const n=parseInt(ch);if(n===0)return;
    const mi=i%7;
    if(mi===1&&n===1)r=p[1]+r;
    else if(mi===1&&n===2)r='ยี่'+p[1]+r;
    else r=u[n]+p[mi]+r;
    if(i>0&&mi===0)r='ล้าน'+r;
  });
  if(!r)r='ศูนย์';
  r+='บาท';
  const d1=parseInt(dp[0]),d2=parseInt(dp[1]);
  if(d1===0&&d2===0)r+='ถ้วน';
  else{
    let s='';
    if(d1===1)s='สิบ';else if(d1===2)s='ยี่สิบ';else if(d1>0)s=u[d1]+'สิบ';
    if(d2>0)s+=u[d2];
    r+=s+'สตางค์';
  }
  return r;
}

// ============================================================
// TOAST
// ============================================================
function toast(msg, type='ok'){
  const el=document.createElement('div');
  el.className='toast '+type;
  const icons={ok:I.check, err:I.alert, warn:I.alert, info:I.info};
  el.innerHTML='<div class="toast-icon">'+icons[type]+'</div><div>'+esc(msg)+'</div>';
  document.getElementById('toaster').appendChild(el);
  setTimeout(()=>{el.classList.add('exit');setTimeout(()=>el.remove(),250);},3200);
}

// ============================================================
// MODAL
// ============================================================
function openModal(html){
  closeModal();
  const ov=document.createElement('div');
  ov.className='overlay';ov.id='ov';
  ov.innerHTML='<div class="modal" id="modal-box" onclick="event.stopPropagation()">'+html+'</div>';
  ov.addEventListener('click',e=>{if(e.target===ov)closeModal();});
  document.body.appendChild(ov);
  document.body.style.overflow='hidden';
}
function closeModal(){
  const m=document.getElementById('ov');
  if(m){m.style.animation='overlayIn .15s reverse';setTimeout(()=>m.remove(),140);}
  document.body.style.overflow='';
  document.querySelectorAll('.ac-pop').forEach(p=>p.remove());
}
function lockSaveBtn(){
  const b=document.querySelector('.mf .btn-save');
  if(b&&!b.disabled){b.disabled=true;b._ot=b.innerHTML;b.innerHTML='<span class="spin"></span> กำลังบันทึก...';b.style.opacity='.7';}
}
function unlockSaveBtn(){
  const b=document.querySelector('.mf .btn-save');
  if(b&&b.disabled){b.disabled=false;if(b._ot)b.innerHTML=b._ot;b.style.opacity='1';}
}

// ============================================================
// Animated number counter
// ============================================================
function animateNumber(el,from,to,duration=700,format=fmoney){
  if(!el)return;
  const start=performance.now();
  const step=(now)=>{
    const t=Math.min(1,(now-start)/duration);
    const e=1-Math.pow(1-t,3); // easeOutCubic
    const val=from+(to-from)*e;
    const out=format(val);
    if(out!=null)el.textContent=out;  // skip if format mutated el itself
    if(t<1)requestAnimationFrame(step);
    else{const fin=format(to);if(fin!=null)el.textContent=fin;}
  };
  requestAnimationFrame(step);
}

// ============================================================
// Ripple effect on .btn click
// ============================================================
document.addEventListener('click',e=>{
  const btn=e.target.closest('.btn-accent,.btn-doc,.btn-primary,.btn-danger,.btn-success');
  if(!btn)return;
  const rect=btn.getBoundingClientRect();
  const r=document.createElement('span');
  const size=Math.max(rect.width,rect.height);
  r.className='ripple';
  r.style.width=r.style.height=size+'px';
  r.style.left=(e.clientX-rect.left-size/2)+'px';
  r.style.top=(e.clientY-rect.top-size/2)+'px';
  btn.appendChild(r);
  setTimeout(()=>r.remove(),600);
});

// ============================================================
// CUSTOMER MEMORY — auto-save address from any doc form
// ============================================================
async function rememberCustomer({name,taxId,address,phone,email}){
  if(!name||!name.trim())return null;
  const all=await dbAll('customers');
  // match by (taxId if present) else by name
  let found=null;
  if(taxId&&taxId.trim()){
    found=all.find(c=>(c.taxId||'').trim()===taxId.trim());
  }
  if(!found)found=all.find(c=>(c.name||'').trim().toLowerCase()===name.trim().toLowerCase());
  if(found){
    // อัปเดตข้อมูลถ้ามีของใหม่ที่ยังไม่ได้บันทึก
    let changed=false;
    if(address&&address.trim()&&address!==found.address){found.address=address;changed=true;}
    if(taxId&&taxId.trim()&&taxId!==found.taxId){found.taxId=taxId;changed=true;}
    if(phone&&phone.trim()&&!found.phone){found.phone=phone;changed=true;}
    if(email&&email.trim()&&!found.email){found.email=email;changed=true;}
    if(changed)await dbPut('customers',found);
    return found.id;
  }
  const data={
    name:name.trim(),
    taxId:(taxId||'').trim(),
    address:(address||'').trim(),
    phone:(phone||'').trim(),
    email:(email||'').trim(),
    note:'',
    createdAt:new Date().toISOString(),
    autoCreated:true,
  };
  return await dbAdd('customers',data);
}

// ============================================================
// State
// ============================================================
window._app = {
  page:'dashboard',
  items:[], // current form's items
  sub:0, vat:0, tot:0, discount:0, vatPercent:7,
  blTot:0, bcTot:0,
  selInv:new Set(), // selected invoice ids for billing
  prodAc:null, // current autocomplete popover
};
