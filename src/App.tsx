import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PartsLegend, PlateMeta, TitleColumn } from './components/Plate';
import { currentMachine, useMachine } from './machines';
import { CameraRig, Guides, InkRenderer, MotionDriver } from './scene';
import { useStudio } from './state';
import { bridge, exportPlate, recordTeardown } from './export';
import { DrawingRig } from './drawing/DrawingRig';
import { DrawingSheet } from './drawing/Sheet';
import './styles/fonts.css';
import './styles/theme.css';

function download(name: string, href: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
}

function exportJson() {
  const m = currentMachine();
  const data = { id: m.id, name: m.name, en: m.en, drawingNo: m.drawingNo, scale: m.scale, parts: m.parts, steps: m.steps.map(({ apply: _apply, ...step }) => step) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  download(`gewu-${m.id}.json`, url);
  URL.revokeObjectURL(url);
}

/** Lets the exporters change the render resolution from outside the canvas. */
function ExportBridge() {
  const setDpr = useThree((s) => s.setDpr);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    bridge.setDpr = setDpr;
    bridge.getDpr = () => gl.getPixelRatio();
  }, [setDpr, gl]);
  return null;
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
  const machine = useMachine();
  const { Model, Driver, Backdrop } = machine;
  const drawingMode = useStudio((s) => s.view === 'drawing');
  const [recording, setRecording] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const onExport = async (kind: 'plate' | 'video' | 'json') => {
    if (busy) return;
    if (kind === 'json') return exportJson();
    setBusy(true);
    try {
      if (kind === 'plate') await exportPlate();
      else await recordTeardown(setRecording);
    } finally {
      setBusy(false);
      setRecording(null);
    }
  };
  return (
    <div className={`studio${drawingMode ? ' is-drawing' : ''}`}>
      <div className="paper-drawings" aria-hidden="true">
        {Backdrop && <Backdrop />}
      </div>
      <div className="stage">
        <Canvas
          camera={{ position: [5.5, 6.45, 11.85], fov: 30, near: 0.5, far: 200 }}
          dpr={[1, 2]}
          gl={{ antialias: false, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping }}
          linear
          flat
          onPointerMissed={() => { if (useStudio.getState().view !== 'drawing') clear({ selected: null }); }}
        >
          <MotionDriver />
          {Driver && <Driver key={`driver-${machine.id}`} />}
          <Model key={machine.id} />
          <Guides />
          <OrbitControls makeDefault enabled={!drawingMode} enablePan={false} minDistance={3} maxDistance={160} maxPolarAngle={Math.PI * 0.49} enableDamping dampingFactor={0.08} />
          <CameraRig shift={shift} />
          <InkRenderer />
          <ExportBridge />
          <DrawingRig />
        </Canvas>
        <DrawingSheet />
      </div>
      <TitleColumn />
      <PlateMeta onExport={onExport} busy={busy} recording={recording} />
      <PartsLegend />
      <p className="stage-hint">{drawingMode ? '第一角画法 · 悬停或点选零件查看投影关系' : '拖动旋转 · 滚轮缩放 · 点选零件'}</p>
    </div>
  );
}
