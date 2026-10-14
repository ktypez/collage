# Collage — SvelteKit เฝ้าเดียวบน Vercel

สร้างคอลลาจจากรูปกลุ่ม ส่งเข้า LINE หรือดาวน์โหลดได้

## โครงสร้าง

```
web/   SvelteKit (Svelte 5 runes) — UI, canvas renderer และ /api/* ทั้งหมด  → Vercel
```

ไม่มีโฟลเดอร์อื่นที่รันได้ — สคริปต์ rich menu รุ่นเก่า (`scripts/*.cjs` ที่ต้องใช้
`sharp` + `@line/bot-sdk` + ฟอนต์จาก `backend/`) ถูกลบแล้ว แทนด้วย
`web/scripts/richmenu.mjs`

`frontend/` (HTML/CSS/JS) และ `backend/` (Express + sharp) ถูกลบทั้งคู่ —
งานทุกอย่างย้ายเข้า `web/`

**ไม่มี backend แยกอีกต่อไป** — งานเก็บรูปที่เคยทำบน Express เดิม ย้ายมาเป็น
`+server.ts` ใต้ `web/src/routes/api/` ทั้งหมด ข้อดีคือ deploy ครั้งเดียว ไม่มี
CORS และไม่มี service ที่ต้องคอยให้ตื่น

**การเรนเดอร์เกิดในเบราว์เซอร์** ไม่ใช่บนเซิร์ฟเวอร์: `web/src/lib/collage/render.ts`
วาดด้วย `<canvas>` แล้วส่ง JPEG ที่เสร็จแล้วไปเก็บที่ R2 เฉพาะกรณี LIFF ที่ต้องใช้ URL สาธารณะ
ฝั่งเว็บ (`/`) ดาวน์โหลดจาก blob URL ได้เลย ไม่แตะเซิร์ฟเวอร์

### โค้ดอยู่ตรงไหน

| ไฟล์ | หน้าที่ |
|---|---|
| `web/src/lib/collage/themes.ts` | manifest ของธีมทั้ง 7 + สีประจำวัน + label/sub ของ UI |
| `web/src/lib/collage/layout.ts` | คณิตเลย์อเรย์ masonry (ค่าคงที่เดิมจาก `backend/collage.js`) |
| `web/src/lib/collage/render.ts` | canvas renderer ตัวเดียวที่ใช้กับทุกธีม (backdrop → photos → foreground) |
| `web/src/lib/server/r2.ts` | R2 ผ่าน S3 API ด้วย `aws4fetch` (ไม่ใช้ AWS SDK) |
| `web/src/lib/components/Studio.svelte` | state กลาง + ปุ่มสร้าง |
| `web/src/lib/liff.ts` | ตัว loader/typing ของ LINE LIFF SDK |
| `web/src/routes/+page.svelte` | เว็บ — ดาวน์โหลด |
| `web/src/routes/liff/+page.svelte` | ใน LINE — ส่งเข้ากลุ่ม |
| `web/src/routes/api/collage/+server.ts` | รับ JPEG → R2 → คืน public URL |
| `web/src/routes/api/image/[filename]/+server.ts` | ส่งรูปกลับ (LINE ดึงจาก URL นี้) |
| `web/src/routes/api/cleanup/+server.ts` | ลบรูปเก่ากว่า 15 วัน (cron) |
| `web/src/routes/api/webhook/+server.ts` | LINE Messaging API webhook |
| `web/src/app.css` | design system ทั้งหมด (token, component class, `@font-face`) — แก้ที่เดียว |
| `web/static/fonts/` | ฟอนต์ 5 ตัว self-host (ไม่ใช้ Google Fonts) |
| `web/static/previews/` | รูปตัวอย่าง output ต่อธีม (`pv-<id>.jpg`) + `og.jpg` |

ธีมทั้ง 7: `7days`, `claude`, `lumen`, `post`, `studio`, `cinema`, `velvet`
(ธีม `min`/`noc`/`rack` เป็นของรุ่นเก่า ไม่มีแล้ว)

## คำสั่ง

```bash
cd web
bun install
bun run dev        # http://localhost:5173
bun run check      # svelte-check + tsc
bun run build
```

ต้องใช้ Bun (`bun` อยู่ที่ `~/.bun/bin`)

## rich menu

```bash
cd web
node scripts/richmenu.mjs --render              # ได้ scripts/richmenu.png (2500x843)
node scripts/richmenu.mjs --deploy              # render + สร้างเมนู + ตั้งเป็นค่าเริ่มต้น
node scripts/richmenu.mjs --image art.png --deploy
node scripts/richmenu.mjs --list                # ดูเมนูทั้งหมด (บอทมี 18 อันค้างอยู่)
node scripts/richmenu.mjs --delete richmenu-xxx
```

แก้เมนู = แก้ `CELLS` กับสีใน `web/scripts/richmenu.mjs` แล้ว `--deploy` ซ้ำ
สคริปต์ไม่พึ่ง dependency ใด ๆ: วาดบน `<canvas>` แล้ว screenshot ด้วย Chromium
ของเครื่อง (`--no-sandbox` จำเป็นบน Alpine ไม่งั้นไม่ได้ไฟล์) — เหตุผลเดียวกับที่
คอลลาจเรนเดอร์ในเบราว์เซอร์ คืออักษรไทยจะ shape ถูกเฉพาะเมื่อเบราว์เซอร์เป็นคนวาด
ต้องมี `LINE_CHANNEL_ACCESS_TOKEN` (อ่านจาก env หรือ `web/.env`)

## env

ดู `web/.env.example` — ตัวแปรทั้งหมดประกาศใน `web/src/env.ts` แล้วอ่านผ่าน
`$app/env/public` / `$app/env/private`

**R2 ต้องตั้งค่าใน Vercel Environment Variables** (ตัวแปรชื่อเดิมจาก backend เดิม)
รวมถึง `CLEANUP_SECRET` ซึ่งต้อง**เท่ากับ** `CRON_SECRET` ของ Vercel เพื่อให้ cron ยิงได้

## deploy

- ทั้งหมดอยู่ Vercel ผ่าน `@sveltejs/adapter-vercel` (ตั้งใน `vite.config.ts`)
- Vercel project `collage` ต้องตั้ง **Root Directory = `web`**
- `web/vercel.json` ตั้ง cron เก็บกวาดรูปเก่า ทุกวัน 03:17 UTC
- Render, Fly.io, Elysia, Bun runtime ถูกเลิกใช้ทั้งหมด

## หมายเหตุ

- ไม่มี `sharp`/`harfbuzzjs`/`opentype.js` แล้ว — เบราว์เซอร์ shape อักษรไทยเอง
  (stack เดิมต้องใช้ HarfBuzz เพราะ opentype.js ทำ Thai GPOS ไม่ได้ ทำให้สระและวรรณยุกต์
  `วันที่` กลายเป็น `วันที`)
- ผลลัพธ์ canvas ตรงกับ pipeline sharp เดิม: ขนาดเท่ากันทุกธีม และส่วนล่างของภาพ
  ต่างกัน <1% ของพิกเซล — ที่ต่างคือ rasterize ตัวอักษรในหัวเรื่องเท่านั้น
- `web/src/lib/collage/layout.ts` ต้องคงค่าคงที่เดิมไว้ ไม่งั้นผลลัพธ์จะต่างจากเวอร์ชันก่อน
- `web/src/lib/server/` คือโฟลเดอร์ที่ SvelteKit บล็อกไม่ให้เข้า client bundle — อย่าย้าย
  `r2.ts` ออกไปข้างบน ไม่งั้น secret จะหลุด
- ต้อง `await document.fonts.load()` ก่อนวาดทุกครั้ง (`ensureFonts()` ใน `render.ts`)
  ไม่งั้นรอบแรกจะได้ฟอนต์ fallback
- `web/src/lib/collage/*.ts` เป็น canvas TS ล้วน ไม่ผูกกับ Svelte เลย ถ้าวันหนึ่งเปลี่ยน
  เฟรมเวิร์ก ย้ายแค่สามไฟล์ในโฟลเดอร์นั้นก็ได้
- โปรเจกต์นี้ใช้ **minimem** เป็นความจำถาวร (ไม่ใช่ Second Brain แล้ว) —
  ค้นก่อนทำงาน บันทึกเฉพาะข้อเท็จจริงที่อยู่ยาว
