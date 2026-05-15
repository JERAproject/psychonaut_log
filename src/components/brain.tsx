import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, Line } from '@react-three/drei';
import * as THREE from 'three';

const Brain = ({ count = 80, connections = 120 }) => {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#7c3aed" />
      <BrainGraph count={count} connections={connections} />
    </Canvas>
  );
};

const BrainGraph = React.memo(({ count, connections }) => {
  const groupRef = useRef();

  const nodePositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.2 + Math.random() * 1.2;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.8;
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [count]);

  const linePoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const edgeCount = Math.min(connections, Math.floor(count * (count - 1) / 2));
    const added = new Set<string>();
    let attempts = 0;
    while (pts.length / 2 < edgeCount && attempts < connections * 10) {
      const a = Math.floor(Math.random() * count);
      const b = Math.floor(Math.random() * count);
      if (a === b) { attempts++; continue; }
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (added.has(key)) { attempts++; continue; }
      added.add(key);
      pts.push(
        new THREE.Vector3(nodePositions[a * 3], nodePositions[a * 3 + 1], nodePositions[a * 3 + 2]),
        new THREE.Vector3(nodePositions[b * 3], nodePositions[b * 3 + 1], nodePositions[b * 3 + 2])
      );
      attempts++;
    }
    return pts;
  }, [nodePositions, connections, count]);

  const nodeColors = useMemo(() => {
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const dist = Math.sqrt(
        nodePositions[i * 3] ** 2 +
        nodePositions[i * 3 + 1] ** 2 +
        nodePositions[i * 3 + 2] ** 2
      );
      const t = Math.min(dist / 4, 1);
      colors[i * 3] = THREE.MathUtils.lerp(0.486, 0.357, t);
      colors[i * 3 + 1] = THREE.MathUtils.lerp(0.227, 0.549, t);
      colors[i * 3 + 2] = THREE.MathUtils.lerp(0.929, 0.976, t);
    }
    return colors;
  }, [nodePositions, count]);

  const nodeGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', nodePositions);
    geo.setAttribute('color', nodeColors);
    return geo;
  }, [nodePositions, nodeColors]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <Line
        points={linePoints}
        color="#5b8cf9"
        lineWidth={0.8}
        transparent
        opacity={0.15}
      />
      <Points geometry={nodeGeometry} size={0.12} vertexColors>
        <pointsMaterial
          size={0.12}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
});

Brain.displayName = 'Brain';
BrainGraph.displayName = 'BrainGraph';

export default Brain;