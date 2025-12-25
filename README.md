# PronouncePal 🎤

A voice-driven English speaking practice app that helps non-native speakers improve their conversational English skills through AI-powered coaching.

## What it does

PronouncePal is a fully voice-based English learning app where you:
- **Talk naturally** - Just click the mic and speak
- **Get instant feedback** - AI coach responds with corrections and encouragement
- **Practice conversations** - Have real dialogues, not scripted exercises
- **Hear native pronunciation** - AI speaks back with natural voice

The AI coach remembers your conversation and provides gentle grammar corrections while keeping things fun and engaging.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **AI**: Google Gemini 2.5 Flash
- **Voice**: Web Speech API + ElevenLabs TTS
- **Deployment**: Vercel

## Setup Locally

### 1. Clone the repo
```bash
git clone https://github.com/Mujaheed56/pal.git
cd pal
```

### 2. Install dependencies
```bash
npm install
cd backend
npm install
cd ..
```

### 3. Setup environment variables

Create `.env` in root:
```env
VITE_API_URL=http://localhost:5000/api
```

Create `backend/.env`:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 4. Run the app

Terminal 1 - Frontend:
Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Backend:
```bash
cd backend
node server.js
```

Open http://localhost:3000 and start speaking!

## Get API Keys

- **Gemini API**: https://aistudio.google.com/app/apikey
- **ElevenLabs**: https://elevenlabs.io (free tier available)

## How to use

1. Click the microphone button
2. Allow mic permissions
3. Speak naturally in English
4. Listen to AI coach's response
5. Keep the conversation going!

## Features

✅ Real-time speech recognition  
✅ Natural AI conversations  
✅ Grammar corrections  
✅ Text-to-speech responses  
✅ Conversation memory  
✅ Mobile responsive  

Built for hackathon 🚀
