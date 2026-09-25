/**
 * Put playable placeholder videos on a tenant's welcome days, so the orientation flow can be
 * tested end to end before the real ones are filmed.
 *
 * ── WHY NOT YOUTUBE ───────────────────────────────────────────────────────────────────────
 *
 * The welcome plays its videos in a plain <video> element, and a YouTube link is not a video
 * file — it is a web page. A <video> pointed at one shows nothing. Embedding YouTube instead
 * would mean an <iframe>, and an iframe emits no `timeupdate`, which is the event the
 * ninety-per-cent watch gate is built on. So a YouTube placeholder would break both the player
 * and the rule it is there to exercise.
 *
 * These are MP4s from Google's public sample bucket — the standard, stable, Creative Commons
 * test videos — so the player works, the progress bar moves, and the gate can actually be tried.
 *
 * ── WHY A SCRIPT AND NOT A DEFAULT ────────────────────────────────────────────────────────
 *
 * DEFAULT_ORIENTATION ships with empty URLs on purpose: a tenant with no welcome of their own
 * falls back to it, and "A word from the founder" playing Big Buck Bunny to real students is a
 * worse failure than an honest "this video has not been added yet". Placeholders are therefore
 * something a tenant is deliberately given, and `--clear` takes them away again.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────────────────
 *
 *   ts-node src/scripts/setOrientationPlaceholderVideos.ts --tenant <id>            # dry run
 *   ts-node src/scripts/setOrientationPlaceholderVideos.ts --tenant <id> --apply    # write
 *   ts-node src/scripts/setOrientationPlaceholderVideos.ts --tenant <id> --clear --apply
 *
 * Dry run by default, and it prints exactly which day and item each URL lands on.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { orientationProgram, saveOrientationProgram } from '../services/orientationService';

/**
 * Short, public, directly playable MP4s. Different lengths on purpose: a ten-second clip makes
 * the ninety-per-cent gate quick to reach, and a longer one makes it obvious that dragging the
 * scrubber to the end does not count.
 */
const PLACEHOLDERS: string[] = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
];

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (name: string) => process.argv.includes(`--${name}`);

(async () => {
  const tenantId = arg('tenant');
  if (!tenantId) {
    console.error('Give a tenant: --tenant <tenantId>');
    process.exit(1);
  }
  const apply = has('apply');
  const clear = has('clear');

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');

  /* Whatever this tenant serves today — their own welcome, or the shipped default. */
  const program = await orientationProgram(tenantId);
  const days = JSON.parse(JSON.stringify(program.days || []));

  let n = 0;
  for (const day of days) {
    for (const item of day.items || []) {
      if (item.kind !== 'video') continue;
      const next = clear ? '' : PLACEHOLDERS[n % PLACEHOLDERS.length];
      console.log(`  day ${day.dayNumber}  ${String(item.key).padEnd(20)} ${item.url || '(empty)'} -> ${next || '(empty)'}`);
      item.url = next;
      n++;
    }
  }

  console.log(`\n${n} video item${n === 1 ? '' : 's'} on ${days.length} welcome days for tenant ${tenantId}`);
  if (!n) {
    console.log('Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Add --apply to save.');
    await mongoose.disconnect();
    return;
  }

  /*
   * Saved through the service, so the same validation a tenant's own edit goes through applies
   * here: duplicate day numbers, duplicate item keys and untitled days are all refused.
   */
  const saved = await saveOrientationProgram(tenantId, days, program.enabled, 'placeholder-video-script');
  console.log(saved?.ok === false ? `REFUSED: ${saved.message}` : 'Saved.');
  await mongoose.disconnect();
})().catch(e => { console.error(e?.message || e); process.exit(1); });
