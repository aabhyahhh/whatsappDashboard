import 'dotenv/config';

const apiBaseUrl = process.env.VITE_API_BASE_URL || 'https://whatsappdashboard-1.onrender.com';

interface LoginTestResult {
  success: boolean;
  duration: number;
  error?: string;
  statusCode?: number;
}

async function testLoginPerformance(): Promise<LoginTestResult> {
  const startTime = Date.now();
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${apiBaseUrl}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        username: 'admin', 
        password: 'L@@riKh0j0' 
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        duration,
        error: data.error || 'Login failed',
        statusCode: response.status
      };
    }

    return {
      success: true,
      duration,
      statusCode: response.status
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          duration,
          error: 'Request timeout'
        };
      }
      return {
        success: false,
        duration,
        error: error.message
      };
    }
    
    return {
      success: false,
      duration,
      error: 'Unknown error'
    };
  }
}

async function runPerformanceTest() {
  console.log('🚀 LOGIN PERFORMANCE TEST');
  console.log('==========================');
  console.log(`API Base URL: ${apiBaseUrl}`);
  console.log(`Test Time: ${new Date().toISOString()}`);
  console.log('');

  const results: LoginTestResult[] = [];
  const testCount = 5;

  console.log(`Running ${testCount} login tests...`);
  console.log('');

  for (let i = 1; i <= testCount; i++) {
    console.log(`Test ${i}/${testCount}...`);
    const result = await testLoginPerformance();
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Success: ${result.duration}ms`);
    } else {
      console.log(`❌ Failed: ${result.duration}ms - ${result.error}`);
    }
    
    // Wait 1 second between tests
    if (i < testCount) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('');
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('======================');

  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);

  console.log(`Total Tests: ${results.length}`);
  console.log(`Successful: ${successfulTests.length}`);
  console.log(`Failed: ${failedTests.length}`);

  if (successfulTests.length > 0) {
    const durations = successfulTests.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log('');
    console.log('⏱️ TIMING STATISTICS (Successful Tests)');
    console.log(`Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`Minimum: ${minDuration}ms`);
    console.log(`Maximum: ${maxDuration}ms`);
  }

  if (failedTests.length > 0) {
    console.log('');
    console.log('❌ FAILED TESTS');
    failedTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.error} (${test.duration}ms)`);
    });
  }

  // Performance assessment
  console.log('');
  console.log('📈 PERFORMANCE ASSESSMENT');
  console.log('=========================');

  if (successfulTests.length === 0) {
    console.log('🚨 CRITICAL: All tests failed - immediate attention required');
  } else {
    const avgDuration = successfulTests.reduce((a, b) => a + b.duration, 0) / successfulTests.length;
    
    if (avgDuration < 1000) {
      console.log('✅ EXCELLENT: Login performance is very fast (< 1s)');
    } else if (avgDuration < 3000) {
      console.log('✅ GOOD: Login performance is acceptable (1-3s)');
    } else if (avgDuration < 10000) {
      console.log('⚠️ SLOW: Login performance needs improvement (3-10s)');
    } else {
      console.log('🚨 CRITICAL: Login performance is very slow (> 10s)');
    }
  }

  console.log('');
  console.log('🔧 RECOMMENDATIONS');
  console.log('==================');
  
  if (failedTests.length > 0) {
    console.log('• Check server connectivity and database connection');
    console.log('• Verify environment variables are set correctly');
    console.log('• Check server logs for errors');
  }
  
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((a, b) => a + b.duration, 0) / successfulTests.length;
    
    if (avgDuration > 5000) {
      console.log('• Optimize database queries');
      console.log('• Check for slow database connections');
      console.log('• Consider adding database indexes');
      console.log('• Review server startup processes');
    }
  }
}

runPerformanceTest().catch(console.error);
