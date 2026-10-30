import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { EndElevation, SideElevation } from './components/Elevation';
import { PartsLegend, PlateMeta, TitleColumn } from './components/Plate';
import { ENGINE, MACHINE_PARTS } from './data/machine';
import { CameraRig, Engine, Guides, InkRenderer, MotionDriver } from './scene';
import { useStudio } from './state';
import { PALETTE } from './scene/ink';
import './styles/theme.css';

function download(name: string, href: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
}

function exportPlate(kind: 'png' | 'json') {
  if (kind === 'json') {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ engine: ENGINE, parts: MACHINE_PARTS }, null, 2)], { type: 'application/json' }));
    download('gewu-mill-engine.json', url);
    URL.revokeObjectURL(url);
    return;
  }
  const source = document.querySelector<HTMLCanvasElement>('.stage canvas');
  if (!source) return;
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  download('gewu-mill-engine.png', out.toDataURL('image/png'));
}

/** Horizontal offset (px) of the projection centre, so the machine clears the text column. */
function useStageShift() {
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const measure = () => setShift(window.innerWidth >= 1100 ? Math.min(60, window.innerWidth * 0.025) : 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return shift;
}

export default function App() {
  const shift = useStageShift();
  const clear = useStudio((s) => s.set);
  return (
    <div className="studio">
      <div className="paper-drawings" aria-hidden="true">
        <SideElevation className="drawing drawing--side" />
        <EndElevation className="drawing drawing--end" />
      </div>
      <div className="stage">
        <Canvas
          camera={{ position: [5.5, 6.45, 11.85], fov: 30, near: 0.5, far: 200 }}
          dpr={[1, 2]}
          gl={{ antialias: false, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping }}
          linear
          flat
          onPointerMissed={() => clear({ selected: null })}
        >
          <MotionDriver />
          <Engine />
          <Guides />
          <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={160} maxPolarAngle={Math.PI * 0.49} enableDamping dampingFactor={0.08} />
          <CameraRig shift={shift} />
          <InkRenderer />
        </Canvas>
      </div>
      <TitleColumn />
      <PlateMeta onExport={exportPlate} />
      <PartsLegend />
      <p className="stage-hint">拖动旋转 · 滚轮缩放 · 点选零件</p>
    </div>
  );
}
