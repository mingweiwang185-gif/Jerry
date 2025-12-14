import React, { useRef, useMemo } from 'react';
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

const Snow = () => {
    // Generate snow particles
    const count = 3000;
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 80;      // x: spread wide
            pos[i * 3 + 1] = Math.random() * 60 - 20;     // y: height
            pos[i * 3 + 2] = (Math.random() - 0.5) * 80;  // z: depth
        }
        return pos;
    }, []);

    const ref = useRef<THREE.Points>(null);

    useFrame((_state, delta) => {
        if (!ref.current) return;
        const pos = ref.current.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < count; i++) {
            // Move down
            pos[i * 3 + 1] -= delta * 3; // Falling speed

            // Reset if below floor
            if (pos[i * 3 + 1] < -20) {
                pos[i * 3 + 1] = 40; // Reset to top
                pos[i * 3] = (Math.random() - 0.5) * 80; // Random X
                pos[i * 3 + 2] = (Math.random() - 0.5) * 80; // Random Z
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
        
        // Gentle wind rotation
        ref.current.rotation.y += delta * 0.05;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                color="#ffffff"
                transparent
                opacity={0.8}
                sizeAttenuation={true}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

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

        {/* Falling Snow Effect */}
        <Snow />

        {/* Floating Particles for Atmosphere */}
        <Sparkles count={500} scale={40} size={2} speed={0.4} opacity={0.5} color="#ffd966" />

        {/* Main 3D Content */}
        <group position={[0, -2, 0]}>
            <TreeParticles handState={handStateRef} />
            <PhotoGallery handState={handStateRef} uploadedTextures={uploadedTextures} />
        </group>
        
        {/* Post Processing for Glow */}
        <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.9} mipmapBlur intensity={1.2} radius={0.6} />
            <Vignette eskil={false} offset={0.1} darkness={0.8} />
        </EffectComposer>

        <Controls handStateRef={handStateRef} />
      </Canvas>
    </div>
  );
};

export default Scene;