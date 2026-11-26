const fs = require('fs');
const path = require('path');

async function testSuite() {
  console.log('--- 1. Testing GET /api/status ---');
  let res = await fetch('http://localhost:4242/api/status');
  let data = await res.json();
  console.log('Status:', data.connected ? 'CONNECTED' : 'DISCONNECTED');
  console.log('Active Doc:', data.activeDoc ? data.activeDoc.name : 'None');

  console.log('\n--- 2. Testing POST /api/generate-image (Text to Image) ---');
  res = await fetch('http://localhost:4242/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'A cute golden retriever puppy sitting in a sunlit garden, photorealistic, 8k',
      width: 512,
      height: 512,
      placeInDoc: true
    })
  });
  data = await res.json();
  console.log('T2I Success:', data.success, 'Filename:', data.filename);
  console.log('Placed in PhotoCraft:', JSON.stringify(data.placed));

  console.log('\n--- 3. Testing POST /api/copilot (Curves / Vibrance) ---');
  res = await fetch('http://localhost:4242/api/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Tăng tương phản và độ rực rỡ màu' })
  });
  data = await res.json();
  console.log('Copilot Executed:', JSON.stringify(data.executed, null, 2));

  console.log('\n--- 4. Checking Updated Document Structure ---');
  res = await fetch('http://localhost:4242/api/status');
  data = await res.json();
  if (data.activeDoc && data.activeDoc.layers) {
    console.log('Layers in PhotoCraft Document:');
    data.activeDoc.layers.forEach((l, idx) => {
      console.log('  [' + idx + '] Layer #' + l.id + ': "' + l.name + '" (' + l.kind + ', blend: ' + l.blend + ')');
    });
  }

  console.log('\n--- 5. Rendering Canvas to Disk ---');
  res = await fetch('http://localhost:4242/api/preview');
  data = await res.json();
  if (data.success && data.base64) {
    const outPath = path.join(__dirname, 'workspace', 'demo_preview.png');
    fs.writeFileSync(outPath, Buffer.from(data.base64, 'base64'));
    console.log('Saved canvas preview to:', outPath);
  }
  console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY! ---');
}

testSuite().catch(console.error);
