import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandState } from '../types';
import { COLORS } from '../constants';

interface PhotoGalleryProps {
  handState: React.MutableRefObject<HandState>;
  uploadedTextures: THREE.Texture[];
}

const Frame = ({ texture, index, total, globalRot, handState }: any) => {
    const ref = useRef<THREE.Group>(null);
    
    // Calculate standard orbital position
    const baseRadius = 14; 
    const angleStep = (Math.PI * 2) / total;
    const angle = index * angleStep;

    useFrame((state, delta) => {
        if (!ref.current) return;

        const { isPinching, isHeart } = handState.current;

        // Current rotation state
        const currentGlobalRot = globalRot.current;
        const finalAngle = angle + currentGlobalRot;

        // --- HEART MODE ADJUSTMENT ---
        // If isHeart, we expand radius slightly to surround the particle heart.
        // Set to 18 as requested by user
        const currentRadius = isHeart ? 18 : baseRadius;
        
        // Lowered height from 5 to 2.5 to sit slightly below the heart center
        const currentYOffset = isHeart ? 2.5 : 0; 

        // --- VISIBILITY / SELECTION LOGIC (Standard Mode) ---
        const xRing = Math.cos(finalAngle) * currentRadius;
        const zRing = Math.sin(finalAngle) * currentRadius;
        
        // Check alignment only if NOT in heart mode (Heart mode just rotates)
        const camPos = state.camera.position;
        const camDir = new THREE.Vector3(camPos.x, 0, camPos.z).normalize();
        const itemDir = new THREE.Vector3(xRing, 0, zRing).normalize();
        const alignment = itemDir.dot(camDir);
        
        // Focus Condition: Pointing AND facing camera AND NOT doing heart gesture
        const isFocused = isPinching && alignment > 0.96 && !isHeart;

        // Dynamic visual parameters
        let targetScale = 1.0;
        let targetPos = new THREE.Vector3();

        if (isFocused) {
            // --- FOCUSED STATE ---
            targetScale = 3.5; 
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion);
            const distFromCam = 12; 
            const targetWorld = camPos.clone().add(forward.multiplyScalar(distFromCam));
            targetPos.copy(targetWorld).sub(new THREE.Vector3(0, 4, 0));
            
            ref.current.position.lerp(targetPos, delta * 8);
        } else {
            // --- ORBIT STATE (Normal or Heart) ---
            
            // Standard orbital position
            // Gentle bobbing motion (reduced in Heart mode for cleaner look)
            const yBob = Math.sin(state.clock.elapsedTime * 2 + index) * 0.5;
            const finalY = currentYOffset + yBob;
            
            targetPos.set(xRing, finalY, zRing);
            
            // Use lerp for smooth transition between radius changes
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
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ handState, uploadedTextures }) => {
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

    const showTextures = useMemo(() => {
        const arr = [...uploadedTextures];
        while(arr.length < 6) arr.push(defaultTex);
        return arr.slice(0,6);
    }, [uploadedTextures, defaultTex]);

    useFrame((state, delta) => {
        const { isOpen, isPinching, isHeart } = handState.current;
        
        // Active if Open, Pinching OR Heart
        const isActive = isOpen || isPinching || isHeart;

        // ROTATION LOGIC:
        // Pause if Pinching.
        // Moderate if Heart (Slow elegant orbit).
        // Slow if Open.
        // Fast if Closed (Background).
        let speed = 0.5;
        if (isPinching) speed = 0;
        else if (isHeart) speed = 0.3; // Reduced from 0.8 to 0.3 for a more peaceful heart moment
        else if (isOpen) speed = 0.2;
        
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
                    total={6} 
                    globalRot={rotationRef}
                    handState={handState}
                />
            ))}
        </group>
    );
};

export default PhotoGallery;