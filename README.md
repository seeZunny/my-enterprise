# My Enterprise — ระบบเอกสารธุรกิจ

Web app สำหรับออกเอกสาร 5 ประเภท: ใบเสนอราคา · ใบกำกับภาษี/ใบส่งของ · ใบเสร็จรับเงิน · ใบวางบิล · ใบวางบิลรวม

ข้อมูลทั้งหมดเก็บใน IndexedDB ของเบราว์เซอร์ (client-only, ไม่มี backend) — สำรองข้อมูลเป็น `.json` ผ่านเมนูตั้งค่าได้

## ใช้งาน

เปิด [index.html](index.html) ในเบราว์เซอร์ หรือเข้าผ่าน GitHub Pages

- กด `⌘K` / `Ctrl+K` เปิด command palette
- ปุ่ม "สร้างเอกสาร" มุมขวาบนเลือกประเภทเอกสาร

## เวอร์ชัน

- `index.html` — Editorial Workspace (ปัจจุบัน)
- `v1/index.html` — Sidebar design เดิม
