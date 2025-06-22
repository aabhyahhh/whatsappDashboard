import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

interface Message {
  _id: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  location?: { latitude: number; longitude: number };
}

export default function ChatView() {
  const { phone } = useParams<{ phone: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!phone) return;

      try {
        setLoading(true);
        const response = await fetch(`${apiBaseUrl}/api/messages/${phone}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch messages');
        }

        const data: Message[] = await response.json();
        setMessages(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setMessages([]); // Clear messages on error
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [phone]);

  useEffect(() => {
    // Scroll to the bottom of the chat when messages load or update
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !phone || sending) return;

    try {
      setSending(true);
      const response = await fetch(`${apiBaseUrl}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          body: newMessage.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      // Clear the input field after successful send
      setNewMessage('');
      
      // Note: In Task 23, we'll add auto-refresh functionality
      // For now, the message will appear after manual refresh
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium mr-3">
            {phone?.slice(-2)}
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Chat with {phone}</h1>
        </div>

        {/* Messages Display */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p>No messages yet with {phone}.</p>
              <p>Start a conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow-sm ${msg.direction === 'inbound'
                    ? 'bg-gray-100 text-gray-800 rounded-bl-none'
                    : 'bg-blue-600 text-white rounded-br-none'
                  }`}
                >
                  <p className="text-sm mb-1">{msg.body}</p>
                  {msg.location && (
                    <div className="mt-2 text-xs text-blue-600">
                      <a 
                        href={`https://maps.google.com/?q=${msg.location.latitude},${msg.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-800"
                      >
                        📍 View Location ({msg.location.latitude.toFixed(4)}, {msg.location.longitude.toFixed(4)})
                      </a>
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${msg.direction === 'inbound' ? 'text-gray-600' : 'text-blue-100'}`}>
                    {formatTimestamp(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                newMessage.trim() && !sending
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 