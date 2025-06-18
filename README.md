# WhatsApp Admin Dashboard

A React + TypeScript + Vite application for managing WhatsApp conversations through Twilio integration.

## Features

- Admin authentication with JWT
- Real-time WhatsApp message handling via Twilio webhooks
- Contact management and message history
- Send WhatsApp messages through admin interface
- Location sharing support
- Modern UI with Tailwind CSS

## Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account
- Twilio account with WhatsApp Business API access

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
   TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
   TWILIO_PHONE_NUMBER=your_twilio_whatsapp_number_here

   # JWT Secret
   JWT_SECRET=your_jwt_secret_here

   # MongoDB Connection
   MONGODB_URI=your_mongodb_connection_string_here

   # Server Port
   PORT=5000
   ```

### Twilio Setup

1. Sign up for a Twilio account at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Set up WhatsApp Business API:
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Follow the setup instructions to get your WhatsApp number
4. Configure webhook URL in Twilio Console to point to your server's `/api/webhook` endpoint

### Running the Application

1. Start the backend server:
   ```bash
   npm run auth-server
   ```

2. Start the frontend development server:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:5173`

### Default Admin Credentials

- Username: `admin`
- Password: `admin123`

## API Endpoints

- `POST /api/auth` - Admin login
- `GET /api/messages/:phone` - Get messages for a contact
- `POST /api/messages/send` - Send WhatsApp message
- `POST /api/webhook` - Twilio webhook for incoming messages
- `GET /api/contacts` - Get all contacts
- `GET /api/admin` - Admin management endpoints

## Development

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
# whatsappDashboard
