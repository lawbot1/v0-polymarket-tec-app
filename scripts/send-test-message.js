const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Get your chat ID from @userinfobot on Telegram
// Or use getUpdates to find it
async function main() {
  if (!TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return;
  }

  // First get recent updates to find chat IDs
  console.log('=== Getting Recent Updates ===\n');
  const updatesRes = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?limit=5`);
  const updates = await updatesRes.json();
  
  if (updates.result && updates.result.length > 0) {
    console.log('Recent updates:');
    for (const update of updates.result) {
      if (update.callback_query) {
        console.log(`- Callback: "${update.callback_query.data}" from chat ${update.callback_query.message?.chat?.id}`);
      } else if (update.message) {
        console.log(`- Message: "${update.message.text}" from chat ${update.message.chat.id}`);
      }
    }
  } else {
    console.log('No recent updates (webhook is active, updates go there)');
  }

  // Try to answer any pending callback queries
  console.log('\n=== Checking for pending callbacks ===');
  for (const update of (updates.result || [])) {
    if (update.callback_query) {
      console.log(`Answering callback ${update.callback_query.id}...`);
      const answerRes = await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: update.callback_query.id,
          text: 'Processing...'
        })
      });
      const answerResult = await answerRes.json();
      console.log('Answer result:', JSON.stringify(answerResult));
    }
  }
}

main().catch(console.error);
