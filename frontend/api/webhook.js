import { Client, validateSignature } from '@line/bot-sdk';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const LIFF_ID = process.env.LIFF_ID;
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
  if (event.message.text.trim() !== '!ส่งรูป') return;

  return client.replyMessage(event.replyToken, {
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
  });
}
