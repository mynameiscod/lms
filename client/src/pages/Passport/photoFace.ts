import * as THREE from 'three';

/**
 * A talking face made from a single photograph.
 *
 * A photo cannot be rigged — there are no blend shapes to drive, and turning one into a
 * true 3D head needs GPU inference (Wav2Lip, SadTalker and friends), which is the
 * per-minute vendor cost this whole approach exists to avoid.
 *
 * So the photo is textured onto a plane and DEFORMED in the fragment shader instead. The
 * mouth region is stretched vertically as the jaw opens and squeezed horizontally on
 * rounded vowels; the eyes are compressed briefly to blink. Each deformation falls off
 * smoothly with distance from its centre, so the surrounding face is untouched and the
 * warp has no visible seam.
 *
 * It is a puppet, not a reconstruction — it cannot show teeth that are not in the photo,
 * or turn the head. At the size this renders it reads convincingly as someone talking,
 * and it costs nothing per interview.
 *
 * The feature positions are normalised to the image (0,0 = top-left) and adjustable,
 * because they depend entirely on how the subject was framed.
 */

export interface FaceLandmarks {
  /** Centre of the mouth. */
  mouth: { x: number; y: number; r: number };
  /** Eye centres, for blinking. */
  eyeL: { x: number; y: number; r: number };
  eyeR: { x: number; y: number; r: number };
}

/** Framing for a square, head-and-shoulders portrait shot straight on. */
export const DEFAULT_LANDMARKS: FaceLandmarks = {
  mouth: { x: 0.548, y: 0.437, r: 0.085 },
  eyeL:  { x: 0.487, y: 0.323, r: 0.052 },
  eyeR:  { x: 0.617, y: 0.323, r: 0.052 },
};

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = `
uniform sampler2D map;
uniform float uJaw;      // 0..1 how far the jaw is open
uniform float uRound;    // 0..1 how rounded the lips are (oo, oh)
uniform float uWide;     // 0..1 how spread the lips are (ee)
uniform float uBlink;    // 0..1
uniform float uAspect;   // width / height, to keep the falloff circular
uniform vec3 uMouth;     // xy centre, z radius   (image space, y down)
uniform vec3 uEyeL;
uniform vec3 uEyeR;
varying vec2 vUv;

// 1 at the centre of a feature, 0 at its edge, smooth in between.
float influence(vec2 p, vec3 f) {
  vec2 d = (p - f.xy) * vec2(uAspect, 1.0);
  return 1.0 - smoothstep(0.0, f.z, length(d));
}

void main() {
  // Work in image space (y increasing downward) so the landmark numbers read the way
  // someone would measure them off the picture.
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);

  float m = influence(p, uMouth);
  if (m > 0.0) {
    // Sampling a COMPRESSED region makes the mouth appear stretched — the jaw drops and
    // the lips part. Anchored slightly above centre so the upper lip stays put and the
    // chin does the moving, which is what a real jaw does.
    float anchor = uMouth.y - uMouth.z * 0.28;
    p.y = anchor + (p.y - anchor) / (1.0 + uJaw * 0.62 * m);
    // Rounded vowels: sample WIDER, so the mouth reads as narrower and pushed forward.
    p.x = uMouth.x + (p.x - uMouth.x) * (1.0 + uRound * 0.34 * m);
    // Spread vowels do the opposite, a little more gently.
    p.x = uMouth.x + (p.x - uMouth.x) / (1.0 + uWide * 0.16 * m);
  }

  float bl = influence(p, uEyeL) + influence(p, uEyeR);
  if (bl > 0.0 && uBlink > 0.0) {
    vec3 e = influence(p, uEyeL) > influence(p, uEyeR) ? uEyeL : uEyeR;
    // Squash the eye vertically toward the lid line.
    p.y = e.y + (p.y - e.y) * (1.0 + uBlink * 1.35 * min(1.0, bl));
  }

  vec4 c = texture2D(map, vec2(p.x, 1.0 - p.y));

  // Darken the very centre of an open mouth. Stretching skin alone gives a smear where a
  // dark opening should be; this is what makes it read as a mouth rather than a wobble.
  float inner = influence(vec2(vUv.x, 1.0 - vUv.y), vec3(uMouth.xy, uMouth.z * 0.52));
  c.rgb *= 1.0 - inner * uJaw * 0.55;

  gl_FragColor = c;
}`;

export interface PhotoFace {
  mesh: THREE.Mesh;
  /** Feed one frame of lip-sync. */
  update(jaw: number, round: number, wide: number, blink: number): void;
  dispose(): void;
}

/**
 * Build the face. `aspect` is the image's width/height, used both to size the plane and to
 * keep the feature falloffs circular rather than oval.
 */
export function createPhotoFace(texture: THREE.Texture, aspect: number, marks: FaceLandmarks = DEFAULT_LANDMARKS): PhotoFace {
  texture.colorSpace = THREE.SRGBColorSpace;
  // The warp samples outside the plane near the edges; clamping stops it wrapping the
  // opposite side of the picture into view.
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;

  const uniforms = {
    map:     { value: texture },
    uJaw:    { value: 0 },
    uRound:  { value: 0 },
    uWide:   { value: 0 },
    uBlink:  { value: 0 },
    uAspect: { value: aspect },
    uMouth:  { value: new THREE.Vector3(marks.mouth.x, marks.mouth.y, marks.mouth.r) },
    uEyeL:   { value: new THREE.Vector3(marks.eyeL.x, marks.eyeL.y, marks.eyeL.r) },
    uEyeR:   { value: new THREE.Vector3(marks.eyeR.x, marks.eyeR.y, marks.eyeR.r) },
  };

  const geometry = new THREE.PlaneGeometry(aspect, 1, 1, 1);
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: false });
  const mesh = new THREE.Mesh(geometry, material);

  return {
    mesh,
    update(jaw, round, wide, blink) {
      uniforms.uJaw.value = jaw;
      uniforms.uRound.value = round;
      uniforms.uWide.value = wide;
      uniforms.uBlink.value = blink;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
