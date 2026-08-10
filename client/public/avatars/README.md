# Interviewer face

**Currently switched OFF.** `INTERVIEWER_FACE_ENABLED` in
`client/src/pages/Passport/interviewFace.ts` is `false`, so the interview renders voice and
transcript only and nothing in this folder is loaded. Set it to `true` to bring the face
back — everything below applies from that point on.

When enabled, the mock interview looks for a face here, in this order:

1. `interviewer.jpg` — a photograph. Warped in a shader so the mouth and eyes move with
   the speech (see `photoFace.ts`). This is the best-looking option and the one in use.
2. `interviewer.glb` — a 3D head with ARKit or Oculus blend shapes.
3. Neither — a stylised head built from primitives, so the interview never shows an
   empty frame.

## Replacing the photo

Drop a new `interviewer.jpg` in this folder and redeploy. Best results from a square,
straight-on, head-and-shoulders portrait on a plain background, evenly lit, mouth closed
or barely open.

If the mouth or eyes move in the wrong place, the feature positions are `DEFAULT_LANDMARKS`
in `client/src/pages/Passport/photoFace.ts`, measured as fractions of the image from the
top-left. The framing (how far in it crops) is `PHOTO_ZOOM` and `PHOTO_FACE_OFFSET` in
`InterviewAvatar.tsx`.

## Rights

Whoever is in this photograph is the face of an AI interviewer in a paid product. Use your
own likeness, or someone's with their explicit permission. Not a stock or scraped image.
