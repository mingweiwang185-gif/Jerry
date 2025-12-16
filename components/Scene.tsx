import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, Sparkles, Text, Float, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import TreeParticles from './TreeParticles';
import PhotoGallery from './HoloPanels';
import { HandState } from '../types';
import * as THREE from 'three';
import { COLORS } from '../constants';

interface SceneProps {
  handStateRef: React.MutableRefObject<HandState>;
  uploadedTextures: THREE.Texture[];
  forceShowGallery?: boolean;
  customWishes: string[];
}

// 祝福语库 (Local copy for default fallback)
const DEFAULT_SURPRISE_TEXTS = [
    "Merry Xmas!", "Happiness", "Love & Joy", 
    "Big Hugs!", "Stay Warm", "Dream Big",
    "Ho Ho Ho!", "Good Luck", "Smile :)",
    "Magic!", "Peace", "You Rock!"
];

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

const HoloBase = () => {
    const ringRef = useRef<THREE.Mesh>(null);
    const ringRef2 = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (ringRef.current) ringRef.current.rotation.z -= delta * 0.2;
        if (ringRef2.current) ringRef2.current.rotation.z += delta * 0.1;
    });

    return (
        <group position={[0, -14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
             {/* Tech Ring 1 */}
            <mesh ref={ringRef}>
                <ringGeometry args={[9, 9.5, 64]} />
                <meshBasicMaterial color={COLORS.champagneGold} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>
            {/* Tech Ring 2 */}
            <mesh ref={ringRef2} position={[0, 0, -0.1]}>
                <ringGeometry args={[11, 11.2, 64]} />
                <meshBasicMaterial color={COLORS.champagneGold} transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
            {/* Base Glow */}
            <mesh position={[0, 0, -0.2]}>
                <circleGeometry args={[8, 32]} />
                <meshBasicMaterial color={COLORS.deepGreen} transparent opacity={0.5} />
            </mesh>
        </group>
    );
};

// Interactive Gift Box Component
const GiftBox = ({ position, scale, color, delay, photos, customWishes }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [popped, setPopped] = useState(false);
    const [surpriseContent, setSurpriseContent] = useState<{type: 'text' | 'photo', content: string | THREE.Texture | null} | null>(null);

    // Random idle floating
    useFrame((state) => {
        if (!groupRef.current) return;
        
        // Idle Animation
        const t = state.clock.elapsedTime + delay;
        const hoverY = Math.sin(t * 2) * 0.2;
        
        // Interaction Animation
        const targetScale = hovered ? 1.2 : 1.0;
        const currentScale = groupRef.current.scale.x;
        const smoothScale = THREE.MathUtils.lerp(currentScale, targetScale * scale[0], 0.1);
        
        groupRef.current.position.y = position[1] + hoverY;
        groupRef.current.scale.setScalar(smoothScale);

        // Rotation
        if (hovered) {
             groupRef.current.rotation.y += 0.1;
             groupRef.current.rotation.z = Math.sin(t * 15) * 0.1; // Shake
        } else {
             // Reset rotation slowly
             groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
        }
    });

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setPopped(true);
        
        // Determine content logic
        // 1. If we have uploaded photos, 50% chance to show photo.
        // 2. Otherwise show text.
        // 3. If showing text, prioritizing Custom Wishes (100% chance if available).

        const showPhoto = photos && photos.length > 0 && Math.random() > 0.5;

        if (showPhoto) {
            const randPhoto = photos[Math.floor(Math.random() * photos.length)];
            setSurpriseContent({ type: 'photo', content: randPhoto });
        } else {
            // Text Mode
            let textToDisplay = "";
            if (customWishes && customWishes.length > 0) {
                // Prioritize user wishes if they exist!
                textToDisplay = customWishes[Math.floor(Math.random() * customWishes.length)];
            } else {
                // Fallback to default
                textToDisplay = DEFAULT_SURPRISE_TEXTS[Math.floor(Math.random() * DEFAULT_SURPRISE_TEXTS.length)];
            }
            setSurpriseContent({ type: 'text', content: textToDisplay });
        }

        // Auto close after 4 seconds
        setTimeout(() => {
            setPopped(false);
            setSurpriseContent(null);
        }, 4000);
    };

    return (
        <group position={[position[0], 0, position[2]]}>
            <group 
                ref={groupRef}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                onClick={handleClick}
                rotation={[0, Math.random() * Math.PI, 0]}
            >
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial 
                        color={color} 
                        roughness={0.3} 
                        metalness={0.4} 
                        emissive={hovered ? color : '#000000'}
                        emissiveIntensity={hovered ? 0.5 : 0}
                    />
                </mesh>
                {/* Ribbon Vertical */}
                <mesh position={[0, 0, 0]} scale={[1.02, 1.02, 0.2]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color={color === COLORS.accentRed ? COLORS.champagneGold : COLORS.accentRed} />
                </mesh>
                 {/* Ribbon Horizontal */}
                 <mesh position={[0, 0, 0]} scale={[0.2, 1.02, 1.02]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color={color === COLORS.accentRed ? COLORS.champagneGold : COLORS.accentRed} />
                </mesh>
            </group>

            {/* Surprise Pop-up */}
            {popped && surpriseContent && (
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <group position={[0, position[1] + 3, 0]}>
                        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                            {surpriseContent.type === 'text' ? (
                                <Text
                                    fontSize={0.6}
                                    color={COLORS.champagneGold}
                                    outlineWidth={0.04}
                                    outlineColor="#550000"
                                    anchorX="center"
                                    anchorY="middle"
                                    maxWidth={4}
                                    textAlign="center"
                                >
                                    {surpriseContent.content as string}
                                </Text>
                            ) : (
                                <mesh>
                                    <planeGeometry args={[3, 2.2]} />
                                    <meshBasicMaterial map={surpriseContent.content as THREE.Texture} side={THREE.DoubleSide} />
                                    <mesh position={[0,0,-0.01]}>
                                         <boxGeometry args={[3.1, 2.3, 0.05]} />
                                         <meshBasicMaterial color={COLORS.champagneGold} />
                                    </mesh>
                                </mesh>
                            )}
                        </Billboard>
                        {/* Sparkle Burst effect simplified as a glow */}
                        <pointLight distance={5} intensity={5} color={color} />
                    </group>
                </Float>
            )}
        </group>
    );
};

const Gifts = ({ uploadedTextures, customWishes }: { uploadedTextures: THREE.Texture[], customWishes: string[] }) => {
    const gifts = useMemo(() => {
        const items = [];
        const colors = [COLORS.accentRed, COLORS.champagneGold, '#ffffff', '#2a4d69'];
        for(let i=0; i<12; i++) {
            const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
            const r = 6 + Math.random() * 4;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const s = 0.8 + Math.random() * 1.0;
            const y = -14 + s/2; 
            items.push({ 
                pos: [x, y, z], 
                scale: [s,s,s], 
                color: colors[Math.floor(Math.random()*colors.length)],
                delay: Math.random() * 10 
            });
        }
        return items;
    }, []);

    return (
        <group>
            {gifts.map((g, i) => (
                <GiftBox 
                    key={i} 
                    position={g.pos} 
                    scale={g.scale} 
                    color={g.color} 
                    delay={g.delay}
                    photos={uploadedTextures}
                    customWishes={customWishes}
                />
            ))}
        </group>
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

const Scene: React.FC<SceneProps> = ({ handStateRef, uploadedTextures, forceShowGallery, customWishes }) => {
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
        shadows
      >
        <color attach="background" args={[COLORS.deepGreen]} />
        <fog attach="fog" args={[COLORS.deepGreen, 20, 80]} />

        {/* Ambient Warmth */}
        <ambientLight intensity={0.5} color="#ffd966" />
        
        {/* Magical Spotlights */}
        <spotLight 
            position={[20, 50, 20]} 
            angle={0.3} 
            penumbra={1} 
            intensity={150} 
            color="#ffddaa" 
            castShadow 
            shadow-bias={-0.0001}
        />
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
            <PhotoGallery 
                handState={handStateRef} 
                uploadedTextures={uploadedTextures}
                forceShow={forceShowGallery}
            />
        </group>
        
        {/* Decor: Base & Interactive Gifts */}
        <HoloBase />
        <Gifts uploadedTextures={uploadedTextures} customWishes={customWishes} />

        {/* Ground Floor Plane for Shadows */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -14.1, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#020a05" roughness={0.8} metalness={0.2} />
        </mesh>
        
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
