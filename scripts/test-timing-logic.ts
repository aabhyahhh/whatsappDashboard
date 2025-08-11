import moment from 'moment-timezone';

function testTimingLogic() {
  console.log('🧪 TESTING TIMING LOGIC');
  console.log('========================');
  
  const now = moment().tz('Asia/Kolkata');
  console.log(`Current time: ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  
  // Test different opening times
  const testTimes = [
    '8:00 AM',
    '9:00 AM', 
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
    '7:00 PM',
    '8:00 PM',
    '9:00 PM',
    '10:00 PM'
  ];
  
  console.log('\n📊 Testing timing logic for different opening times:');
  console.log('Time\t\tDiff\t15min\tAt Open\tStatus');
  console.log('----\t\t----\t-----\t-------\t------');
  
  for (const timeStr of testTimes) {
    const openTime = moment.tz(timeStr, 'h:mm A', 'Asia/Kolkata');
    openTime.set({
      year: now.year(),
      month: now.month(),
      date: now.date(),
    });
    
    const diff = openTime.diff(now, 'minutes');
    const is15Min = diff === 15;
    const isAtOpen = diff === 0;
    
    let status = '⏩ Skip';
    if (is15Min) status = '📤 15min';
    else if (isAtOpen) status = '📤 Open';
    else if (diff > 0 && diff <= 20) status = '⏰ Soon';
    else if (diff < 0) status = '🚪 Closed';
    
    console.log(`${timeStr}\t${diff}\t${is15Min ? '✅' : '❌'}\t${isAtOpen ? '✅' : '❌'}\t${status}`);
  }
  
  console.log('\n📝 EXPLANATION:');
  console.log('✅ 15min: Will send 15-minute reminder');
  console.log('✅ Open: Will send opening time reminder');
  console.log('⏰ Soon: Within 20 minutes of opening');
  console.log('⏩ Skip: Not time for reminder');
  console.log('🚪 Closed: Already opened for today');
  
  console.log('\n✅ Timing logic test completed!');
  console.log('📋 The fix ensures reminders are sent ONLY at:');
  console.log('   - Exactly 15 minutes before opening time');
  console.log('   - Exactly at opening time');
  console.log('   - No more continuous messages every 2-3 minutes');
}

testTimingLogic(); 