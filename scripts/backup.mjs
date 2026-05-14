// Monthly backup — runs in GitHub Actions
// Fetches all rows from Supabase app_store table, groups by app namespace,
// emails one JSON attachment per app via Resend.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = process.env.BACKUP_EMAIL_TO;

const required = { SUPABASE_URL, SERVICE_KEY, RESEND_KEY, TO_EMAIL };
const missing = Object.entries(required).filter(([_, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  process.exit(1);
}

const today = new Date();
const ymd = today.toISOString().slice(0, 10);
const month = today.toISOString().slice(0, 7);

// 1) Fetch app_store
console.log('Fetching app_store…');
const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/app_store?select=*`, {
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  },
});

if (!fetchRes.ok) {
  console.error('Supabase fetch failed:', fetchRes.status, await fetchRes.text());
  process.exit(1);
}

const rows = await fetchRes.json();
console.log(`Got ${rows.length} rows`);

if (rows.length === 0) {
  console.log('No rows to backup — sending notification only');
}

// 2) Group by app namespace
const apps = {};
for (const row of rows) {
  const app = row.app || 'docs';
  if (!apps[app]) apps[app] = { version: 3, app, timestamp: today.toISOString(), data: {} };
  apps[app].data[row.store] = row.data;
}

// 3) Build attachments + summary
const APP_LABEL = { docs: 'Crocodile Enterprise', multi: 'บิลรวมไม่ VAT' };
const attachments = [];
const summaryRows = [];

for (const app of Object.keys(apps)) {
  const json = JSON.stringify(apps[app], null, 2);
  const sizeKB = (json.length / 1024).toFixed(1);
  const stores = Object.keys(apps[app].data);
  const counts = stores.map(s => {
    const d = apps[app].data[s];
    return Array.isArray(d) ? d.length : (d && typeof d === 'object' ? 1 : 0);
  });
  const totalRecs = counts.reduce((a, b) => a + b, 0);
  const filename = `backup-${app}-${ymd}.json`;
  attachments.push({
    filename,
    content: Buffer.from(json).toString('base64'),
  });
  summaryRows.push({
    app,
    label: APP_LABEL[app] || app,
    sizeKB,
    totalRecs,
    storeCount: stores.length,
  });
}

// If no rows at all, still email a notice
if (attachments.length === 0) {
  attachments.push({
    filename: `backup-empty-${ymd}.txt`,
    content: Buffer.from('No data found in app_store table').toString('base64'),
  });
}

// 4) Send via Resend
console.log('Sending email…');
const html = `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1c1815">
    <div style="border-bottom:3px solid #a8472a;padding-bottom:12px;margin-bottom:18px">
      <h1 style="margin:0;font-size:22px;font-weight:600">📦 Monthly Backup สำเร็จ</h1>
      <div style="color:#7a6f63;font-size:13px;margin-top:4px">My Enterprise · ${month}</div>
    </div>
    <p style="color:#3a342e;font-size:14px;line-height:1.6">
      ระบบ backup อัตโนมัติของคุณทำงานเสร็จแล้ว ไฟล์ <code>.json</code> แนบมาพร้อมอีเมลฉบับนี้<br>
      เก็บไฟล์ไว้ใน Google Drive หรือที่ปลอดภัย เผื่อต้อง restore
    </p>
    <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px">
      <thead>
        <tr style="background:#f8f4ec;color:#3a342e">
          <th align="left" style="padding:8px 10px;border-bottom:1px solid #e7ddc7">ระบบ</th>
          <th align="right" style="padding:8px 10px;border-bottom:1px solid #e7ddc7">รายการ</th>
          <th align="right" style="padding:8px 10px;border-bottom:1px solid #e7ddc7">ขนาด</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows.map(r => `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #f1ebde">
              <b>${r.label}</b><br>
              <span style="color:#7a6f63;font-size:11px">${r.app} · ${r.storeCount} stores</span>
            </td>
            <td align="right" style="padding:8px 10px;border-bottom:1px solid #f1ebde">${r.totalRecs}</td>
            <td align="right" style="padding:8px 10px;border-bottom:1px solid #f1ebde">${r.sizeKB} KB</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p style="color:#7a6f63;font-size:11px;margin-top:24px;line-height:1.6">
      สร้างอัตโนมัติจาก GitHub Actions · ${ymd}<br>
      <a href="https://github.com/seeZunny/my-enterprise/actions" style="color:#a8472a">ดู Action logs</a>
    </p>
  </div>
`;

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${RESEND_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'My Enterprise Backup <onboarding@resend.dev>',
    to: [TO_EMAIL],
    subject: `📦 Monthly Backup — ${month}`,
    html,
    attachments,
  }),
});

if (!emailRes.ok) {
  const err = await emailRes.text();
  console.error('Email send failed:', emailRes.status, err);
  process.exit(1);
}

const okPayload = await emailRes.json();
console.log('Email sent:', okPayload.id);
console.log('Backup complete — ', summaryRows.map(r => `${r.app}: ${r.totalRecs} recs (${r.sizeKB}KB)`).join(', '));
