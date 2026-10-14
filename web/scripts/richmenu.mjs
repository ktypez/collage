/* =============================================================================
   Rich menu — render and deploy
   -----------------------------------------------------------------------------
   Replaces the old scripts/setup-richmenu-v2.cjs and richmenu-designs.cjs, both
   of which needed `sharp`, `@line/bot-sdk` and fonts from the deleted backend/.

   No dependencies: the artwork is drawn on a <canvas> and screenshotted with the
   system Chromium — the same reason the collages render in a browser, Thai marks
   only shape correctly when the browser does it.

   Usage (from web/):
     node scripts/richmenu.mjs --render            # just write scripts/richmenu.png
     node scripts/richmenu.mjs --deploy            # render + create + set default
     node scripts/richmenu.mjs --image art.png --deploy
     node scripts/richmenu.mjs --list
     node scripts/richmenu.mjs --delete richmenu-xxxx

   Needs LINE_CHANNEL_ACCESS_TOKEN. Reads web/.env when the variable is not
   already in the environment.
   ============================================================================= */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '..');
const FONTS = join(WEB, 'static', 'fonts');
const OUT_PNG = join(HERE, 'richmenu.png');

const LINE_API = 'https://api.line.me/v2/bot';
/* The artwork lives on a different host from the menu metadata: posting the
   image to api.line.me/.../content returns 404, it has to go to api-data. */
const LINE_DATA_API = 'https://api-data.line.me/v2/bot';
const CHROME = process.env.CHROMIUM ?? 'chromium';

/* --- menu definition ------------------------------------------------------ */
/* Edit these and re-run `--deploy`. Five cells of 500px across a 2500x843 bar,
   which is what the bot already uses. */
const LIFF_ID = env('LIFF_ID') || env('PUBLIC_LIFF_ID') || '2010606328-7UnH1Yre';

const CELLS = [
	{ num: '01', icon: 'collage', title: 'ส่งรูปงาน', sub: 'COLLAGE', uri: `https://liff.line.me/${LIFF_ID}` },
	{ num: '02', icon: 'truck', title: 'บันทึกงาน', sub: 'TRUCK', uri: 'https://truck.mcky.space' },
	{ num: '03', icon: 'data', title: 'เปิดหน้าลูกค้า', sub: 'CLIENT DATA', uri: 'https://data.mcky.space' },
	{ num: '04', icon: 'rider', title: 'ไรเดอร์', sub: 'RIDER', uri: 'https://rider.ezzytransporter.com/' },
	{ num: '05', icon: 'portal', title: 'เปิดสมาชิก', sub: 'PORTAL', uri: 'https://me.mcky.space' },
];

const W = 2500;
const H = 843;
const COL = W / CELLS.length;

/* App palette (light theme in web/src/app.css) so the menu matches the product. */
const C = {
	bg: '#F6F4F0',
	surface: '#FFFFFF',
	border: '#E4DFD7',
	text: '#1F1B16',
	muted: '#6B645C',
	accent: '#B8502F',
};

const NAME = 'COLLAGE หลัก';
const CHAT_BAR = 'เมนู';

/* --- env ------------------------------------------------------------------ */
function env(key) {
	if (process.env[key]) return process.env[key];
	const file = join(WEB, '.env');
	if (!existsSync(file)) return '';
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const eq = line.indexOf('=');
		if (eq > 0 && line.slice(0, eq).trim() === key) return line.slice(eq + 1).trim();
	}
	return '';
}

function token() {
	const t = env('LINE_CHANNEL_ACCESS_TOKEN');
	if (!t) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set (env or web/.env)');
	return t;
}

/* --- artwork -------------------------------------------------------------- */
function fontData(name) {
	const buf = readFileSync(join(FONTS, name));
	return `data:font/ttf;base64,${buf.toString('base64')}`;
}

function buildHtml() {
	return `<!doctype html>
<meta charset="utf-8">
<style>
	@font-face { font-family: 'Noto Sans Thai'; src: url('${fontData('NotoSansThai.ttf')}'); font-weight: 100 900; }
	@font-face { font-family: 'JetBrains Mono'; src: url('${fontData('JetBrainsMono-Regular.ttf')}'); font-weight: 400; }
	html, body { margin: 0; padding: 0; background: ${C.bg}; }
</style>
<canvas id="c" width="${W}" height="${H}"></canvas>
<script>
const CELLS = ${JSON.stringify(CELLS)};
const C = ${JSON.stringify(C)};
const W = ${W}, H = ${H}, COL = ${COL};

function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/* Icons drawn in a 24x24 space, then scaled to ICON_PX. Straight strokes and
   circles only — nothing that depends on a particular rasteriser. */
const ICON_PX = 160;

const ICONS = {
	collage(c) {
		roundRect(c, 3, 6, 18, 12, 2); c.stroke();
		c.beginPath(); c.moveTo(8, 6); c.lineTo(9.6, 3.6); c.lineTo(14.4, 3.6); c.lineTo(16, 6); c.stroke();
		c.beginPath(); c.arc(12, 12, 3.5, 0, Math.PI * 2); c.stroke();
	},
	truck(c) {
		roundRect(c, 1, 8, 12, 9, 1); c.stroke();
		c.beginPath(); c.moveTo(13, 11); c.lineTo(18.5, 11); c.lineTo(21, 13.5); c.lineTo(21, 17); c.lineTo(13, 17); c.closePath(); c.stroke();
		c.beginPath(); c.arc(5.5, 19, 1.8, 0, Math.PI * 2); c.stroke();
		c.beginPath(); c.arc(16.5, 19, 1.8, 0, Math.PI * 2); c.stroke();
	},
	data(c) {
		c.beginPath(); c.ellipse(12, 6, 8, 3, 0, 0, Math.PI * 2); c.stroke();
		c.beginPath(); c.moveTo(4, 6); c.lineTo(4, 18); c.moveTo(20, 6); c.lineTo(20, 18); c.stroke();
		c.beginPath(); c.ellipse(12, 12, 8, 3, 0, 0, Math.PI); c.stroke();
		c.beginPath(); c.ellipse(12, 18, 8, 3, 0, 0, Math.PI); c.stroke();
	},
	rider(c) {
		// scooter: two wheels, a frame, a handlebar — straight strokes only
		c.beginPath(); c.arc(5.5, 17.2, 3.2, 0, Math.PI * 2); c.stroke();
		c.beginPath(); c.arc(18.5, 17.2, 3.2, 0, Math.PI * 2); c.stroke();
		c.beginPath();
		c.moveTo(5.5, 17.2); c.lineTo(11, 17.2); c.lineTo(13.8, 11); c.lineTo(18.5, 17.2);
		c.stroke();
		c.beginPath();
		c.moveTo(13.8, 11); c.lineTo(12.6, 6.8); c.lineTo(16.2, 6.8);
		c.stroke();
	},
	portal(c) {
		c.beginPath(); c.arc(12, 8, 3.6, 0, Math.PI * 2); c.stroke();
		c.beginPath(); c.moveTo(4.5, 20.5); c.quadraticCurveTo(4.5, 14.5, 12, 14.5); c.quadraticCurveTo(19.5, 14.5, 19.5, 20.5); c.stroke();
	},
};

function draw() {
	const ctx = document.getElementById('c').getContext('2d');

	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, W, H);

	CELLS.forEach((cell, i) => {
		const x = i * COL;
		const pad = 34;
		const bx = x + pad;
		const by = 30;
		const bw = COL - pad * 2;
		const bh = H - by * 2;

		ctx.save();
		ctx.shadowColor = 'rgba(31,27,22,0.10)';
		ctx.shadowBlur = 18;
		ctx.shadowOffsetY = 6;
		roundRect(ctx, bx, by, bw, bh, 26);
		ctx.fillStyle = C.surface;
		ctx.fill();
		ctx.restore();

		roundRect(ctx, bx, by, bw, bh, 26);
		ctx.strokeStyle = C.border;
		ctx.lineWidth = 3;
		ctx.stroke();

		// accent tab
		roundRect(ctx, bx + 30, by + 30, 58, 8, 4);
		ctx.fillStyle = C.accent;
		ctx.fill();

		ctx.textAlign = 'left';
		ctx.fillStyle = C.muted;
		ctx.font = '400 32px "JetBrains Mono", monospace';
		ctx.fillText(cell.num, bx + 32, by + 96);

		// icon, centred in the empty middle of the card
		ctx.save();
		ctx.translate(bx + bw / 2 - ICON_PX / 2, 300);
		ctx.scale(ICON_PX / 24, ICON_PX / 24);
		ctx.strokeStyle = C.accent;
		ctx.lineWidth = 1.6;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ICONS[cell.icon](ctx);
		ctx.restore();

		ctx.textAlign = 'center';
		ctx.fillStyle = C.accent;
		ctx.font = '400 34px "JetBrains Mono", monospace';
		ctx.fillText(cell.sub, bx + bw / 2, by + 525);

		ctx.fillStyle = C.text;
		ctx.font = '600 62px "Noto Sans Thai", sans-serif';
		ctx.fillText(cell.title, bx + bw / 2, by + bh - 108);
	});

	// separator rules between cells
	ctx.strokeStyle = C.border;
	ctx.lineWidth = 2;
	for (let i = 1; i < CELLS.length; i++) {
		ctx.beginPath();
		ctx.moveTo(i * COL, 150);
		ctx.lineTo(i * COL, H - 150);
		ctx.stroke();
	}
}

// Draw only once the Thai + Latin faces are actually usable, otherwise the
// screenshot races the font load and Thai falls back to a system face.
Promise.all([
	document.fonts.load('600 62px "Noto Sans Thai"'),
	document.fonts.load('400 28px "JetBrains Mono"'),
]).then(() => document.fonts.ready).then(() => {
	draw();
	document.title = 'rendered';
});
</script>`;
}

function render(imagePath = OUT_PNG) {
	const dir = mkdtempSync(join(tmpdir(), 'richmenu-'));
	const html = join(dir, 'richmenu.html');
	writeFileSync(html, buildHtml());

	try {
		execFileSync(
			CHROME,
			[
				'--headless',
				// Alpine's Chromium cannot set up its sandbox (no user namespaces),
				// and without --no-sandbox the screenshot silently never lands.
				'--no-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--hide-scrollbars',
				'--force-device-scale-factor=1',
				`--window-size=${W},${H}`,
				'--virtual-time-budget=10000',
				`--screenshot=${imagePath}`,
				`file://${html}`,
			],
			{ stdio: 'pipe' },
		);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}

	if (!existsSync(imagePath)) throw new Error(`Chromium did not write ${imagePath}`);
	console.log(`rendered  ${imagePath}  (${W}x${H}, ${readFileSync(imagePath).length} bytes)`);
	return imagePath;
}

/* --- LINE ----------------------------------------------------------------- */
async function line(path, init = {}) {
	return request(LINE_API, path, init);
}

async function dataLine(path, init = {}) {
	return request(LINE_DATA_API, path, init);
}

async function request(base, path, init = {}) {
	const res = await fetch(`${base}${path}`, {
		...init,
		headers: { Authorization: `Bearer ${token()}`, ...(init.headers ?? {}) },
	});
	if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`);
	return res;
}

async function deploy(imagePath, { dryRun = false } = {}) {
	const body = {
		size: { width: W, height: H },
		selected: true,
		name: NAME,
		chatBarText: CHAT_BAR,
		areas: CELLS.map((cell, i) => ({
			bounds: { x: Math.round(i * COL), y: 0, width: Math.round(COL), height: H },
			action: { type: 'uri', uri: cell.uri },
		})),
	};

	if (dryRun) {
		console.log(JSON.stringify(body, null, 2));
		return null;
	}

	const created = await (await line('/richmenu', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})).json();

	await dataLine(`/richmenu/${created.richMenuId}/content`, {
		method: 'POST',
		headers: { 'Content-Type': 'image/png' },
		body: readFileSync(imagePath),
	});
	await line(`/user/all/richmenu/${created.richMenuId}`, { method: 'POST' });

	console.log(`deployed  ${created.richMenuId}  (set as the default rich menu)`);
	return created.richMenuId;
}

async function list() {
	const { richmenus } = await (await line('/richmenu/list')).json();
	const current = await (await line('/user/all/richmenu')).json().catch(() => ({}));
	for (const m of richmenus) {
		const mark = m.richMenuId === current.richMenuId ? '*' : ' ';
		console.log(`${mark} ${m.richMenuId}  ${m.size.width}x${m.size.height}  ${m.areas.length} areas  ${m.name}`);
	}
	console.log(`\n${richmenus.length} menus, * = current default`);
}

/* --- cli ------------------------------------------------------------------ */
const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (flag) => (has(flag) ? argv[argv.indexOf(flag) + 1] : null);

const main = async () => {
	if (has('--list')) return list();
	if (has('--delete')) return void console.log('deleted  ', value('--delete'), await (await line(`/richmenu/${value('--delete')}`, { method: 'DELETE' })).text());

	const image = has('--deploy') || has('--render') ? (value('--image') ?? render()) : null;
	if (has('--deploy')) await deploy(image, { dryRun: has('--dry-run') });
	else if (!has('--render')) console.log('nothing to do — pass --render, --deploy, --list or --delete <id>');
};

main().catch((err) => {
	console.error('FAILED:', err.message);
	process.exit(1);
});
