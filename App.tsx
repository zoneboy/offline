import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { loadModel, predict, getModelLabels } from './services/scannerService';
import { PRICE_MAPPING, CONFIDENCE_THRESHOLD, MODEL_URL, METADATA_URL } from './constants';
import { AppStatus, PredictionResult, PriceInfo } from './types';

// Icons
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const WifiOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.5 10.662a9.002 9.002 0 00-6.134 3.407M16.5 12.332a9.002 9.002 0 016.134-1.67M12.924 16.082a5.002 5.002 0 01-5.91 1.572M12 19.5h.01" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number | null>(null);
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.LOADING);
  const [bestPrediction, setBestPrediction] = useState<PredictionResult | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<PriceInfo | null>(null);
  
  // State for Price Management
  const [currentMapping, setCurrentMapping] = useState<Record<string, PriceInfo>>(PRICE_MAPPING);
  const [showSettings, setShowSettings] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  
  // Form State
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [editPrice, setEditPrice] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // 1. Load Model
  useEffect(() => {
    const initModel = async () => {
      try {
        await loadModel(MODEL_URL, METADATA_URL);
        
        // After loading, get actual labels from model
        const labels = getModelLabels();
        setAvailableLabels(labels);
        if (labels.length > 0) setSelectedLabel(labels[0]);

        setStatus(AppStatus.READY);
      } catch (e) {
        console.error(e);
        setStatus(AppStatus.ERROR);
      }
    };
    initModel();
  }, []);

  // 2. Load LocalStorage Overrides
  useEffect(() => {
    const savedMapping = localStorage.getItem('price_mapping_overrides');
    if (savedMapping) {
      try {
        const parsed = JSON.parse(savedMapping);
        // Merge saved overrides with default constants
        setCurrentMapping(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse saved prices", e);
      }
    }
  }, []);

  // 3. Update Form when Selection Changes
  useEffect(() => {
    if (selectedLabel) {
      const info = currentMapping[selectedLabel] || { name: selectedLabel, price: '₦0', category: 'Uncategorized' };
      setEditName(info.name);
      setEditPrice(info.price);
      setEditCategory(info.category || '');
    }
  }, [selectedLabel, currentMapping]);

  // 4. Save Handler
  const handleSavePrice = () => {
    if (!selectedLabel) return;

    const newInfo: PriceInfo = {
      name: editName,
      price: editPrice,
      category: editCategory
    };

    const newMapping = { ...currentMapping, [selectedLabel]: newInfo };
    
    // Update State
    setCurrentMapping(newMapping);
    
    // Persist to LocalStorage
    // We only need to save the difference, but for simplicity, we can save the whole overrides object.
    // To keep it clean, let's just save the current state as the new truth (or diffs).
    // Simple approach: Save the whole mapping object to storage or just the changed ones.
    // Let's rely on 'newMapping' being the source of truth for this session.
    
    // To persist:
    // 1. Get existing overrides
    const existingOverridesStr = localStorage.getItem('price_mapping_overrides');
    const existingOverrides = existingOverridesStr ? JSON.parse(existingOverridesStr) : {};
    
    // 2. Update overrides
    const updatedOverrides = { ...existingOverrides, [selectedLabel]: newInfo };
    
    // 3. Save back
    localStorage.setItem('price_mapping_overrides', JSON.stringify(updatedOverrides));

    alert('Price updated!');
    setShowSettings(false);
  };

  // Prediction Loop
  const loop = useCallback(async () => {
    if (
      status === AppStatus.READY &&
      !showSettings && // Pause detection while settings are open
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const predictions = await predict(webcamRef.current.video);
      
      let maxProb = 0;
      let topClass = null;

      predictions.forEach(p => {
        if (p.probability > maxProb) {
          maxProb = p.probability;
          topClass = p;
        }
      });

      if (topClass && maxProb > CONFIDENCE_THRESHOLD) {
        setBestPrediction(topClass);
        // USE DYNAMIC MAPPING HERE
        const info = currentMapping[topClass.className];
        if (info) {
          setDetectedProduct(info);
        } else {
          setDetectedProduct({
            name: topClass.className,
            price: 'Not mapped',
            category: 'Unknown ID'
          });
        }
      } else {
        setBestPrediction(null);
        setDetectedProduct(null);
      }
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [status, currentMapping, showSettings]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [loop]);

  const videoConstraints = {
    width: 720,
    height: 1280,
    facingMode: "environment"
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-2">
           <div className="bg-indigo-600 p-2 rounded-lg">
             <CameraIcon />
           </div>
           <h1 className="text-lg font-bold tracking-wide">PriceScanner</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 active:scale-95 transition"
          >
            <SettingsIcon />
          </button>
          
          <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full ${status === AppStatus.READY ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            {!navigator.onLine && <WifiOffIcon />}
          </div>
        </div>
      </div>

      {/* Main Camera View */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900">
        {status === AppStatus.ERROR ? (
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl text-red-500 font-bold mb-2">Model Load Error</h2>
            <p className="text-gray-400">Ensure 'my_model' folder exists in public directory.</p>
          </div>
        ) : (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="absolute inset-0 w-full h-full object-cover"
            onUserMediaError={() => setStatus(AppStatus.PERMISSION_DENIED)}
          />
        )}

        {status === AppStatus.PERMISSION_DENIED && (
          <div className="absolute inset-0 bg-black z-30 flex items-center justify-center p-6 text-center">
             <p className="text-xl font-bold mb-2">Camera Access Required</p>
          </div>
        )}

        {status === AppStatus.LOADING && (
          <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-sm font-medium tracking-widest text-indigo-300">LOADING AI MODEL</p>
          </div>
        )}
        
        {/* Bounding Box */}
        {status === AppStatus.READY && !showSettings && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="w-64 h-64 border-2 border-white/30 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
             </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col p-6 animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Manage Prices</h2>
            <button 
              onClick={() => setShowSettings(false)} 
              className="text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Model Class</label>
              <select 
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                {availableLabels.length === 0 && <option value="">Loading classes...</option>}
                {availableLabels.map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 space-y-4">
               <div>
                 <label className="block text-xs font-uppercase tracking-wider text-gray-500 mb-1">Display Name</label>
                 <input 
                   type="text" 
                   value={editName}
                   onChange={(e) => setEditName(e.target.value)}
                   className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                 />
               </div>
               <div>
                 <label className="block text-xs font-uppercase tracking-wider text-gray-500 mb-1">Price</label>
                 <input 
                   type="text" 
                   value={editPrice}
                   onChange={(e) => setEditPrice(e.target.value)}
                   className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-lg"
                 />
               </div>
               <div>
                 <label className="block text-xs font-uppercase tracking-wider text-gray-500 mb-1">Category</label>
                 <input 
                   type="text" 
                   value={editCategory}
                   onChange={(e) => setEditCategory(e.target.value)}
                   className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                 />
               </div>
            </div>
            
            <button 
              onClick={handleSavePrice}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95"
            >
              Save Changes
            </button>
            
            <p className="text-center text-xs text-gray-500 mt-4">
              Changes are saved to this device's browser storage.
            </p>
          </div>
        </div>
      )}

      {/* Result Overlay */}
      {!showSettings && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-24 px-4 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className={`transform transition-all duration-300 ease-out ${detectedProduct ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
             {detectedProduct ? (
               <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-2xl border-b-8 border-indigo-600">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <span className={`inline-block px-2 py-1 ${detectedProduct.category === 'Unknown ID' ? 'bg-red-100 text-red-800' : 'bg-indigo-100 text-indigo-800'} text-xs font-bold rounded mb-2 uppercase tracking-wide`}>
                       {detectedProduct.category || 'Product'}
                     </span>
                     <h2 className="text-2xl font-black leading-tight">{detectedProduct.name}</h2>
                   </div>
                   <div className="text-right">
                     <div className="text-xs text-gray-500 font-semibold uppercase">Price</div>
                     <div className="text-3xl font-bold text-indigo-600 tracking-tight">{detectedProduct.price}</div>
                   </div>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                    <span>Confidence: {Math.round((bestPrediction?.probability || 0) * 100)}%</span>
                    <span className="font-mono text-xs">{bestPrediction?.className}</span>
                 </div>
               </div>
             ) : (
               <div className="h-40"></div>
             )}
          </div>
          
          {!detectedProduct && status === AppStatus.READY && (
             <div className="absolute bottom-12 left-0 right-0 text-center text-gray-400 animate-pulse">
               <p className="text-sm font-medium">Point camera at a product...</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;