/* =============================================================================
   LINE Messaging API webhook (ported from frontend/api/webhook.js)
   -----------------------------------------------------------------------------
   Raw body is required: validateSignature hashes the exact bytes LINE sent,
   so this route must never go through body parsing.
   ============================================================================= */

import { LineBotClient, validateSignature, type messagingApi } from '@line/bot-sdk';
import { LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET, LIFF_ID } from '$app/env/private';
import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const config = {
	channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
	channelSecret: LINE_CHANNEL_SECRET,
};

const LIFF_URL_BASE = `https://liff.line.me/${LIFF_ID}`;
const CLIENTDATA_URL = 'https://data.mcky.space';

const client = config.channelAccessToken ? LineBotClient.fromChannelAccessToken({ channelAccessToken: config.channelAccessToken }) : null;

type Message = messagingApi.Message;

function liffUrl(): string {
	return LIFF_URL_BASE;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!client || !config.channelSecret) return text('webhook not configured', { status: 503 });

	const rawBody = await request.text();
	const signature = request.headers.get('x-line-signature');

	if (!validateSignature(rawBody, config.channelSecret, signature ?? '')) {
		return text('Invalid signature', { status: 401 });
	}

	let body: { events?: Array<Record<string, unknown>> };
	try {
		body = JSON.parse(rawBody);
	} catch {
		return text('Bad Request', { status: 400 });
	}

	// Always 200 — a non-2xx makes LINE retry the entire batch.
	try {
		await Promise.all((body.events ?? []).map((e) => handleEvent(e)));
	} catch (err) {
		console.error('webhook handler error:', err);
	}
	return json({ ok: true });
};

function reply(replyToken: string, messages: Message[]) {
	return client!.replyMessage({ replyToken, messages });
}

async function handleEvent(event: Record<string, any>) {
	// Follow/unblock → greet with the flex menu. Follow events carry a
	// replyToken, so this uses the Reply API (free, no message quota).
	if (event.type === 'follow') {
		return reply(event.replyToken, [mainMenu()]);
	}

	if (event.type !== 'message' || event.message?.type !== 'text') return;

	const text = String(event.message.text ?? '').trim();
	const match = text.match(/^([!*])(.+)/);
	if (!match) return;

	const [, prefix, rawCmd] = match;
	const cmd = rawCmd.trim();

	if (cmd === 'ส่งรูป' || cmd === 'รูป') {
		return reply(event.replyToken, [collageMenu()]);
	}

	if (cmd === 'เมนู') {
		return reply(event.replyToken, [mainMenu()]);
	}

	if (cmd.startsWith('ลูกค้า')) {
		const q = cmd.slice('ลูกค้า'.length).trim();
		if (!q) {
			return reply(event.replyToken, [
				{
					type: 'text',
					text: `⚠️ ระบุชื่อหรือร้านที่ต้องการค้นหา เช่น\n${prefix}ลูกค้า เจ๊ฟ้า`,
				},
			]);
		}
		return handleSearchClient(event.replyToken, q);
	}
}

function collageMenu(): Message {
	return {
		type: 'flex',
		altText: 'กดเพื่อส่งรูปงาน',
		contents: {
			type: 'bubble',
			body: {
				type: 'box',
				layout: 'vertical',
				spacing: 'md',
				contents: [
					{ type: 'text', text: '📸 ส่งรูปงานประจำวัน', weight: 'bold', size: 'lg' },
					{ type: 'text', text: 'กดปุ่มด้านล่างเพื่อเปิดหน้าอัปโหลดรูป', size: 'sm', color: '#888888', wrap: true },
				],
			},
			footer: {
				type: 'box',
				layout: 'vertical',
				contents: [
					{
						type: 'button',
						style: 'primary',
						color: '#B91C1C',
						action: { type: 'uri', label: 'เปิดหน้าส่งรูป', uri: liffUrl() },
					},
				],
			},
		},
	} as Message;
}

function mainMenu(): Message {
	return {
		type: 'flex',
		altText: 'เมนูหลัก',
		contents: {
			type: 'bubble',
			body: {
				type: 'box',
				layout: 'vertical',
				spacing: 'md',
				contents: [{ type: 'text', text: '📋 เมนูหลัก', weight: 'bold', size: 'lg' }],
			},
			footer: {
				type: 'box',
				layout: 'vertical',
				spacing: 'sm',
				contents: [
					{
						type: 'button',
						style: 'primary',
						color: '#B91C1C',
						action: { type: 'uri', label: '📸 ส่งรูปงาน', uri: liffUrl() },
					},
					{
						type: 'button',
						style: 'secondary',
						action: { type: 'uri', label: '🚛 เปิดบันทึกงาน', uri: 'https://truck.mcky.space' },
					},
					{
						type: 'button',
						style: 'secondary',
						action: { type: 'uri', label: '🥊 เปิดหน้าลูกค้า', uri: CLIENTDATA_URL },
					},
				],
			},
		},
	} as Message;
}

interface ClientRow {
	id: number;
	name: string;
	shopName: string;
	address: string;
}

async function handleSearchClient(replyToken: string, query: string) {
	try {
		const res = await fetch(`${CLIENTDATA_URL}/api/clients/search?${new URLSearchParams({ q: query })}`);
		if (!res.ok) throw new Error(`API error ${res.status}`);
		const clients: ClientRow[] = await res.json();

		if (!clients.length) {
			return reply(replyToken, [{ type: 'text', text: `❌ ไม่พบ "${query}"` }]);
		}
		return reply(replyToken, [buildClientFlex(clients, query)]);
	} catch (err) {
		console.error('Search error:', err);
		return reply(replyToken, [{ type: 'text', text: '⚠️ เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่' }]);
	}
}

function buildClientFlex(clients: ClientRow[], query: string): Message {
	const isSingle = clients.length === 1;
	const c = clients[0];
	const body: Record<string, unknown>[] = [];

	if (isSingle) {
		body.push(
			{ type: 'text', text: `👤 : ${c.name}`, weight: 'bold', size: 'lg' },
			{ type: 'text', text: `🛒 : ${c.shopName}`, size: 'sm', color: '#666666', wrap: true },
			{ type: 'text', text: `📌 : ${c.address}`, size: 'sm', color: '#666666', wrap: true },
		);
	} else {
		body.push({ type: 'text', text: `พบ ${clients.length} รายการ`, weight: 'bold', size: 'md' });
		clients.forEach((cl, i) => {
			body.push({
				type: 'text',
				text: `${i + 1}. 👤${cl.name} — 🛒${cl.shopName}`,
				size: 'sm',
				color: '#666666',
				wrap: true,
			});
		});
	}

	return {
		type: 'flex',
		altText: `ค้นพบ ${clients.length} รายการ`,
		contents: {
			type: 'bubble',
			body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: body },
			footer: {
				type: 'box',
				layout: 'vertical',
				contents: [
					{
						type: 'button',
						style: 'primary',
						color: '#0B3C87',
						action: {
							type: 'uri',
							label: 'เปิดใน browser',
							uri: isSingle
								? `${CLIENTDATA_URL}/c/${c.id}`
								: `${CLIENTDATA_URL}?${new URLSearchParams({ q: query })}`,
						},
					},
				],
			},
		},
	} as Message;
}