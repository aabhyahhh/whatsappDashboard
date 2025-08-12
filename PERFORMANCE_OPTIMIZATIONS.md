# Performance Optimizations for Inactive Vendors Page

## 🎯 Problem Statement

The inactive vendors page was taking **1.4 minutes** to load, with the following issues identified from network logs:

1. **Slow API Response**: `inactive-vendors` request taking 1.4 minutes
2. **Double Contacts Fetch**: Two separate `contacts` requests (2.90s and 4.41s)
3. **N+1 Query Problem**: Backend making separate database queries for each vendor
4. **No Pagination**: Loading all vendors at once
5. **Missing Indexes**: Database queries not optimized

## ✅ Optimizations Implemented

### 1. Backend Database Optimizations

#### A. Aggregation Pipeline (Replaces N+1 Queries)
**Before**: Separate queries for each vendor
```javascript
// OLD: N+1 queries
for (const contact of inactiveContacts) {
  const vendor = await User.findOne({ contactNumber: contact.phone });
  const recentReminder = await SupportCallReminderLog.findOne({...});
}
```

**After**: Single aggregation pipeline
```javascript
// NEW: Single optimized query
const inactiveVendors = await Contact.aggregate([
  { $match: { lastSeen: { $lt: threeDaysAgo } } },
  { $lookup: { from: 'users', localField: 'phone', foreignField: 'contactNumber', as: 'vendor' } },
  { $unwind: '$vendor' },
  { $lookup: { from: 'supportcallreminderlogs', ... } },
  { $addFields: { daysInactive: ..., reminderStatus: ... } },
  { $project: { _id: 1, phone: 1, lastSeen: 1, daysInactive: 1, reminderStatus: 1, name: '$vendor.name' } },
  { $sort: { lastSeen: -1 } },
  { $skip: skip },
  { $limit: limit }
]);
```

#### B. Database Indexes
Created optimized indexes for faster queries:
```javascript
// Contact collection
db.contacts.createIndex({ lastSeen: -1 }, { name: 'lastSeen_desc' });

// User collection  
db.users.createIndex({ contactNumber: 1 }, { name: 'contactNumber_asc' });

// SupportCallReminderLog collection
db.supportcallreminderlogs.createIndex(
  { contactNumber: 1, sentAt: -1 }, 
  { name: 'contactNumber_sentAt' }
);

// Message collection
db.messages.createIndex(
  { to: 1, direction: 1, timestamp: -1 }, 
  { name: 'to_direction_timestamp' }
);
```

#### C. Pagination Implementation
**Before**: Loading all vendors at once
**After**: Paginated response with configurable limits
```javascript
// Query parameters
const page = parseInt(req.query.page) || 1;
const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
const skip = (page - 1) * limit;

// Response format
{
  vendors: [...],
  pagination: {
    page: 1,
    limit: 50,
    total: 114,
    pages: 3,
    hasNext: true,
    hasPrev: false
  },
  performance: {
    duration: "150ms",
    optimized: true
  }
}
```

#### D. Field Projection
Only return necessary fields to reduce data transfer:
```javascript
{
  $project: {
    _id: 1,
    phone: 1,
    lastSeen: 1,
    daysInactive: 1,
    reminderStatus: 1,
    reminderSentAt: 1,
    name: '$vendor.name'
  }
}
```

### 2. Frontend Optimizations

#### A. Contact Caching with React Context
**Problem**: Double contacts fetch (2.90s + 4.41s)
**Solution**: Implemented `ContactsContext` with 5-minute cache

```typescript
// ContactsContext.tsx
export const ContactsProvider: React.FC<ContactsProviderProps> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchContacts = async (forceRefresh = false) => {
    const now = Date.now();
    
    // Use cached data if still valid
    if (!forceRefresh && contacts.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('📋 Using cached contacts data');
      return;
    }
    // ... fetch from API
  };
};
```

#### B. Updated AdminLayout
Removed direct contacts fetch, now uses cached context:
```typescript
// Before: Direct fetch in AdminLayout
useEffect(() => {
  const fetchContacts = async () => {
    const response = await fetch(`${apiBaseUrl}/api/contacts`);
    // ... handle response
  };
  fetchContacts();
}, []);

// After: Use cached contacts
const { contacts, loading: contactsLoading, error: contactsError } = useContacts();
```

#### C. Enhanced InactiveVendors Component
- Added pagination support
- Performance metrics display
- Better error handling
- Loading states
- Backward compatibility with old API format

```typescript
// Handle both old and new API formats
if (data.vendors && data.pagination) {
  // New optimized API format
  setVendors(data.vendors);
  setPagination(data.pagination);
  setPerformance(data.performance?.duration || `${endTime - startTime}ms`);
} else {
  // Old API format - transform the data
  const transformedData = (data as any).map((vendor: any) => ({
    ...vendor,
    reminderStatus: vendor.reminderStatus || (vendor.templateReceivedAt ? 'Sent' : 'Not sent'),
    reminderSentAt: vendor.reminderSentAt || vendor.templateReceivedAt
  }));
  setVendors(transformedData);
  setPagination(null);
}
```

### 3. Performance Monitoring

#### A. Backend Performance Tracking
```javascript
const startTime = Date.now();
// ... aggregation pipeline
const endTime = Date.now();
const duration = endTime - startTime;

console.log(`✅ Inactive vendors fetched in ${duration}ms - Found: ${inactiveVendors.length}/${totalCount}`);
```

#### B. Frontend Performance Display
```typescript
{performance && (
  <p className="text-sm text-green-600 mt-1">
    ⚡ Loaded in {performance} (optimized)
  </p>
)}
```

## 📊 Expected Performance Improvements

### Before Optimization
- **API Response Time**: 1.4 minutes (84,000ms)
- **Contacts Fetch**: 2.90s + 4.41s = 7.31s
- **Total Load Time**: ~91 seconds
- **Database Queries**: N+1 (hundreds of queries)
- **Data Transfer**: Full vendor objects

### After Optimization
- **API Response Time**: < 1 second (target: 150-500ms)
- **Contacts Fetch**: Cached (0ms after first load)
- **Total Load Time**: < 2 seconds
- **Database Queries**: 1 aggregation pipeline
- **Data Transfer**: Only necessary fields
- **Pagination**: 50 vendors per page

### Performance Improvement
- **Expected Improvement**: 95%+ faster loading
- **From 91 seconds to < 2 seconds**
- **Database load reduced by 99%**

## 🚀 Deployment Steps

### 1. Backend Deployment
1. Deploy updated `server/routes/webhook.ts` with optimized endpoint
2. Run index creation script: `npx tsx scripts/create-indexes.js`
3. Monitor performance logs

### 2. Frontend Deployment
1. Deploy updated components:
   - `src/pages/InactiveVendors.tsx`
   - `src/components/AdminLayout.tsx`
   - `src/App.tsx`
   - `src/contexts/ContactsContext.tsx`

### 3. Testing
Run performance test: `npx tsx scripts/test-performance-improvements.ts`

## 📋 Files Modified

### Backend Files
1. **`server/routes/webhook.ts`**
   - Optimized `/inactive-vendors` endpoint
   - Added aggregation pipeline
   - Implemented pagination
   - Added performance tracking

2. **`scripts/create-indexes.js`**
   - Database index creation script

### Frontend Files
1. **`src/pages/InactiveVendors.tsx`**
   - Added pagination support
   - Performance metrics display
   - Backward compatibility

2. **`src/contexts/ContactsContext.tsx`**
   - Contact caching implementation
   - 5-minute cache duration

3. **`src/components/AdminLayout.tsx`**
   - Removed direct contacts fetch
   - Uses cached contacts context

4. **`src/App.tsx`**
   - Wrapped with ContactsProvider

### Test Files
1. **`scripts/test-performance-improvements.ts`**
   - Performance testing script

## 🎯 Success Metrics

- [ ] API response time < 1 second
- [ ] No double contacts fetch
- [ ] Pagination working correctly
- [ ] Reminder status displaying properly
- [ ] Performance metrics visible in UI
- [ ] Backward compatibility maintained

## 🔧 Monitoring

After deployment, monitor:
1. API response times in server logs
2. Frontend performance metrics
3. Database query performance
4. User experience feedback

The optimizations should transform the inactive vendors page from a slow, unusable interface to a fast, responsive dashboard that loads in under 2 seconds.
