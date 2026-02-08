import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  History, 
  Mic, 
  Zap, 
  ZapOff, 
  RotateCw, 
  Crop, 
  Search, 
  ArrowLeft, 
  Leaf, 
  Droplets, 
  Sun, 
  Wind,
  ExternalLink,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RotateCcw
} from 'lucide-react';

// --- Configuration ---
const API_BASE_URL = "https://plantque.onrender.com"; // Python FastAPI server address

const App = () => {
  // --- States ---
  const [view, setView] = useState('home'); 
  const [capturedImage, setCapturedImage] = useState(null);
  const [compressedImage, setCompressedImage] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [previewRotation, setPreviewRotation] = useState(0); // Algorithm for image rotation

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const userId = useRef("user_" + Math.random().toString(36).substr(2, 9)).current;

  // Load History on Mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('plantque_history');
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory));
  }, []);

  // --- 1. Strong Compression Algorithm (Token & Bandwidth Optimization) ---
  const compressImage = (imageDataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageDataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Apply rotation if needed during final processing
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedData = canvas.toDataURL('image/jpeg', 0.7); 
        resolve(compressedData);
      };
    });
  };

  // --- 2. Advanced Camera Module ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setErrorMsg("Camera access nahi mila. Settings check karein.");
    }
  };

  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      
      setCapturedImage(dataUrl);
      const compressed = await compressImage(dataUrl);
      setCompressedImage(compressed);
      
      const stream = video.srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());
      setView('preview');
      setPreviewRotation(0); // Reset rotation for new capture
    }
  };

  // --- 3. Client-Side Plant Filter (Strong Keyword Algorithm) ---
  const isQueryPlantRelated = (text) => {
    const plantKeywords = ['plant', 'ped', 'phool', 'flower', 'leaf', 'tree', 'patti', 'care', 'health', 'mitti', 'soil', 'water', 'khaad', 'fertilizer', 'poda'];
    return plantKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };

  // --- 4. Backend Identification Logic ---
  const handleIdentify = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressedImage,
          userId: userId
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || "Server down hai, kripya baad mein koshish karein.");
      if (data.error) throw new Error(data.error);

      setApiResult(data);
      
      // Update History Algorithm
      const newHistory = [{
        id: Date.now(),
        name: data.identity.name,
        date: new Date().toLocaleDateString(),
        img: compressedImage,
        fullData: data
      }, ...searchHistory];
      setSearchHistory(newHistory);
      localStorage.setItem('plantque_history', JSON.stringify(newHistory));
      
      setView('result');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // --- 5. Bilingual Voice Search with Local Filter ---
  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Voice recognition supported nahi hai.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setVoiceQuery(transcript);
      
      if (!isQueryPlantRelated(transcript)) {
        setVoiceQuery("Sirf plants se jude sawal puchein!");
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/voice-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: transcript, lang: 'hi' })
        });
        const data = await res.json();
        setVoiceQuery(data.answer);
      } catch (e) {
        setErrorMsg("Voice query processing fail ho gayi.");
      }
    };
    recognition.start();
  };

  // --- UI Components ---
  const Header = () => (
    <div className="flex items-center justify-between p-4 bg-emerald-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-2">
        <Leaf className="text-emerald-400" size={28} />
        <h1 className="text-xl font-bold tracking-tight">PlantQue</h1>
      </div>
      <button onClick={() => setView('history')} className="hover:text-emerald-300 transition p-2">
        <History size={24} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 select-none overflow-x-hidden">
      <style>
        {`
          @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
          .animate-scan { animation: scan 2s linear infinite; }
          .image-preview-transition { transition: transform 0.3s ease-in-out; }
        `}
      </style>

      {/* Error Feedback UI */}
      {errorMsg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl transform animate-in fade-in zoom-in duration-300">
            <div className="text-red-500 mb-4 flex justify-center"><AlertCircle size={48} /></div>
            <h3 className="text-center font-bold text-xl mb-2 text-slate-900">Galti Ho Gayi!</h3>
            <p className="text-center text-slate-600 mb-6 text-sm">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-active active:scale-95">Theek Hai</button>
          </div>
        </div>
      )}

      {/* 1. HOME VIEW */}
      {view === 'home' && (
        <div className="max-w-4xl mx-auto">
          <Header />
          <div className="p-6">
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-emerald-100 border border-emerald-50 mb-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="text-emerald-600" size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-emerald-900">Identify Any Plant</h2>
              <p className="text-slate-500 mb-6 text-sm">AI analysis se paudhe ki sehat aur care tips payein.</p>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { setView('camera'); startCamera(); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg shadow-emerald-200"
                >
                  <Camera size={24} /> Capture Photo
                </button>
                <label className="w-full bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-50 cursor-pointer transition-all">
                  <ImageIcon size={24} /> Gallery se Upload
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files[0];
                    if(file) {
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        setCapturedImage(reader.result);
                        setCompressedImage(await compressImage(reader.result));
                        setView('preview');
                      };
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
            </div>

            {/* Smart Voice Input Section */}
            <div className="relative mb-8">
              <input 
                type="text" 
                placeholder={isListening ? "Sun raha hoon..." : "Ask: Is mitti ko kab badle?"}
                value={voiceQuery}
                readOnly
                className="w-full p-4 pr-14 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 outline-none transition shadow-sm bg-white font-medium"
              />
              <button onClick={startVoiceSearch} className={`absolute right-2 top-2 p-2 rounded-xl transition ${isListening ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100'} text-white`}>
                <Mic size={24} />
              </button>
            </div>

            <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
              <History size={20} className="text-emerald-600" /> Recent Searches
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {searchHistory.slice(0, 4).map((item) => (
                <div key={item.id} onClick={() => { setApiResult(item.fullData); setCompressedImage(item.img); setView('result'); }} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group cursor-pointer hover:shadow-md transition">
                  <img src={item.img} alt="" className="w-full h-24 object-cover" />
                  <div className="p-2">
                    <p className="font-bold text-[11px] truncate text-emerald-900 uppercase tracking-wider">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.date}</p>
                  </div>
                </div>
              ))}
              {searchHistory.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-400 font-medium italic">Abhi tak koi purana search nahi mila.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ADVANCED CAMERA VIEW */}
      {view === 'camera' && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
            <button onClick={() => setView('home')} className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white"><ArrowLeft size={24} /></button>
            <button onClick={() => setIsFlashOn(!isFlashOn)} className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white">
              {isFlashOn ? <Zap size={24} className="text-yellow-400" /> : <ZapOff size={24} />}
            </button>
          </div>
          
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            {/* SCANNER OVERLAY - Restored with Corner Borders */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-72 border-2 border-emerald-400/30 rounded-[32px] relative overflow-hidden">
                {/* Visual Corners */}
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-3xl"></div>
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-3xl"></div>
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-3xl"></div>
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-3xl"></div>
                
                {/* Moving Scan Line Algorithm */}
                <div className="absolute w-full h-1 bg-emerald-400 shadow-[0_0_20px_#10b981] top-0 left-0 animate-scan"></div>
              </div>
            </div>
          </div>

          <div className="p-10 bg-black/50 backdrop-blur-lg flex justify-around items-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center text-white"><ImageIcon size={24} /></div>
            <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1">
              <div className="w-full h-full bg-white rounded-full active:scale-90 transition-transform"></div>
            </button>
            <div className="w-12 h-12"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* 3. PREVIEW VIEW WITH ROTATION */}
      {view === 'preview' && (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col">
          <div className="p-6 flex items-center justify-between text-white">
            <button onClick={() => setView('camera')} className="flex items-center gap-2"><ArrowLeft size={20} /> Retake</button>
            <h2 className="font-bold">Fine Tune Photo</h2>
            <div className="flex gap-4">
              <button onClick={() => setPreviewRotation(prev => prev + 90)} className="p-2 bg-white/10 rounded-lg"><RotateCw size={20} /></button>
              <button className="p-2 bg-white/10 rounded-lg opacity-50"><Crop size={20} /></button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative max-w-full max-h-[60vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
              <img 
                src={capturedImage} 
                alt="Preview" 
                className="w-full h-full object-contain image-preview-transition" 
                style={{ transform: `rotate(${previewRotation}deg)` }}
              />
              {isScanning && (
                <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
                   <Loader2 className="w-16 h-16 animate-spin mb-4 text-emerald-400" />
                   <p className="text-xl font-bold animate-pulse">Deep Scanning Process...</p>
                   <p className="text-xs text-emerald-200 mt-2">Leaf patterns aur pixel density analyze ki ja rahi hai.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 bg-white rounded-t-[40px] flex flex-col gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
            <p className="text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">Pixel Compression: Optimized for API</p>
            <button 
              onClick={handleIdentify} 
              disabled={isScanning} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 transition-all disabled:opacity-50"
            >
              <Search size={24} /> Identify Details
            </button>
          </div>
        </div>
      )}

      {/* 4. RESULT DASHBOARD (PREMIUM UI) */}
      {view === 'result' && apiResult && (
        <div className="max-w-4xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom duration-500">
          <div className="relative h-80 overflow-hidden">
            <img src={compressedImage} className="w-full h-full object-cover" alt="Result" />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-900 via-emerald-900/20 to-transparent opacity-60"></div>
            <button onClick={() => setView('home')} className="absolute top-6 left-6 p-3 bg-white/20 backdrop-blur-md text-white rounded-full"><ArrowLeft size={24} /></button>
          </div>

          <div className="px-6 -mt-16 relative z-10">
            {/* Identity Card */}
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-emerald-50 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-black text-emerald-950 leading-tight">{apiResult.identity.name}</h1>
                  <p className="text-emerald-600 font-semibold italic text-sm">{apiResult.identity.scientific_name}</p>
                </div>
                <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
                  <Leaf size={32} />
                </div>
              </div>
              
              {/* Health Percentage Card Algorithm */}
              <div className="bg-emerald-50 rounded-2xl p-5 flex items-center gap-5">
                <div className="relative w-16 h-16 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                     <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-emerald-100" />
                     <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={176} strokeDashoffset={176 - (176 * apiResult.health.health_percentage) / 100} className="text-emerald-600 transition-all duration-1000" />
                   </svg>
                   <span className="absolute font-black text-xs text-emerald-900">{apiResult.health.health_percentage}%</span>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950">Health Status: {apiResult.health.health_percentage > 75 ? 'Swasth' : 'Attention Required'}</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">Issues detected: {apiResult.health.issues}</p>
                </div>
              </div>
            </div>

            {/* Environment Cards Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-orange-50 p-5 rounded-[28px] border border-orange-100 flex flex-col">
                <Sun className="text-orange-500 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-950 opacity-40">Sunlight</span>
                <p className="font-bold text-slate-800 text-sm">{apiResult.health.sunlight_captured}</p>
              </div>
              <div className="bg-blue-50 p-5 rounded-[28px] border border-blue-100 flex flex-col">
                <Droplets className="text-blue-500 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-950 opacity-40">Water</span>
                <p className="font-bold text-slate-800 text-sm">{apiResult.care.water}</p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-[28px] border border-emerald-100 flex flex-col">
                <Wind className="text-emerald-500 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-950 opacity-40">Humidity</span>
                <p className="font-bold text-slate-800 text-sm">{apiResult.care.humidity}</p>
              </div>
              <div className="bg-stone-50 p-5 rounded-[28px] border border-stone-100 flex flex-col">
                <CheckCircle className="text-stone-500 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-950 opacity-40">Soil</span>
                <p className="font-bold text-slate-800 text-sm">{apiResult.care.soil}</p>
              </div>
            </div>

            {/* Care Insights List */}
            <div className="bg-white rounded-[32px] p-8 shadow-lg border border-slate-100 mb-8">
               <h3 className="font-bold mb-5 flex items-center gap-2 text-slate-900">
                 <AlertCircle size={22} className="text-emerald-500" /> Plant Doctor Advice
               </h3>
               <div className="space-y-4">
                 <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</div>
                    <p className="text-xs text-slate-600 leading-relaxed">Pattiyaan saaf rakhein taaki sunlight achhe se absorb ho sake.</p>
                 </div>
                 <div className="flex gap-4 items-start">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">2</div>
                    <p className="text-xs text-slate-600 leading-relaxed">Mitti check karein, agar 1 inch dry hai tabhi pani dein.</p>
                 </div>
               </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
               <a href={apiResult.shopping[0] || "#"} target="_blank" className="flex-1 bg-white border-2 border-emerald-600 text-emerald-600 font-bold py-5 rounded-2xl text-center hover:bg-emerald-50 transition-colors">Buy Fertilisers</a>
               <button className="flex-1 bg-emerald-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-emerald-200 active:scale-95 transition-transform">Complete Care Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SEARCH HISTORY VIEW */}
      {view === 'history' && (
        <div className="max-w-4xl mx-auto min-h-screen bg-white">
          <div className="p-4 bg-emerald-900 text-white flex items-center gap-4 sticky top-0 z-50 shadow-xl">
            <button onClick={() => setView('home')} className="p-2"><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold tracking-tight">Activity Log</h1>
            <button 
              onClick={() => {setSearchHistory([]); localStorage.removeItem('plantque_history');}} 
              className="ml-auto text-emerald-300 p-2 hover:bg-white/10 rounded-xl"
            >
              <Trash2 size={20} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            {searchHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => { setApiResult(item.fullData); setCompressedImage(item.img); setView('result'); }} 
                className="flex gap-4 p-5 bg-slate-50 rounded-[28px] border border-slate-100 hover:border-emerald-300 cursor-pointer transition-all hover:shadow-lg active:scale-95"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                  <img src={item.img} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 py-1">
                  <h4 className="font-black text-emerald-950 uppercase text-xs tracking-widest">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 mb-3">{item.date}</p>
                  <button className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-4 py-1.5 rounded-full uppercase">Re-View Stats</button>
                </div>
              </div>
            ))}
            {searchHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
                 <History size={80} className="opacity-10" />
                 <p className="font-medium italic">Abhi tak koi activity record nahi hai.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;