import { Client, validateSignature } from '@line/bot-sdk';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const LIFF_ID = process.env.LIFF_ID;
const CLIENTDATA_URL = 'https://data.mcky.space';
const client = new Client(config);

export const config_vercel = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const rawBody = await getRawBody(req);
  const signature = req.headers['x-line-signature'];

  if (!validateSignature(rawBody, config.channelSecret, signature)) {
    return res.status(401).end('Invalid signature');
  }

  const body = JSON.parse(rawBody);

  try {
    await Promise.all(body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(200).end();
  }
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const text = event.message.text.trim();

  if (text === '!ส่งรูป' || text === '!รูป') {
    return client.replyMessage(event.replyToken, collageMenu());
  }

  if (text === '!เมนู') {
    return client.replyMessage(event.replyToken, mainMenu());
  }

  if (text.startsWith('!ลูกค้า')) {
    const q = text.slice('!ลูกค้า'.length).trim();
    if (!q) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '⚠️ ระบุชื่อหรือร้านที่ต้องการค้นหา เช่น\n!ลูกค้า เจ๊ฟ้า',
      });
    }
    return handleSearchClient(event.replyToken, q);
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
            action: { type: 'uri', label: '📋 เปิดหน้าลูกค้า', uri: CLIENTDATA_URL },
          },
        ],
      },
    },
  };
}

async function handleSearchClient(replyToken, query) {
  try {
    const res = await fetch(`${CLIENTDATA_URL}/api/clients/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const clients = await res.json();

    if (clients.length === 0) {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `❌ ไม่พบ "${query}"`,
      });
    }

    return client.replyMessage(replyToken, buildClientFlex(clients, query));
  } catch (err) {
    console.error('Search error:', err);
    return client.replyMessage(replyToken, {
      type: 'text',
      text: '⚠️ เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่',
    });
  }
}

function buildClientFlex(clients, query) {
  const isSingle = clients.length === 1;
  const c = clients[0];

  const bodyContents = [];

  if (isSingle) {
    bodyContents.push(
      { type: 'text', text: `👤 : ${c.name}`, weight: 'bold', size: 'lg' },
      { type: 'text', text: `🛒 : ${c.shopName}`, size: 'sm', color: '#666666', wrap: true },
      { type: 'text', text: `📌 : ${c.address}`, size: 'sm', color: '#666666', wrap: true },
    );

  } else {
    bodyContents.push(
      { type: 'text', text: `พบ ${clients.length} รายการ`, weight: 'bold', size: 'md' },
    );
    clients.forEach((cl, i) => {
      bodyContents.push({
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
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: bodyContents,
      },
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
              uri: isSingle ? `${CLIENTDATA_URL}/c/${c.id}` : `${CLIENTDATA_URL}?q=${encodeURIComponent(query)}`,
            },
          },
        ],
      },
    },
  };
}
