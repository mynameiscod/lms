/**
 * Master switch for the interviewer's face in the mock interview.
 *
 * OFF: the interview is voice plus transcript, with nothing rendered where the face was.
 *
 * Everything behind it is still here and still works — the photo shader (`photoFace.ts`),
 * the 3D rig (`InterviewAvatar.tsx`, `visemeRig.ts`) and the formant lip-sync
 * (`lipsync.ts`). Turning this back on is the only change needed, plus dropping a
 * portrait at `public/avatars/interviewer.jpg` if you want a real face rather than the
 * stylised fallback head.
 *
 * The avatar is loaded lazily by the interview room, so while this is false the three.js
 * bundle is split out and never fetched — being switched off costs nothing to download.
 */
export const INTERVIEWER_FACE_ENABLED = false;
