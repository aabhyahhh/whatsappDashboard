✅ WhatsApp Admin Dashboard MVP – Task Plan
Each task is:

Small and testable

Focused on one concern

Ordered logically for iterative builds

🧱 PHASE 1: Setup & Scaffolding
Task 1: Initialize reactjs + vite App
Start: Create a new vite project
End: Running next dev shows a blank homepage

Task 2: Install Tailwind CSS
Start: Tailwind is not installed
End: Tailwind classes apply and render on page (bg-blue-500 test)

Task 3: Create Admin Login Page at /login
Start: Route doesn't exist
End: Visiting /login renders a login form with email + password fields

Task 4: Build Custom JWT Auth (Hardcoded Admin)
Start: Login form submits nothing
End: POST /api/auth checks hardcoded admin creds → returns JWT

Task 5: Store JWT in HttpOnly Cookie After Login
Start: JWT is returned but not stored
End: JWT is set in browser cookie after login

Task 6: Create Middleware to Protect /dashboard
Start: All routes are accessible
End: Visiting /dashboard without valid JWT redirects to /login

📦 PHASE 2: MongoDB Setup + Message Model
Task 7: Connect to MongoDB Atlas Using Mongoose
Start: No DB connection
End: API can read/write to test collection in MongoDB

Task 8: Define Mongoose Message Schema
Start: No models defined
End: models/Message.ts stores sender, receiver, body, direction, timestamp

Task 9: Create Contact Schema with Phone + LastSeen
Start: No contacts model
End: models/Contact.ts tracks unique phone numbers

📬 PHASE 3: Webhook & Inbound Message Handling
Task 10: Create /api/webhook Route to Receive Twilio Messages
Start: Webhook doesn't exist
End: Twilio can POST messages to /api/webhook, returns 200 OK

Task 11: Parse From, Body, Timestamp from Webhook
Start: Raw Twilio message logged
End: Extracted fields are logged + validated

Task 12: Save Inbound Message to messages Collection
Start: Message is only logged
End: Valid message is inserted into MongoDB

Task 13: Upsert Contact in contacts Collection
Start: No contact is saved
End: Contact with phone and lastSeen is created/updated

Task 14: Extract and Save Location if Message Contains Google Maps Link
Start: Location not handled
End: If message has ?q=lat,lng, it’s saved to message.location

🧑‍💼 PHASE 4: Admin Dashboard UI
Task 15: Create /dashboard Route with Sidebar
Start: Blank page
End: Renders protected admin layout + sidebar nav

Task 16: Build Contact List in Sidebar from MongoDB
Start: No contacts visible
End: Sidebar shows list of unique phone numbers (with lastSeen)

Task 17: Create Chat View at /dashboard/[phone]
Start: Clicking a contact does nothing
End: Route loads message thread for that number

Task 18: Fetch Messages by Contact on Page Load
Start: Chat window is empty
End: All messages (sorted chronologically) are shown

Task 19: Style Messages Like WhatsApp (Left/Right Bubbles)
Start: Plain text list
End: Inbound/outbound messages styled in distinct bubbles

📤 PHASE 5: Reply + Send via Twilio
Task 20: Add Message Input Box with Send Button
Start: No input available
End: Admin can type message in text box under chat

Task 21: Create /api/send to Send WhatsApp Message via Twilio
Start: Message not sent
End: API sends message using Twilio + logs to console

Task 22: Save Outbound Message to MongoDB
Start: Only Twilio sends it
End: Sent message also inserted into messages with direction: outbound

Task 23: Auto-refresh Chat Window After Sending
Start: Message appears only after manual reload
End: Chat updates immediately after sending

Task 24: Add Timestamp and Location Preview to Message UI
Start: No metadata
End: Message shows time + opens location in Leaflet/Google Maps if present

🧹 PHASE 6: Polish & Final Testing
Task 25: Add Logout Button + JWT Clear
Start: No way to logout
End: Clicking logout removes cookie + redirects to /login

Task 26: Seed DB with Sample Inbound Messages (Optional)
Start: DB is empty
End: Test data is available for demo/testing

Task 27: Set Up Error Handling + Loading States
Start: Raw errors and empty states
End: Proper loading spinners, error messages, empty inbox views

Task 28: Deploy to Vercel / Railway / Render
Start: Local only
End: Live, secure deployment with .env configured

