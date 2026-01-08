import { useState, useEffect, useRef } from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard,
  TrendingUp,
  Wallet,
  FileText,
  IndianRupee,
  Users,
  Sparkles,
  Activity,
  CreditCard,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  FileDown,
  LogOut,
  UserCircle,
  Building2,
  Clock,
  Eye,
  ArrowLeft,
  Lock,
  Mail,
  User,
  KeyRound,
  Shield,
  UserPlus,
  Trash2,
  RefreshCw,
  CheckSquare,
  XSquare,
  Settings
} from 'lucide-react';
import FormInput from './components/FormInput';
import ScoreCard from './components/ScoreCard';
import jsPDF from 'jspdf';

const API_URL = 'http://localhost:8000';

// ==================== AUTH HELPER ====================
const getAuthHeaders = () => {
  const token = localStorage.getItem('sakhiToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ==================== LOGIN PAGE ====================
function LoginPage({ onLoginSuccess, onShowRegister }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [lang, setLang] = useState('en');
  const audioCacheRef = useRef(new Map());
  const audioRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [conversation, setConversation] = useState([]); // {speaker: 'user'|'system', text}
  const [processingSTT, setProcessingSTT] = useState(false);
  const [detectedLang, setDetectedLang] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  const fetchAndPlay = async (text) => {
    if (!text) return;
    const key = text;
    const cache = audioCacheRef.current;
    try {
      if (cache.has(key)) {
        const url = cache.get(key);
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(url);
        await audioRef.current.play();
        return;
      }

      const resp = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang })
      });

      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      cache.set(key, url);
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      await audioRef.current.play();
    } catch (err) {
      console.error('TTS error', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Prefer Opus in webm if available for best compatibility with Whisper/ffmpeg
      const preferred = 'audio/webm;codecs=opus';
      const fallback = 'audio/webm';
      const mimeType = (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(preferred)) ? preferred : fallback;
      console.log('Using media mimeType:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        console.log('Recorded blob size', blob.size, 'type', blob.type);
        await handleAudioBlob(blob);
        // stop tracks
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
      setRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') mr.stop();
    } catch (e) {
      console.error(e);
    }
    setRecording(false);
  };

  const handleAudioBlob = async (blob) => {
    try {
      setProcessingSTT(true);
      const fd = new FormData();
      // pick extension from blob type
      const ext = blob.type.includes('wav') ? 'wav' : blob.type.includes('webm') ? 'webm' : 'dat';
      const filename = `speech.${ext}`;
      console.log('Uploading', filename, 'size', blob.size, 'type', blob.type);
      fd.append('file', blob, filename);
      // allow 'auto' so backend can detect language
      fd.append('lang', lang || 'auto');

      const resp = await fetch(`${API_URL}/stt`, { method: 'POST', body: fd });
      if (!resp.ok) {
        console.error('STT failed');
        return;
      }
      const data = await resp.json();
      const text = data.text || '';
      const detected = data.detected_lang || null;
      setDetectedLang(detected);
      if (detected) {
        setConversation(prev => [...prev, { speaker: 'system', text: `Detected language: ${detected}` }]);
      }
      console.log('STT response text:', text);
      if (text) {
        setConversation(prev => [...prev, { speaker: 'user', text }]);

        // send to converse endpoint; prefer detected language from STT when available
        const fd2 = new FormData();
        fd2.append('text', text);
        fd2.append('lang', detected || lang || 'auto');
        fd2.append('savings', formData.savings);
        fd2.append('attendance', formData.attendance);
        fd2.append('repayment', formData.repayment);

        const resp2 = await fetch(`${API_URL}/converse`, { method: 'POST', body: fd2 });
        if (!resp2.ok) return;
        const convo = await resp2.json();
        const reply = convo.reply || 'OK';

        // Handle actions
        if (convo.action === 'set_field') {
          // Ask user to confirm before applying potentially destructive updates
          setPendingAction({ convo, reply });
          setConversation(prev => [...prev, { speaker: 'system', text: `Detected intent: ${reply} — please confirm.` }]);
          fetchAndPlay(`Detected intent: ${reply}. Please confirm.`);
        } else {
          // Handle navigation action
          if (convo.action === 'navigate') {
            const target = convo.target;
            if (target) {
              setNavItems(prev => prev.map(i => ({ ...i, active: i.key === target })));
              setSidebarOpen(true);
            }
            setConversation(prev => [...prev, { speaker: 'system', text: reply }]);
            fetchAndPlay(reply);

          } else if (convo.action === 'show_logs') {
            setConversation(prev => [...prev, { speaker: 'system', text: reply }]);
            // fetch logs and append summary
            try {
              const r = await fetch(`${API_URL}/logs`);
              const data = await r.json();
              const logs = data.logs || [];
              if (logs.length === 0) {
                setConversation(prev => [...prev, { speaker: 'system', text: 'No logs found.' }]);
                fetchAndPlay('No logs found.');
              } else {
                const summary = logs.slice(0,5).map(l => `Score ${l.score} • ${l.risk}`).join('\n');
                setConversation(prev => [...prev, { speaker: 'system', text: summary }]);
                fetchAndPlay(summary);
              }
            } catch (err) {
              console.error('Failed to fetch logs', err);
            }

          } else {
            setConversation(prev => [...prev, { speaker: 'system', text: reply }]);

            // If backend asks to predict, fetch full prediction
            if (convo.action === 'predict') {
              try {
                const r = await axios.post(`${API_URL}/predict`, formData, { headers: { 'Content-Type': 'application/json' } });
                setResult(r.data);
              } catch (err) {
                console.error('Predict from converse failed', err);
              }
            }

            // Speak reply
            fetchAndPlay(reply);
          }
        }
      }
    } catch (err) {
      console.error('Audio handling failed', err);
    }
    finally {
      setProcessingSTT(false);
    }
  };

  const confirmPending = () => {
    if (!pendingAction) return;
    const { convo, reply } = pendingAction;
    const field = convo.field;
    const value = convo.value;
    if (field) setFormData(prev => ({ ...prev, [field]: Number(value) }));
    setConversation(prev => [...prev, { speaker: 'system', text: `Action applied: ${reply}` }]);
    fetchAndPlay(`Action applied: ${reply}`);
    setPendingAction(null);
  };

  const cancelPending = () => {
    if (!pendingAction) return;
    setConversation(prev => [...prev, { speaker: 'system', text: 'Action canceled.' }]);
    fetchAndPlay('Action canceled.');
    setPendingAction(null);
  };
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        username: formData.username,
        password: formData.password
      });

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('sakhiToken', response.data.token);
        localStorage.setItem('sakhiUser', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user, response.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      savings: 2500,
      attendance: 85,
      repayment: 75
    });
    setResult(null);
    setError(null);
  };

  const initialNav = [
    { icon: LayoutDashboard, key: 'dashboard', active: true },
    { icon: Activity, key: 'sakhi_ai', active: false },
    { icon: Wallet, key: 'accounts', active: false },
    { icon: TrendingUp, key: 'transactions', active: false },
    { icon: FileText, key: 'reports', active: false },
    { icon: PieChart, key: 'investments', active: false },
    { icon: CreditCard, key: 'loans', active: false },
    { icon: Settings, key: 'settings', active: false },
  ];

  const [navItems, setNavItems] = useState(initialNav);

  const LOCALES = {
    en: {
      dashboard: 'Dashboard',
      sakhi_ai: 'Sakhi AI',
      accounts: 'Accounts',
      transactions: 'Transactions',
      reports: 'Reports',
      investments: 'Investments',
      loans: 'Loans',
      settings: 'Settings',
      voice_on: 'Voice On',
      voice_off: 'Voice Off',
      calculate_score: 'Calculate Score',
      reset: 'Reset',
      add_new_widget: '+ Add new Widget',
      monthly_savings: 'Monthly Savings per Member',
      avg_monthly_savings: 'Average monthly savings contribution',
      meeting_attendance: 'Meeting Attendance Rate',
      attendance_description: 'Member attendance percentage',
      loan_repayment: 'Loan Repayment Rate',
      repayment_description: 'On-time repayment rate',
      credit_score_result: 'Credit Score Result',
      adjust_metrics: 'Adjust your SHG metrics and click "Calculate Score" to see results',
      analyzing: 'Analyzing with AI...',
      savings: 'Savings',
      attendance: 'Attendance',
      repayment: 'Repayment',
      excellent_credit: 'Excellent Credit',
      good_credit: 'Good Credit',
      fair_credit: 'Fair Credit',
      needs_improvement: 'Needs Improvement',
      calculated_at: 'Calculated at',
    },
    hi: {
      dashboard: 'डैशबोर्ड',
      sakhi_ai: 'सखी एआई',
      accounts: 'खाते',
      transactions: 'लेन-देन',
      reports: 'रिपोर्ट',
      investments: 'निवेश',
      loans: 'ऋण',
      settings: 'सेटिंग्स',
      voice_on: 'वॉइस चालू',
      voice_off: 'वॉइस बंद',
      calculate_score: 'स्कोर निकालें',
      reset: 'रीसेट',
      add_new_widget: '+ नया विजेट जोड़ें',
      monthly_savings: 'प्रति सदस्य मासिक बचत',
      avg_monthly_savings: 'औसत मासिक बचत योगदान',
      meeting_attendance: 'बैठक उपस्थिति दर',
      attendance_description: 'सदस्य उपस्थिति प्रतिशत',
      loan_repayment: 'ऋण भुगतान दर',
      repayment_description: 'समय पर भुगतान दर',
      credit_score_result: 'क्रेडिट स्कोर परिणाम',
      adjust_metrics: 'अपने SHG मीट्रिक्स समायोजित करें और परिणाम देखने के लिए "स्कोर निकालें" क्लिक करें',
      analyzing: 'एआई के साथ विश्लेषण...',
      savings: 'बचत',
      attendance: 'उपस्थिति',
      repayment: 'भुगतान',
      excellent_credit: 'उत्कृष्ट क्रेडिट',
      good_credit: 'अच्छा क्रेडिट',
      fair_credit: 'मध्यम क्रेडिट',
      needs_improvement: 'सुधार की आवश्यकता',
      calculated_at: 'गणना समय',
    },
    ta: {
      dashboard: 'டாஷ்போர்ட்',
      sakhi_ai: 'சகி ஏ.ஐ.',
      accounts: 'கணக்குகள்',
      transactions: 'பரிவர்த்தனைகள்',
      reports: 'அறிக்கைகள்',
      investments: 'முதலீடுகள்',
      loans: 'கடன்',
      settings: 'அமைப்புகள்',
      voice_on: 'வாய்ஸ் இயக்கம்',
      voice_off: 'வாய்ஸ் நிறுத்து',
      calculate_score: 'மதிப்பீடு செய்ய',
      reset: 'மீட்டமை',
      add_new_widget: '+ புதிய ویஜெட்',
      monthly_savings: 'ஒரு உறுப்பினருக்கான மாதாந்திர சேமிப்பு',
      avg_monthly_savings: 'சராசரி மாதாந்திர சேமிப்பு பங்களிப்பு',
      meeting_attendance: 'கூட்ட ஒப்புதல் வீதம்',
      attendance_description: 'உறுப்பினர் வருகை சதவிகிதம்',
      loan_repayment: 'கடன் திருப்பித் தொகை வீதம்',
      repayment_description: 'சமயத்தில் பணம் திருப்புவதின் வீதம்',
      credit_score_result: 'கடன் மதிப்பீடு முடிவு',
      adjust_metrics: 'உங்கள் SHG அளவுகோல்களை சரிசெய்து முடிவை காண "மதிப்பீடு செய்ய" கிளிக் செய்க',
      analyzing: 'ஏ.ஐ. மூலம் பகுப்பாய்வு...',
      savings: 'சேமிப்பு',
      attendance: 'வருகை',
      repayment: 'திருப்புதல்',
      excellent_credit: 'உத்தம கடன்',
      good_credit: 'நன்றாக கடன்',
      fair_credit: 'சராசரி கடன்',
      needs_improvement: 'மேம்பாட்டு தேவை',
      calculated_at: 'கணக்கிடப்பட்டது',
    },
    bn: {
      dashboard: 'ড্যাশবোর্ড',
      sakhi_ai: 'সখী এআই',
      accounts: 'একাউন্ট',
      transactions: 'লেনদেন',
      reports: 'রিপোর্ট',
      investments: 'বিনিয়োগ',
      loans: 'ঋণ',
      settings: 'সেটিংস',
      voice_on: 'ভয়েস চালু',
      voice_off: 'ভয়েস বন্ধ',
      calculate_score: 'স্কোর হিসাব করুন',
      reset: 'রিসেট',
      add_new_widget: '+ নতুন উইজেট যোগ করুন',
      monthly_savings: 'প্রতি সদস্য মাসিক সঞ্চয়',
      avg_monthly_savings: 'গড় মাসিক সঞ্চয় অবদান',
      meeting_attendance: 'মিটিং উপস্থিতি হার',
      attendance_description: 'সদস্যদের উপস্থিতির শতাংশ',
      loan_repayment: 'ঋণ প্রত্যর্পণ হার',
      repayment_description: 'সময়মত অর্থ প্রদানের হার',
      credit_score_result: 'ক্রেডিট স্কোর ফলাফল',
      adjust_metrics: 'আপনার SHG মেট্রিক অ্যাডজাস্ট করুন এবং ফলাফল দেখার জন্য "স্কোর হিসাব করুন" ক্লিক করুন',
      analyzing: 'এআই দিয়ে বিশ্লেষণ...',
      savings: 'সঞ্চয়',
      attendance: 'উপস্থিতি',
      repayment: 'প্রত্যর্পণ',
      excellent_credit: 'চমৎকার ক্রেডিট',
      good_credit: 'ভাল ক্রেডিট',
      fair_credit: 'মোটামুটি ক্রেডিট',
      needs_improvement: 'উন্নতির প্রয়োজন',
      calculated_at: 'হিসাব করা হয়',
    }
    ,
    kn: {
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      sakhi_ai: 'ಸಖಿ ಏಐ',
      accounts: 'ಖಾತೆಗಳು',
      transactions: 'ವಹಿವಾಟುಗಳು',
      reports: 'ರಿಪೋರ್ಟ್‌ಗಳು',
      investments: 'ನಿವೇಶನಗಳು',
      loans: 'ಸಾಲುಗಳು',
      settings: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
      voice_on: 'ವಾಯ್ಸ್ ಚಾಲು',
      voice_off: 'ವಾಯ್ಸ್ ನಿಷ್ಕ್ರಿಯ',
      calculate_score: 'ಸ್ಕೋರ್ ಗಣನೆ ಮಾಡಿ',
      reset: 'ಮರುಹೊಂದಿಸಿ',
      add_new_widget: '+ ಹೊಸ ವಿಜೆಟ್ ಸೇರಿಸಿ',
      monthly_savings: 'ಪ್ರತಿ ಸದಸ್ಯರ ಮಾಸಿಕ ಸಂರಕ್ಷಣೆ',
      avg_monthly_savings: 'ಸರಾಸರಿ ಮಾಸಿಕ ಸಂರಕ್ಷಣೆ ಕೊಡುಗೆ',
      meeting_attendance: 'ಸಭಾ ಹಾಜರಿ ದರ',
      attendance_description: 'ಸದಸ್ಯರ ಹಾಜರಿ ಶೇಕಡಾವಾರು',
      loan_repayment: 'ಕಡನ್ ವಾಪಾಸು ದರ',
      repayment_description: 'ಸಮಯಕ್ಕೆ ಮರುಪಾವತಿ ದರ',
      credit_score_result: 'ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ ಫಲಿತಾಂಶ',
      adjust_metrics: 'ನಿಮ್ಮ SHG ಮೆಟ್ರಿಕ್‌ಗಳನ್ನು ಹೊಂದಿಸಿ ಮತ್ತು ಫಲಿತಾಂಶವನ್ನು ನೋಡಲು "ಸ್ಕೋರ್ ಗಣನೆ ಮಾಡಿ" ಕ್ಲಿಕ್ ಮಾಡಿ',
      analyzing: 'ಎಐ ಬಳಸಿ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
      savings: 'ಸಂಚಯ',
      attendance: 'ಹಾಜರಿ',
      repayment: 'ಮರುಪಾವತಿ',
      excellent_credit: 'ಉತ್ತಮ ಕ್ರೆಡಿಟ್',
      good_credit: 'ಚೆನ್ನಾದ ಕ್ರೆಡಿಟ್',
      fair_credit: 'ಸರಾಸರಿ ಕ್ರೆಡಿಟ್',
      needs_improvement: 'ಸुधಾರಣೆ ಅಗತ್ಯ',
      calculated_at: 'ಲೆಕ್ಕಿಸಲಾಗಿದೆ',
    },
    te: {
      dashboard: 'డాష్‌బోర్డ్',
      sakhi_ai: 'సఖి ఏఐ',
      accounts: 'ఖాతాలు',
      transactions: 'లావాదేవీలు',
      reports: 'రిపోర్ట్లు',
      investments: 'నివేశాలు',
      loans: 'రుణాలు',
      settings: 'సెట్టింగ్స్',
      voice_on: 'వాయిస్ ప్రారంభం',
      voice_off: 'వాయిస్ ఆపి',
      calculate_score: 'స్కోర్ లెక్కించండి',
      reset: 'రిసెట్',
      add_new_widget: '+ కొత్త విడ్జెట్ చేర్చండి',
      monthly_savings: 'ప్రతి సభ్యుడి మాసిక పొదుపు',
      avg_monthly_savings: 'సగటు నెలవారీ పొదుపు భాగస్వామ్యం',
      meeting_attendance: 'సభ హాజರಿ రేటు',
      attendance_description: 'సభ్యుల హాజరు శాతం',
      loan_repayment: 'రుణపు తిరిగి చెల్లింపు రేటు',
      repayment_description: 'సమయానికి తిరిగి చెల్లింపు రేటు',
      credit_score_result: 'క్రెడిట్ స్కోర్ ఫలితం',
      adjust_metrics: 'మీ SHG మ్యాట్రిక్స్ సమీకరించి ఫలితాన్ని చూడటానికి "స్కోర్ లెక్కించండి" క్లిక్ చేయండి',
      analyzing: 'ఏఐతో విశ్లేషిస్తున్నాం...',
      savings: 'సేవింగ్స్',
      attendance: 'హాజరు',
      repayment: 'చెల్లింపు',
      excellent_credit: 'అద్భుతమైన క్రెడిట్',
      good_credit: 'మంచి క్రెడిట్',
      fair_credit: 'సామాన్య క్రెడిట్',
      needs_improvement: 'మెరుగుదల అవసరం',
      calculated_at: 'లెక్కించబడింది',
    },
    ml: {
      dashboard: 'ഡാഷ്ബോർഡ്',
      sakhi_ai: 'സഖി എഐ',
      accounts: 'അക്കൗണ്ടുകൾ',
      transactions: 'വ്യവഹാരങ്ങൾ',
      reports: 'റിപ്പോർട്ടുകൾ',
      investments: 'നിക്ഷേപങ്ങൾ',
      loans: 'ഋണങ്ങൾ',
      settings: 'ക്രമീകരണങ്ങൾ',
      voice_on: 'വോയ്സ് ഓൺ',
      voice_off: 'വോയ്സ് ഓഫ്',
      calculate_score: 'സ്കോർ കണക്കാക്കുക',
      reset: 'റീസെറ്റ്',
      add_new_widget: '+ പുതിയ വിഡ്ജറ്റ് ചേർക്കുക',
      monthly_savings: 'ഓരോ അംഗത്തിന്റെയും മാസാന്ത ശേഖരം',
      avg_monthly_savings: 'ശരാശരി മാസാന്ത ശേഖരണ പങ്ക്',
      meeting_attendance: 'യോഗത്തിലെ ഹാജരി നിരക്ക്',
      attendance_description: 'അംഗങ്ങളുടെ ഹാജർ ശതമാനം',
      loan_repayment: 'പണം തിരിച്ചടയ്ക്കൽ നിരക്ക്',
      repayment_description: 'സമയത്ത് തിരിച്ചടവ് നിരക്ക്',
      credit_score_result: 'ക്രെഡിറ്റ് സ്കോർ ഫലം',
      adjust_metrics: 'നിങ്ങളുടെ SHG മെട്രികുകൾ ക്രമീകരിച്ച് ഫലം കാണാൻ "സ്കോർ കണക്കാക്കുക" ക്ലിക്ക് ചെയ്യുക',
      analyzing: 'എഐ ഉപയോഗിച്ച് വിശകലനം...',
      savings: 'ശേഖരം',
      attendance: 'ഹാജരി',
      repayment: 'തിരിച്ചടവ്',
      excellent_credit: 'ഉത്തമ ക്രെഡിറ്റ്',
      good_credit: 'നല്ല ക്രെഡിറ്റ്',
      fair_credit: 'സാധാരണ ക്രെഡിറ്റ്',
      needs_improvement: 'മികച്ചതാവേണ്ടത്',
      calculated_at: 'കണക്കാക്കിയത്',
    },
    mr: {
      dashboard: 'डॅशबोर्ड',
      sakhi_ai: 'सखी एआय',
      accounts: 'खाते',
      transactions: 'व्यवहार',
      reports: 'अहवाल',
      investments: 'गुंतवणूक',
      loans: 'कर्ज',
      settings: 'सेटिंग्ज',
      voice_on: 'वॉइस चालू',
      voice_off: 'वॉइस बंद',
      calculate_score: 'स्कोअर गणना करा',
      reset: 'रीसेट',
      add_new_widget: '+ नवीन विजेट जोडा',
      monthly_savings: 'प्रति सदस्य मासिक बचत',
      avg_monthly_savings: 'सरासरी मासिक बचत योगदान',
      meeting_attendance: 'बैठकीची हजेरी दर',
      attendance_description: 'सदस्यांची हजेरी टक्केवारी',
      loan_repayment: 'कर्ज परतफेड दर',
      repayment_description: 'वेळेवर परतफेड दर',
      credit_score_result: 'क्रेडिट स्कोअर निकाल',
      adjust_metrics: 'आपले SHG मेट्रिक्स समायोजित करा आणि निकाल पाहण्यासाठी "स्कोअर गणना करा" क्लिक करा',
      analyzing: 'एआय सह विश्लेषण करत आहे...',
      savings: 'बचत',
      attendance: 'हजेरी',
      repayment: 'परतफेड',
      excellent_credit: 'उत्तम क्रेडिट',
      good_credit: 'चांगले क्रेडिट',
      fair_credit: 'सामान्य क्रेडिट',
      needs_improvement: 'सुधारणा आवश्यक',
      calculated_at: 'गणना केली',
    },
    gu: {
      dashboard: 'ડેશબોર્ડ',
      sakhi_ai: 'સખી એઆઇ',
      accounts: 'ખાતાઓ',
      transactions: 'લેનદેન',
      reports: 'રિપોર્ટ્સ',
      investments: 'નિવેશ',
      loans: 'કરજ',
      settings: 'સેટિંગ્સ',
      voice_on: 'વોઇસ ચાલુ',
      voice_off: 'વોઇસ બંધ',
      calculate_score: 'સ્કોર ગણો',
      reset: 'રીસેટ',
      add_new_widget: '+ નવું વિજેટ ઉમેરો',
      monthly_savings: 'દર સભ્ય માસિક બચત',
      avg_monthly_savings: 'સરેરાશ માસિક બચતનું યોગદાન',
      meeting_attendance: 'મીટિંગ હાજરી દર',
      attendance_description: 'સભ્યની હાજરી ટકા',
      loan_repayment: 'કરજની ચુકવણી દર',
      repayment_description: 'સમયસર ચુકવણી દર',
      credit_score_result: 'ક્રેડિટ સ્કોર પરિણામ',
      adjust_metrics: 'તમારા SHG મેટ્રિક્સને સમાયોજિત કરો અને પરિણામ જોવા માટે "સ્કોર ગણો" પર ક્લિક કરો',
      analyzing: 'એઆઇ સાથે વિશ્લેષણ...',
      savings: 'બચત',
      attendance: 'હાજરી',
      repayment: 'ચુકવણી',
      excellent_credit: 'ઉત્કૃષ્ટ ક્રેડિટ',
      good_credit: 'સારો ક્રેડિટ',
      fair_credit: 'સરેરાશ ક્રેડિટ',
      needs_improvement: 'સુધારો જરૂરી',
      calculated_at: 'ગણના કરવામાં આવી',
    },
    pa: {
      dashboard: 'ਡੈਸ਼ਬੋਰਡ',
      sakhi_ai: 'ਸਖੀ ਏਆਈ',
      accounts: 'ਖਾਤੇ',
      transactions: 'ਲੇਣਦੇਣ',
      reports: 'ਰਿਪੋਰਟਾਂ',
      investments: 'ਨਿਵੇਸ਼',
      loans: 'ਕਰਜ਼',
      settings: 'ਸੈਟਿੰਗਸ',
      voice_on: 'ਵੋਇਸ ਚਾਲੂ',
      voice_off: 'ਵੋਇਸ ਬੰਦ',
      calculate_score: 'ਸਕੋਰ ਗਣਨਾ ਕਰੋ',
      reset: 'ਰੀਸੈੱਟ',
      add_new_widget: '+ ਨਵਾਂ ਵਿਜਟ ਜੋੜੋ',
      monthly_savings: 'ਹਰ ਮੈਂਬਰ ਦੀ ਮਹੀਨਾਵਾਰ ਬਚਤ',
      avg_monthly_savings: 'ਔਸਤ ਮਹੀਨਾਵਾਰ ਬਚਤ ਯੋਗਦਾਨ',
      meeting_attendance: 'ਮੀਟਿੰਗ ਹਾਜ਼ਰੀ ਦਰ',
      attendance_description: 'ਸਦੱਸਾਂ ਦੀ ਹਾਜ਼ਰੀ ਪ੍ਰਤੀਸ਼ਤ',
      loan_repayment: 'ਕਰਜ਼ ਵਾਪਸੀ ਦਰ',
      repayment_description: 'ਸਮੇਂ ਉੱਤੇ ਵਾਪਸੀ ਦਰ',
      credit_score_result: 'ਕ੍ਰੈਡਿਟ ਸਕੋਰ ਨਤੀਜਾ',
      adjust_metrics: 'ਆਪਣੇ SHG ਮੈਟ੍ਰਿਕਸ ਨੂੰ ਸੰਸ਼ੋਧਿਤ ਕਰੋ ਅਤੇ ਨਤੀਜਾ ਵੇਖਣ ਲਈ "ਸਕੋਰ ਗਣਨਾ ਕਰੋ" ਤੇ ਕਲਿੱਕ ਕਰੋ',
      analyzing: 'ਏਅਈ ਨਾਲ ਵਿਸ਼ਲੇਸ਼ਣ...',
      savings: 'ਬਚਤ',
      attendance: 'ਹਾਜ਼ਰੀ',
      repayment: 'ਵਾਪਸੀ',
      excellent_credit: 'ਸ਼ਾਨਦਾਰ ਕਰੈਡਿਟ',
      good_credit: 'ਚੰਗਾ ਕਰੈਡਿਟ',
      fair_credit: 'ਸਧਾਰਨ ਕਰੈਡਿਟ',
      needs_improvement: 'ਸੁਧਾਰ ਦੀ ਲੋੜ',
      calculated_at: 'ਗਣਨਾ ਕੀਤੀ ਗਈ',
    }
  };

  const translate = (key) => {
    return (LOCALES[lang] && LOCALES[lang][key]) || (LOCALES['en'][key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      if (!ttsEnabled) return;
      let el = e.target;
      if (!el) return;
      if (['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
      let text = el.getAttribute && el.getAttribute('data-tts');
      if (!text) text = el.innerText || el.textContent;
      text = (text || '').trim();
      if (text && text.length > 0 && text.length < 400) {
        fetchAndPlay(text);
      }
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [ttsEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8 wave-1">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">SakhiScore</h1>
          <p className="text-slate-400">AI-Powered Credit Scoring for Self-Help Groups</p>
        </div>

        {/* Login Card */}
        <div className="glass rounded-2xl p-8 wave-2">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Login</h2>
            <p className="text-slate-400 text-sm mt-1">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Username
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 wave-3">
          {navItems.map((item) => {
            const label = translate(item.key);
            return (
              <button
                key={item.key}
                data-tts={label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  item.active 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Upgrade Card */}
        {sidebarOpen && (
          <div className="mx-4 mt-6 p-4 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 wave-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-white" />
              <p className="text-sm font-semibold text-white">Activate Pro</p>
            </div>
            <p className="text-xs text-blue-100 mb-3">
              Elevate finances with AI
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{' '}
              <button 
                onClick={onShowRegister}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Register here
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center wave-3">
          <p className="text-xs text-slate-500">
            Powered by AI & Explainable Machine Learning (SHAP)
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== REGISTRATION PAGE ====================
function RegisterPage({ onRegisterSuccess, onShowLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    shg_name: '',
    role: 'user',
    contact: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

              {/* Language Selector and Voice Toggle */}
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="glass-light px-3 py-2 rounded-xl text-sm text-slate-300 mr-2"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="bn">বাংলা</option>
                <option value="ta">தமிழ்</option>
                <option value="te">తెలుగు</option>
                <option value="mr">मराठी</option>
                <option value="kn">ಕನ್ನಡ</option>
                <option value="gu">ગુજરાતી</option>
                <option value="ml">മലയാളം</option>
              </select>

              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`glass-light px-3 py-2 rounded-xl transition-colors ${ttsEnabled ? 'bg-emerald-500 text-white' : 'text-slate-300'}`}
              >
                {ttsEnabled ? translate('voice_on') : translate('voice_off')}
              </button>

              {/* Speech-to-Text (Push-to-talk) */}
              <button
                onClick={() => (recording ? stopRecording() : startRecording())}
                className={`ml-2 px-3 py-2 rounded-xl border ${recording ? 'bg-red-500 text-white' : 'text-slate-300'}`}
              >
                {recording ? 'Stop' : 'Talk'}
              </button>

              {/* Add Widget Button */}
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-xl flex items-center gap-2 hover-lift">
                <span className="text-sm font-semibold text-white">{translate('add_new_widget')}</span>
              </button>
            </div>
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/register`, {
        username: formData.username,
        password: formData.password,
        full_name: formData.full_name,
        shg_name: formData.shg_name,
        role: formData.role,
        contact: formData.contact
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setTimeout(() => {
          onShowLogin();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">Join SakhiScore</h1>
          <p className="text-slate-400 text-sm">Register as SHG Representative or Member</p>
        </div>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Conversation Panel */}
          <div className="fixed right-6 top-24 w-80 max-h-96 overflow-auto glass rounded-xl p-3 text-sm z-50">
            {conversation.length === 0 ? (
              <p className="text-slate-400 text-xs">Conversation will appear here</p>
            ) : (
              conversation.map((m, i) => (
                <div key={i} className={`mb-2 ${m.speaker === 'user' ? 'text-white' : 'text-slate-300'}`}>
                  <div className="font-semibold text-xs uppercase">{m.speaker}</div>
                  <div className="mt-1">{m.text}</div>
                </div>
              ))
            )}

            {processingSTT && (
              <div className="mt-2 text-xs text-amber-300">Processing speech... ⏳</div>
            )}

            {detectedLang && (
              <div className="mt-2 text-xs text-slate-400">Detected language: {detectedLang}</div>
            )}

            {pendingAction && (
              <div className="mt-3 flex gap-2">
                <button onClick={confirmPending} className="px-3 py-1 bg-emerald-500 text-white rounded">Confirm</button>
                <button onClick={cancelPending} className="px-3 py-1 bg-red-500 text-white rounded">Cancel</button>
              </div>
            )}
          </div>
          {/* Top Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* AI Insights Card */}
            <div className="glass rounded-2xl p-6 hover-lift wave-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-400">AI Insights</h3>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">Score Volume</p>
                    <p className="text-lg font-bold text-white">
                      {result ? `+${result.score}%` : '+12%'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Your credit score has increased by {result ? result.score : '12'}% since last month
                </p>
        {/* Register Card */}
        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                I am registering as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    formData.role === 'admin'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Settings className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-sm font-semibold">SHG Representative</p>
                  <p className="text-xs opacity-70">Calculate scores</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    formData.role === 'user'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <UserCircle className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-sm font-semibold">SHG Member</p>
                  <p className="text-xs opacity-70">Apply for loans</p>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* SHG Group Name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">SHG Group Name</label>
              <input
                type="text"
                name="shg_name"
                value={formData.shg_name}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g., Shakti Mahila SHG"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.role === 'admin' 
                  ? 'You will manage this group\'s credit score'
                  : 'You will use this group\'s credit score to apply for loans'
                }
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Choose a username"
                required
                minLength={3}
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Password"
                  required
                  minLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Confirm</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Confirm"
                  required
                />
              </div>
            </div>

            {/* Contact (Optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Contact (Optional)</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Phone or email"
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  <span>Register</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <button 
                onClick={onShowLogin}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SHG GROUP DASHBOARD (Admin = SHG Representative) ====================
function AdminPanel({ user, onLogout }) {
  // Admin represents an SHG group - they update group financial details
  const [groupData, setGroupData] = useState({
    savings: 2500,
    attendance: 85,
    repayment: 75
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loanRequests, setLoanRequests] = useState([]);

  useEffect(() => {
    fetchGroupData();
  }, []);

  const fetchGroupData = async () => {
    try {
      // Fetch group's saved financial data
      const response = await axios.get(`${API_URL}/shg/group_data`, {
        headers: getAuthHeaders()
      });
      if (response.data.group_data) {
        setGroupData({
          savings: response.data.group_data.savings || 2500,
          attendance: response.data.group_data.attendance || 85,
          repayment: response.data.group_data.repayment || 75
        });
        if (response.data.group_data.score) {
          setResult({
            score: response.data.group_data.score,
            risk: response.data.group_data.risk
          });
        }
      }
      if (response.data.members) {
        setGroupMembers(response.data.members);
      }
      if (response.data.loan_requests) {
        setLoanRequests(response.data.loan_requests);
      }
    } catch (err) {
      console.error('Failed to fetch group data:', err);
    }
  };

  const handleInputChange = (field, value) => {
    setGroupData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculateScore = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, {
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to calculate score');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroupData = async () => {
    if (!result) {
      setError('Please calculate your credit score first');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Save current group data
      await axios.post(`${API_URL}/shg/update_group_data`, {
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment,
        score: result.score,
        risk: result.risk
      }, {
        headers: getAuthHeaders()
      });

      // Log to score history (append, don't replace)
      await axios.post(`${API_URL}/score/log`, {
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment,
        score: result.score,
        risk: result.risk
      }, {
        headers: getAuthHeaders()
      });

      setSuccess('Score saved and logged to history! Members can now apply for loans. Managers will see your financial trend.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save group data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{user?.shg_name || 'SHG Group'}</h1>
              <p className="text-xs text-slate-400">Group Dashboard • Update Financial Details</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Welcome, {user?.full_name}</span>
            <button
              onClick={onLogout}
              className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Alerts */}
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <p className="text-emerald-400">{success}</p>
              <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Info Banner */}
          <div className="glass rounded-2xl p-6 mb-6 border border-blue-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Settings className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">SHG Group Representative</h2>
                <p className="text-slate-400 text-sm">
                  As the group representative, you can update your SHG's financial metrics. 
                  Once you save, all group members can apply for loans using this credit score.
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Financial Metrics Input */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6 hover-lift">
                <h2 className="text-lg font-bold text-white mb-6">Update Group Financial Metrics</h2>
                <form onSubmit={handleCalculateScore} className="space-y-6">
                  <FormInput
                    label={translate('monthly_savings')}
                    icon={<IndianRupee className="h-5 w-5" />}
                    value={groupData.savings}
                    onChange={(value) => handleInputChange('savings', value)}
                    min={100}
                    max={5000}
                    step={100}
                    unit="₹"
                    description={translate('avg_monthly_savings')}
                    color="emerald"
                  />

                  <FormInput
                    label={translate('meeting_attendance')}
                    icon={<Calendar className="h-5 w-5" />}
                    value={groupData.attendance}
                    onChange={(value) => handleInputChange('attendance', value)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    description={translate('attendance_description')}
                    color="blue"
                  />

                  <FormInput
                    label={translate('loan_repayment')}
                    icon={<Wallet className="h-5 w-5" />}
                    value={groupData.repayment}
                    onChange={(value) => handleInputChange('repayment', value)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    description={translate('repayment_description')}
                    color="purple"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Calculating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>Calculate Credit Score</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Loan Requests from Members */}
              {loanRequests.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Member Loan Requests</h3>
                  <div className="space-y-3">
                    {loanRequests.map((req, idx) => (
                      <div key={idx} className="glass-light rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{req.member_name}</p>
                          <p className="text-slate-400 text-sm">Score: {req.score}/100</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          req.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          req.status === 'Rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Score Display */}
            <div className="space-y-6">
              {result ? (
                <>
                  <ScoreCard result={result} formData={groupData} />
                  
                  {/* Save Button */}
                  <div className="glass rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Save Group Score</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Save this score so your group members can apply for loans. 
                      The manager will review their applications with this credit score.
                    </p>
                    <button
                      onClick={handleSaveGroupData}
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{translate('analyzing')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          <span>{translate('calculate_score')}</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleReset}
                      className="glass-light text-slate-300 font-semibold py-3 px-6 rounded-xl hover-lift"
                    >
                      {translate('reset')}
                    </button>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>Save & Enable Loan Applications</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* SHAP Explanation */}
                  {result.explanation_image && (
                    <div className="glass rounded-2xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">AI Explanation</h3>
                      <div className="bg-slate-800/50 rounded-xl p-4">
                        <img 
                          src={result.explanation_image} 
                          alt="SHAP Explanation" 
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass rounded-2xl p-12 text-center">
                  <Activity className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Calculate Your Score</h3>
                  <p className="text-slate-400">
                    Enter your group's financial metrics and calculate the credit score.
                    Then save it so members can apply for loans.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MANAGER INBOX ====================
function ManagerInbox({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [scoreHistory, setScoreHistory] = useState([]);  // New: Historical scores
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Fetch score history when a request is selected
  useEffect(() => {
    if (selectedRequest?.shg_name) {
      fetchScoreHistory(selectedRequest.shg_name);
    }
  }, [selectedRequest]);

  const fetchScoreHistory = async (shgName) => {
    setLoadingHistory(true);
    try {
      console.log('Fetching score history for:', shgName);
      const response = await axios.get(`${API_URL}/score/history/${encodeURIComponent(shgName)}?limit=6`, {
        headers: getAuthHeaders()
      });
      console.log('Score history response:', response.data);
      const history = response.data.history || [];
      console.log('Score history entries:', history.length, history);
      setScoreHistory(history);
    } catch (err) {
      console.error('Failed to fetch score history:', err);
      setScoreHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/loan/all`, {
        headers: getAuthHeaders()
      });
      setRequests(response.data.requests);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      // Fallback to legacy endpoint
      try {
        const fallback = await axios.get(`${API_URL}/get_requests?status=Pending`);
        setRequests(fallback.data.requests);
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    setUpdating(true);
    try {
      await axios.post(`${API_URL}/loan/update_status`, {
        request_id: requestId,
        status: status,
        manager_notes: `${status} by ${user?.full_name || 'manager'}`
      }, {
        headers: getAuthHeaders()
      });
      
      setRequests(prev => prev.filter(r => r._id !== requestId));
      setSelectedRequest(null);
    } catch (err) {
      // Fallback to legacy endpoint
      try {
        await axios.post(`${API_URL}/update_status`, {
          request_id: requestId,
          status: status,
          manager_notes: `${status} by ${user?.full_name || 'manager'}`
        });
        setRequests(prev => prev.filter(r => r._id !== requestId));
        setSelectedRequest(null);
      } catch (e) {
        alert('Failed to update status: ' + (e.response?.data?.detail || e.message));
      }
    } finally {
      setUpdating(false);
    }
  };

  const downloadPDF = () => {
    if (!selectedRequest) return;

    const doc = new jsPDF();
    const req = selectedRequest;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('SakhiScore - Loan Request Report', 20, 20);

    // Line separator
    doc.setDrawColor(203, 213, 225);
    doc.line(20, 25, 190, 25);

    // SHG Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('SHG Information', 20, 35);
    doc.setFontSize(10);
    doc.text(`Name: ${req.shg_name}`, 20, 42);
    doc.text(`Contact: ${req.contact}`, 20, 48);
    doc.text(`Submitted: ${new Date(req.submitted_at).toLocaleString()}`, 20, 54);

    // Credit Score
    doc.setFontSize(12);
    doc.text('Current Credit Score Analysis', 20, 65);
    doc.setFontSize(10);
    doc.text(`Score: ${req.score}/100`, 20, 72);
    doc.text(`Risk Level: ${req.risk}`, 20, 78);

    // Metrics
    doc.text('Current Financial Metrics', 20, 90);
    doc.text(`Savings per Member: Rs.${req.savings}`, 20, 97);
    doc.text(`Attendance Rate: ${req.attendance}%`, 20, 103);
    doc.text(`Repayment Rate: ${req.repayment}%`, 20, 109);

    // 6-Month Performance History Table
    let yPos = 125;
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('6-Month Performance History', 20, yPos);
    yPos += 8;

    if (scoreHistory.length > 0) {
      // Table Header
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Month', 20, yPos);
      doc.text('Savings', 55, yPos);
      doc.text('Attendance', 85, yPos);
      doc.text('Repayment', 120, yPos);
      doc.text('Score', 155, yPos);
      doc.text('Risk', 175, yPos);
      
      yPos += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPos, 190, yPos);
      yPos += 5;

      // Table Data
      doc.setTextColor(0, 0, 0);
      scoreHistory.forEach((entry) => {
        doc.text(entry.month_label || 'N/A', 20, yPos);
        doc.text(`Rs.${entry.savings}`, 55, yPos);
        doc.text(`${entry.attendance}%`, 85, yPos);
        doc.text(`${entry.repayment}%`, 120, yPos);
        doc.text(`${entry.score}`, 155, yPos);
        doc.text(entry.risk?.includes('Low') ? 'Low' : 'High', 175, yPos);
        yPos += 6;
      });
      
      yPos += 5;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No historical data available', 20, yPos);
      yPos += 10;
    }

    // Reviewed by
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Reviewed by: ${user?.full_name || 'Bank Manager'}`, 20, yPos);
    yPos += 15;

    // SHAP Image (on new page if needed)
    if (req.explanation_image) {
      if (yPos > 180) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text('AI Explanation (SHAP Waterfall)', 20, yPos);
      yPos += 5;
      try {
        doc.addImage(req.explanation_image, 'PNG', 20, yPos, 170, 100);
      } catch (e) {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('(Chart image unavailable)', 20, yPos + 10);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Generated by SakhiScore AI System', 20, 280);
    doc.text(`Report Date: ${new Date().toLocaleString()}`, 20, 285);

    doc.save(`loan-request-${req.shg_name.replace(/\s+/g, '-')}.pdf`);
  };

  if (selectedRequest) {
    // Detail View
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="glass border-b border-slate-700/50 px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedRequest(null)}
              className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to List</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadPDF}
                className="bg-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-white"
              >
                <FileDown className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
              <button onClick={onLogout} className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: Request Details */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">{selectedRequest.shg_name}</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-300">
                    <UserCircle className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Contact</p>
                      <p className="font-medium">{selectedRequest.contact}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-300">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Submitted</p>
                      <p className="font-medium">{new Date(selectedRequest.submitted_at).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 my-4"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Savings/Member</p>
                      <p className="text-lg font-bold text-emerald-400">₹{selectedRequest.savings}</p>
                    </div>
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Attendance</p>
                      <p className="text-lg font-bold text-blue-400">{selectedRequest.attendance}%</p>
                    </div>
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Repayment</p>
                      <p className="text-lg font-bold text-purple-400">{selectedRequest.repayment}%</p>
                    </div>
                    <div className="glass-light rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">Credit Score</p>
                      <p className="text-lg font-bold text-white">{selectedRequest.score}/100</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Decision</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest._id, 'Approved')}
                    disabled={updating}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest._id, 'Rejected')}
                    disabled={updating}
                    className="bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-5 w-5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* 6-Month Score History */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    6-Month Performance History
                  </h3>
                  {loadingHistory && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                </div>
                
                {scoreHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-400 font-semibold">Month</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Savings</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Attendance</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Repayment</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Score</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-semibold">Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoreHistory.map((entry, idx) => (
                          <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-3 px-3 text-white font-medium">{entry.month_label}</td>
                            <td className="py-3 px-3 text-center text-emerald-400">₹{entry.savings}</td>
                            <td className="py-3 px-3 text-center text-blue-400">{entry.attendance}%</td>
                            <td className="py-3 px-3 text-center text-purple-400">{entry.repayment}%</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`font-bold ${entry.score >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {entry.score}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                entry.score >= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {entry.risk}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No historical data available yet</p>
                    <p className="text-slate-500 text-xs">History builds as SHG Rep saves scores</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Score & SHAP */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Credit Score & AI Explanation</h3>
              
              {/* Score Display */}
              <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                  <span className="text-4xl font-bold text-white">{selectedRequest.score}</span>
                </div>
                <p className="text-xl font-bold text-white">{selectedRequest.risk}</p>
              </div>

              {/* SHAP Image */}
              {selectedRequest.explanation_image && (
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-sm text-slate-400 mb-3">SHAP Waterfall Explanation</p>
                  <img 
                    src={selectedRequest.explanation_image} 
                    alt="SHAP Explanation" 
                    className="w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="glass border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Manager Inbox</h1>
              <p className="text-xs text-slate-400">Review & Approve Loan Requests</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Welcome, {user?.full_name}</span>
            <button onClick={onLogout} className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

            {/* Right Column - Score Results */}
            <div className="wave-7">
              <ScoreCard result={result} loading={loading} formData={formData} strings={LOCALES[lang]} />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Pending Loan Requests</h2>
              <button
                onClick={fetchRequests}
                className="glass-light px-4 py-2 rounded-xl text-sm text-slate-300 hover-lift flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
                <p className="text-slate-400 mt-4">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No pending requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">SHG Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Score</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Risk</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Submitted</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-4 px-4 text-white font-medium">{req.shg_name}</td>
                        <td className="py-4 px-4 text-slate-300">{req.contact}</td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-white">{req.score}</span>
                          <span className="text-slate-400">/100</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            req.score >= 60 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {req.risk}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-400 text-sm">
                          {new Date(req.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="glass-light px-4 py-2 rounded-lg flex items-center gap-2 hover-lift text-blue-400"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">Review</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SHG MEMBER DASHBOARD (User) ====================
function SHGDashboard({ user, onLogout }) {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loanAmount, setLoanAmount] = useState(10000);
  const [loanPurpose, setLoanPurpose] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Auto-dismiss success message after 5 seconds
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch group data (score calculated by admin/SHG representative)
      const groupResponse = await axios.get(`${API_URL}/shg/my_group_data`, {
        headers: getAuthHeaders()
      });
      setGroupData(groupResponse.data);

      // Fetch my loan requests
      const requestsResponse = await axios.get(`${API_URL}/loan/my_requests`, {
        headers: getAuthHeaders()
      });
      setMyRequests(requestsResponse.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyForLoan = async () => {
    if (!groupData?.score) {
      setError('Your SHG group has not calculated their credit score yet. Please contact your SHG representative.');
      return;
    }

    if (!loanPurpose.trim()) {
      setError('Please enter the purpose of your loan');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await axios.post(`${API_URL}/loan/apply`, {
        group_id: user?.shg_name || 'Unknown',
        shg_name: user?.shg_name || 'Unknown',
        member_name: user?.full_name,
        contact: user?.contact || '',
        loan_amount: loanAmount,
        loan_purpose: loanPurpose,
        savings: groupData.savings,
        attendance: groupData.attendance,
        repayment: groupData.repayment,
        score: groupData.score,
        risk: groupData.risk,
        explanation_image: groupData.explanation_image
      }, {
        headers: getAuthHeaders()
      });

      setSuccess('Loan application submitted successfully! The manager will review your request.');
      setLoanPurpose('');
      setLoanAmount(10000);
      
      // Refresh data after a short delay to ensure backend has processed
      setTimeout(() => {
        fetchData();
      }, 500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'Rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  // No longer blocking multiple applications
  // const hasPendingRequest = myRequests.some(r => r.status === 'Pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{user?.full_name}</h1>
              <p className="text-xs text-slate-400">{user?.shg_name} • SHG Member</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift text-slate-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Alerts */}
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <p className="text-emerald-400">{success}</p>
              <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
              <p className="text-slate-400 mt-4">Loading...</p>
            </div>
          ) : (
            <>
              {/* Group Credit Score Section */}
              <div className="glass rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-bold text-white mb-4">Your SHG Group Credit Score</h2>
                
                {groupData?.score ? (
                  <div className="flex items-center gap-8">
                    <div className="flex-shrink-0">
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                        groupData.score >= 60 
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                          : 'bg-gradient-to-br from-red-500 to-orange-600'
                      }`}>
                        <span className="text-4xl font-bold text-white">{groupData.score}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-2xl font-bold text-white mb-2">{groupData.risk}</p>
                      <p className="text-slate-400 mb-4">
                        This score was calculated by your SHG representative based on your group's financial performance.
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="glass-light rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500">Savings</p>
                          <p className="text-lg font-bold text-emerald-400">₹{groupData.savings}</p>
                        </div>
                        <div className="glass-light rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500">Attendance</p>
                          <p className="text-lg font-bold text-blue-400">{groupData.attendance}%</p>
                        </div>
                        <div className="glass-light rounded-xl p-3 text-center">
                          <p className="text-xs text-slate-500">Repayment</p>
                          <p className="text-lg font-bold text-purple-400">{groupData.repayment}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">No Credit Score Available</p>
                    <p className="text-slate-400 text-sm">
                      Your SHG representative has not calculated the group's credit score yet.
                      Please contact them to update the group's financial details.
                    </p>
                  </div>
                )}
              </div>

              {/* My Loan Applications - Always visible with scrollable list */}
              <div className="glass rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">My Loan Applications ({myRequests.length})</h2>
                  <button
                    onClick={fetchData}
                    className="glass-light px-3 py-2 rounded-lg text-sm text-slate-300 hover-lift flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
                
                {myRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No loan applications yet. Submit your first application below!</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Purpose</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Score</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.map((req) => (
                          <tr key={req._id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-4 px-4 text-white font-bold">₹{req.loan_amount?.toLocaleString() || 'N/A'}</td>
                            <td className="py-4 px-4 text-slate-300">{req.loan_purpose || req.shg_name}</td>
                            <td className="py-4 px-4 text-white">{req.score}/100</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(req.status)}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-400 text-sm">
                              {new Date(req.submitted_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Apply for Loan Section - Always visible if group has score */}
              {groupData?.score && (
                <div className="glass rounded-2xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4">Apply for a Loan</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Based on your SHG group's credit score, you can apply for a loan. 
                    The bank manager will review your application.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Loan Amount (₹)</label>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(Number(e.target.value))}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        min={1000}
                        max={100000}
                        step={1000}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Purpose of Loan *</label>
                      <input
                        type="text"
                        value={loanPurpose}
                        onChange={(e) => setLoanPurpose(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        placeholder="e.g., Business expansion, Education, Medical"
                        required
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleApplyForLoan}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 rounded-xl hover-lift disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5" />
                        <span>Submit Loan Application</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  // Check for saved user session on load
  useEffect(() => {
    const savedToken = localStorage.getItem('sakhiToken');
    const savedUser = localStorage.getItem('sakhiUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/logout`, {}, {
        headers: getAuthHeaders()
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('sakhiToken');
    localStorage.removeItem('sakhiUser');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Not logged in - show login or register page
  if (!user || !token) {
    if (showRegister) {
      return (
        <RegisterPage 
          onRegisterSuccess={() => setShowRegister(false)}
          onShowLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        onShowRegister={() => setShowRegister(true)}
      />
    );
  }

  // Redirect based on role
  switch (user.role) {
    case 'admin':
      return <AdminPanel user={user} onLogout={handleLogout} />;
    case 'manager':
      return <ManagerInbox user={user} onLogout={handleLogout} />;
    case 'user':
      return <SHGDashboard user={user} onLogout={handleLogout} />;
    default:
      // Unknown role - logout
      handleLogout();
      return (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess}
          onShowRegister={() => setShowRegister(true)}
        />
      );
  }
}

export default App;
