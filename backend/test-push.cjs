// Test push notification delivery directly
const webpush = require('./node_modules/web-push');
const { PrismaClient } = require('./node_modules/@prisma/client');

const publicKey = 'BMR9t5PPHg2Jko1VPZ2fDlmX9lEN303BH6Z-2bpKe7lf-7MxX3quJhCYYtKbJlho-CVzr2uW-aDELgUMW7rGiio';
const privateKey = 'akmPXo7n_zVhuXGjPB_GsS_G_mkzqc-WC9OF2d8mzLg';

webpush.setVapidDetails('mailto:admin@school.com', publicKey, privateKey);

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://usman:834927615@localhost:5432/sms_db' } }
});

async function main() {
  const subs = await prisma.$queryRaw`
    SELECT endpoint, p256dh, auth FROM "PushSubscription" LIMIT 5
  `;

  console.log(`Found ${subs.length} subscription(s)\n`);

  for (const sub of subs) {
    const shortEndpoint = sub.endpoint.substring(0, 70) + '...';
    console.log('Testing:', shortEndpoint);
    try {
      const result = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: 'Test Push ✅', body: 'Push notifications are working!' })
      );
      console.log('✅ SUCCESS! Status:', result.statusCode);
    } catch (err) {
      console.error('❌ FAILED!');
      console.error('   Status code:', err.statusCode);
      console.error('   Body:', err.body);
      console.error('   Message:', err.message);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
