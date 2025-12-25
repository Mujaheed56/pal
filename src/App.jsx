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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        setMicOn(true)
      }
      
      recognition.onresult = (event) => {
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setTranscript('')
            setMicOn(false)
            if (transcript.trim()) {
              sendText(transcript.trim())
            }
          } else {
            setTranscript(transcript)
          }
        }
      }
      
      recognition.onerror = (event) => {
        setMicOn(false)
        setTranscript('')
        
        if (event.error === 'not-allowed') {
          alert('Mic access denied. Check browser permissions.')
        } else if (event.error === 'no-speech') {
          alert('No speech detected. Make sure your mic is working.')
        } else {
          alert('Speech error: ' + event.error)
        }
      }
      
      recognition.onend = () => {
        setMicOn(false)
        setTranscript('')
      }
      
      recognitionRef.current = recognition
    } else {
      alert('Your browser does not support speech recognition. Use Chrome or Edge.')
    }
  }, [])

  const startRec = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser')
      return
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      
      recognitionRef.current.start()
    } catch (err) {
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
    const newUserMsg = { role: 'user', text }
    const updatedMsgs = [...msgs, newUserMsg]
    setMsgs(updatedMsgs)
    
    try {
      console.log('sending to:', `${import.meta.env.VITE_API_URL}/speak`)
      console.log('sending history:', updatedMsgs.length, 'messages')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          history: updatedMsgs
        })
      })
      
      console.log('response status:', res.status)
      
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      
      const data = await res.json()
      
      setMsgs(prev => [...prev, { 
        role: 'ai', 
        text: data.reply 
      }])
      
      if (data.audioBase64) {
        const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg')
        const audioUrl = URL.createObjectURL(audioBlob)
        audioRef.current.src = audioUrl
        audioRef.current.volume = 0.8
        audioRef.current.play().catch(e => console.log('audio play err:', e))
      }
      
      setTalking(false)
    } catch (err) {
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex flex-col">
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
              <span className="text-2xl">🗣️</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg md:text-xl">PronuncePal</h1>
              <p className="text-white/70 text-xs">Practice English with AI</p>
            </div>
          </div>
          {msgs.length > 0 && (
            <button 
              onClick={() => setMsgs([])}
              className="text-white/80 hover:text-white text-sm px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-36">
        {msgs.length === 0 && !transcript && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-12 max-w-md">
              <div className="text-6xl mb-4">🎤</div>
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-3">
                Ready to Practice?
              </h2>
              <p className="text-white/80 text-base md:text-lg mb-6">
                Tap the mic and start speaking in English. I'll help you improve!
              </p>
              <div className="flex flex-col gap-2 text-white/70 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Real-time feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Grammar corrections</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  <span>Natural conversations</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {transcript && (
          <div className="flex justify-center mb-6">
            <div className="bg-white/20 backdrop-blur-md text-white px-6 py-4 rounded-2xl max-w-lg shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-white/70">Listening...</span>
              </div>
              <p className="text-lg font-medium">{transcript}</p>
            </div>
          </div>
        )}
        
        <div className="max-w-3xl mx-auto space-y-4">
          {msgs.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div 
                className={`flex gap-2 max-w-[85%] md:max-w-[70%] ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-white/90' : 'bg-purple-600'
                }`}>
                  <span className="text-sm">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </span>
                </div>
                <div 
                  className={`px-4 py-3 rounded-2xl shadow-lg ${
                    msg.role === 'user' 
                      ? 'bg-white/95 text-gray-800 rounded-tr-sm' 
                      : 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}
          
          {talking && (
            <div className="flex justify-start animate-fadeIn">
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🤖</span>
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/20 to-transparent pt-8 pb-6">
        <div className="flex justify-center">
          <button
            onClick={toggleMic}
            disabled={talking}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full shadow-2xl transition-all transform relative ${
              micOn 
                ? 'bg-gradient-to-br from-red-500 to-red-600 scale-110' 
                : talking 
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-white hover:scale-110 hover:shadow-3xl'
            }`}
          >
            {micOn && (
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
            )}
            <div className="relative">
              {micOn ? (
                <svg className="w-8 h-8 md:w-10 md:h-10 mx-auto text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg 
                  className={`w-8 h-8 md:w-10 md:h-10 mx-auto ${talking ? 'text-gray-600' : 'text-purple-600'}`} 
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
            </div>
          </button>
        </div>
        {!micOn && !talking && (
          <p className="text-center text-white/70 text-sm mt-3">Tap to speak</p>
        )}
        {micOn && (
          <p className="text-center text-white font-medium text-sm mt-3 animate-pulse">Listening... Tap to stop</p>
        )}
      </div>
    </div>
  )
}

export default App
