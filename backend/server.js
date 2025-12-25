import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// serve frontend dist folder
app.use(express.static(join(__dirname, '../dist')))

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const SYSTEM_PROMPT = `You are a friendly English speaking coach having a real conversation.

CRITICAL RULES:
1. ACTUALLY RESPOND to what the user said - answer their questions, react to their topics, continue their conversation naturally
2. DO NOT give generic praise like "that's great" or "well done" - be specific and genuine
3. If they ask a question, ANSWER IT
4. If they tell you something, RESPOND naturally like a real person would
5. Keep your responses SHORT (1-2 sentences max)
6. After responding naturally, add ONE gentle correction IF there's an obvious grammar or pronunciation mistake
7. Use casual, conversational language - speak like texting a friend

Bad response: "That's great! Keep practicing!"
Good response: "Yeah, pizza is amazing! I love pepperoni. Quick tip: say 'I like' not 'I am like'."

Bad response: "Nice work! You're improving!"
Good response: "Wednesday works for me too. By the way, it's 'works' not 'work' when talking about one day."

STAY ON TOPIC. If they're talking about movies, talk about movies. If they're asking about weather, answer about weather.`

async function generateTTS(text) {
  console.log('generating tts for:', text.substring(0, 50))
  try {
    const ttsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75
        }
      })
    })
    
    console.log('tts response status:', ttsResponse.status)
    
    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.arrayBuffer()
      const base64 = Buffer.from(audioBuffer).toString('base64')
      console.log('tts audio generated, size:', base64.length)
      return base64
    }
    const errorText = await ttsResponse.text()
    console.log('elevenlabs failed:', ttsResponse.status, errorText)
  } catch (err) {
    console.log('tts error:', err.message)
  }
  return null
}

app.post('/api/speak', async (req, res) => {
  const { text, history = [] } = req.body
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    console.log('user said:', text)
    console.log('conversation history:', history.length, 'messages')
    
    // Start a chat with history
    const chat = model.startChat({
      history: history.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      generationConfig: {
        maxOutputTokens: 200,
      },
    })
    
    const coachResult = await chat.sendMessage(`${SYSTEM_PROMPT}\n\nUser said: "${text}"\n\nRespond naturally to what they said. Be conversational, not robotic. If there's a grammar mistake, mention it casually at the end.`)
    const reply = coachResult.response.text()
    console.log('ai reply:', reply)
    
    // generate speech with elevenlabs
    const audioBase64 = await generateTTS(reply)
    
    res.json({
      reply,
      audioBase64
    })
    
  } catch (err) {
    console.log('error:', err)
    res.status(500).json({ error: 'something broke' })
  }
})

// serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

// export for vercel
export default app

// local server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`server running on ${PORT}`)
    console.log(`share this link: http://localhost:${PORT}`)
  })
}
