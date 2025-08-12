import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface Contact {
  _id: string;
  name: string;
  phone: string;
  lastSeen: string;
  // Add other contact fields as needed
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

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

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
      const response = await fetch(`${apiBaseUrl}/api/webhook/contacts`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      const data = await response.json();
      setContacts(data);
      setLastFetch(now);
      
      console.log(`✅ Fetched ${data.length} contacts`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contacts';
      setError(errorMessage);
      console.error('❌ Error fetching contacts:', errorMessage);
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

  // Initialize contacts on mount
  useEffect(() => {
    if (!isInitialized) {
      fetchContacts();
      setIsInitialized(true);
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
