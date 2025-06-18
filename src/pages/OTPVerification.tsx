import { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';

interface OTPResponse {
  success: boolean;
  message: string;
  otp?: string;
}

export default function OTPVerification() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [showVerification, setShowVerification] = useState(false);
  const [sentOTP, setSentOTP] = useState('');
  const navigate = useNavigate();

  const handleSendOTP = async () => {
    if (!phone) {
      setMessage('Please enter a phone number');
      setMessageType('error');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setMessage('Please enter a valid phone number');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/verify/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phone.replace(/\s/g, '') }),
      });

      const data: OTPResponse = await response.json();

      if (data.success) {
        setMessage(data.message);
        setMessageType('success');
        setShowVerification(true);
        // Store the OTP for verification (in development mode)
        if (data.otp) {
          setSentOTP(data.otp);
        }
      } else {
        setMessage(data.message || 'Failed to send OTP');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      setMessage('Please enter the OTP');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/verify/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone.replace(/\s/g, ''),
          otp 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Phone number verified successfully!');
        setMessageType('success');
        setShowVerification(false);
        setPhone('');
        setOtp('');
        setSentOTP('');
        // Redirect to User Management with phone and verified status
        navigate('/users', { state: { phone, verified: true } });
      } else {
        setMessage(data.error || 'Invalid OTP');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const clearMessage = () => {
    setMessage('');
    setMessageType('');
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">WhatsApp OTP Verification</h1>
          <p className="text-gray-600">
            Send and verify OTP codes to WhatsApp numbers for authentication
          </p>
        </div>

        {/* Phone Number Input */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Send OTP</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearMessage();
                }}
                placeholder="+1234567890"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter phone number with country code (e.g., +1234567890)
              </p>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading || !phone}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending OTP...
                </span>
              ) : (
                'Send OTP via WhatsApp'
              )}
            </button>
          </div>
        </div>

        {/* OTP Verification */}
        {showVerification && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Verify OTP</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    clearMessage();
                  }}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code sent to your WhatsApp
                </p>
              </div>

              {/* Development Mode OTP Display */}
              {sentOTP && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Development Mode:</strong> OTP sent to {phone}: <code className="bg-yellow-100 px-2 py-1 rounded">{sentOTP}</code>
                  </p>
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={loading || !otp}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </span>
                ) : (
                  'Verify OTP'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`rounded-lg p-4 ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <span>{message}</span>
              <button
                onClick={clearMessage}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">How it works</h3>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-start">
              <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
              <p>Enter the phone number with country code (e.g., +1234567890)</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
              <p>Click "Send OTP via WhatsApp" to receive a 6-digit code</p>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
              <p>Enter the OTP code and click "Verify OTP" to complete verification</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 