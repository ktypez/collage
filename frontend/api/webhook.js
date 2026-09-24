import { Client, validateSignature } from '@line/bot-sdk';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const LIFF_ID = process.env.LIFF_ID;
const CLIENTDATA_URL = 'https://data.mcky.space';
const MAX_BODY_BYTES = 256 * 1024;
const MAX_EVENTS = 50;
const client = new Client(config);

export const config_vercel = {
  api: { bodyParser: false },
};

export async function getRawBody(req, maxBytes = MAX_BODY_BYTES) {
  const declaredLength = Number.parseInt(req.headers['content-length'] || '0', 10);
  if (declaredLength > maxBytes) {
    const error = new Error('Request body is too large');
    error.code = 'BODY_TOO_LARGE';
    throw error;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      const error = new Error('Request body is too large');
      error.code = 'BODY_TOO_LARGE';
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function assertConfig() {
  const missing = [
    ['LINE_CHANNEL_ACCESS_TOKEN', config.channelAccessToken],
    ['LINE_CHANNEL_SECRET', config.channelSecret],
    ['LIFF_ID', LIFF_ID],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    const error = new Error(`Missing webhook configuration: ${missing.join(', ')}`);
    error.code = 'CONFIG_MISSING';
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  try {
    assertConfig();
    const rawBody = await getRawBody(req);
    const signature = req.headers['x-line-signature'];
    if (!validateSignature(rawBody, config.channelSecret, signature)) {
      res.status(401).end('Invalid signature');
      return;
    }

    const body = JSON.parse(rawBody);
    if (!body || !Array.isArray(body.events) || body.events.length > MAX_EVENTS) {
      res.status(400).end('Invalid event payload');
      return;
    }

    const results = await Promise.allSettled(body.events.map(handleEvent));
    for (const result of results) {
      if (result.status === 'rejected') console.error('LINE event error:', result.reason);
    }
    res.status(200).end();
  } catch (error) {
    if (error.code === 'BODY_TOO_LARGE') {
      res.status(413).end('Request body is too large');
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).end('Invalid JSON');
      return;
    }
    console.error('Webhook error:', error);
    res.status(500).end('Webhook unavailable');
  }
}

async function handleEvent(event) {
  if (event.type === 'follow') {
    return client.replyMessage(event.replyToken, mainMenu());
  }

  if (event.type !== 'message' || event.message.type !== 'text') return;
  const text = event.message.text.trim();
  const command = text.replace(/^[!*]\s*/, '').trim();

  if (command === 'ส่งรูป' || command === 'รูป') {
    return client.replyMessage(event.replyToken, collageMenu());
  }
  if (command === 'เมนู') {
    return client.replyMessage(event.replyToken, mainMenu());
  }
}

function collageMenu() {
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
            action: { type: 'uri', label: 'เปิดหน้าส่งรูป', uri: `https://liff.line.me/${LIFF_ID}` },
          },
        ],
      },
    },
  };
}

function mainMenu() {
  return {
    type: 'flex',
    altText: 'เมนูหลัก',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: '📋 เมนูหลัก', weight: 'bold', size: 'lg' },
        ],
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
            action: { type: 'uri', label: '📸 ส่งรูปงาน', uri: `https://liff.line.me/${LIFF_ID}` },
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
  };
}
