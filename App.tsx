import React, { useRef, useState, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import HandTracker from './components/HandTracker';
import { HandState } from './types';
import * as THREE from 'three';

// 祝福语库
const WISHES = [
    "天天开心", "好好吃饭", "多喝热水", "心想事成", 
    "万事如意", "平安喜乐", "好运连连", "未来可期",
    "暴富暴瘦", "百事可爱", "好事发生", "岁岁平安",
    "前程似锦", "美梦成真", "快乐无边"
];

// 生成随机高亮颜色 (HSL)
const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    // 饱和度 100%, 亮度 75% 保证在黑色背景上清晰且鲜艳
    return `hsl(${hue}, 100%, 75%)`;
};

// 随机祝福语组件
const FloatingWishes = ({ active }: { active: boolean }) => {
    const [currentWish, setCurrentWish] = useState<{ text: string, x: number, y: number, id: number, color: string } | null>(null);

    useEffect(() => {
        if (!active) {
            setCurrentWish(null);
            return;
        }

        const showNextWish = () => {
            // 随机选择一句
            const text = WISHES[Math.floor(Math.random() * WISHES.length)];
            
            // 随机坐标
            const x = 10 + Math.random() * 60;
            const y = 20 + Math.random() * 50;

            // 随机颜色
            const color = getRandomColor();

            setCurrentWish({
                text,
                x,
                y,
                id: Date.now(),
                color
            });
        };

        // 立即展示第一个
        showNextWish();

        // 缩短间隔到 0.5 秒 (500ms)
        const interval = setInterval(showNextWish, 500);

        return () => clearInterval(interval);
    }, [active]);

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
                    // 动画时长缩短为 0.5s
                    animation: 'float-appear 0.5s ease-in-out forwards'
                }}
            >
                {/* 字体大小减小，颜色使用动态随机颜色 */}
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

const App: React.FC = () => {
  const handStateRef = useRef<HandState>({
    isDetected: false,
    isOpen: false,
    isPinching: false,
    isHeart: false,
    pinchDistance: 1,
    cursorX: 0,
    cursorY: 0,
  });

  const [uiState, setUiState] = useState({
      detected: false,
      isHeart: false, // 新增：追踪是否是比心状态
      mode: 'Idle',
  });

  const [uploadedTextures, setUploadedTextures] = useState<THREE.Texture[]>([]);

  const handleHandUpdate = useCallback((newState: HandState) => {
    handStateRef.current = newState;
    
    let mode = 'Waiting for Gesture...';
    if (newState.isHeart) mode = '❤️ Love Magic ❤️';
    else if (newState.isPinching) mode = 'Focusing Memories';
    else if (newState.isOpen) mode = 'Scattering Magic';
    else if (newState.isDetected) mode = 'Hand Detected';

    setUiState(prev => {
        // 只有当状态真正改变时才更新，优化性能
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach((file) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                  if(ev.target?.result) {
                      new THREE.TextureLoader().load(ev.target.result as string, (tex) => {
                          tex.colorSpace = THREE.SRGBColorSpace;
                          setUploadedTextures(prev => [...prev, tex]);
                      });
                  }
              };
              reader.readAsDataURL(file as Blob);
          });
      }
  };

  return (
    <div className="relative w-full h-full bg-[#050510] overflow-hidden text-[#ffd966] selection:bg-[#ffd966] selection:text-black font-serif">
      
      {/* 3D Scene */}
      <Scene handStateRef={handStateRef} uploadedTextures={uploadedTextures} />

      {/* 随机祝福语层 */}
      <FloatingWishes active={uiState.isHeart} />

      {/* Elegant Overlay */}
      <div className="absolute inset-0 pointer-events-none">
          {/* Top Header */}
          <div className="absolute top-0 left-0 w-full p-8 flex flex-col items-center z-10">
             <h1 className="text-5xl md:text-7xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fffbe6] to-[#ffd966] drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-wide text-center">
                Christmas Memories
             </h1>
             <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#ffd966] to-transparent mt-4 mb-2"></div>
             <div className="text-sm tracking-[0.2em] text-[#fffbe6] opacity-80 uppercase">Gesture Controlled Experience</div>
          </div>

          {/* Bottom Mode Indicator */}
          <div className="absolute bottom-10 left-10 z-10">
              <div className="flex flex-col border-l-2 border-[#ffd966]/50 pl-4">
                  <span className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Status</span>
                  <span className={`text-xl md:text-2xl font-serif italic ${uiState.detected ? 'text-white drop-shadow-[0_0_10px_rgba(255,217,102,0.6)]' : 'text-[#ffd966]/60'}`}>
                      {uiState.mode}
                  </span>
              </div>
          </div>

          {/* Center Upload Trigger (Visible) */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto transition-all hover:scale-105 z-20">
               <label className="cursor-pointer group relative flex items-center gap-4 px-8 py-3 bg-black/40 border border-[#ffd966]/40 hover:border-[#ffd966] hover:bg-[#ffd966]/10 backdrop-blur-md rounded-full overflow-hidden transition-all duration-500">
                  <span className="font-serif text-sm tracking-widest text-[#fffbe6] group-hover:text-white uppercase">Upload Photos</span>
                  <div className="w-2 h-2 bg-[#ffd966] rounded-full group-hover:animate-ping"></div>
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
               </label>
          </div>
      </div>
      
      {/* Hand Tracker Component */}
      <HandTracker onUpdate={handleHandUpdate} />
    </div>
  );
};

export default App;