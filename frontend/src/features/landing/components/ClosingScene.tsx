import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AnimatedSection } from './AnimatedSection';
import { MascotModel, GeometricMascotFallback } from './MascotModel';

export function ClosingScene() {
  const navigate = useNavigate();

  return (
    <section className="landing-section landing-closing">
      <div className="closing-content-grid">
        {/* Text and Actions */}
        <AnimatedSection variant="fadeLeft" className="closing-text-side">
          <span className="section-pill">SẴN SÀNG CHO KỲ HỌC MỚI</span>
          <h2 className="closing-title">
            Bắt đầu một ngày học rõ ràng, chủ động và không còn áp lực
          </h2>
          <p className="closing-subtitle">
            Trải nghiệm toàn bộ sức mạnh của SmartSchedule: từ nhận diện xung đột thời gian, tự động tính toán khoảng cách khuôn viên FPT University Quy Nhơn đến đề xuất thời gian học sâu lý tưởng.
          </p>

          <div className="closing-actions-row">
            <button
              type="button"
              className="btn-primary-glow large-btn"
              onClick={() => navigate('/calendar')}
            >
              Mở Lịch biểu SmartSchedule →
            </button>
            <button
              type="button"
              className="btn-secondary-glass"
              onClick={() => navigate('/scheduling')}
            >
              Thử nghiệm Smart Plan
            </button>
          </div>

          <div className="closing-meta-points">
            <div className="closing-meta-item">
              <span className="meta-bullet">✓</span>
              <span>100% Miễn phí & Tối ưu cho sinh viên FPTU</span>
            </div>
            <div className="closing-meta-item">
              <span className="meta-bullet">✓</span>
              <span>Không cần cài đặt phức tạp, chạy trực tiếp trên web</span>
            </div>
            <div className="closing-meta-item">
              <span className="meta-bullet">✓</span>
              <span>Bảo mật toàn diện, dữ liệu vị trí không rời khỏi máy</span>
            </div>
          </div>
        </AnimatedSection>

        {/* 3D Visual Mascot Showcase Stage */}
        <AnimatedSection variant="fadeRight" delay={0.2} className="closing-visual-side">
          <div className="closing-3d-stage" style={{ width: '100%', height: '420px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="closing-ambient-disc" />
            <Canvas
              camera={{ position: [2.5, 1.8, 3.0], fov: 38 }}
              gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <ambientLight intensity={0.9} color="#162036" />
              <directionalLight position={[4, 6, 3]} intensity={1.8} color="#fff6ee" />
              <directionalLight position={[-5, 3, 1]} intensity={1.0} color="#00d4ff" />
              <pointLight position={[0, -0.2, 0]} intensity={0.7} color="#f27024" distance={5} />
              <Suspense fallback={<GeometricMascotFallback scale={0.9} position={[0, 0, 0]} />}>
                <MascotModel scale={1.05} position={[0, -0.15, 0]} rotation={[0, -0.3, 0]} floatIntensity={0.8} interactive={true} />
              </Suspense>
              <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.0} minPolarAngle={Math.PI / 3.5} maxPolarAngle={Math.PI / 2.1} />
            </Canvas>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
