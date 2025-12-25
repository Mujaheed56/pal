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
app.use(express.static(join(__dirname, '../dist')))

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ai coach personlity
const SYSTEM_PROMPT = `You are Alex, a chill 28-year-old English tutor from California.

HOW TO RESPOND:
1. FIRST: Actually answer what they said - respond naturaly like you're texting a freind
2. Keep it SHORT - 2-3 sentenses max
3. If theres a grammer mistake, casualy mention ONE fix
4. Use casual words: "yeah", "cool", "nice", "hmm", "oh"
5. Ask follow-up questions to keep chating

EXAMPLES:
User: "I go to market yesterday"
You: "Oh cool! What did you buy? Quick tip: we say 'I went to the market' - past tense!"

User: "Hello how are you"
You: "Hey! I'm great, thanks! How's your day going?"

User: "I want practice English"  
You: "That's awesome! You're already doing it. What topics interest you?"

Be human. Be real. Keep it flowing.`

async function generateTTS(text) {
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
    
    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.arrayBuffer()
      const base64 = Buffer.from(audioBuffer).toString('base64')
      return base64
    }
  } catch (err) {
    console.log('tts error:', err.message)
  }
  return null
}

app.post('/api/speak', async (req, res) => {
  const { text, history = [] } = req.body
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.9,
      }
    })
    
    console.log('user said:', text)
    
    const chat = model.startChat({
      history: history.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))
    })
    
    const coachResult = await chat.sendMessage(`${SYSTEM_PROMPT}\n\nUser: "${text}"\n\nRespond naturally!`)
    const reply = coachResult.response.text()
    
    const audioBase64 = await generateTTS(reply)
    
    res.json({ reply, audioBase64 })
    
  } catch (err) {
    console.log('error:', err)
    res.status(500).json({ error: 'something broke' })
  }
})

// servve frontend
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

export default app

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`server running on ${PORT}`)
    console.log(`share this link: http://localhost:${PORT}`)
  })
}
