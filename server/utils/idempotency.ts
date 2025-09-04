// Redis-based idempotency system for message deduplication
// Note: Redis is optional - system will fallback to in-memory storage if not available

// Redis client instance
let redisClient: any = null;

// Initialize Redis client
export async function initializeRedis() {
  try {
    // Check if Redis is available by trying to require it
    let createClient: any;
    try {
      // Use eval to avoid TypeScript compilation errors
      const redisModule = eval('require')('redis');
      createClient = redisModule.createClient;
    } catch (importError) {
      console.log('⚠️ Redis module not available, using in-memory fallback');
      return false;
    }
    
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisPassword = process.env.REDIS_PASSWORD;
    
    redisClient = createClient({
      url: redisUrl,
      password: redisPassword,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });
    
    redisClient.on('error', (err: Error) => {
      console.error('❌ Redis Client Error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis Client Connected');
    });
    
    await redisClient.connect();
    return true;
  } catch (error) {
    console.log('⚠️ Redis not available, using in-memory fallback:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Check if message was already processed
export async function isMessageProcessed(messageId: string): Promise<boolean> {
  if (!redisClient) {
    console.warn('⚠️ Redis not available, using fallback idempotency');
    return false;
  }
  
  try {
    const exists = await redisClient.exists(`msg:${messageId}`);
    return exists === 1;
  } catch (error) {
    console.error('❌ Error checking message idempotency:', error);
    return false;
  }
}

// Mark message as processed
export async function markMessageProcessed(messageId: string, ttlHours: number = 24): Promise<void> {
  if (!redisClient) {
    console.warn('⚠️ Redis not available, skipping idempotency marking');
    return;
  }
  
  try {
    const ttlSeconds = ttlHours * 60 * 60;
    await redisClient.setEx(`msg:${messageId}`, ttlSeconds, 'processed');
    console.log(`✅ Marked message ${messageId} as processed (TTL: ${ttlHours}h)`);
  } catch (error) {
    console.error('❌ Error marking message as processed:', error);
  }
}

// Get message processing info
export async function getMessageInfo(messageId: string): Promise<any> {
  if (!redisClient) {
    return null;
  }
  
  try {
    const info = await redisClient.get(`msg:${messageId}`);
    return info ? { processed: true, timestamp: Date.now() } : null;
  } catch (error) {
    console.error('❌ Error getting message info:', error);
    return null;
  }
}

// Clean up old processed messages (optional - Redis TTL handles this automatically)
export async function cleanupOldMessages(): Promise<void> {
  if (!redisClient) {
    return;
  }
  
  try {
    // Redis TTL automatically handles cleanup, but we can add manual cleanup if needed
    const keys = await redisClient.keys('msg:*');
    console.log(`📊 Found ${keys.length} processed messages in Redis`);
  } catch (error) {
    console.error('❌ Error cleaning up old messages:', error);
  }
}

// Close Redis connection
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
    }
  }
}

// Fallback in-memory idempotency for when Redis is not available
const fallbackProcessedMessages = new Map<string, number>();
const FALLBACK_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function isMessageProcessedFallback(messageId: string): boolean {
  const timestamp = fallbackProcessedMessages.get(messageId);
  if (!timestamp) {
    return false;
  }
  
  // Check if expired
  if (Date.now() - timestamp > FALLBACK_TTL) {
    fallbackProcessedMessages.delete(messageId);
    return false;
  }
  
  return true;
}

export function markMessageProcessedFallback(messageId: string): void {
  fallbackProcessedMessages.set(messageId, Date.now());
  
  // Clean up old entries periodically
  if (fallbackProcessedMessages.size > 1000) {
    const now = Date.now();
    for (const [id, timestamp] of fallbackProcessedMessages.entries()) {
      if (now - timestamp > FALLBACK_TTL) {
        fallbackProcessedMessages.delete(id);
      }
    }
  }
}

// Combined idempotency check (Redis + fallback)
export async function checkMessageIdempotency(messageId: string): Promise<boolean> {
  // Try Redis first
  if (redisClient) {
    return await isMessageProcessed(messageId);
  }
  
  // Fallback to in-memory
  return isMessageProcessedFallback(messageId);
}

// Combined idempotency marking (Redis + fallback)
export async function markMessageIdempotency(messageId: string, ttlHours: number = 24): Promise<void> {
  // Try Redis first
  if (redisClient) {
    await markMessageProcessed(messageId, ttlHours);
  } else {
    // Fallback to in-memory
    markMessageProcessedFallback(messageId);
  }
}
