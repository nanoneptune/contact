import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Play,
  Square,
  Copy,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Mail,
  Search,
  MessageSquare,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { Contact } from '../types';

interface AiVoiceTalkbackProps {
  contacts: Contact[];
  onDraftToMailer?: (subject: string, body: string, recipient?: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  source?: string;
  emailDraft?: {
    subject?: string;
    body?: string;
    recipient?: string;
  };
}

type SupportedLanguage = 'kn-IN' | 'hi-IN' | 'en-IN';
type AssistantMode = 'talk' | 'email_draft' | 'lookup';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  sampleGreeting: string;
  presets: {
    label: string;
    prompt: string;
    icon: 'search' | 'mail' | 'summary' | 'chat';
  }[];
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    sampleGreeting: 'ನಮಸ್ಕಾರ! 👋 ನಾನು ನಿಮ್ಮ AI ಧ್ವನಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಸಂಪರ್ಕಗಳ ಬಗ್ಗೆ ಕೇಳಿ ಅಥವಾ ಇಮೇಲ್ ರಚಿಸಲು ಹೇಳಿ!',
    presets: [
      {
        label: 'ಸಂಪರ್ಕಗಳ ಪಟ್ಟಿ',
        prompt: 'ನನ್ನ ಎಲ್ಲಾ ಉಳಿಸಿದ ಸಂಪರ್ಕಗಳನ್ನು ವಿವರವಾಗಿ ಪಟ್ಟಿ ಮಾಡಿ',
        icon: 'summary',
      },
      {
        label: 'ಇಮೇಲ್ ಇರುವವರು ಯಾರು?',
        prompt: 'ಯಾವ ಸಂಪರ್ಕಗಳಿಗೆ ಇಮೇಲ್ ವಿಳಾಸವಿದೆ ಎಂದು ತಿಳಿಸಿ?',
        icon: 'search',
      },
      {
        label: 'ಶುಭಹಾರೈಕೆ ಇಮೇಲ್ ಡ್ರಾಫ್ಟ್',
        prompt: 'ನನ್ನ ಸಂಪರ್ಕಗಳಿಗಾಗಿ ಒಂದು ಆಕರ್ಷಕ ಶುಭಹಾರೈಕೆ ಇಮೇಲ್ ಡ್ರಾಫ್ಟ್ ಮಾಡಿ',
        icon: 'mail',
      },
      {
        label: 'ಬೆಂಗಳೂರಿನ ಸಂಪರ್ಕಗಳು',
        prompt: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ (Bangalore) ಇರುವ ಸಂಪರ್ಕಗಳು ಯಾರು?',
        icon: 'search',
      },
    ],
  },
  {
    code: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳',
    sampleGreeting: 'नमस्ते! 👋 मैं आपका AI वॉयस असिस्टेंट हूं। अपने संपर्कों के बारे में कुछ भी पूछें या ईमेल ड्राफ्ट करवाएं!',
    presets: [
      {
        label: 'सभी संपर्क दिखाएं',
        prompt: 'मेरे सभी सेव किए गए संपर्कों की सूची दिखाएं',
        icon: 'summary',
      },
      {
        label: 'ईमेल वाले संपर्क',
        prompt: 'किन संपर्कों के पास ईमेल एड्रेस मौजूद है?',
        icon: 'search',
      },
      {
        label: 'औपचारिक ईमेल ड्राफ्ट',
        prompt: 'एक पेशेवर और औपचारिक ईमेल ड्राफ्ट तैयार करें',
        icon: 'mail',
      },
      {
        label: 'संपर्कों का सारांश',
        prompt: 'मेरे सभी संपर्कों और शहरों का संक्षिप्त विश्लेषण दें',
        icon: 'summary',
      },
    ],
  },
  {
    code: 'en-IN',
    name: 'English',
    nativeName: 'English (India)',
    flag: '🌐',
    sampleGreeting: 'Hello! 👋 I am your AI Voice Assistant. Ask about your directory or dictate emails to draft!',
    presets: [
      {
        label: 'Summarize Contacts',
        prompt: 'Summarize all my saved contacts with their places and emails',
        icon: 'summary',
      },
      {
        label: 'Find Email Ready',
        prompt: 'Which contacts have a valid email address configured?',
        icon: 'search',
      },
      {
        label: 'Draft Meeting Email',
        prompt: 'Draft a clean meeting announcement email with subject and markdown body',
        icon: 'mail',
      },
      {
        label: 'Location Breakdown',
        prompt: 'Group all my contacts by their cities and locations',
        icon: 'search',
      },
    ],
  },
];

// Helper to extract email draft if AI replied with an email
function extractEmailDraftFromText(text: string): { subject?: string; body?: string } | null {
  const subjectMatch = text.match(/(?:Subject|ವಿಷಯ|विषय):\s*([^\n\r]+)/i);
  if (subjectMatch) {
    const subject = subjectMatch[1].trim().replace(/^[*_"]|[*_"]$/g, '');
    const bodyPart = text.replace(/(?:Subject|ವಿಷಯ|विषय):\s*[^\n\r]+[\n\r]*/i, '').trim();
    return { subject, body: bodyPart };
  }
  if (text.includes('# ') || text.includes('## ') || text.includes('Dear ') || text.includes('ಸ್ನೇಹಿತರೆ') || text.includes('नमस्ते')) {
    return { subject: 'Update from Contacts Mailer', body: text };
  }
  return null;
}

export default function AiVoiceTalkback({ contacts, onDraftToMailer }: AiVoiceTalkbackProps) {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('kn-IN');
  const activeLangConfig = LANGUAGE_OPTIONS.find((l) => l.code === selectedLang) || LANGUAGE_OPTIONS[0];

  const [activeMode, setActiveMode] = useState<AssistantMode>('talk');
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  const [autoTalkback, setAutoTalkback] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

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
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [audioWaves, setAudioWaves] = useState<number[]>([20, 45, 75, 35, 90, 60, 40, 70, 30]);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat stream
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingAi]);

  // Dynamic waveform simulation when listening or AI speaking
  useEffect(() => {
    let interval: any = null;
    if (isListening || isAiSpeaking) {
      interval = setInterval(() => {
        setAudioWaves(Array.from({ length: 12 }, () => Math.floor(Math.random() * 70) + 25));
      }, 120);
    } else {
      setAudioWaves([15, 25, 20, 30, 25, 20, 35, 25, 20, 15, 25, 20]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening, isAiSpeaking]);

  // Initialize Speech Recognition
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
          if (err.error === 'not-allowed' || err.error === 'permission-denied') {
            setMicPermissionError(
              'Microphone access is blocked by your browser settings. Please click the camera/mic icon in the browser address bar to allow microphone access, or type your query in the prompt box.'
            );
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [selectedLang]);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setSelectedLang(code);
    const chosenConfig = LANGUAGE_OPTIONS.find((l) => l.code === code);
    if (!chosenConfig) return;

    if (isAiSpeaking) {
      stopAudio();
    }

    const langSwitchMsg: ChatMessage = {
      id: `lang-${Date.now()}`,
      sender: 'ai',
      text: `${chosenConfig.flag} **${chosenConfig.name} (${chosenConfig.nativeName})**\n\n${chosenConfig.sampleGreeting}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, langSwitchMsg]);
  };

  const toggleMicListening = async () => {
    if (isAiSpeaking) {
      stopAudio();
    }

    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported on this browser. You can type your request in the input box!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    // Try requesting user media audio permission first to prompt browser dialog
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop stream immediately since recognition will acquire its own stream
        stream.getTracks().forEach((track) => track.stop());
        setMicPermissionError(null);
      }
    } catch (err: any) {
      console.warn('Microphone permission request:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError(
          'Microphone access is blocked by your browser settings. Please allow microphone access in your browser address bar or use text queries.'
        );
        return;
      }
    }

    setMicPermissionError(null);
    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    }
  };

  // Local intelligent fallback generator if server endpoint is unavailable
  const generateLocalAiResponse = (query: string, lang: SupportedLanguage): { reply: string; draft?: { subject?: string; body?: string } } => {
    const q = query.toLowerCase();
    const contactCount = contacts.length;
    const emailable = contacts.filter((c) => c.email && c.email.includes('@'));

    // Check if user is asking to draft an email
    if (q.includes('draft') || q.includes('email') || q.includes('mail') || q.includes('ಇಮೇಲ್') || q.includes('ಈಮೇಲ್') || q.includes('ईमेल')) {
      if (lang === 'kn-IN') {
        const subject = 'ಸಂಪರ್ಕ ನವೀಕರಣ ಮತ್ತು ಶುಭಾಶಯಗಳು';
        const body = `### ನಮಸ್ಕಾರ,\n\nಇದು ಸಂಪರ್ಕ ಆಪ್ ಮೂಲಕ ಕಳುಹಿಸಲಾದ ಪ್ರಮುಖ ಸಂದೇಶವಾಗಿದೆ.\n\n- **ವಿಷಯ:** ನಿಯಮಿತ ಸಂಪರ್ಕ ನವೀಕರಣ\n- **ದಿನಾಂಕ:** ${new Date().toLocaleDateString('kn-IN')}\n\nಧನ್ಯವಾದಗಳು,\n*ಸಂಪರ್ಕ ವ್ಯವಸ್ಥಾಪಕ ತಂಡ*`;
        return {
          reply: `ಖಂಡಿತ! ನಿಮಗಾಗಿ ಇಮೇಲ್ ಡ್ರಾಫ್ಟ್ ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ:\n\n**ವಿಷಯ:** ${subject}\n\n${body}`,
          draft: { subject, body },
        };
      } else if (lang === 'hi-IN') {
        const subject = 'संपर्क अपडेट और शुभकामनाएं';
        const body = `### नमस्ते,\n\nयह संपर्क ऐप के माध्यम से भेजा गया एक महत्वपूर्ण संदेश है।\n\n- **विषय:** नियमित संपर्क अपडेट\n- **तारीख:** ${new Date().toLocaleDateString('hi-IN')}\n\nधन्यवाद,\n*संपर्क प्रबंधन टीम*`;
        return {
          reply: `ज़रूर! आपके लिए ईमेल ड्राफ्ट तैयार किया गया है:\n\n**विषय:** ${subject}\n\n${body}`,
          draft: { subject, body },
        };
      } else {
        const subject = 'Important Directory & Contact Update';
        const body = `### Hello,\n\nThis is an automated communication from your Contacts & Mailer assistant.\n\n- **Subject:** Directory Update & Announcements\n- **Date:** ${new Date().toLocaleDateString()}\n\nBest regards,\n*Contacts Management Team*`;
        return {
          reply: `Here is your drafted email message ready for review:\n\n**Subject:** ${subject}\n\n${body}`,
          draft: { subject, body },
        };
      }
    }

    // Check for contact list / summary
    if (q.includes('list') || q.includes('all') || q.includes('summar') || q.includes('ಎಲ್ಲಾ') || q.includes('ಪಟ್ಟಿ') || q.includes('सूची') || q.includes('सभी')) {
      if (contactCount === 0) {
        return {
          reply: lang === 'kn-IN' ? 'ನಿಮ್ಮ ಡೈರೆಕ್ಟರಿಯಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಸಂಪರ್ಕಗಳು ಉಳಿಸಿಲ್ಲ.' : lang === 'hi-IN' ? 'आपकी डायरेक्टरी में अभी कोई संपर्क सेव नहीं है।' : 'You do not have any saved contacts in your directory yet.',
        };
      }

      const listItems = contacts.slice(0, 8).map((c) => `• **${c.name}** (${c.place}) - ${c.phone}${c.email ? ` | ✉️ ${c.email}` : ''}`).join('\n');
      if (lang === 'kn-IN') {
        return {
          reply: `ನಿಮ್ಮ ಬಳಿ ಒಟ್ಟು **${contactCount}** ಸಂಪರ್ಕಗಳಿವೆ:\n\n${listItems}\n\nನೀವು ಇವುಗಳಲ್ಲಿ ಯಾರಿಗಾದರೂ ಇಮೇಲ್ ಕಳುಹಿಸಲು ಬಯಸುತ್ತೀರಾ?`,
        };
      } else if (lang === 'hi-IN') {
        return {
          reply: `आपके पास कुल **${contactCount}** संपर्क सुरक्षित हैं:\n\n${listItems}\n\nक्या आप इनमें से किसी को ईमेल भेजना चाहते हैं?`,
        };
      } else {
        return {
          reply: `You have **${contactCount}** contacts saved in your directory:\n\n${listItems}\n\nWould you like me to draft an email to any of these contacts?`,
        };
      }
    }

    // Check for email contacts inquiry
    if (q.includes('email ready') || q.includes('who has email') || q.includes('ಇಮೇಲ್ ಇರುವವರು') || q.includes('ईमेल वाले')) {
      if (emailable.length === 0) {
        return {
          reply: lang === 'kn-IN' ? 'ಯಾವುದೇ ಸಂಪರ್ಕಕ್ಕೆ ಇಮೇಲ್ ವಿಳಾಸ ಸೇರಿಸಲಾಗಿಲ್ಲ.' : lang === 'hi-IN' ? 'किसी भी संपर्क के पास ईमेल एड्रेस नहीं है।' : 'None of your saved contacts currently have an email address configured.',
        };
      }
      const emailList = emailable.map((c) => `• **${c.name}**: ${c.email}`).join('\n');
      if (lang === 'kn-IN') {
        return { reply: `ಇಮೇಲ್ ವಿಳಾಸ ಹೊಂದಿರುವ **${emailable.length}** ಸಂಪರ್ಕಗಳು:\n\n${emailList}` };
      } else if (lang === 'hi-IN') {
        return { reply: `ईमेल एड्रेस वाले **${emailable.length}** संपर्क:\n\n${emailList}` };
      } else {
        return { reply: `Found **${emailable.length}** contacts configured with email addresses:\n\n${emailList}` };
      }
    }

    // Default conversational reply
    if (lang === 'kn-IN') {
      return {
        reply: `ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಡೈರೆಕ್ಟರಿಯಲ್ಲಿ **${contactCount}** ಸಂಪರ್ಕಗಳಿವೆ. ನಾನು ನಿಮಗೆ ಸಂಪರ್ಕಗಳ ಪಟ್ಟಿ, ಶೋಧನೆ ಅಥವಾ ಇಮೇಲ್ ಡ್ರಾಫ್ಟ್ ರಚಿಸಲು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?`,
      };
    } else if (lang === 'hi-IN') {
      return {
        reply: `नमस्ते! आपकी डायरेक्टरी में **${contactCount}** संपर्क सेव हैं। मैं संपर्क खोजने, सारांश देने या ईमेल ड्राफ्ट करने में आपकी सहायता कर सकता हूं।`,
      };
    } else {
      return {
        reply: `Hello! You currently have **${contactCount}** saved contacts (${emailable.length} with emails). I can help you search records, summarize cities, or compose custom Markdown emails. How can I assist you?`,
      };
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || loadingAi) return;

    setInputPrompt('');
    if (isAiSpeaking) {
      stopAudio();
    }

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

      let replyText = '';
      let replySource = 'groq';
      let emailDraft: { subject?: string; body?: string } | null = null;

      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: query,
            contacts,
            history: historyFormatted,
            languageCode: selectedLang,
            mode: activeMode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          replyText = data.reply || data.error;
          replySource = data.source || 'groq';
        } else {
          // If server returned 404 or error status, use smart local engine
          const localResult = generateLocalAiResponse(query, selectedLang);
          replyText = localResult.reply;
          emailDraft = localResult.draft || null;
          replySource = 'local-engine';
        }
      } catch {
        const localResult = generateLocalAiResponse(query, selectedLang);
        replyText = localResult.reply;
        emailDraft = localResult.draft || null;
        replySource = 'local-engine';
      }

      if (!emailDraft) {
        emailDraft = extractEmailDraftFromText(replyText);
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: replySource,
        emailDraft: emailDraft || undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (autoTalkback) {
        speakResponseSarvam(replyText);
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      const localResult = generateLocalAiResponse(query, selectedLang);
      const fallbackMsg: ChatMessage = {
        id: `fb-${Date.now()}`,
        sender: 'ai',
        text: localResult.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        emailDraft: localResult.draft || undefined,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (autoTalkback) {
        fallbackWebSpeech(localResult.reply);
      }
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
      audioRef.current.currentTime = 0;
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

  const handleTransferToMailer = (draft?: { subject?: string; body?: string; recipient?: string }) => {
    if (onDraftToMailer && draft) {
      onDraftToMailer(draft.subject || 'AI Generated Mail', draft.body || '', draft.recipient);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* TOP CONTROL BAR: LANGUAGE PILLS & ACOUSTIC TOGGLES */}
      <div className="ambient-card rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Language Selection */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {LANGUAGE_OPTIONS.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`py-2 px-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider font-geist-mono transition-all whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#1a1a1e] dark:bg-white text-white dark:text-[#1a1a1e] shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
                <span className="opacity-60 text-[10px]">({lang.name})</span>
              </button>
            );
          })}
        </div>

        {/* Audio Preferences & Mode */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeechSpeed(speechSpeed === 1.0 ? 1.25 : speechSpeed === 1.25 ? 1.5 : speechSpeed === 1.5 ? 0.8 : 1.0)}
            className="px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-geist-mono rounded-xl transition-all"
            title="Adjust Speech Playback Rate"
          >
            SPEED: <span className="font-bold text-[#5e5ce6]">{speechSpeed}x</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoTalkback(!autoTalkback)}
            className={`px-3 py-2 rounded-xl text-xs font-geist-mono flex items-center gap-1.5 transition-all ${
              autoTalkback
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-black/5 dark:bg-white/5 text-slate-400'
            }`}
            title="Toggle Auto Vocal Response"
          >
            {autoTalkback ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{autoTalkback ? 'VOICE ON' : 'MUTED'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl text-xs transition-all ${
              showSettings ? 'bg-[#5e5ce6] text-white' : 'bg-black/5 dark:bg-white/5 text-slate-500 hover:text-[#1a1a1e] dark:hover:text-white'
            }`}
            title="Assistant Mode Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EXPANDABLE ASSISTANT MODE STRIP */}
      {showSettings && (
        <div className="ambient-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveMode('talk')}
            className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
              activeMode === 'talk'
                ? 'bg-[#5e5ce6]/10 border-[#5e5ce6] text-[#5e5ce6]'
                : 'bg-white/40 dark:bg-slate-950/40 border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="font-geist-mono uppercase font-bold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Conversational
            </div>
            <p className="text-[11px] opacity-75">Ask questions about saved contacts, locations, and details.</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('email_draft')}
            className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
              activeMode === 'email_draft'
                ? 'bg-[#5e5ce6]/10 border-[#5e5ce6] text-[#5e5ce6]'
                : 'bg-white/40 dark:bg-slate-950/40 border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="font-geist-mono uppercase font-bold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Author
            </div>
            <p className="text-[11px] opacity-75">Dictate key points to generate ready-to-dispatch markdown emails.</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('lookup')}
            className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
              activeMode === 'lookup'
                ? 'bg-[#5e5ce6]/10 border-[#5e5ce6] text-[#5e5ce6]'
                : 'bg-white/40 dark:bg-slate-950/40 border-black/5 dark:border-white/5 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="font-geist-mono uppercase font-bold flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Instant Lookup
            </div>
            <p className="text-[11px] opacity-75">Quick directory filtering and phone/email queries.</p>
          </button>
        </div>
      )}

      {/* MIC PERMISSION WARNING BANNER */}
      {micPermissionError && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">{micPermissionError}</p>
              <p className="text-[11px] opacity-80">
                Tip: If running inside an embedded iframe preview, click the URL bar lock icon to allow microphone, or use the instant prompt box below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMicPermissionError(null)}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AMBIENT HERO SOUNDSTAGE ORB */}
      <div className="ambient-card rounded-[28px] p-6 sm:p-8 relative overflow-hidden flex flex-col items-center justify-center text-center space-y-6 shadow-sm border border-black/5 dark:border-white/5">
        
        {/* Subtle Ambient Radial Glow Behind Orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#5e5ce6]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Central Pulsing Mic Orb */}
        <div className="relative">
          {isListening && (
            <div className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
          )}
          {isAiSpeaking && (
            <div className="absolute -inset-4 rounded-full bg-[#5e5ce6]/25 animate-ping pointer-events-none" />
          )}
          {loadingAi && (
            <div className="absolute -inset-3 rounded-full border-2 border-dashed border-[#5e5ce6]/60 animate-spin pointer-events-none" />
          )}

          <button
            type="button"
            onClick={toggleMicListening}
            className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md ${
              isListening
                ? 'bg-rose-500 text-white shadow-rose-500/40 scale-105'
                : isAiSpeaking
                ? 'bg-[#5e5ce6] text-white shadow-[#5e5ce6]/40 scale-105'
                : 'bg-[#1a1a1e] dark:bg-white text-white dark:text-[#1a1a1e] hover:scale-105 shadow-xl'
            }`}
            title={isListening ? 'Stop Listening' : `Tap to Speak in ${activeLangConfig.name}`}
          >
            {isListening ? (
              <Mic className="w-10 h-10 animate-pulse" />
            ) : isAiSpeaking ? (
              <Volume2 className="w-10 h-10 animate-bounce" />
            ) : loadingAi ? (
              <RefreshCw className="w-10 h-10 animate-spin text-[#5e5ce6]" />
            ) : (
              <Mic className="w-10 h-10 opacity-90 hover:opacity-100" />
            )}
          </button>
        </div>

        {/* Dynamic Status Indicator */}
        <div className="space-y-1 z-10">
          <div className="meta-tag text-slate-500 flex items-center justify-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isListening
                  ? 'bg-rose-500 animate-pulse'
                  : isAiSpeaking
                  ? 'bg-[#5e5ce6] animate-pulse'
                  : loadingAi
                  ? 'bg-amber-500 animate-spin'
                  : 'bg-emerald-500'
              }`}
            />
            {isListening
              ? `LISTENING IN ${activeLangConfig.name.toUpperCase()}...`
              : isAiSpeaking
              ? `PLAYING TALKBACK (${activeLangConfig.nativeName})`
              : loadingAi
              ? 'SYNTHESIZING RESPONSE...'
              : `READY • ${activeLangConfig.nativeName} (${activeLangConfig.name.toUpperCase()})`}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isListening
              ? 'Speak clearly into your microphone now...'
              : isAiSpeaking
              ? 'Synthesizing voice playback. Click Stop to cancel.'
              : 'Tap the microphone or choose a quick prompt below to interact.'}
          </p>
        </div>

        {/* Real-time Acoustic Waveform Equalizer */}
        <div className="flex items-center gap-1.5 h-8 px-4 bg-white/40 dark:bg-slate-950/40 rounded-full border border-black/5 dark:border-white/5 z-10">
          {audioWaves.map((height, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isListening
                  ? 'bg-rose-500'
                  : isAiSpeaking
                  ? 'bg-[#5e5ce6]'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
          {isAiSpeaking && (
            <button
              type="button"
              onClick={stopAudio}
              className="ml-2 pl-2 border-l border-black/10 dark:border-white/10 text-[10px] font-geist-mono uppercase font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* QUICK PROMPTS CHIPS */}
      <div className="space-y-2">
        <div className="meta-tag text-slate-400">SUGGESTED QUERIES ({activeLangConfig.nativeName})</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {activeLangConfig.presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(preset.prompt)}
              disabled={loadingAi}
              className="ambient-card p-3 rounded-xl text-left border border-black/5 dark:border-white/5 hover:border-[#5e5ce6]/40 transition-all group flex items-start gap-2.5"
            >
              <div className="p-1.5 rounded-lg bg-[#5e5ce6]/10 text-[#5e5ce6] shrink-0 mt-0.5">
                {preset.icon === 'search' ? (
                  <Search className="w-3.5 h-3.5" />
                ) : preset.icon === 'mail' ? (
                  <Mail className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#1a1a1e] dark:text-white truncate group-hover:text-[#5e5ce6] transition-colors">
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{preset.prompt}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CONVERSATION LOG CONTAINER */}
      <div className="ambient-card rounded-[24px] overflow-hidden flex flex-col h-[480px] shadow-xs border border-black/5 dark:border-white/5">
        
        {/* Chat Stream Header */}
        <div className="px-5 py-3.5 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#5e5ce6]" />
            <span className="meta-tag text-slate-500">VOICE SESSION TRANSCRIPT</span>
          </div>
          <button
            type="button"
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
            className="text-xs font-geist-mono uppercase tracking-wider text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            Clear Log
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar Pill */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-[#1a1a1e] dark:bg-white text-white dark:text-[#1a1a1e]'
                    : 'bg-[#5e5ce6] text-white shadow-xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm space-y-2 relative group ${
                  msg.sender === 'user'
                    ? 'bg-[#1a1a1e] text-white rounded-tr-none'
                    : 'bg-white/60 dark:bg-slate-900/60 text-[#1a1a1e] dark:text-slate-100 rounded-tl-none border border-black/5 dark:border-white/5 shadow-2xs'
                }`}
              >
                {/* Formatted Markdown Content */}
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>

                {/* EMAIL DRAFT CALLOUT ACTION */}
                {msg.sender === 'ai' && msg.emailDraft && onDraftToMailer && (
                  <div className="mt-3 p-3 rounded-xl bg-[#5e5ce6]/10 border border-[#5e5ce6]/20 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-4 h-4 text-[#5e5ce6] shrink-0" />
                      <div className="truncate text-xs">
                        <span className="font-semibold text-[#5e5ce6]">Draft Generated:</span>{' '}
                        <span className="text-slate-600 dark:text-slate-300">{msg.emailDraft.subject || 'Message Draft'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTransferToMailer(msg.emailDraft)}
                      className="px-3 py-1.5 bg-[#5e5ce6] hover:bg-[#5e5ce6]/90 text-white font-geist-mono text-[11px] font-semibold uppercase tracking-wider rounded-lg shrink-0 flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                    >
                      <span>Open in Mailer</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Actions & Metadata Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[11px] font-geist-mono">
                  <div className="flex items-center gap-2">
                    {msg.sender === 'ai' && (
                      <button
                        type="button"
                        onClick={() => speakResponseSarvam(msg.text)}
                        className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#5e5ce6]/10 hover:text-[#5e5ce6] text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1"
                        title="Vocalize this message"
                      >
                        <Play className="w-3 h-3" />
                        <span>Speak</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => copyMessageText(msg.id, msg.text)}
                      className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* AI Generating Indicator */}
          {loadingAi && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#5e5ce6] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 p-3.5 rounded-2xl text-xs text-slate-500 flex items-center gap-2 border border-black/5 dark:border-white/5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#5e5ce6]" />
                <span className="font-geist-mono">Reasoning across contact database...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMicListening}
            className={`p-3 rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-black/5 dark:bg-white/5 text-[#5e5ce6] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
            title={isListening ? 'Stop Mic' : `Speak in ${activeLangConfig.name}`}
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
                : `Type or dictate a prompt in ${activeLangConfig.nativeName}...`
            }
            disabled={loadingAi}
            className="flex-1 px-4 py-3 bg-white/50 dark:bg-slate-950/40 border border-black/10 dark:border-white/10 rounded-xl text-xs sm:text-sm text-[#1a1a1e] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#5e5ce6] font-mono"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={loadingAi || !inputPrompt.trim()}
            className="px-5 py-3 bg-[#1a1a1e] dark:bg-white hover:bg-black/90 dark:hover:bg-slate-100 text-white dark:text-[#1a1a1e] text-xs font-semibold uppercase tracking-wider font-geist-mono rounded-xl shadow-xs disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
