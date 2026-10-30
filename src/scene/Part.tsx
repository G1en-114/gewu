import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useStudio } from '../state';
import { createInkMaterial } from './ink';
import { partDef, partOffset } from './explode';

/** World-space section plane; its constant is animated to sweep the cut in. */
export const SECTION_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 100);

interface PartMaterials {
  solid: THREE.ShaderMaterial;
  clipped: THREE.ShaderMaterial;
}

const PartContext = createContext<PartMaterials | null>(null);

export function Part({ id, tone = 1, children }: { id: string; tone?: number; children: ReactNode }) {
  const index = partDef(id)?.index ?? 15;
  const group = useRef<THREE.Group>(null);
  const materials = useMemo<PartMaterials>(() => {
    const partId = index / 32;
    return {
      solid: createInkMaterial({ partId, tone }),
      clipped: createInkMaterial({ partId, tone, clip: [SECTION_PLANE] }),
    };
  }, [index, tone]);
  const select = useStudio((s) => s.set);

  useEffect(() => () => {
    materials.solid.dispose();
    materials.clipped.dispose();
  }, [materials]);

  useFrame((_, dt) => {
    const { selected, hovered } = useStudio.getState();
    if (group.current) partOffset(id, group.current.position);
    const k = 1 - Math.exp(-dt * 10);
    for (const material of [materials.solid, materials.clipped]) {
      const u = material.uniforms;
      u.uSelected.value += ((selected === id ? 1 : 0) - u.uSelected.value) * k;
      u.uHover.value += ((hovered === id && selected !== id ? 1 : 0) - u.uHover.value) * k;
    }
  });

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.delta > 4) return;
    select({ selected: useStudio.getState().selected === id ? null : id });
  };

  return (
    <PartContext.Provider value={materials}>
      <group
        ref={group}
        name={`part-${id}`}
        onClick={onClick}
        onDoubleClick={(event) => {
          event.stopPropagation();
          const { localExplode } = useStudio.getState();
          select({ selected: id, localExplode: localExplode === id ? null : id, explode: 0 });
        }}
        onPointerOver={(event) => { event.stopPropagation(); select({ hovered: id }); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { if (useStudio.getState().hovered === id) select({ hovered: null }); document.body.style.cursor = ''; }}
      >
        {children}
      </group>
    </PartContext.Provider>
  );
}

type Vec3 = [number, number, number];

/** A mesh drawn with the surrounding part's ink material. */
export function M({ geo, p, r, s, clip = false }: { geo: THREE.BufferGeometry; p?: Vec3; r?: Vec3; s?: Vec3; clip?: boolean }) {
  const materials = useContext(PartContext)!;
  return <mesh geometry={geo} material={clip ? materials.clipped : materials.solid} position={p} rotation={r} scale={s} />;
}
