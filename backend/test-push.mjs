import webpush from 'web-push';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Client } = require('@prisma/client');

const publicKey = 'BMR9t5PPHg2Jko1VPZ2fDlmX9lEN303BH6Z-2bpKe7lf-7MxX3quJhCYYtKbJlho-CVzr2uW-aDELgUMW7rGiio';
const privateKey = 'akmPXo7n_zVhuXGjPB_GsS_G_mkzqc-WC9OF2d8mzLg';

webpush.setVapidDetails('mailto:admin@school.com', publicKey, privateKey);

// Use raw postgres instead
import pg from 'pg';

const { Client: PgClient } = pg;
const client = new PgClient({
  connectionString: 'postgresql://usman:834927615@localhost:5432/sms_db'
});

await client.connect();
const res = await client.query('SELECT endpoint, p256dh, auth FROM "PushSubscription" LIMIT 5');
await client.end();

console.log(`Found ${res.rows.length} subscription(s)`);

for (const row of res.rows) {
  console.log('Testing:', row.endpoint.substring(0, 60) + '...');
  try {
    const result = await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify({ title: 'Test Push ✅', body: 'Push notifications are working!' })
    );
    console.log('✅ SUCCESS! Status:', result.statusCode);
  } catch (err) {
    console.error('❌ FAILED! Status:', err.statusCode);
    console.error('   Body:', err.body || err.message);
  }
}
