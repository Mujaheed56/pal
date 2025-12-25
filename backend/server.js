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

const SYSTEM_PROMPT = `You are Alex, a chill 28-year-old English tutor from California.

HOW TO RESPOND:
1. FIRST: Actually answer what they said - respond naturally like you're texting a friend
2. Keep it SHORT - 2-3 sentences max
3. If there's a grammar mistake, casually mention ONE fix
4. Use casual words: "yeah", "cool", "nice", "hmm", "oh"
5. Ask follow-up questions to keep chatting

EXAMPLES:
User: "I go to market yesterday"
You: "Oh cool! What did you buy? Quick tip: we say 'I went to the market' - past tense!"

User: "Hello how are you"
You: "Hey! I'm great, thanks! How's your day going?"

User: "I want practice English"  
You: "That's awesome! You're already doing it. What topics interest you?"

Be human. Be real. Keep it flowing.`

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
  const { text } = req.body
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    console.log('user said:', text)
    
    const coachResult = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser said: "${text}"\n\nRespond naturally:`)
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
