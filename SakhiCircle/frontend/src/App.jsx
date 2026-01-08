import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard,
  TrendingUp,
  Wallet,
  FileText,
  PieChart,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Calendar,
  IndianRupee,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Activity,
  CreditCard,
  AlertCircle,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import FormInput from './components/FormInput';
import ScoreCard from './components/ScoreCard';

const API_URL = 'http://localhost:8000';

function App() {
  const [formData, setFormData] = useState({
    savings: 2500,
    attendance: 85,
    repayment: 75
  });

  const [result, setResult] = useState(null);
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      setResult(response.data);
    } catch (err) {
      console.error('Prediction error:', err);
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please ensure the backend is running on port 8000.');
      } else if (err.response?.status === 503) {
        setError('Model not loaded. Please run model_trainer.py first.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to get prediction. Please try again.');
      }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen glass border-r border-slate-700/50 transition-all duration-300 z-50 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-700/50 wave-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-lg font-bold gradient-text">SakhiScore</h1>
                <p className="text-xs text-slate-400">AI Credit System</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Section */}
        {sidebarOpen && (
          <div className="p-6 border-b border-slate-700/50 wave-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Welcome back,</p>
                <p className="text-2xl font-bold text-white">Sakhi!</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">MONDAY, JANUARY 8</p>
          </div>
        )}

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
            </p>
            <button className="w-full bg-white text-blue-600 text-sm font-semibold py-2 rounded-lg hover:bg-blue-50 transition-colors">
              Upgrade Now
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="glass border-b border-slate-700/50 px-8 py-4 wave-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              {/* Month Selector */}
              <button className="glass-light px-4 py-2 rounded-xl flex items-center gap-2 hover-lift">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-white">This Month</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 glass-light px-4 py-2 rounded-xl">
                <Search className="h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 w-48"
                />
              </div>

              {/* Notifications */}
              <button className="relative glass-light p-3 rounded-xl hover-lift">
                <Bell className="h-5 w-5 text-slate-400" />
                <span className="notification-badge"></span>
              </button>

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
          </div>
        </header>

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
              </div>
            </div>

            {/* Balance Overview */}
            <div className="glass rounded-2xl p-6 hover-lift wave-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-400">Balance Overview</h3>
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mb-1">
                <p className="text-3xl font-bold text-white">₹{formData.savings.toLocaleString()}</p>
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    12%
                  </span>
                  <span className="text-slate-400">From last month</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
                <Activity className="h-3 w-3" />
                <span>{formData.attendance} transactions</span>
                <span>•</span>
                <span>12 categories</span>
              </div>
            </div>

            {/* Earnings */}
            <div className="glass rounded-2xl p-6 hover-lift wave-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-400">Earnings</h3>
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white">₹{(formData.savings * 1.2).toLocaleString()}</p>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  7%
                </span>
                <span className="text-slate-400">From last month</span>
              </div>
              
              {/* Mini Circular Progress */}
              <div className="mt-4 flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="transform -rotate-90" width="64" height="64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="6" />
                    <circle 
                      cx="32" cy="32" r="28" fill="none" 
                      stroke="url(#gradient)" 
                      strokeWidth="6"
                      strokeDasharray={`${(formData.repayment / 100) * 176} 176`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{formData.repayment}%</span>
                  </div>
                </div>
                <div className="text-xs">
                  <p className="text-slate-400">Percentage</p>
                  <p className="text-white font-semibold">Current vs Month goal</p>
                </div>
              </div>
            </div>

            {/* Spending */}
            <div className="glass rounded-2xl p-6 hover-lift wave-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-400">Spending</h3>
                <ArrowDownRight className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-3xl font-bold text-white">₹{(formData.savings * 0.4).toLocaleString()}</p>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className="text-red-400 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" />
                  2%
                </span>
                <span className="text-slate-400">From last month</span>
              </div>

              {/* Category Pills */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'Clothing', value: 34, icon: '👔' },
                  { label: 'Groceries', value: 16, icon: '🛒' },
                  { label: 'Pets', value: 8, icon: '🐾' },
                  { label: 'Bills', value: 6, icon: '💡' }
                ].map((cat, idx) => (
                  <div key={idx} className="glass-light rounded-lg px-2 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{cat.icon}</span>
                      <span className="text-xs text-slate-300">{cat.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Transactions/Form */}
            <div className="space-y-6">
              {/* SHG Metrics Card */}
              <div className="glass rounded-2xl p-6 hover-lift wave-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white">SHG Financial Metrics</h2>
                    <p className="text-sm text-slate-400 mt-1">Adjust metrics to calculate credit score</p>
                  </div>
                  <CreditCard className="h-6 w-6 text-blue-400" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormInput
                    label={translate('monthly_savings')}
                    icon={<IndianRupee className="h-5 w-5" />}
                    value={formData.savings}
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
                    value={formData.attendance}
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
                    value={formData.repayment}
                    onChange={(value) => handleInputChange('repayment', value)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    description={translate('repayment_description')}
                    color="purple"
                  />

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-300">Error</p>
                        <p className="text-sm text-red-400 mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover-lift disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
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
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column - Score Results */}
            <div className="wave-7">
              <ScoreCard result={result} loading={loading} formData={formData} strings={LOCALES[lang]} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
