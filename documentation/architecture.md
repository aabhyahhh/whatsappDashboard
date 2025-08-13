🛠️ WhatsApp Admin Dashboard Architecture (Twilio + TypeScript + MongoDB)
A private dashboard to:

View WhatsApp conversations by contact (like a chat app)

Reply to each message via Twilio

Parse location data from shared location links or lat/lng

Only allow admin users to access the system

⚙️ Tech Stack
Layer	Tech
Frontend	react.js (TypeScript, App Router)
UI Framework	Tailwind CSS
State Mgmt	React Context / Zustand
Backend	react.js API Routes or Express
Auth	MongoDB with JWT (admin only)
Messaging	Twilio WhatsApp API
DB	MongoDB Atlas
Map Rendering	Leaflet.js
Hosting	Vercel (frontend), Render (backend)

📁 File & Folder Structure
whatsapp-admin-dashboard/
│
├── app/                        # Next.js App Router
│   ├── layout.tsx
│   ├── login/                  # Admin login page
│   │   └── page.tsx
│   ├── dashboard/              # Main chat dashboard (admin protected)
│   │   ├── page.tsx
│   │   └── [phone]/page.tsx    # Individual chat view by contact
│
├── components/                 # Reusable components
│   ├── ContactList.tsx         # List of all contacts
│   ├── ChatWindow.tsx          # Message thread UI
│   ├── MessageInput.tsx        # Reply input form
│   ├── LocationMap.tsx         # Map preview for shared location
│
├── lib/                        # Utility & service logic
│   ├── twilio.ts               # Send/reply to WhatsApp messages
│   ├── auth.ts                 # JWT-based admin auth
│   ├── parseLocation.ts        # Extract lat/lng from message
│   ├── api.ts                  # Axios/fetch wrappers
│
├── models/                     # MongoDB schemas (via Mongoose)
│   ├── Message.ts
│   └── Contact.ts
│
├── pages/api/                  # API Routes
│   ├── webhook.ts              # Twilio inbound message webhook
│   ├── send.ts                 # Send message from dashboard
│   └── auth.ts                 # Admin login, JWT issue
│
├── middleware.ts               # Auth middleware for admin routes
├── .env.local                  # Secrets (Twilio, MongoDB, JWT)
├── next.config.js
├── tailwind.config.js
└── README.md
🧠 What Each Part Does
🔸 app/
login/page.tsx: Admin login form

dashboard/page.tsx: Contact list and conversation summary

dashboard/[phone]/page.tsx: Full WhatsApp-style chat view per contact

🔸 components/
ContactList.tsx: Shows all unique phone numbers from messages collection

ChatWindow.tsx: Scrollable thread of inbound/outbound messages

MessageInput.tsx: Admin input field to send replies

LocationMap.tsx: Render pin on map if message contains location

🔸 lib/
twilio.ts: Uses Twilio SDK to send WhatsApp messages

auth.ts: Handles JWT validation for admin session

parseLocation.ts: Extracts lat/lng from messages like:
https://maps.google.com/?q=18.5204,73.8567

api.ts: Handles client-side requests to /api/send, /api/messages, etc.

🔸 models/
Message.ts: Stores all WhatsApp messages:

ts
Copy
Edit
{
  from: string,
  to: string,
  body: string,
  timestamp: Date,
  direction: 'inbound' | 'outbound',
  location?: { lat: number, lng: number }
}
Contact.ts: Stores contact-specific data like:

ts
Copy
Edit
{
  phone: string,
  lastSeen: Date,
  latestMessage: string
}
🔸 pages/api/
webhook.ts:

Twilio sends messages here via POST

Save to MongoDB

If body contains Google Maps link → extract and store lat/lng

send.ts:

Accepts admin message from frontend

Uses Twilio to send WhatsApp message

Saves to DB as outbound

auth.ts:

Handles admin login and JWT issuing

Only one hardcoded admin account if needed

🔸 middleware.ts
Protects all /dashboard/* routes

Redirects to /login if JWT is invalid or missing

📊 Where State Lives
State	Lives In
Auth session (admin)	JWT cookie (browser), decoded in middleware
Message list (per contact)	MongoDB messages collection
Contact list	MongoDB contacts collection
Current chat window	React state (useParams, useState)
Parsed location	MongoDB location field (optional)
Send input	useState in MessageInput.tsx

🔌 How Services Connect
🔁 Message Flow
plaintext
Copy
Edit
[User sends WhatsApp message]
      ↓
[Twilio Webhook POST /api/webhook]
      ↓
[Parse + store to MongoDB (message + optional location)]
      ↓
[Admin dashboard fetches messages via /api/messages?phone=xxx]
📤 Reply Flow
plaintext
Copy
Edit
[Admin types reply in MessageInput]
      ↓
[POST /api/send → includes phone + message]
      ↓
[Twilio API sends message]
      ↓
[Save message to MongoDB as outbound]
🧪 Example Location Parsing (parseLocation.ts)
ts
Copy
Edit
export function extractLatLng(text: string): { lat: number, lng: number } | null {
  const match = text.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!match) return null;
  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
}
🔐 Auth Strategy (Admin-Only)
Single admin account stored in .env:

env
Copy
Edit
ADMIN_EMAIL=admin@laarikhojo.com
ADMIN_PASSWORD=supersecret
JWT_SECRET=your_jwt_secret
POST /api/auth returns a JWT

JWT stored in httpOnly cookie

Middleware protects all /dashboard/* routes

✅ Summary
Feature	Tool
Chat UI like WhatsApp	ChatWindow, per-contact view
Real-time messages	Via Twilio webhook ➝ MongoDB
Replies	MessageInput + /api/send
Admin login	Custom JWT
Location support	Google Maps link parsing + Leaflet.js display
Data storage	MongoDB Atlas (messages, contacts)