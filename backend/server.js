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

const SYSTEM_PROMPT = `You are a friendly English speaking coach.
You sound like a calm human tutor, not a robot.
Keep responses short and encouraging.

When the user speaks:
1. Reply naturally to what they said.
2. Point out ONLY one grammar mistake if any.
3. Point out ONLY one pronunciation issue if any.
4. Be gentle and supportive.
5. Do not over-explain.
6. Avoid technical phonetics terms.
7. Never shame the user.
8. Keep it conversational.

Example style:
"Nice try! Small fix: instead of 'I am want', say 'I want'. Also, try to pronounce 'this' with your tongue slightly between your teeth. Want to try again?"

Do not mention rules or analysis.`

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
    
    // get ai response with coaching
    const coachResult = await model.generateContent([
      SYSTEM_PROMPT,
      `User said: "${text}"\n\nProvide a friendly response with feedback.`
    ])
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

const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`server running on ${PORT}`)
  console.log(`share this link: http://localhost:${PORT}`)
})
