# Messenger WebView PSID Display

A React application that displays the PSID (Page-Scoped ID) of users who access it through Facebook Messenger's webview.

## Features

- Displays user's PSID when accessed through Messenger
- Mobile-responsive design
- Simple and clean interface

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- A Facebook Messenger bot
- HTTPS hosting for production

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd messenger-webview
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
# or
npm run dev
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the contents of the `build` folder to your HTTPS server.

## Messenger Integration

1. Whitelist your domain in your Messenger app settings
2. Create a button or link in your Messenger bot that opens this webview
3. The webview will automatically display the PSID of the user who clicks the link

## Development

The application is built with:
- React 18
- Create React App
- Facebook Messenger Extensions SDK

## License

MIT 