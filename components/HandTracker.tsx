import React, { useEffect, useRef, useState } from 'react';
import { isHandOpen, getCursorPosition, isPointing, isHeartGesture } from '../services/gestureService';
import { HandState, Results } from '../types';

interface HandTrackerProps {
  onUpdate: (state: HandState) => void;
  onStatusChange?: (status: string, mode: 'CAMERA' | 'MOUSE') => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onUpdate, onStatusChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [debugMsg, setDebugMsg] = useState("Initializing...");
  const [useFallback, setUseFallback] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mouseState = useRef({ x: 0, y: 0, isDown: false, isRightClick: false });

  // --- MOUSE FALLBACK MODE ---
  useEffect(() => {
    if (!useFallback) return;

    onStatusChange?.("Manual Mode (Active)", 'MOUSE');
    setDebugMsg(permissionDenied ? "Camera Denied - Mouse Mode" : "Touch/Mouse Mode Active");

    const handleMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        mouseState.current.x = x;
        mouseState.current.y = y;
        updateMouse();
    };

    const handleDown = (e: MouseEvent) => { 
        if(e.button === 2) mouseState.current.isRightClick = true; // Right click for heart simulation
        else mouseState.current.isDown = true; 
        updateMouse(); 
    };
    const handleUp = () => { 
        mouseState.current.isDown = false; 
        mouseState.current.isRightClick = false;
        updateMouse(); 
    };
    
    // Prevent context menu for right click testing
    const handleContext = (e: Event) => e.preventDefault();

    const updateMouse = () => {
          const isRight = mouseState.current.isRightClick;
          const isLeft = mouseState.current.isDown;
          
          onUpdate({
            isDetected: true,
            isOpen: true, 
            isPinching: isLeft && !isRight, // Click acts as "Point/Focus"
            isHeart: isRight, // Right click acts as "Heart"
            pinchDistance: isLeft ? 0 : 1,
            cursorX: mouseState.current.x,
            cursorY: mouseState.current.y
        });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('contextmenu', handleContext);

    return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mousedown', handleDown);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('contextmenu', handleContext);
    };
  }, [useFallback, onUpdate, onStatusChange, permissionDenied]);

  // --- CAMERA INIT ---
  useEffect(() => {
    if (useFallback) return;

    let isMounted = true;
    let stream: MediaStream | null = null;
    let hands: any = null;
    let reqId: number;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           setPermissionDenied(true);
           throw new Error("Camera API unavailable");
        }

        let attempts = 0;
        while (!(window as any).Hands && attempts < 20) {
           if (!isMounted) return;
           setDebugMsg(`Loading AI... ${Math.round(attempts/20 * 100)}%`);
           await new Promise(r => setTimeout(r, 500));
           attempts++;
        }

        if (!(window as any).Hands) throw new Error("AI Library failed to load");

        setDebugMsg("Requesting Camera...");
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 },
                    facingMode: "user" 
                }
            });
        } catch (mediaErr: any) {
            if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
                throw new Error("Permission Denied");
            } else {
                throw mediaErr;
            }
        }

        if (!isMounted) {
            stream?.getTracks().forEach(t => t.stop());
            return;
        }

        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            await new Promise<void>((resolve) => {
                if (!videoRef.current) return;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().then(() => resolve()).catch(() => resolve());
                };
            });
        }

        setDebugMsg("Starting Detection...");
        const Hands = (window as any).Hands;
        hands = new Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
            maxNumHands: 2, // Enable 2 hands for Heart gesture
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults((results: Results) => {
             if (!isMounted) return;
             processResults(results);
        });

        setDebugMsg("System Active");
        onStatusChange?.("System Active", 'CAMERA');

        const loop = async () => {
            if (!isMounted) return;
            if (videoRef.current && hands && videoRef.current.readyState >= 2) {
                try {
                    await hands.send({ image: videoRef.current });
                } catch (e) {
                    // ignore frame drop
                }
            }
            reqId = requestAnimationFrame(loop);
        };
        loop();

      } catch (err: any) {
        console.warn("Camera Init Error:", err);
        if (isMounted) {
            let msg = err.message;
            if (msg === "Permission Denied") msg = "Camera Denied";
            
            setDebugMsg(msg);
            setTimeout(() => setUseFallback(true), 1500);
        }
      }
    };

    startCamera();

    return () => {
        isMounted = false;
        cancelAnimationFrame(reqId);
        if (hands) hands.close();
        if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [useFallback]);

  const processResults = (results: Results) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);

      const landmarksList = results.multiHandLandmarks;

      if (landmarksList && landmarksList.length > 0) {
          // Draw all detected hands
          landmarksList.forEach(landmarks => drawSkeleton(ctx, landmarks, canvas.width, canvas.height));
          
          let heartDetected = false;
          let pointingDetected = false;
          let openDetected = false;
          
          // Check for Heart Gesture (Needs 2 hands)
          if (landmarksList.length === 2) {
              heartDetected = isHeartGesture(landmarksList[0], landmarksList[1]);
          }

          // If Heart is detected, it overrides individual hand gestures
          if (!heartDetected) {
              // Check individual hands
              for (const landmarks of landmarksList) {
                  if (isPointing(landmarks)) {
                      pointingDetected = true;
                      break; // Priority to pointing
                  }
                  if (isHandOpen(landmarks)) {
                      openDetected = true;
                  }
              }
          }

          // Determine Primary Cursor (use first hand)
          const primaryHand = landmarksList[0];
          const cursor = getCursorPosition(primaryHand);

          onUpdate({
              isDetected: true,
              isOpen: openDetected && !pointingDetected && !heartDetected,
              isPinching: pointingDetected && !heartDetected,
              isHeart: heartDetected,
              pinchDistance: pointingDetected ? 0 : 1,
              cursorX: cursor.x,
              cursorY: cursor.y
          });
      } else {
          onUpdate({
              isDetected: false,
              isOpen: false,
              isPinching: false,
              isHeart: false,
              pinchDistance: 1,
              cursorX: 0,
              cursorY: 0
          });
      }
      ctx.restore();
  };

  const drawSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number) => {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffd966'; 
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 15;
      
      const connections = [
          [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8], 
          [5,9],[9,10],[10,11],[11,12], [9,13],[13,14],[14,15],[15,16], 
          [13,17],[17,18],[18,19],[19,20], [0,17]
      ];

      ctx.beginPath();
      connections.forEach(([s, e]) => {
          ctx.moveTo(landmarks[s].x * w, landmarks[s].y * h);
          ctx.lineTo(landmarks[e].x * w, landmarks[e].y * h);
      });
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      [4,8,12,16,20].forEach(i => {
          ctx.beginPath();
          ctx.arc(landmarks[i].x * w, landmarks[i].y * h, 4, 0, Math.PI*2);
          ctx.fill();
      });
  };

  if (useFallback) {
      return (
        <div className="absolute bottom-6 right-6 w-52 h-40 rounded-xl overflow-hidden border border-[#ffd966]/30 bg-black/80 shadow-[0_0_30px_rgba(255,217,102,0.1)] z-50 flex flex-col items-center justify-center">
             
             <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-16 h-16 border-2 border-white rounded-full animate-ping"></div>
             </div>
             
             <div className="z-10 text-center p-2">
                <div className={`${permissionDenied ? "text-red-400" : "text-[#ffd966]"} text-xs font-bold uppercase tracking-widest mb-1`}>
                    {permissionDenied ? "Camera Denied" : "Mouse Mode"}
                </div>
                
                <p className="text-white/50 text-[9px] mb-1">
                    Left Click: Point | Right Click: Heart
                </p>
                
                {permissionDenied && (
                     <button 
                        onClick={() => window.location.reload()}
                        className="mt-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] text-[#ffd966] transition-colors"
                     >
                        Retry Camera
                     </button>
                )}
             </div>
        </div>
      );
  }

  return (
    <div className="absolute bottom-6 right-6 w-52 h-40 rounded-xl overflow-hidden border border-[#ffd966]/30 bg-black/80 shadow-[0_0_30px_rgba(255,217,102,0.1)] z-50">
       <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" playsInline muted />
       <canvas ref={canvasRef} width={320} height={240} className="absolute inset-0 w-full h-full object-cover" />
       <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent p-2 text-center">
           <span className="text-[10px] text-[#ffd966] font-mono tracking-widest uppercase animate-pulse">{debugMsg}</span>
       </div>
    </div>
  );
};

export default HandTracker;