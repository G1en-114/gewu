import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { compositeFragment, compositeVertex, inkUniforms, PALETTE, rgb } from './ink';
import { partDef } from './explode';
import { useStudio } from '../state';

/** Layer used for construction lines drawn on top of the ink composite. */
export const OVERLAY_LAYER = 1;

/**
 * Takes over R3F's render loop: colour pass, normal/id pass, ink composite,
 * then the overlay layer (centre lines, explode guides, motion arcs).
 */
export function InkRenderer({ lineWidth = 1.15, hatch = 1 }: { lineWidth?: number; hatch?: number }) {
  const { gl, scene, camera, size } = useThree();
  const dpr = gl.getPixelRatio();

  const targets = useMemo(() => {
    const color = new THREE.WebGLRenderTarget(1, 1, { samples: 0, type: THREE.UnsignedByteType });
    const normal = new THREE.WebGLRenderTarget(1, 1, { samples: 0, type: THREE.UnsignedByteType });
    normal.depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType);
    color.texture.minFilter = color.texture.magFilter = THREE.NearestFilter;
    normal.texture.minFilter = normal.texture.magFilter = THREE.NearestFilter;
    return { color, normal };
  }, []);

  const composite = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: compositeVertex,
      fragmentShader: compositeFragment,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      premultipliedAlpha: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        tColor: { value: targets.color.texture },
        tNormal: { value: targets.normal.texture },
        tDepth: { value: targets.normal.depthTexture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uLine: { value: lineWidth },
        uNear: { value: 0.1 },
        uFar: { value: 100 },
        uOrtho: { value: 0 },
        uInk: { value: rgb(PALETTE.ink) },
        uHatch: { value: hatch },
        uSelId: { value: -1 },
        uAccent: { value: rgb(PALETTE.rust) },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const quadScene = new THREE.Scene();
    quadScene.add(quad);
    return { material, quadScene, quadCamera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [targets, lineWidth, hatch]);

  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    targets.color.setSize(w, h);
    targets.normal.setSize(w, h);
    composite.material.uniforms.uResolution.value.set(w, h);
    composite.material.uniforms.uLine.value = lineWidth * Math.max(1, dpr * 0.85);
  }, [size, dpr, targets, composite, lineWidth]);

  useEffect(() => () => {
    targets.color.dispose();
    targets.normal.dispose();
    composite.material.dispose();
  }, [targets, composite]);

  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    const uniforms = composite.material.uniforms;
    uniforms.uNear.value = cam.near;
    uniforms.uFar.value = cam.far;
    uniforms.uOrtho.value = (cam as THREE.OrthographicCamera).isOrthographicCamera ? 1 : 0;
    const { selected } = useStudio.getState();
    uniforms.uSelId.value = selected ? (partDef(selected)?.index ?? -32) / 32 : -1;

    const background = scene.background;
    scene.background = null;
    gl.setClearColor(0x000000, 0);
    gl.autoClear = true;
    gl.localClippingEnabled = true;

    cam.layers.set(0);
    inkUniforms.uPass.value = 0;
    gl.setRenderTarget(targets.color);
    gl.clear();
    gl.render(scene, cam);

    inkUniforms.uPass.value = 1;
    gl.setRenderTarget(targets.normal);
    gl.clear();
    gl.render(scene, cam);
    inkUniforms.uPass.value = 0;

    gl.setRenderTarget(null);
    gl.clear();
    gl.render(composite.quadScene, composite.quadCamera);

    gl.autoClear = false;
    cam.layers.set(OVERLAY_LAYER);
    gl.render(scene, cam);
    cam.layers.enableAll();
    cam.layers.disable(OVERLAY_LAYER);
    cam.layers.enable(0);
    gl.autoClear = true;
    scene.background = background;
  }, 1);

  return null;
}
