import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fetch from 'node-fetch'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
    
    const coachResult = await chat.sendMessage(`${SYSTEM_PROMPT}\n\nUser said: "${text}"\n\nProvide a friendly response with feedback based on our conversation history.`)
    const reply = coachResult.response.text()
    console.log('ai reply:', reply)
    
    const audioBase64 = await generateTTS(reply)
    
    res.json({
      reply,
      audioBase64
    })
    
  } catch (err) {
    console.log('error:', err)
    res.status(500).json({ error: 'something broke' })
  }
}
