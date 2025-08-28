import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface Contact {
  _id: string;
  phone: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
}

interface ContactsContextType {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  refreshContacts: () => Promise<void>;
  getContactByPhone: (phone: string) => Contact | undefined;
}

const ContactsContext = createContext<ContactsContextType | undefined>(undefined);

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};

interface ContactsProviderProps {
  children: ReactNode;
}

export const ContactsProvider: React.FC<ContactsProviderProps> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cache duration: 10 minutes (increased for better performance)
  const CACHE_DURATION = 10 * 60 * 1000;

  const fetchContacts = async (forceRefresh = false) => {
    const now = Date.now();
    
    // Check if we have cached data and it's still valid
    if (!forceRefresh && contacts.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('📋 Using cached contacts data');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Fetching contacts from API...');
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${apiBaseUrl}/api/contacts`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setContacts(data);
      setLastFetch(now);
      
      console.log(`✅ Fetched ${data.length} contacts`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contacts';
      setError(errorMessage);
      console.error('❌ Error fetching contacts:', errorMessage);
      
      // If it's a timeout error, show a more user-friendly message
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshContacts = async () => {
    await fetchContacts(true);
  };

  const getContactByPhone = (phone: string): Contact | undefined => {
    return contacts.find(contact => contact.phone === phone);
  };

  // Initialize contacts on mount with delay to prevent blocking initial render
  useEffect(() => {
    if (!isInitialized) {
      // Small delay to prevent blocking initial page load
      const timer = setTimeout(() => {
        fetchContacts();
        setIsInitialized(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  const value: ContactsContextType = {
    contacts,
    loading,
    error,
    refreshContacts,
    getContactByPhone,
  };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};
