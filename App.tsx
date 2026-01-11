import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { loadModel, predict } from './services/scannerService';
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

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const requestRef = useRef<number | null>(null);
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.LOADING);
  const [bestPrediction, setBestPrediction] = useState<PredictionResult | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<PriceInfo | null>(null);

  // Load Model on Mount
  useEffect(() => {
    const initModel = async () => {
      try {
        await loadModel(MODEL_URL, METADATA_URL);
        setStatus(AppStatus.READY);
      } catch (e) {
        console.error(e);
        setStatus(AppStatus.ERROR);
      }
    };
    initModel();
  }, []);

  // Prediction Loop
  const loop = useCallback(async () => {
    if (
      status === AppStatus.READY &&
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const predictions = await predict(webcamRef.current.video);
      
      // Find highest probability class
      let maxProb = 0;
      let topClass = null;

      predictions.forEach(p => {
        if (p.probability > maxProb) {
          maxProb = p.probability;
          topClass = p;
        }
      });

      // Filter by threshold
      if (topClass && maxProb > CONFIDENCE_THRESHOLD) {
        setBestPrediction(topClass);
        // Map to price
        const info = PRICE_MAPPING[topClass.className];
        if (info) {
          setDetectedProduct(info);
        } else {
          // Fallback if the class exists in model but not in constants.ts
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
  }, [status]);

  // Start/Stop loop based on status
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
    facingMode: "environment" // Use back camera on mobile
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white overflow-hidden">
      
      {/* Header / Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center space-x-2">
           <div className="bg-indigo-600 p-2 rounded-lg">
             <CameraIcon />
           </div>
           <h1 className="text-lg font-bold tracking-wide">PriceScanner</h1>
        </div>
        <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
          <div className={`w-2 h-2 rounded-full ${status === AppStatus.READY ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs font-mono uppercase text-gray-300">
            {status === AppStatus.LOADING ? 'INIT MODEL...' : 'LIVE'}
          </span>
          {!navigator.onLine && <WifiOffIcon />}
        </div>
      </div>

      {/* Main Camera View */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900">
        {status === AppStatus.ERROR ? (
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl text-red-500 font-bold mb-2">Model Load Error</h2>
            <p className="text-gray-400">Ensure 'my_model' folder exists in public directory with model.json and metadata.json.</p>
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

        {/* Permission Denied State */}
        {status === AppStatus.PERMISSION_DENIED && (
          <div className="absolute inset-0 bg-black z-30 flex items-center justify-center p-6 text-center">
            <div>
              <p className="text-xl font-bold mb-2">Camera Access Required</p>
              <p className="text-gray-400">Please allow camera access to scan products.</p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {status === AppStatus.LOADING && (
          <div className="absolute inset-0 bg-black/60 z-30 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-sm font-medium tracking-widest text-indigo-300">LOADING AI MODEL</p>
          </div>
        )}
        
        {/* Detection Bounding Box Guide (Visual only) */}
        {status === AppStatus.READY && (
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

      {/* Result Overlay */}
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
             // Placeholder to keep layout stable or empty
             <div className="h-40"></div>
           )}
        </div>

        {/* Scan Helper Text when idle */}
        {!detectedProduct && status === AppStatus.READY && (
           <div className="absolute bottom-12 left-0 right-0 text-center text-gray-400 animate-pulse">
             <p className="text-sm font-medium">Point camera at a product...</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default App;