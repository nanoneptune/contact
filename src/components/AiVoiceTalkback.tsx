import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Bot,
  User,
  Radio,
  RefreshCw,
  Globe,
  Zap,
  CheckCircle2,
  Languages,
  Play,
  Pause,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Compass,
} from 'lucide-react';
import { Contact } from '../types';

interface AiVoiceTalkbackProps {
  contacts: Contact[];
  onSelectEmailContact?: (email: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

type SupportedLanguage = 'kn-IN' | 'hi-IN' | 'en-IN';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  subtext: string;
  sampleGreeting: string;
  presets: string[];
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    subtext: 'ಕರ್ನಾಟಕ ಧ್ವನಿ ಗ್ರಹಿಕೆ ಹಾಗೂ Sarvam AI ಕನ್ನಡ Talkback',
    sampleGreeting: 'ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ AI ಧ್ವನಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಸಂಪರ್ಕಗಳ ಬಗ್ಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ!',
    presets: [
      '👋 ನಮಸ್ಕಾರ! ನನ್ನ ಎಲ್ಲಾ ಸಂಪರ್ಕಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡಿ',
      '🔍 ಬೆಂಗಳೂರಿನಲ್ಲಿ ಯಾರು ಇದ್ದಾರೆ?',
      '📝 ನನ್ನ ಸಂಪರ್ಕಗಳಿಗೆ ಇಮೇಲ್ ಡ್ರಾಫ್ಟ್ ಮಾಡಿ',
      '📊 ಸಂಪರ್ಕಗಳ ವಿವರಗಳ ಸಾರಾಂಶ ಹೇಳಿ',
    ],
  },
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
    subtext: 'हिंदी आवाज़ पहचान एवं Sarvam AI हिंदी Talkback',
    sampleGreeting: 'नमस्ते! 👋 मैं आपका AI वॉयस असिस्टेंट हूं। अपने संपर्कों के बारे में कुछ भी पूछें!',
    presets: [
      '👋 नमस्ते! मेरे सभी संपर्क दिखाएं',
      '🔍 दिल्ली में कौन रहता है?',
      '📝 मेरे संपर्कों के लिए ईमेल ड्राफ्ट करें',
      '📊 संपर्कों का संक्षिप्त सारांश बताएं',
    ],
  },
  {
    code: 'en-IN',
    name: 'English',
    nativeName: 'English (India)',
    flag: '🌐',
    subtext: 'Indian English Speech Rec & Sarvam AI Voice',
    sampleGreeting: 'Hello! 👋 I am your AI Voice Assistant. Ask me anything about your saved contacts!',
    presets: [
      '👋 Greet & list all saved contacts',
      '🔍 Who is located in New York?',
      '📝 Draft an email for my contacts',
      '📊 Tell me contact summary stats',
    ],
  },
];

export default function AiVoiceTalkback({ contacts }: AiVoiceTalkbackProps) {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('kn-IN');
  const activeLangConfig = LANGUAGE_OPTIONS.find((l) => l.code === selectedLang) || LANGUAGE_OPTIONS[0];

  const [activeVoiceMode, setActiveVoiceMode] = useState<'talk' | 'translate' | 'actions'>('talk');
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: LANGUAGE_OPTIONS[0].sampleGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [autoTalkback, setAutoTalkback] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [langToast, setLangToast] = useState<string | null>('Selected Kannada (ಕನ್ನಡ) Voice Mode');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingAi]);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setSelectedLang(code);
    const chosenConfig = LANGUAGE_OPTIONS.find((l) => l.code === code);
    if (!chosenConfig) return;

    setLangToast(`Voice Language switched to ${chosenConfig.name} (${chosenConfig.nativeName})`);
    setTimeout(() => setLangToast(null), 3000);

    const langSwitchMsg: ChatMessage = {
      id: `lang-${Date.now()}`,
      sender: 'ai',
      text: `🌐 ${chosenConfig.flag} ${chosenConfig.sampleGreeting}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, langSwitchMsg]);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLang;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputPrompt(transcript);
            handleSendMessage(transcript);
          }
        };

        recognition.onerror = (err: any) => {
          console.log('Speech recognition error:', err);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [selectedLang]);

  const toggleMicListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported on this browser. You can type your message below!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Error starting speech rec:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || loadingAi) return;

    setInputPrompt('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoadingAi(true);

    try {
      const historyFormatted = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: query,
          contacts,
          history: historyFormatted,
          languageCode: selectedLang,
          mode: activeVoiceMode,
        }),
      });

      let replyText = '';
      const contentType = res.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        replyText = data.reply || data.error || "I've processed your request.";
      } else {
        const textBody = await res.text();
        console.warn('Non-JSON response received:', textBody.slice(0, 100));
        replyText = `Hello! I am your AI Assistant. You have ${contacts?.length || 0} saved contact${contacts?.length === 1 ? '' : 's'}. How can I assist you today?`;
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (autoTalkback) {
        speakResponseSarvam(replyText);
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: "I couldn't reach the AI server right now. Let me know if you need help viewing saved contacts!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingAi(false);
    }
  };

  const speakResponseSarvam = async (text: string) => {
    try {
      setIsAiSpeaking(true);
      const res = await fetch('/api/sarvam-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          languageCode: selectedLang,
        }),
      });

      const contentType = res.headers.get('content-type');
      let data: any = {};
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.ok && data.audioBase64) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audio = new Audio(data.audioBase64);
        audio.playbackRate = speechSpeed;
        audioRef.current = audio;

        audio.onended = () => setIsAiSpeaking(false);
        audio.onerror = () => {
          setIsAiSpeaking(false);
          fallbackWebSpeech(text);
        };

        await audio.play();
      } else {
        fallbackWebSpeech(text);
      }
    } catch (err) {
      console.error('Sarvam TTS Error, falling back to WebSpeech:', err);
      fallbackWebSpeech(text);
    }
  };

  const fallbackWebSpeech = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = selectedLang;
      utterance.rate = speechSpeed;
      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsAiSpeaking(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsAiSpeaking(false);
  };

  const copyMessageText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="space-y-3.5 max-w-xl mx-auto">
      {/* Toast Notification */}
      {langToast && (
        <div className="px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-xl flex items-center justify-between shadow-2xs">
          <span>{langToast}</span>
          <button onClick={() => setLangToast(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Sleek Language & Controls Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setSpeechSpeed(speechSpeed === 1.0 ? 1.25 : speechSpeed === 1.25 ? 1.5 : 1.0)}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
            title="Speech Speed"
          >
            {speechSpeed}x
          </button>
          <button
            onClick={() => setAutoTalkback(!autoTalkback)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              autoTalkback
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
            }`}
            title="Toggle Auto Voice"
          >
            {autoTalkback ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Minimalist Hero Voice Trigger Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-indigo-500/20 flex flex-col items-center justify-center text-center space-y-3">
        {/* Soft Glowing Background Orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Big Interactive Mic Button */}
        <div className="relative">
          {isListening && (
            <div className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
          )}
          {isAiSpeaking && (
            <div className="absolute -inset-2 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
          )}
          <button
            onClick={toggleMicListening}
            className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md ${
              isListening
                ? 'bg-rose-500 text-white shadow-rose-500/50 scale-105'
                : isAiSpeaking
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-indigo-500/50 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40 hover:scale-105'
            }`}
            title={isListening ? 'Stop Listening' : `Speak in ${activeLangConfig.name}`}
          >
            {isListening ? (
              <Mic className="w-7 h-7 animate-bounce" />
            ) : (
              <MicOff className="w-7 h-7" />
            )}
          </button>
        </div>

        {/* Status Label */}
        <div>
          <div className="text-xs font-bold flex items-center justify-center gap-1.5">
            <span>{activeLangConfig.nativeName} ({activeLangConfig.name}) AI Voice</span>
            {isAiSpeaking && (
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                Speaking
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {isListening
              ? '🎙️ Listening... Speak now'
              : isAiSpeaking
              ? '🔊 Playing vocal response'
              : 'Tap mic or type a message below'}
          </p>
        </div>

        {/* Audio Spectrum Bars */}
        <div className="flex items-center gap-1 h-4 px-2.5 bg-slate-950/70 rounded-full border border-slate-800">
          {[30, 75, 45, 90, 60, 85, 40].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                isAiSpeaking || isListening ? 'bg-indigo-400' : 'bg-slate-700'
              }`}
              style={{ height: isAiSpeaking || isListening ? `${h}%` : '20%' }}
            />
          ))}
          {isAiSpeaking && (
            <button
              onClick={stopAudio}
              className="ml-1 text-[10px] text-rose-400 hover:text-rose-300 font-bold px-1"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Preset Action Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {activeLangConfig.presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(preset)}
            disabled={loadingAi}
            className="shrink-0 text-[11px] font-medium px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs transition-all active:scale-95"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Chat Conversation Stream */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col h-[340px] overflow-hidden">
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>Voice Log ({activeLangConfig.nativeName})</span>
          </div>
          <button
            onClick={() =>
              setMessages([
                {
                  id: 'reset-1',
                  sender: 'ai',
                  text: activeLangConfig.sampleGreeting,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
          >
            <RotateCcw className="w-3 h-3" />
            Clear Log
          </button>
        </div>

        {/* Message Bubble List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-2.5 text-xs sm:text-sm space-y-1 shadow-2xs relative group ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-700/40 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => speakResponseSarvam(msg.text)}
                        className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-600 transition-colors flex items-center gap-1"
                        title="Replay Speech"
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>Replay</span>
                      </button>
                    )}
                    <button
                      onClick={() => copyMessageText(msg.id, msg.text)}
                      className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors flex items-center gap-1"
                      title="Copy text"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                      <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <span
                    className={`font-mono ${
                      msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {loadingAi && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 animate-bounce" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span>AI generating response...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={toggleMicListening}
            className={`p-2 rounded-xl transition-all shadow-xs flex items-center gap-1 ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200'
            }`}
            title={isListening ? 'Stop Listening' : `Speak in ${activeLangConfig.nativeName}`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              isListening
                ? `Listening in ${activeLangConfig.nativeName}...`
                : `Type or speak in ${activeLangConfig.nativeName}...`
            }
            disabled={loadingAi}
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={loadingAi || !inputPrompt.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}


