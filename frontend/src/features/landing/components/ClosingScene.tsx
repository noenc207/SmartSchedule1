import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MascotModel, GeometricMascotFallback } from './MascotModel';
import { SoftBlurInText, ShimmerSweepBadge } from '../../../components/effects/AnimateText';

export function ClosingScene() {
  const navigate = useNavigate();

  return (
    <section className="landing-closing-section" aria-labelledby="closing-heading">
      <div className="landing-container">
        <motion.div
          className="landing-closing-card"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="landing-closing-grid">
            {/* Left: Text & Actions */}
            <div className="landing-closing-content">
              <ShimmerSweepBadge delay={0.08} duration={0.8} className="inline-block">
                <span className="landing-pill-badge" style={{ background: 'rgba(234, 88, 12, 0.08)' }}>
                  <span className="landing-pill-dot" aria-hidden="true" />
                  SẴN SÀNG CHO KỲ HỌC TIẾP THEO
                </span>
              </ShimmerSweepBadge>

              <h2 id="closing-heading" className="landing-closing-title">
                <SoftBlurInText
                  text="Bắt đầu một ngày học rõ ràng, chủ động cùng "
                  delay={0.15}
                  duration={0.85}
                  stagger={0.02}
                  trigger="inView"
                />
                <span className="landing-hero-headline-highlight">
                  <SoftBlurInText
                    text="SmartSchedule"
                    delay={0.4}
                    duration={0.85}
                    stagger={0.02}
                    highlight={true}
                    trigger="inView"
                  />
                </span>
              </h2>

              <motion.p
                className="landing-closing-desc"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                Trải nghiệm trọn vẹn sức mạnh xếp lịch thông minh: từ nhận diện xung đột 6 slot học, tự động tính toán đệm di chuyển giữa các tòa nhà campus đến nhắc nhở deadline đồ án Capstone theo nhịp sinh học.
              </motion.p>

              <motion.div
                className="landing-hero-cta-group"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.button
                  type="button"
                  className="landing-btn-hero-primary"
                  onClick={() => navigate('/register')}
                  whileHover={{ scale: 1.025, boxShadow: '0 0 28px rgba(234, 88, 12, 0.55)' }}
                  whileTap={{ scale: 0.975 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  Tạo tài khoản sinh viên FPTU →
                </motion.button>
                <motion.button
                  type="button"
                  className="landing-btn-hero-secondary"
                  onClick={() => navigate('/login')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  Đăng nhập với Google
                </motion.button>
              </motion.div>

              <div className="landing-closing-badges-row">
                {[
                  '100% Miễn phí trọn đời cho sinh viên',
                  'Đăng nhập an toàn @fpt.edu.vn',
                  'Tương thích mọi thiết bị di động',
                ].map((text, idx) => (
                  <motion.div
                    key={text}
                    className="landing-closing-badge-item"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.45 + idx * 0.1 }}
                  >
                    <span className="landing-closing-check">✓</span>
                    <span>{text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: 3D Mascot Showcase Stage */}
            <motion.div
              className="landing-closing-stage-wrapper"
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="landing-closing-3d-stage"
                role="img"
                aria-label="Tượng Mascot 3D Cóc AI SmartSchedule vẫy chào và khích lệ sinh viên"
                style={{ width: '100%', height: '420px', position: 'relative' }}
              >
                <Canvas
                  camera={{ position: [0, 0.65, 3.15], fov: 42 }}
                  shadows
                  gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.25,
                  }}
                  onCreated={({ gl }) => {
                    gl.domElement.addEventListener('webglcontextlost', (event) => {
                      event.preventDefault();
                      console.warn('ClosingScene WebGL context lost handled');
                    });
                  }}
                >
                  {/* Midnight Cosmic Lighting */}
                  <ambientLight intensity={0.9} color="#111a3a" />
                  <directionalLight
                    position={[3, 5, 4]}
                    intensity={2.4}
                    color="#f8faff"
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                    shadow-bias={-0.0001}
                  />
                  <directionalLight position={[2.5, 3.5, -3]} intensity={3.0} color="#ff7a32" />
                  <directionalLight position={[-3, 2.5, -2]} intensity={2.2} color="#9de7ff" />
                  <pointLight position={[0, -0.2, 0]} intensity={1.5} color="#ea580c" distance={4} />

                  <Suspense fallback={<GeometricMascotFallback scale={0.85} position={[0, -0.15, 0]} />}>
                    <group position={[0, 0, 0]}>
                      {/* Dark Cosmic Platform Disc */}
                      <mesh position={[0, -0.17, 0]} receiveShadow>
                        <cylinderGeometry args={[1.2, 1.3, 0.04, 64]} />
                        <meshStandardMaterial color="#0c1226" roughness={0.3} metalness={0.6} />
                      </mesh>
                      <mesh position={[0, -0.168, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[1.22, 1.28, 64]} />
                        <meshBasicMaterial color="#ea580c" transparent opacity={0.8} side={THREE.DoubleSide} />
                      </mesh>

                      {/* Mascot facing front with welcoming float */}
                      <MascotModel
                        scale={0.92}
                        position={[0, -0.15, 0]}
                        rotation={[0, 0, 0]}
                        floatIntensity={0.85}
                        interactive={true}
                      />
                    </group>
                  </Suspense>

                  {/* Clamped controls so mascot never turns its back */}
                  <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    minAzimuthAngle={-Math.PI / 5}
                    maxAzimuthAngle={Math.PI / 5}
                    minPolarAngle={Math.PI / 2.6}
                    maxPolarAngle={Math.PI / 2.05}
                    dampingFactor={0.06}
                  />
                </Canvas>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
