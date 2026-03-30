// Test sending a callback_query to the webhook
const WEBHOOK_URL = 'https://app.vantake.trade/api/telegram/webhook';

async function testCallback() {
  console.log('=== Testing Webhook with Callback Query ===\n');
  
  // Simulate a callback_query (button press)
  const testPayload = {
    update_id: 123456789,
    callback_query: {
      id: "test_callback_id",
      from: {
        id: 123456789,
        first_name: "Test",
        username: "testuser"
      },
      message: {
        message_id: 1,
        chat: {
          id: 123456789,
          type: "private"
        },
        date: Math.floor(Date.now() / 1000),
        text: "test"
      },
      data: "menu_help"
    }
  };
  
  console.log('Sending test callback_query to webhook...');
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    console.log('\nResponse status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testCallback();
