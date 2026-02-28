// Check webhook info
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function main() {
  if (!TOKEN) {
    console.error('Missing TELEGRAM_BOT_TOKEN');
    process.exit(1);
  }

  // Get webhook info
  console.log('=== Webhook Info ===');
  const infoRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const info = await infoRes.json();
  console.log(JSON.stringify(info, null, 2));

  // Check pending updates
  if (info.result?.pending_update_count > 0) {
    console.log('\n=== Pending Updates ===');
    console.log('There are', info.result.pending_update_count, 'pending updates');
  }

  // Check last error
  if (info.result?.last_error_message) {
    console.log('\n=== Last Error ===');
    console.log('Error:', info.result.last_error_message);
    console.log('Error Date:', new Date(info.result.last_error_date * 1000).toISOString());
  }
}

main().catch(console.error);
