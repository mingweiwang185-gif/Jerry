import React, { useRef, useState, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import { HandState } from './types';
import * as THREE from 'three';

// 默认祝福语库
const DEFAULT_WISHES = [
    "天天开心", "好好吃饭", "多喝热水", "心想事成", 
    "万事如意", "平安喜乐", "好运连连", "未来可期",
    "暴富暴瘦", "百事可爱", "好事发生", "岁岁平安",
    "前程似锦", "美梦成真", "快乐无边"
];

// High reliability audio sources (Mixkit CDN)
const MUSIC_TRACKS = [
    "https://assets.mixkit.co/music/preview/mixkit-christmas-magic-opening-2983.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-deck-the-halls-2993.mp3",
    "https://assets.mixkit.co/music/preview/mixkit-jingle-bells-2994.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
];

// 生成随机高亮颜色 (HSL)
const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 100%, 75%)`;
};

// 随机祝福语组件
const FloatingWishes = ({ active, customWishes }: { active: boolean, customWishes: string[] }) => {
    const [currentWish, setCurrentWish] = useState<{ text: string, x: number, y: number, id: number, color: string } | null>(null);

    // Combine default and custom wishes
    const wishPool = customWishes.length > 0 ? [...customWishes, ...DEFAULT_WISHES] : DEFAULT_WISHES;

    useEffect(() => {
        if (!active) {
            setCurrentWish(null);
            return;
        }

        const showNextWish = () => {
            const text = wishPool[Math.floor(Math.random() * wishPool.length)];
            const x = 10 + Math.random() * 60;
            const y = 20 + Math.random() * 50;
            const color = getRandomColor();

            setCurrentWish({
                text,
                x,
                y,
                id: Date.now(),
                color
            });
        };

        showNextWish();
        const interval = setInterval(showNextWish, 500);
        return () => clearInterval(interval);
    }, [active, wishPool]);

    if (!currentWish) return null;

    return (
        <>
            <style>
                {`
                @keyframes float-appear {
                    0% { opacity: 0; transform: scale(0.5); }
                    20% { opacity: 1; transform: scale(1.1); }
                    80% { opacity: 1; transform: scale(1.0); }
                    100% { opacity: 0; transform: scale(0.8); }
                }
                `}
            </style>
            <div 
                key={currentWish.id}
                className="absolute pointer-events-none z-30"
                style={{ 
                    left: `${currentWish.x}%`, 
                    top: `${currentWish.y}%`,
                    animation: 'float-appear 0.5s ease-in-out forwards'
                }}
            >
                <h2 
                    className="text-2xl md:text-4xl font-serif italic font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] whitespace-nowrap"
                    style={{ color: currentWish.color }}
                >
                    {currentWish.text}
                </h2>
            </div>
        </>
    );
};

// Wish Modal Component
const WishModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (text: string) => void }) => {
    const [text, setText] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text.trim());
            setText("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0a0a1a] border border-[#ffd966] w-full max-w-sm rounded-2xl p-6 shadow-[0_0_50px_rgba(255,217,102,0.2)] relative">
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-4 text-[#ffd966]/50 hover:text-[#ffd966] text-xl"
                >
                    ✕
                </button>
                
                <h3 className="text-[#ffd966] font-serif text-2xl italic mb-1 text-center">Make a Wish</h3>
                <p className="text-[#ffd966]/60 text-xs text-center mb-6 uppercase tracking-widest">Hide it in a gift box</p>
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <textarea 
                        autoFocus
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Write your wish or expectation here..."
                        maxLength={20}
                        className="w-full h-24 bg-white/5 border border-[#ffd966]/30 rounded-lg p-3 text-[#ffd966] placeholder-[#ffd966]/20 focus:outline-none focus:border-[#ffd966] focus:bg-white/10 resize-none text-center font-serif text-lg"
                    />
                    <div className="flex justify-between text-[10px] text-[#ffd966]/40 px-1">
                        <span>Keep it short for magic</span>
                        <span>{text.length}/20</span>
                    </div>
                    <button 
                        type="submit"
                        disabled={!text.trim()}
                        className="w-full py-3 bg-[#ffd966] text-black font-bold uppercase tracking-widest rounded-lg hover:bg-[#ffeebb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_rgba(255,217,102,0.3)] hover:shadow-[0_0_30px_rgba(255,217,102,0.5)]"
                    >
                        Send to Tree
                    </button>
                </form>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const handStateRef = useRef<HandState>({
    isDetected: false,
    isOpen: false,
    isDoubleOpen: false,
    isPinching: false,
    isHeart: false,
    pinchDistance: 1,
    cursorX: 0,
    cursorY: 0,
  });

  const [uiState, setUiState] = useState({
      detected: false,
      isHeart: false,
      mode: 'Idle',
  });

  const [uploadedTextures, setUploadedTextures] = useState<THREE.Texture[]>([]);
  const [forceShowGallery, setForceShowGallery] = useState(false);

  // Custom Wishes State
  const [customWishes, setCustomWishes] = useState<string[]>([]);
  const [isWishModalOpen, setIsWishModalOpen] = useState(false);

  // Music State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicLoading, setMusicLoading] = useState(true);
  const [musicError, setMusicError] = useState(false);
  
  // Custom Music State
  const [customTrack, setCustomTrack] = useState<{ url: string, name: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize audio volume
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = 0.5;
      }
  }, []);

  // When track changes (either index change or custom track loaded), auto-play if needed
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.load();
        if (isMusicPlaying) {
             const playPromise = audioRef.current.play();
             if (playPromise !== undefined) {
                 playPromise.catch((e) => {
                     console.warn("Auto-play failed:", e);
                     setIsMusicPlaying(false);
                 });
             }
        }
    }
  }, [currentTrackIndex, customTrack]);

  const toggleMusic = () => {
      if (audioRef.current) {
          if (isMusicPlaying) {
              audioRef.current.pause();
              setIsMusicPlaying(false);
          } else {
              setMusicLoading(true);
              setMusicError(false);
              audioRef.current.volume = 0.5;
              const playPromise = audioRef.current.play();
              
              if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                        setIsMusicPlaying(true);
                        setMusicLoading(false);
                    })
                    .catch(e => {
                      console.error("Play failed:", e instanceof Error ? e.message : String(e));
                      setIsMusicPlaying(false);
                      setMusicLoading(false);
                    });
              }
          }
      }
  };

  const handleAudioCanPlay = () => {
      setMusicLoading(false);
      setMusicError(false);
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      // If custom track fails, revert to default
      if (customTrack) {
          console.warn("Custom track failed, reverting.");
          setCustomTrack(null);
          setMusicError(true);
          return;
      }

      const error = e.currentTarget.error;
      console.warn(`Audio track ${currentTrackIndex} failed to load.`, error);
      
      // If we haven't exhausted all tracks, try the next one
      if (currentTrackIndex < MUSIC_TRACKS.length - 1) {
          console.log("Switching to fallback track...");
          setMusicLoading(true);
          setTimeout(() => setCurrentTrackIndex(prev => prev + 1), 500);
      } else {
          console.error("All audio tracks failed.");
          setMusicLoading(false);
          setMusicError(true);
          setIsMusicPlaying(false);
      }
  };

  const handleHandUpdate = useCallback((newState: HandState) => {
    handStateRef.current = newState;
    
    let mode = 'Waiting for Gesture...';
    if (newState.isHeart) mode = '❤️ Love Magic ❤️';
    else if (newState.isDoubleOpen) mode = '💥 BIG BANG 💥';
    else if (newState.isPinching) mode = 'Focusing Memories';
    else if (newState.isOpen) mode = 'Scattering Magic';
    else if (newState.isDetected) mode = 'Hand Detected';

    setUiState(prev => {
        if (prev.detected !== newState.isDetected || prev.mode !== mode || prev.isHeart !== newState.isHeart) {
            return { 
                detected: newState.isDetected, 
                isHeart: newState.isHeart,
                mode 
            };
        }
        return prev;
    });
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          setForceShowGallery(true);
          setTimeout(() => setForceShowGallery(false), 5000);

          Array.from(files).forEach((file) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                  if(ev.target?.result) {
                      new THREE.TextureLoader().load(ev.target.result as string, (tex) => {
                          tex.colorSpace = THREE.SRGBColorSpace;
                          tex.needsUpdate = true;
                          setUploadedTextures(prev => [...prev, tex]);
                      });
                  }
              };
              reader.readAsDataURL(file as Blob);
          });
      }
      e.target.value = '';
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Revoke old url to prevent memory leak
          if (customTrack) URL.revokeObjectURL(customTrack.url);
          
          const url = URL.createObjectURL(file);
          setCustomTrack({ url, name: file.name });
          setIsMusicPlaying(true); // Auto play new song
          setMusicLoading(true);
      }
      e.target.value = '';
  };

  const handleAddWish = (wish: string) => {
      setCustomWishes(prev => [...prev, wish]);
  };

  const handleClearPhotos = () => {
      setUploadedTextures([]);
      setForceShowGallery(true);
      setTimeout(() => setForceShowGallery(false), 2000);
  };

  const handleClearMusic = () => {
      if (customTrack) URL.revokeObjectURL(customTrack.url);
      setCustomTrack(null);
      setIsMusicPlaying(false); // Stop playback to switch cleanly
      // It will fallback to default tracks automatically due to src logic
  };

  // Button Label Logic
  let buttonLabel = "Play Music";
  let buttonIcon = "🔇";
  
  if (musicLoading && !isMusicPlaying) {
      buttonIcon = "⏳";
      buttonLabel = "Loading...";
  } else if (musicError) {
      buttonIcon = "⚠️";
      buttonLabel = "Error";
  } else if (isMusicPlaying) {
      buttonIcon = "🎵";
      // Show custom filename if playing, truncated
      if (customTrack) {
          const name = customTrack.name.length > 15 ? customTrack.name.substring(0, 12) + "..." : customTrack.name;
          buttonLabel = name;
      } else {
          buttonLabel = "Merry Christmas";
      }
  } else if (!isMusicPlaying && customTrack) {
      // Paused but custom track loaded
      buttonLabel = "Paused";
  }

  // Determine Source
  const audioSrc = customTrack ? customTrack.url : MUSIC_TRACKS[currentTrackIndex];

  return (
    <div className="relative w-full h-full bg-[#050510] overflow-hidden text-[#ffd966] selection:bg-[#ffd966] selection:text-black font-serif">
      
      <audio 
        ref={audioRef} 
        loop 
        preload="auto"
        playsInline
        onCanPlay={handleAudioCanPlay}
        onError={handleAudioError}
        src={audioSrc}
      />

      <Scene 
        handStateRef={handStateRef} 
        uploadedTextures={uploadedTextures} 
        forceShowGallery={forceShowGallery}
        customWishes={customWishes}
      />

      <FloatingWishes active={uiState.isHeart} customWishes={customWishes} />
      
      <WishModal 
          isOpen={isWishModalOpen} 
          onClose={() => setIsWishModalOpen(false)} 
          onSubmit={handleAddWish} 
      />

      <div className="absolute inset-0 pointer-events-none">
          {/* Top Header */}
          <div className="absolute top-0 left-0 w-full p-8 flex flex-col items-center z-10">
             <h1 className="text-5xl md:text-7xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fffbe6] to-[#ffd966] drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-wide text-center">
                Christmas Memories
             </h1>
             <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#ffd966] to-transparent mt-4 mb-2"></div>
             <div className="text-sm tracking-[0.2em] text-[#fffbe6] opacity-80 uppercase">Gesture Controlled Experience</div>
          </div>

          {/* Music Control - Top Right */}
          <div className="absolute top-8 right-8 z-20 pointer-events-auto">
                <button 
                    onClick={toggleMusic}
                    disabled={musicLoading && !isMusicPlaying}
                    className={`flex items-center gap-3 px-5 py-2 rounded-full border backdrop-blur-md transition-all duration-300 hover:scale-105 ${isMusicPlaying ? 'bg-[#ffd966]/20 border-[#ffd966] text-[#ffd966] shadow-[0_0_15px_rgba(255,217,102,0.3)]' : 'bg-black/40 border-white/20 text-white/60 hover:text-white hover:border-white/50'}`}
                >
                    <span className="text-lg">{buttonIcon}</span>
                    <span className="text-xs font-bold tracking-widest uppercase hidden md:inline">{buttonLabel}</span>
                </button>
          </div>

          {/* Bottom Mode Indicator */}
          <div className="absolute bottom-10 left-10 z-10">
              <div className="flex flex-col border-l-2 border-[#ffd966]/50 pl-4">
                  <span className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Status</span>
                  <span className={`text-xl md:text-2xl font-serif italic ${uiState.detected ? 'text-white drop-shadow-[0_0_10px_rgba(255,217,102,0.6)]' : 'text-[#ffd966]/60'}`}>
                      {uiState.mode}
                  </span>
                  {forceShowGallery && <span className="text-[#ffd966] text-xs mt-1 animate-pulse">
                      {uploadedTextures.length === 0 ? "Photos Reset!" : "Photos Updated!"}
                  </span>}
                  {customWishes.length > 0 && <span className="text-[#ffd966] text-[10px] mt-1 opacity-70">
                      {customWishes.length} wish{customWishes.length > 1 ? 'es' : ''} added
                  </span>}
              </div>
          </div>

          {/* Center Upload & Reset Controls (Visible) - COMPACT VERSION */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-20 flex flex-col md:flex-row gap-3 items-center transform scale-90 md:scale-100 origin-bottom">
               
               {/* Photo Controls Group */}
               <div className="flex gap-2 items-center">
                   <label className="cursor-pointer group relative flex items-center gap-2 px-4 py-1.5 bg-black/40 border border-[#ffd966]/40 hover:border-[#ffd966] hover:bg-[#ffd966]/10 backdrop-blur-md rounded-full overflow-hidden transition-all duration-500 hover:scale-105">
                      <span className="font-serif text-xs tracking-widest text-[#fffbe6] group-hover:text-white uppercase whitespace-nowrap">
                          {uploadedTextures.length > 0 ? "Add Photos" : "Photos"}
                      </span>
                      <div className="w-1.5 h-1.5 bg-[#ffd966] rounded-full group-hover:animate-ping"></div>
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                   </label>
                   
                   {uploadedTextures.length > 0 && (
                       <button 
                           onClick={handleClearPhotos}
                           title="Clear Photos"
                           className="cursor-pointer group relative flex items-center justify-center w-8 h-8 bg-red-900/20 border border-red-500/40 hover:border-red-500 hover:bg-red-900/40 backdrop-blur-md rounded-full overflow-hidden transition-all duration-500 hover:scale-105"
                       >
                           <span className="text-red-200 group-hover:text-white text-xs">✕</span>
                       </button>
                   )}
               </div>

               {/* Divider */}
               <div className="w-px h-6 bg-[#ffd966]/30 hidden md:block"></div>

               {/* Music Controls Group */}
               <div className="flex gap-2 items-center">
                    <label className="cursor-pointer group relative flex items-center gap-2 px-4 py-1.5 bg-black/40 border border-blue-300/40 hover:border-blue-300 hover:bg-blue-300/10 backdrop-blur-md rounded-full overflow-hidden transition-all duration-500 hover:scale-105">
                        <span className="font-serif text-xs tracking-widest text-blue-100 group-hover:text-white uppercase whitespace-nowrap">
                           Music
                        </span>
                        <span className="text-blue-300 text-xs">♫</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} />
                    </label>

                    {customTrack && (
                       <button 
                           onClick={handleClearMusic}
                           title="Reset to Default Music"
                           className="cursor-pointer group relative flex items-center justify-center w-8 h-8 bg-red-900/20 border border-red-500/40 hover:border-red-500 hover:bg-red-900/40 backdrop-blur-md rounded-full overflow-hidden transition-all duration-500 hover:scale-105"
                       >
                           <span className="text-red-200 group-hover:text-white text-xs">✕</span>
                       </button>
                   )}
               </div>

               {/* Divider */}
               <div className="w-px h-6 bg-[#ffd966]/30 hidden md:block"></div>

               {/* Wish Button */}
               <button 
                   onClick={() => setIsWishModalOpen(true)}
                   className="cursor-pointer group relative flex items-center gap-2 px-4 py-1.5 bg-black/40 border border-purple-300/40 hover:border-purple-300 hover:bg-purple-300/10 backdrop-blur-md rounded-full overflow-hidden transition-all duration-500 hover:scale-105"
               >
                  <span className="font-serif text-xs tracking-widest text-purple-100 group-hover:text-white uppercase whitespace-nowrap">
                       Make a Wish
                  </span>
                  <span className="text-purple-300 text-xs">✨</span>
               </button>

          </div>
      </div>
      
      <HandTracker onUpdate={handleHandUpdate} />
    </div>
  );
};

export default App;