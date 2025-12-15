import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandState } from '../types';
import { COLORS, PHOTO_COUNT } from '../constants';

interface PhotoGalleryProps {
  handState: React.MutableRefObject<HandState>;
  uploadedTextures: THREE.Texture[];
  forceShow?: boolean;
}

const Frame = ({ texture, index, total, globalRot, handState, forceShow, radius = 14 }: any) => {
    const ref = useRef<THREE.Group>(null);
    
    // Use passed radius or default
    const baseRadius = radius; 
    const angleStep = (Math.PI * 2) / total;
    const angle = index * angleStep;

    // Precalculate a random scatter direction for explosion mode
    const explodeDir = useMemo(() => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const dist = 30 + Math.random() * 20; // Explode far out
        return new THREE.Vector3(
            dist * Math.sin(phi) * Math.cos(theta),
            dist * Math.cos(phi), // Allow Vertical variance
            dist * Math.sin(phi) * Math.sin(theta)
        );
    }, []);

    useFrame((state, delta) => {
        if (!ref.current) return;

        const { isPinching, isHeart, isDoubleOpen } = handState.current;

        // Current rotation state
        const currentGlobalRot = globalRot.current;
        const finalAngle = angle + currentGlobalRot;

        // --- HEART MODE ADJUSTMENT ---
        const heartRadiusBuffer = baseRadius > 15 ? 4 : 4;
        const currentRadius = isHeart ? baseRadius + heartRadiusBuffer : baseRadius;
        const currentYOffset = isHeart ? 2.5 : 0; 

        // --- VISIBILITY / SELECTION LOGIC ---
        // Normal Orbit Position
        const xRing = Math.cos(finalAngle) * currentRadius;
        const zRing = Math.sin(finalAngle) * currentRadius;
        
        // Alignment Check for Focus Mode
        const camPos = state.camera.position;
        const camDir = new THREE.Vector3(camPos.x, 0, camPos.z).normalize();
        const itemDir = new THREE.Vector3(xRing, 0, zRing).normalize();
        const alignment = itemDir.dot(camDir);
        
        // Focus Condition: Pointing (Single or Double) AND facing camera AND NOT doing heart gesture
        const isFocused = isPinching && alignment > 0.96 && !isHeart && !isDoubleOpen;

        // Dynamic visual parameters
        let targetScale = 1.0;
        let targetPos = new THREE.Vector3();

        if (isDoubleOpen) {
            // --- EXPLODE MODE ---
            // Fly out to random directions
            targetPos.copy(explodeDir);
            // Add current global rotation influence so they spiral out slightly
            targetPos.applyAxisAngle(new THREE.Vector3(0,1,0), currentGlobalRot);
            targetScale = 1.2; // Slightly bigger in chaos

        } else if (isFocused) {
            // --- FOCUSED STATE ---
            targetScale = 3.5; 
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
            const distFromCam = 12; 
            const targetWorld = camPos.clone().add(forward.multiplyScalar(distFromCam));
            targetPos.copy(targetWorld).sub(new THREE.Vector3(0, 4, 0));
            
            ref.current.position.lerp(targetPos, delta * 8);
        } else {
            // --- ORBIT STATE (Normal or Heart) ---
            const yBob = Math.sin(state.clock.elapsedTime * 2 + index) * 0.5;
            const finalY = currentYOffset + yBob;
            
            targetPos.set(xRing, finalY, zRing);
            
            // Use lerp for smooth transition
            ref.current.position.lerp(targetPos, delta * 4);
        }

        // Apply Scale
        const currentScale = ref.current.scale.x;
        const smoothScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 5);
        ref.current.scale.setScalar(smoothScale);
        
        // Always look at camera
        ref.current.lookAt(state.camera.position);
    });

    return (
        <group ref={ref}>
            {/* Frame Border */}
            <mesh position={[0,0,-0.05]}>
                <boxGeometry args={[5.2, 4.0, 0.1]} />
                <meshStandardMaterial 
                    color={COLORS.champagneGold} 
                    metalness={0.9} 
                    roughness={0.1}
                    emissive={COLORS.emissiveGold}
                    emissiveIntensity={0.5} 
                />
            </mesh>
            {/* Photo */}
            <mesh>
                <planeGeometry args={[5, 3.8]} />
                <meshBasicMaterial 
                    key={texture.uuid} 
                    map={texture} 
                    side={THREE.DoubleSide} 
                    toneMapped={false} 
                />
            </mesh>
        </group>
    );
};

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ handState, uploadedTextures, forceShow }) => {
    const groupRef = useRef<THREE.Group>(null);
    const rotationRef = useRef(0);
    const scaleRef = useRef(0); 

    // Fallback Texture
    const defaultTex = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 512; c.height = 512;
        const ctx = c.getContext('2d');
        if(ctx) {
            ctx.fillStyle = '#050510'; ctx.fillRect(0,0,512,512);
            ctx.strokeStyle = '#ffd966'; ctx.lineWidth=15; ctx.strokeRect(20,20,472,472);
            ctx.fillStyle = '#fff'; ctx.textAlign='center';
            ctx.font='60px Serif'; ctx.fillText("HoloMemory", 256, 180);
            ctx.font='30px Serif'; ctx.fillText("Open Hand to View", 256, 280);
            ctx.font='40px Serif'; ctx.fillStyle = '#ffd966'; ctx.fillText("Point ☝️ to Focus", 256, 360);
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }, []);

    // Logic: 
    // 1. If uploaded < 6, fill with default up to 6.
    // 2. If uploaded > 6, show all up to PHOTO_COUNT (12).
    const showTextures = useMemo(() => {
        let arr = [...uploadedTextures];
        
        // Ensure minimum of 6
        if (arr.length < 6) {
             const needed = 6 - arr.length;
             for(let i=0; i<needed; i++) arr.push(defaultTex);
        }
        
        // Cap at PHOTO_COUNT (12)
        if (arr.length > PHOTO_COUNT) {
            arr = arr.slice(0, PHOTO_COUNT);
        }
        
        return arr;
    }, [uploadedTextures, defaultTex]);

    // Calculate dynamic radius based on count
    // Base radius is 14. If we have many photos (e.g. > 8), expand to 18 to avoid overlap.
    const dynamicRadius = showTextures.length > 8 ? 19 : 14;

    useFrame((state, delta) => {
        const { isOpen, isPinching, isHeart, isDoubleOpen } = handState.current;
        
        // Active if Open, Pinching, Heart OR Double Open
        const isActive = isOpen || isPinching || isHeart || isDoubleOpen || forceShow;

        // ROTATION LOGIC:
        let speed = 0.5;
        if (isPinching) speed = 0; // Stop for focus
        else if (isHeart) speed = 0.3; // Slow for heart
        else if (isDoubleOpen) speed = 1.0; // Fast spin during explosion!
        else if (isOpen || forceShow) speed = 0.2; // Slow roam
        
        rotationRef.current += speed * delta;

        // VISIBILITY / SCALE LOGIC
        const targetScale = isActive ? 1 : 0;
        scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, targetScale, delta * 5);

        if (groupRef.current) {
            groupRef.current.scale.setScalar(scaleRef.current);
            groupRef.current.visible = scaleRef.current > 0.01;
        }
    });

    return (
        <group ref={groupRef} position={[0, 4, 0]}>
            {showTextures.map((t, i) => (
                <Frame 
                    key={i} 
                    index={i} 
                    texture={t} 
                    total={showTextures.length} 
                    globalRot={rotationRef}
                    handState={handState}
                    forceShow={forceShow}
                    radius={dynamicRadius}
                />
            ))}
        </group>
    );
};

export default PhotoGallery;