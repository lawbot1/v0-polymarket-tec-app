const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function main() {
  // 1. Test bot token - get bot info
  console.log('=== Testing Bot Token ===');
  const meRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
  const me = await meRes.json();
  console.log('Bot info:', JSON.stringify(me, null, 2));

  if (!me.ok) {
    console.log('ERROR: Bot token is invalid!');
    return;
  }
  console.log(`Bot @${me.result.username} is alive!\n`);

  // 2. Check pending updates (messages people sent while webhook was broken)
  console.log('=== Pending Updates ===');
  const webhookInfo = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`);
  const info = await webhookInfo.json();
  console.log(`Pending messages: ${info.result.pending_update_count}`);
  console.log(`Webhook URL: ${info.result.url}`);
  console.log(`Last error: ${info.result.last_error_message || 'none'}`);
  console.log(`Last error date: ${info.result.last_error_date ? new Date(info.result.last_error_date * 1000).toISOString() : 'none'}\n`);

  // 3. Try to get updates directly (temporarily remove webhook to read pending messages)
  console.log('=== Checking Recent Messages ===');
  // Delete webhook temporarily
  await fetch(`https://api.telegram.org/bot${TOKEN}/deleteWebhook`);
  
  // Get pending updates
  const updatesRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?limit=5`);
  const updates = await updatesRes.json();
  
  if (updates.result && updates.result.length > 0) {
    console.log(`Found ${updates.result.length} pending message(s):`);
    for (const update of updates.result) {
      if (update.message) {
        const msg = update.message;
        console.log(`  From: ${msg.from.first_name} (@${msg.from.username || 'no_username'}) | Chat ID: ${msg.chat.id}`);
        console.log(`  Text: "${msg.text}"`);
        console.log('');
      }
    }
  } else {
    console.log('No pending messages');
  }

  // 4. Re-register webhook
  console.log('\n=== Re-registering Webhook ===');
  const setRes = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://app.vantake.trade/api/telegram/webhook',
      allowed_updates: ['message', 'callback_query']
    })
  });
  const setResult = await setRes.json();
  console.log('Webhook re-registered:', JSON.stringify(setResult, null, 2));
  
  console.log('\n=== SUMMARY ===');
  console.log(`Bot: @${me.result.username} - WORKING`);
  console.log('Webhook: registered at https://app.vantake.trade/api/telegram/webhook');
}

main().catch(console.error);
