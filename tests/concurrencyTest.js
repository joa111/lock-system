const axios = require('axios');

const API = 'http://localhost:3000';

async function test() {
  try {
    console.log('\n🎭 Creating event...');
    const eventRes = await axios.post(`${API}/api/events`, {
      name: 'Test Concert',
      sections: [{ name: 'VIP', price: 5000, capacity: 5 }],
    });

    const responseData = eventRes.data.data;
    console.log('\nFull response:', JSON.stringify(responseData, null, 2));

    // Extract step by step with debugging
    console.log('\n🔍 Debugging extraction:');
    console.log('1. responseData type:', typeof responseData);
    console.log('2. responseData._id:', responseData._id);
    console.log('3. responseData.sections:', responseData.sections);
    console.log('4. responseData.sections type:', typeof responseData.sections);
    console.log('5. responseData.sections.length:', responseData.sections.length);

    const eventId = responseData._id;
    const sectionsArray = responseData.sections;
    const firstSectionObj = sectionsArray[0]; 
    const sectionId = firstSectionObj._id;

    console.log('\n✅ Extracted values:');
    console.log('   eventId:', eventId);
    console.log('   firstSectionObj:', firstSectionObj);
    console.log('   sectionId:', sectionId);

    if (!eventId) {
      console.error('❌ Missing eventId!');
      process.exit(1);
    }
    if (!sectionId) {
      console.error('❌ Missing sectionId!');
      process.exit(1);
    }

    console.log('\n✅✅ SUCCESS: Got both IDs!');
    console.log(`   Event: ${eventId}`);
    console.log(`   Section: ${sectionId}`);

    console.log('\n🔄 Sending 20 concurrent bookings...\n');
    
    const requests = [];
    for (let i = 0; i < 20; i++) {
      const req = axios.post(`${API}/bookings`, {
        eventId: eventId,
        sectionId: sectionId,
        qty: 1,
        userId: `user-${i}`,
      })
        .then(() => {
          console.log(`✅ User ${i}: SUCCESS`);
          return true;
        })
        .catch((err) => {
          console.log(`❌ User ${i}: FAILED`);
          return false;
        });
      requests.push(req);
    }

    const results = await Promise.all(requests);
    const successful = results.filter(x => x).length;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESULTS: ${successful} successful, ${20 - successful} failed`);
    console.log(`✅ Overselling prevented: ${successful <= 5 ? 'YES' : 'NO'}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    process.exit(1);
  }
}

test();
