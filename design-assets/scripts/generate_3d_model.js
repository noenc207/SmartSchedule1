import * as THREE from '../../frontend/node_modules/three/src/Three.js';
import { GLTFExporter } from '../../frontend/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Node.js FileReader polyfill for GLTFExporter binary mode
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
      });
    }
  };
}

// Setup scene
const scene = new THREE.Scene();
scene.name = 'AcademicKnowledgeCore';

// Group for the entire assembly
const rootGroup = new THREE.Group();
rootGroup.name = 'RootAssembly';
scene.add(rootGroup);

// 1. Central Faceted Crystal Core (Academic Prism) — Enhanced scale & faceted shading
const coreGeometry = new THREE.IcosahedronGeometry(1.4, 0); // Bold faceted crystal
const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0xea580c, // FPTU signature orange
  roughness: 0.18,
  metalness: 0.25,
  emissive: 0x9a3412,
  emissiveIntensity: 0.45,
  flatShading: true,
});
const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
coreMesh.name = 'PrismCore';
rootGroup.add(coreMesh);

// 2. Inner Golden Luminary Node (Pulsing warm core)
const innerGeometry = new THREE.OctahedronGeometry(0.72, 0);
const innerMaterial = new THREE.MeshStandardMaterial({
  color: 0xfbbf24, // Amber gold
  roughness: 0.1,
  metalness: 0.85,
  emissive: 0xd97706,
  emissiveIntensity: 0.7,
  flatShading: true,
});
const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
innerMesh.name = 'InnerLuminary';
rootGroup.add(innerMesh);

// 3. Celestial Orbital Ring Primary (Inclined 45 deg)
const ring1Geometry = new THREE.TorusGeometry(1.95, 0.042, 16, 72);
const ring1Material = new THREE.MeshStandardMaterial({
  color: 0xf97316,
  roughness: 0.22,
  metalness: 0.75,
});
const ring1Mesh = new THREE.Mesh(ring1Geometry, ring1Material);
ring1Mesh.name = 'OrbitalRingPrimary';
ring1Mesh.rotation.x = Math.PI / 3.8;
ring1Mesh.rotation.y = Math.PI / 6;
rootGroup.add(ring1Mesh);

// 4. Celestial Orbital Ring Secondary (Inclined -35 deg)
const ring2Geometry = new THREE.TorusGeometry(2.28, 0.034, 16, 72);
const ring2Material = new THREE.MeshStandardMaterial({
  color: 0xfdba74,
  roughness: 0.28,
  metalness: 0.65,
});
const ring2Mesh = new THREE.Mesh(ring2Geometry, ring2Material);
ring2Mesh.name = 'OrbitalRingSecondary';
ring2Mesh.rotation.x = -Math.PI / 4.5;
ring2Mesh.rotation.z = Math.PI / 3.2;
rootGroup.add(ring2Mesh);

// 5. Outer Horizon Ring (Horizontal) — Compacted to 2.55 radius
const ring3Geometry = new THREE.TorusGeometry(2.55, 0.026, 16, 80);
const ring3Material = new THREE.MeshStandardMaterial({
  color: 0xffedd5,
  roughness: 0.35,
  metalness: 0.5,
});
const ring3Mesh = new THREE.Mesh(ring3Geometry, ring3Material);
ring3Mesh.name = 'OrbitalRingHorizon';
ring3Mesh.rotation.x = Math.PI / 2;
rootGroup.add(ring3Mesh);

// 6. Floating Academic Schedule Nodes (Cubes & Prisms)
const nodeSpecs = [
  { pos: [1.5, 0.85, 0.75], size: 0.32, color: 0xfff7ed, rot: [0.3, 0.4, 0.1], type: 'box' },
  { pos: [-1.6, -0.65, 0.85], size: 0.28, color: 0xf97316, rot: [0.5, 0.2, 0.4], type: 'oct' },
  { pos: [0.85, -1.65, -0.55], size: 0.26, color: 0xfdba74, rot: [0.1, 0.6, 0.3], type: 'box' },
  { pos: [-1.05, 1.5, -0.65], size: 0.3, color: 0xea580c, rot: [0.4, 0.3, 0.5], type: 'oct' },
  { pos: [0.4, 2.1, 0.55], size: 0.22, color: 0xffedd5, rot: [0.2, 0.5, 0.2], type: 'box' },
  { pos: [-0.55, -2.0, 0.45], size: 0.24, color: 0xfbbf24, rot: [0.3, 0.1, 0.7], type: 'box' },
];

nodeSpecs.forEach((spec, idx) => {
  const geom = spec.type === 'box'
    ? new THREE.BoxGeometry(spec.size, spec.size, spec.size)
    : new THREE.OctahedronGeometry(spec.size * 0.75, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: 0.25,
    metalness: 0.45,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = `ScheduleNode_${idx + 1}`;
  mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
  mesh.rotation.set(spec.rot[0], spec.rot[1], spec.rot[2]);
  rootGroup.add(mesh);
});

// Output directories
const targetDirs = [
  path.resolve(__dirname, '../3d'),
  path.resolve(__dirname, '../../frontend/public/models'),
];

targetDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Export GLB
const exporter = new GLTFExporter();
exporter.parse(
  scene,
  (gltf) => {
    const buffer = Buffer.from(gltf);
    targetDirs.forEach((dir) => {
      const outPath = path.join(dir, 'academic-knowledge-core.glb');
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved enhanced GLB (${(buffer.length / 1024).toFixed(1)} KB) to: ${outPath}`);
    });
  },
  (error) => {
    console.error('Error generating GLB:', error);
    process.exit(1);
  },
  { binary: true }
);
