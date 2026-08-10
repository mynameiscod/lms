import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { lipSync } from './lipsync';
import { VisemeRig } from './visemeRig';
import { createPhotoFace, PhotoFace } from './photoFace';

/**
 * The interviewer's face — a 3D head whose mouth is driven by the audio she is speaking.
 *
 * The model is expected to carry ARKit/Ready Player Me blend shapes (`viseme_aa`,
 * `eyeBlinkLeft`, …). Those names are a de-facto standard across avatar tools, so the head
 * can be replaced without touching this file.
 *
 * If the model is missing or fails to load, a stylised head is built from primitives and
 * animated the same way. That is deliberate: the interview must never be blocked on a 3MB
 * asset over a bad connection, and a simple face that moves in time with the voice is far
 * better than a spinner where a person should be.
 *
 * Everything runs in ONE requestAnimationFrame loop that also stops itself when the tab is
 * hidden — a WebGL canvas left spinning behind a background tab is a battery complaint.
 */

const MODEL_URL = process.env.REACT_APP_INTERVIEWER_MODEL || '/avatars/interviewer.glb';
const PHOTO_URL = process.env.REACT_APP_INTERVIEWER_PHOTO || '/avatars/interviewer.jpg';

/**
 * Framing for the photo, in fractions of the image height.
 *
 * A portrait is usually shot head-and-shoulders, so filling the frame with the whole
 * picture puts a shirt where a face should be. These crop in on the head. Tuned for a
 * square, straight-on portrait — nudge them if a different photo sits high or low.
 */
const PHOTO_ZOOM = 1.55;
/** Positive moves the visible crop UP the image, toward the face. */
const PHOTO_FACE_OFFSET = 0.12;
/** The subject is rarely dead centre. Positive shifts the crop RIGHT, toward the face. */
const PHOTO_FACE_OFFSET_X = 0.052;

interface Props {
  /** Drives idle vs speaking motion. The mouth itself follows the audio, not this flag. */
  speaking: boolean;
  /** Shown under the face. */
  name?: string;
}


const InterviewAvatar: React.FC<Props> = ({ speaking, name = 'your interviewer' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  // Read inside the animation loop, which must not restart when a prop changes.
  const speakingRef = useRef(speaking);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 1.62, 0.86);          // eye level, close enough to read a face
    camera.lookAt(0, 1.58, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;                                    // no WebGL — the caller renders a photo instead
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));   // cap: retina x3 is invisible here and costs fill rate
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // Soft key from the front-left plus a cool rim, so the face reads as lit by a window
    // rather than by a torch. Flat lighting makes even a good model look like plastic.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.15));
    const key = new THREE.DirectionalLight(0xfff4e8, 1.5);
    key.position.set(-1.2, 2.4, 1.8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc7d2fe, 0.7);
    rim.position.set(1.6, 1.6, -1.4);
    scene.add(rim);

    // Meshes carrying blend shapes, resolved once — searching the graph per frame would
    // cost more than the morph update itself.
    const morphMeshes: THREE.Mesh[] = [];
    let rig: VisemeRig | null = null;
    let head: THREE.Object3D | null = null;
    let jawFallback: THREE.Object3D | null = null;   // procedural head only

    const collect = (root: THREE.Object3D) => {
      root.traverse(o => {
        const m = o as THREE.Mesh;
        if ((m as any).isMesh && m.morphTargetDictionary && m.morphTargetInfluences) {
          morphMeshes.push(m);
        }
        if (/head/i.test(o.name) && !head) head = o;
      });
      // Resolve blend-shape names ONCE against whatever convention this model uses —
      // Oculus visemes, ARKit anatomy, or some exporter's casing of either.
      rig = new VisemeRig(morphMeshes.map(m => m.morphTargetDictionary as any));
      if (!rig.usable) {
        // Loaded, but nothing we can animate. A frozen realistic face is worse than an
        // obvious stand-in, so fall back rather than ship a mannequin.
        console.warn('[interview] avatar has no drivable blend shapes — using fallback head');
        root.visible = false;
        rig = null;
        buildFallback();
      }
    };

    /** A face built from primitives, for when the model cannot be loaded. */
    const buildFallback = () => {
      const group = new THREE.Group();
      const skin = new THREE.MeshStandardMaterial({ color: 0xc98b62, roughness: 0.72, metalness: 0.02 });

      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 48, 40), skin);
      skull.scale.set(1, 1.18, 0.94);
      skull.position.set(0, 1.6, 0);
      group.add(skull);

      const hairMat = new THREE.MeshStandardMaterial({ color: 0x1d1512, roughness: 0.85 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.121, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
      hair.scale.set(1, 1.16, 0.98);
      hair.position.set(0, 1.606, -0.004);
      group.add(hair);

      const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.32 });
      const iris = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.25 });
      for (const x of [-0.038, 0.038]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.0165, 20, 16), eyeWhite);
        e.position.set(x, 1.618, 0.096);
        group.add(e);
        const i = new THREE.Mesh(new THREE.SphereGeometry(0.0082, 16, 14), iris);
        i.position.set(x, 1.618, 0.108);
        group.add(i);
      }

      const brow = new THREE.MeshStandardMaterial({ color: 0x241a15, roughness: 0.9 });
      for (const x of [-0.038, 0.038]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.005, 0.008), brow);
        b.position.set(x, 1.6425, 0.104);
        b.rotation.z = x < 0 ? 0.06 : -0.06;
        group.add(b);
      }

      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.042, 16), skin);
      nose.position.set(0, 1.596, 0.104);
      nose.rotation.x = Math.PI / 2.1;
      group.add(nose);

      // The mouth is a flattened sphere that is scaled by the lip-sync each frame —
      // the fallback's entire animation budget goes here, because this is what sells it.
      const mouth = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 24, 18),
        new THREE.MeshStandardMaterial({ color: 0x53222a, roughness: 0.55 }),
      );
      mouth.position.set(0, 1.5665, 0.094);
      mouth.scale.set(1, 0.16, 0.5);
      group.add(mouth);
      jawFallback = mouth;

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.09, 24), skin);
      neck.position.set(0, 1.487, -0.006);
      group.add(neck);

      const shoulders = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.075, 0.17, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x2f3d63, roughness: 0.8 }),
      );
      shoulders.rotation.z = Math.PI / 2;
      shoulders.position.set(0, 1.412, 0);
      group.add(shoulders);

      head = skull;
      scene.add(group);
    };

    let disposed = false;
    let photo: PhotoFace | null = null;
    let photoFrame: THREE.Group | null = null;
    let photoAspect = 1;

    /**
     * A real photograph beats any model we can generate, so it is tried FIRST and the
     * 3D path is only reached when there is no usable picture.
     */
    const tryPhoto = () => new Promise<boolean>(resolve => {
      const loader = new THREE.TextureLoader();
      loader.load(
        PHOTO_URL,
        tex => {
          if (disposed) { tex.dispose(); return resolve(true); }
          const img: any = tex.image;
          const aspect = (img?.width || 1) / (img?.height || 1);
          photo = createPhotoFace(tex, aspect);
          // The mesh sits inside a group so the two transforms never fight: the group
          // frames the shot, the mesh alone carries the breathing.
          photoFrame = new THREE.Group();
          photoFrame.add(photo.mesh);
          photo.mesh.position.y = -PHOTO_FACE_OFFSET;
          photo.mesh.position.x = -PHOTO_FACE_OFFSET_X;
          photoAspect = aspect;
          // A flat photo wants a flat camera: perspective on a plane just distorts the
          // face toward the edges.
          camera.position.set(0, 0, 1);
          camera.fov = 2 * Math.atan(0.5 / 1) * 180 / Math.PI;
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
          scene.add(photoFrame);
          head = photo.mesh;
          resize();                 // apply the cover scale now that the size is known
          resolve(true);
        },
        undefined,
        () => resolve(false),
      );
    });

    const loadModel = () => new GLTFLoader().load(
      MODEL_URL,
      gltf => {
        if (disposed) { return; }
        gltf.scene.traverse(o => { (o as THREE.Mesh).frustumCulled = false; });
        collect(gltf.scene);
        scene.add(gltf.scene);
      },
      undefined,
      () => { if (!disposed) buildFallback(); },
    );

    // Photo → 3D model → primitives. Each step only runs when the one before it found
    // nothing, so a member always gets a face rather than an empty frame.
    tryPhoto().then(ok => { if (!disposed && !ok) loadModel(); });

    // Reused every frame — a fresh Map at 60fps is avoidable garbage.
    const shapeValues = new Map<string, number>();
    const influencesOf = () => morphMeshes.map(m => m.morphTargetInfluences);

    // Blinks on a randomised timer. A perfectly periodic blink is more unsettling than
    // no blink at all.
    let nextBlink = performance.now() + 1500;
    let blinkUntil = 0;

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      if (photoFrame) {
        // Cover, not contain: a letterboxed portrait with background showing down both
        // sides looks like a mistake. Scale until the plane fills the shorter axis too.
        const cover = Math.max(1, camera.aspect / photoAspect);
        const s = cover * PHOTO_ZOOM;
        photoFrame.scale.set(s, s, 1);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const clock = new THREE.Clock();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const t = clock.getElapsedTime();
      const now = performance.now();

      const w = lipSync.read();
      if (photo) {
        // Rounded vs spread lips come straight from the vowels the analyser picked.
        const round = (w.viseme_O || 0) + (w.viseme_U || 0);
        const wide = (w.viseme_I || 0) + (w.viseme_E || 0) + (w.viseme_SS || 0);
        photo.update(lipSync.jaw, Math.min(1, round), Math.min(1, wide), now < blinkUntil ? 1 : 0);
      }
      if (rig) {
        rig.apply(w, lipSync.jaw, shapeValues);
        rig.write(shapeValues, influencesOf());
      }

      if (jawFallback) {
        // No blend shapes to drive, so the primitive mouth is scaled directly: taller as
        // the jaw drops, narrower on rounded vowels, wider on open ones.
        const open = lipSync.jaw;
        const round = (w.viseme_O || 0) + (w.viseme_U || 0);
        jawFallback.scale.set(1 - round * 0.42, 0.16 + open * 1.5, 0.5);
      }

      if (now > nextBlink) { blinkUntil = now + 110; nextBlink = now + 2200 + Math.random() * 3800; }
      const blink = now < blinkUntil ? 1 : 0;
      if (rig) rig.blink(blink, influencesOf());

      if (photo && head) {
        // A photo cannot rotate — turning a flat plane reveals it is flat. It gets a
        // gentle drift and breath instead, which is enough to stop it looking frozen.
        const amp = speakingRef.current ? 1 : 0.5;
        head.position.x = Math.sin(t * 0.37) * 0.006 * amp;
        head.position.y = Math.sin(t * 0.53) * 0.005 * amp;
        const breath = 1 + Math.sin(t * 0.8) * 0.0035 * amp;
        head.scale.set(breath, breath, 1);
      } else if (head) {
        // Idle sway always, a little more while speaking. Two sine waves at unrelated
        // frequencies so the motion never visibly repeats.
        const amp = speakingRef.current ? 1 : 0.45;
        head.rotation.y = Math.sin(t * 0.42) * 0.045 * amp + Math.sin(t * 1.13) * 0.012 * amp;
        head.rotation.x = Math.sin(t * 0.61) * 0.022 * amp;
        head.rotation.z = Math.sin(t * 0.33) * 0.014 * amp;
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    // A hidden tab throttles rAF anyway; stopping outright also releases the GPU.
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { clock.getDelta(); raf = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      // WebGL resources are not garbage collected with the React tree — leaving these
      // behind leaks GPU memory every time the member opens an interview.
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if ((m as any).isMesh) {
          m.geometry?.dispose();
          const mat = m.material as any;
          if (Array.isArray(mat)) mat.forEach((x: any) => x?.dispose?.());
          else mat?.dispose?.();
        }
      });
      photo?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className={`iv-avatar ${speaking ? 'speaking' : ''}`}>
      <div className="iv-avatar-stage" ref={mountRef} />
      <div className="iv-avatar-name">
        {name}
        <span className="iv-avatar-state">{speaking ? 'speaking…' : 'listening'}</span>
      </div>
    </div>
  );
};

export default InterviewAvatar;
