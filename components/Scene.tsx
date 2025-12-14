import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import TreeParticles from './TreeParticles';
import PhotoGallery from './HoloPanels';
import { HandState } from '../types';
import * as THREE from 'three';
import { COLORS } from '../constants';

interface SceneProps {
  handStateRef: React.MutableRefObject<HandState>;
  uploadedTextures: THREE.Texture[];
}

const Controls = ({ handStateRef }: { handStateRef: React.MutableRefObject<HandState> }) => {
    const ref = useRef<any>(null);
    useFrame(() => {
        if(ref.current) {
            const { isHeart, isPinching, isOpen } = handStateRef.current;
            // Disable autoRotate if interacting (especially Heart mode for steady view)
            const isInteracting = isHeart || isPinching || isOpen;
            ref.current.autoRotate = !isInteracting;
        }
    });
    return (
        <OrbitControls 
            ref={ref}
            enableZoom={true} 
            maxDistance={60}
            minDistance={10}
            enablePan={false} 
            autoRotate 
            autoRotateSpeed={0.5} 
        />
    );
};

const Scene: React.FC<SceneProps> = ({ handStateRef, uploadedTextures }) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 5, 40], fov: 45 }}
        dpr={[1, 2]}
        gl={{ 
            antialias: true, 
            toneMapping: THREE.ReinhardToneMapping, 
            toneMappingExposure: 1.2,
        }}
      >
        <color attach="background" args={[COLORS.deepGreen]} />
        <fog attach="fog" args={[COLORS.deepGreen, 20, 80]} />

        {/* Ambient Warmth */}
        <ambientLight intensity={0.5} color="#ffd966" />
        
        {/* Magical Spotlights */}
        <spotLight position={[20, 50, 20]} angle={0.3} penumbra={1} intensity={150} color="#ffddaa" castShadow />
        <spotLight position={[-20, 50, -20]} angle={0.3} penumbra={1} intensity={100} color="#ffaa88" />
        
        {/* Center Glow */}
        <pointLight position={[0, 10, 0]} intensity={2} color="#ff8800" distance={20} />

        <Environment preset="city" blur={0.8} />

        {/* Floating Particles for Atmosphere */}
        <Sparkles count={500} scale={40} size={2} speed={0.4} opacity={0.5} color="#ffd966" />

        {/* Main 3D Content */}
        <group position={[0, -2, 0]}>
            <TreeParticles handState={handStateRef} />
            <PhotoGallery handState={handStateRef} uploadedTextures={uploadedTextures} />
        </group>
        
        {/* Post Processing for Glow */}
        <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.9} mipmapBlur intensity={1.2} radius={0.6} />
            <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>

        <Controls handStateRef={handStateRef} />
      </Canvas>
    </div>
  );
};

export default Scene;