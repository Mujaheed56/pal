import { useState, useRef, useEffect } from 'react'

function App() {
  const [micOn, setMicOn] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [talking, setTalking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const audioRef = useRef(new Audio())
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    // setup speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        console.log('listening... speak now!')
        setMicOn(true)
      }
      
      recognition.onresult = (event) => {
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            console.log('final:', transcript)
            setTranscript('')
            setMicOn(false)
            if (transcript.trim()) {
              sendText(transcript.trim())
            }
          } else {
            console.log('interim:', transcript)
            setTranscript(transcript)
          }
        }
      }
      
      recognition.onerror = (event) => {
        console.log('error:', event.error)
        setMicOn(false)
        setTranscript('')
        
        if (event.error === 'not-allowed') {
          alert('Mic access denied. Check browser permissions.')
        } else if (event.error === 'no-speech') {
          alert('No speech detected. Make sure:\n1. Your mic is working\n2. You speak clearly\n3. Try speaking immediately after clicking')
        } else {
          alert('Speech error: ' + event.error)
        }
      }
      
      recognition.onend = () => {
        console.log('recognition stopped')
        setMicOn(false)
        setTranscript('')
      }
      
      recognitionRef.current = recognition
    } else {
      console.log('speech recognition not supported')
      alert('Your browser does not support speech recognition. Use Chrome or Edge.')
    }
  }, [])

  const startRec = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser')
      return
    }
    
    try {
      // explicitly request and test mic
      console.log('requesting mic access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('mic access granted, audio tracks:', stream.getAudioTracks().length)
      
      // check if mic is actually working
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      source.connect(analyser)
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteTimeDomainData(dataArray)
      console.log('mic test data:', dataArray.slice(0, 10))
      
      // clean up test
      stream.getTracks().forEach(track => track.stop())
      
      // now start speech recognition
      recognitionRef.current.start()
      console.log('speech recognition started')
    } catch (err) {
      console.log('mic error:', err)
      alert('Cannot access microphone: ' + err.message)
    }
  }

  const stopRec = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const toggleMic = () => {
    if (micOn) {
      stopRec()
    } else {
      startRec()
    }
  }

  const sendText = async (text) => {
    setTalking(true)
    
    // add user msg
    setMsgs(prev => [...prev, { 
      role: 'user', 
      text 
    }])
    
    try {
      console.log('sending to:', `${import.meta.env.VITE_API_URL}/speak`)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      
      console.log('response status:', res.status)
      
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      
      const data = await res.json()
      console.log('got response:', data)
      
      // add ai msg
      setMsgs(prev => [...prev, { 
        role: 'ai', 
        text: data.reply 
      }])
      
      // play audio from elevenlabs
      if (data.audioBase64) {
        console.log('playing audio...')
        const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg')
        const audioUrl = URL.createObjectURL(audioBlob)
        audioRef.current.src = audioUrl
        audioRef.current.volume = 0.8
        audioRef.current.play().catch(e => console.log('audio play err:', e))
      } else {
        console.log('no audio from server')
      }
      
      setTalking(false)
    } catch (err) {
      console.log('send err:', err)
      alert('Error: ' + err.message)
      setTalking(false)
    }
  }

  const base64ToBlob = (base64, type) => {
    const binStr = atob(base64)
    const len = binStr.length
    const arr = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i)
    }
    return new Blob([arr], { type })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-400 flex flex-col">
      {/* chat area */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {msgs.length === 0 && !transcript && (
          <div className="text-center text-white/80 mt-20 text-lg">
            Statrt speaking by tapping the mic below
          </div>
        )}
        
        {/* show live transcript */}
        {transcript && (
          <div className="text-center text-white/90 mt-10 text-xl font-semibold px-4">
            {transcript}
          </div>
        )}
        
        <div className="max-w-2xl mx-auto space-y-3">
          {msgs.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-white/90 text-gray-800' 
                    : 'bg-purple-700/90 text-white'
                }`}
              >
                <p className="text-sm md:text-base">{msg.text}</p>
              </div>
            </div>
          ))}
          
          {talking && (
            <div className="flex justify-start">
              <div className="bg-purple-700/90 text-white px-4 py-3 rounded-2xl">
                <p className="text-sm">thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* mic button */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={toggleMic}
          disabled={talking}
          className={`w-20 h-20 rounded-full shadow-2xl transition-all transform ${
            micOn 
              ? 'bg-red-500 scale-110 animate-pulse' 
              : talking 
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-white hover:scale-105'
          }`}
        >
          {micOn ? (
            <div className="text-white text-xs font-bold">LISTENING</div>
          ) : (
            <svg 
              className={`w-10 h-10 mx-auto ${talking ? 'text-gray-600' : 'text-purple-600'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" 
                clipRule="evenodd" 
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default App
