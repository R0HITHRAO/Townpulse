import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, MeshDistortMaterial, Environment, Preload } from '@react-three/drei';
import * as THREE from 'three';

// A component that plays a video as a WebGL texture
const VideoPlane = ({ url, index }: any) => {
  const [video] = useState(() => {
    const vid = document.createElement('video');
    vid.src = url;
    vid.crossOrigin = 'Anonymous';
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.play().catch(() => console.warn('Autoplay blocked'));
    return vid;
  });

  const meshRef = useRef<THREE.Mesh>(null);
  const scroll = useScroll();
  
  // Arrange in a massive tunnel. 
  // We place them along the Z-axis based on their index.
  const zSpacing = 15;
  const initialZ = -index * zSpacing;

  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Infinite scroll logic:
      // scroll.offset goes 0 to 1 repeatedly if ScrollControls is infinite
      // But actually with `infinite`, scroll.offset is continuous.
      // Let's manually wrap the position so they reappear in front of the camera.
      
      const time = clock.getElapsedTime();
      // Gentle floating animation
      const yOffset = Math.sin(time * 0.5 + index) * 0.5;
      const xOffset = Math.cos(time * 0.3 + index) * 1.5;
      
      // Calculate continuous Z position
      // As scroll.offset increases, camera moves forward. We can just move the planes towards the camera.
      // Total length of the tunnel = number of items * spacing
      const totalLength = 6 * zSpacing; 
      
      // Move planes towards the camera based on scroll offset
      let currentZ = initialZ + (scroll.offset * totalLength * 4); // Speed multiplier
      
      // Wrap around logic to make it infinite
      currentZ = currentZ % totalLength;
      if (currentZ > 5) currentZ -= totalLength;
      
      meshRef.current.position.set(
        (index % 2 === 0 ? 3 : -3) + xOffset,
        yOffset,
        currentZ - 15 // Keep them ahead of the camera
      );
      
      // Look at center
      meshRef.current.lookAt(0, 0, currentZ);
    }
  });

  return (
    <mesh ref={meshRef} scale={[8, 4.5, 1]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <MeshDistortMaterial distort={0.3} speed={2.5}>
        <videoTexture attach="map" args={[video]} colorSpace={THREE.SRGBColorSpace} />
      </MeshDistortMaterial>
    </mesh>
  );
};

const Scene = () => {
  const { camera } = useThree();
  const scroll = useScroll();

  useFrame((state, delta) => {
    // Zajno fluid camera movement - slight sway based on scroll velocity
    const scrollVelocity = scroll.delta * 100;
    camera.rotation.z = THREE.MathUtils.damp(camera.rotation.z, -scrollVelocity * 0.1, 4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, scrollVelocity * 2, 4, delta);
  });

  const videos = [
    "https://player.vimeo.com/external/494252666.sd.mp4?s=1f1b2b3a4a98a0050e0513f5d5b741e40c5fdbba&profile_id=165",
    "https://player.vimeo.com/external/434045526.sd.mp4?s=c27ee3a4f61546990d0b00c2834b179379685a73&profile_id=165",
    "https://player.vimeo.com/external/372338944.sd.mp4?s=d00e0085d7fb797c5f850e0d665b1c5c0d297920&profile_id=165",
    "https://player.vimeo.com/external/494252666.sd.mp4?s=1f1b2b3a4a98a0050e0513f5d5b741e40c5fdbba&profile_id=165",
    "https://player.vimeo.com/external/434045526.sd.mp4?s=c27ee3a4f61546990d0b00c2834b179379685a73&profile_id=165",
    "https://player.vimeo.com/external/372338944.sd.mp4?s=d00e0085d7fb797c5f850e0d665b1c5c0d297920&profile_id=165",
  ];

  return (
    <group>
      {videos.map((url, i) => (
        <VideoPlane key={i} index={i} url={url} />
      ))}
      
      {/* Immersive high-speed ambient particles */}
      {Array.from({ length: 150 }).map((_, i) => (
        <mesh 
          key={i} 
          position={[
            (Math.random() - 0.5) * 40, 
            (Math.random() - 0.5) * 40, 
            -Math.random() * 60
          ]}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#ea580c" : "#ffffff"} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
};

export const ThreeCanvas: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-auto">
      <Canvas camera={{ position: [0, 0, 5], fov: 70 }} dpr={[1, 2]}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2.5} />
        <Environment preset="city" />
        
        <Suspense fallback={null}>
          <ScrollControls pages={4} damping={0.1} infinite>
            <Scene />
            
            <Scroll html style={{ width: '100%', height: '100%' }}>
              {children}
            </Scroll>
          </ScrollControls>
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
};
