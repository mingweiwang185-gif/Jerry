import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_COUNT, TREE_HEIGHT, TREE_RADIUS, COLORS } from '../constants';
import { HandState } from '../types';

interface TreeParticlesProps {
  handState: React.MutableRefObject<HandState>;
}

// Helper: Candy Cane Texture
const useCandyCaneTexture = () => {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,64,64);
        ctx.fillStyle = '#ff0000'; 
        ctx.beginPath();
        for(let i=-64; i<128; i+=16) {
            ctx.moveTo(i, 0); ctx.lineTo(i+16, 64); ctx.lineTo(i+8, 64); ctx.lineTo(i-8, 0);
        }
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
};

const TopStar = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
        ref.current.rotation.y = state.clock.elapsedTime * 0.5;
        const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        ref.current.scale.set(s,s,s);
    }
  });
  return (
    <mesh ref={ref} position={[0, TREE_HEIGHT / 2 + 1.2, 0]}>
      <octahedronGeometry args={[1.2, 0]} />
      <meshStandardMaterial color="#ffdd88" emissive="#ffaa00" emissiveIntensity={3} toneMapped={false} />
    </mesh>
  );
};

const TreeParticles: React.FC<TreeParticlesProps> = ({ handState }) => {
  const greenBoxRef = useRef<THREE.InstancedMesh>(null);
  const goldBoxRef = useRef<THREE.InstancedMesh>(null);
  const goldSphereRef = useRef<THREE.InstancedMesh>(null);
  const redSphereRef = useRef<THREE.InstancedMesh>(null);
  const candyRef = useRef<THREE.InstancedMesh>(null);
  
  const candyTexture = useCandyCaneTexture();
  
  // 0 = Tree, 1 = Scatter, 2 = Heart
  const scatterFactorRef = useRef(0);
  const heartFactorRef = useRef(0);
  
  // Group rotation accumulator
  const rotationRef = useRef(0);

  // Generate Data
  const data = useMemo(() => {
    const all = [];
    const counts = { GREEN: 0, GOLD_BOX: 0, GOLD_SPHERE: 0, RED: 0, CANDY: 0 };
    
    // Total particles
    for(let i=0; i<PARTICLE_COUNT; i++) {
        // 1. Tree Pos (Cone)
        const t = Math.pow(Math.random(), 0.8); 
        const h = TREE_HEIGHT;
        const yTree = (t * h) - (h / 2);
        const rMax = Math.max(0.5, TREE_RADIUS * (1 - t));
        const angle = t * 50 + Math.random() * Math.PI * 2;
        const rTree = rMax * (0.3 + Math.random() * 0.7);
        const treePos = new THREE.Vector3(Math.cos(angle)*rTree, yTree, Math.sin(angle)*rTree);

        // 2. Scatter Pos
        const rScatter = 10 + Math.random() * 20; 
        const scatterAngle = Math.random() * Math.PI * 2;
        const scatterHeight = (Math.random() - 0.5) * 10;
        const scatterPos = new THREE.Vector3(
            rScatter * Math.cos(scatterAngle),
            scatterHeight,
            rScatter * Math.sin(scatterAngle)
        );

        // 3. Heart Pos (Hollow Shell via Rejection Sampling)
        // Formula: (x^2 + 9/4y^2 + z^2 - 1)^3 - x^2*y^3 - 9/80*z^2*y^3 <= 0
        let hx = 0, hy = 0, hz = 0;
        let valid = false;
        let safety = 0;
        
        while(!valid && safety < 2000) {
            safety++;
            // Sample a box. 
            const _x = (Math.random() * 2.8) - 1.4;
            const _y = (Math.random() * 2.8) - 1.4;
            const _z = (Math.random() * 1.8) - 0.9; 
            
            const x2 = _x*_x;
            const y2 = _y*_y;
            const z2 = _z*_z;
            const y3 = y2 * _y;
            
            // 9/4 = 2.25
            const a = x2 + 2.25*y2 + z2 - 1;
            // 9/80 = 0.1125
            const val = (a*a*a) - (x2*y3) - (0.1125*z2*y3);
            
            // HOLLOW LOGIC:
            // Use -0.08 for a shell that is thin but continuous (no gaps, no deformities).
            if (val <= 0 && val > -0.08) {
                valid = true;
                hx = _x;
                hy = _y; 
                hz = _z; 
            }
        }
        
        // Fallback
        if (!valid) {
             const theta = Math.random() * Math.PI * 2;
             const phi = Math.random() * Math.PI;
             hx = Math.sin(phi) * Math.cos(theta);
             hy = Math.cos(phi);
             hz = Math.sin(phi) * Math.sin(theta);
        }
        
        const heartPos = new THREE.Vector3(hx, hy, hz);

        // Assign Type
        const rand = Math.random();
        let type = 'GREEN';
        if (rand > 0.95) type = 'CANDY';
        else if (rand > 0.90) type = 'RED';
        else if (rand > 0.75) type = 'GOLD_SPHERE';
        else if (rand > 0.55) type = 'GOLD_BOX';
        
        if(type==='GREEN') counts.GREEN++;
        if(type==='GOLD_BOX') counts.GOLD_BOX++;
        if(type==='GOLD_SPHERE') counts.GOLD_SPHERE++;
        if(type==='RED') counts.RED++;
        if(type==='CANDY') counts.CANDY++;

        all.push({ type, treePos, scatterPos, heartPos, scale: 0.3 + Math.random()*0.5, speed: Math.random() });
    }
    return { particles: all, counts };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
      const { isOpen, isPinching, isHeart } = handState.current;
      
      const isGalaxyActive = isOpen || isPinching; 

      // Target Factors
      const targetScatter = isGalaxyActive ? 1.0 : 0.0;
      const targetHeart = isHeart ? 1.0 : 0.0;
      
      // Speed
      const rotateSpeed = isPinching ? 0 : (isOpen ? 0.2 : 0.5);

      // Lerp factors
      scatterFactorRef.current = THREE.MathUtils.lerp(scatterFactorRef.current, targetScatter, delta * 3);
      heartFactorRef.current = THREE.MathUtils.lerp(heartFactorRef.current, targetHeart, delta * 2); 
      
      // Update Rotation
      rotationRef.current += rotateSpeed * delta;

      const scatterMix = scatterFactorRef.current;
      const heartMix = heartFactorRef.current;
      const rot = rotationRef.current;
      
      let idxGreen=0, idxGoldBox=0, idxGoldSphere=0, idxRed=0, idxCandy=0;

      // Tree/Galaxy Rotation math
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);

      // Heart Billboard & Scaling Math
      const camPos = state.camera.position;
      const camAngle = Math.atan2(camPos.x, camPos.z);
      const sinCam = Math.sin(camAngle);
      const cosCam = Math.cos(camAngle);

      // --- DYNAMIC SCALING & BREATHING ---
      const baseScale = 12; // Slightly larger for clarity
      
      const time = state.clock.elapsedTime;
      const breathe = 1 + Math.sin(time * 2.5) * 0.05; 
      
      const finalScale = baseScale * breathe;

      // Center of the heart in world space.
      const heartCenterY = 5.0; 

      data.particles.forEach((p) => {
          // 1. Calculate Tree -> Scatter Base Position (Unrotated)
          const xBase = p.treePos.x + (p.scatterPos.x - p.treePos.x) * scatterMix;
          const yBase = p.treePos.y + (p.scatterPos.y - p.treePos.y) * scatterMix;
          const zBase = p.treePos.z + (p.scatterPos.z - p.treePos.z) * scatterMix;

          // 2. Apply Rotation ONLY to the Tree/Scatter layer
          const xRotated = xBase * cos - zBase * sin;
          const zRotated = xBase * sin + zBase * cos;

          // 3. Heart Target Position
          
          let hx = p.heartPos.x;
          let hy = p.heartPos.y;
          let hz = p.heartPos.z;

          // FIX: Removed all manual vertex manipulation / conditional stretching.
          // Using pure uniform scaling guarantees the heart shape is perfectly round and smooth.
          
          const hxScaled = hx * finalScale;
          // Scale Y by 1.2 to make it slightly elegant/tall but keeping smooth curvature
          const hyScaled = hy * finalScale * 1.35; 
          // Scale Z by 0.5 to make it flatter (better for UI presentation)
          const hzScaled = hz * finalScale * 0.5; 

          // Billboard Rotation (Face Camera)
          const hxFace = hxScaled * cosCam + hzScaled * sinCam;
          const hzFace = -hxScaled * sinCam + hzScaled * cosCam;
          const hyFace = hyScaled + heartCenterY; // Apply vertical offset

          // 4. Blend (Tree -> Heart)
          const x = xRotated + (hxFace - xRotated) * heartMix;
          const y = yBase + (hyFace - yBase) * heartMix;
          const z = zRotated + (hzFace - zRotated) * heartMix;

          dummy.position.set(x, y, z);

          // Scale Effect
          const s = p.scale * (1 + Math.sin(time * 3 + p.speed * 15) * 0.2);
          dummy.scale.set(s, s, s);
          
          // Rotation of individual particle
          const sway = isHeart ? Math.sin(time * 3 + p.speed * 100) * 0.2 : 0;
          
          const spinSpeed = p.speed * (isHeart ? 2 : 10);
          dummy.rotation.set(
              rot * p.speed + spinSpeed + sway, 
              rot * p.speed * 0.5 + sway, 
              rot * p.speed
          );
          
          dummy.updateMatrix();

          if (p.type === 'GREEN') greenBoxRef.current?.setMatrixAt(idxGreen++, dummy.matrix);
          if (p.type === 'GOLD_BOX') goldBoxRef.current?.setMatrixAt(idxGoldBox++, dummy.matrix);
          if (p.type === 'GOLD_SPHERE') goldSphereRef.current?.setMatrixAt(idxGoldSphere++, dummy.matrix);
          if (p.type === 'RED') redSphereRef.current?.setMatrixAt(idxRed++, dummy.matrix);
          if (p.type === 'CANDY') candyRef.current?.setMatrixAt(idxCandy++, dummy.matrix);
      });

      [greenBoxRef, goldBoxRef, goldSphereRef, redSphereRef, candyRef].forEach(r => {
          if(r.current) r.current.instanceMatrix.needsUpdate = true;
      });
  });

  return (
    <group>
        <group scale={[1 - Math.max(scatterFactorRef.current, heartFactorRef.current), 1 - Math.max(scatterFactorRef.current, heartFactorRef.current), 1 - Math.max(scatterFactorRef.current, heartFactorRef.current)]}>
            <TopStar />
        </group>

        <instancedMesh ref={greenBoxRef} args={[undefined, undefined, data.counts.GREEN]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={COLORS.deepGreen} roughness={0.3} />
        </instancedMesh>
        
        <instancedMesh ref={goldBoxRef} args={[undefined, undefined, data.counts.GOLD_BOX]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={COLORS.champagneGold} metalness={0.9} roughness={0.1} emissive={COLORS.emissiveGold} emissiveIntensity={1} />
        </instancedMesh>

        <instancedMesh ref={goldSphereRef} args={[undefined, undefined, data.counts.GOLD_SPHERE]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color={COLORS.champagneGold} metalness={1} roughness={0.1} emissive={COLORS.emissiveGold} emissiveIntensity={2} />
        </instancedMesh>

        <instancedMesh ref={redSphereRef} args={[undefined, undefined, data.counts.RED]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color={COLORS.accentRed} metalness={0.6} roughness={0.2} emissive={COLORS.emissiveRed} emissiveIntensity={2} />
        </instancedMesh>

        <instancedMesh ref={candyRef} args={[undefined, undefined, data.counts.CANDY]}>
            <capsuleGeometry args={[0.1, 0.6, 4, 8]} />
            <meshStandardMaterial map={candyTexture} />
        </instancedMesh>
    </group>
  );
};

export default TreeParticles;