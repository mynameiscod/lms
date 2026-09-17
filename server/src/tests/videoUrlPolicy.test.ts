/**
 * A hosted video link is refused at save time when the student player could not play it.
 *
 * The player builds its embed address from an extracted id, so nothing an author pastes can run in a
 * learner's page. What these tests hold is the other half: a link the player cannot read is caught by
 * the author, not discovered by a student as an empty frame.
 */

import { videoUrlProblem, YOUTUBE_ID, VIMEO_ID } from '../data/videoUrlPolicy';

describe('videoUrlProblem', () => {
  it('accepts the YouTube link shapes staff actually paste', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=rfscVS0vtbw',
      'https://youtube.com/watch?list=PL1&v=rfscVS0vtbw&t=30',
      'https://youtu.be/rfscVS0vtbw',
      'https://www.youtube.com/embed/rfscVS0vtbw',
      'https://www.youtube.com/shorts/rfscVS0vtbw',
      'https://m.youtube.com/watch?v=rfscVS0vtbw',
      '  https://www.youtube.com/watch?v=rfscVS0vtbw  ',
    ]) expect([url, videoUrlProblem('youtube', url)]).toEqual([url, null]);
  });

  it('accepts a Vimeo video link', () => {
    expect(videoUrlProblem('vimeo', 'https://vimeo.com/76979871')).toBeNull();
    expect(videoUrlProblem('vimeo', 'https://player.vimeo.com/video/76979871')).toBeNull();
  });

  it('refuses scripts, other schemes and other hosts', () => {
    expect(videoUrlProblem('youtube', 'javascript:alert(1)//www.youtube.com/watch?v=rfscVS0vtbw')).toMatch(/https/);
    expect(videoUrlProblem('youtube', 'data:text/html,<script>alert(1)</script>')).toMatch(/https/);
    expect(videoUrlProblem('youtube', 'https://evil.example/watch?v=rfscVS0vtbw')).toMatch(/not a YouTube link/);
    expect(videoUrlProblem('youtube', 'https://youtube.com.evil.example/watch?v=rfscVS0vtbw')).toMatch(/not a YouTube link/);
    expect(videoUrlProblem('vimeo', 'https://www.youtube.com/watch?v=rfscVS0vtbw')).toMatch(/not a Vimeo link/);
  });

  it('refuses a link that names no single video, or no link at all', () => {
    expect(videoUrlProblem('youtube', 'https://www.youtube.com/@channel')).toMatch(/single video/);
    expect(videoUrlProblem('youtube', 'https://www.youtube.com/watch?v=short')).toMatch(/single video/);
    expect(videoUrlProblem('vimeo', 'https://vimeo.com/channels/staffpicks')).toMatch(/single video/);
    expect(videoUrlProblem('youtube', '')).toMatch(/Add the YouTube link/);
    expect(videoUrlProblem('youtube', 'not a url')).toMatch(/not a web address/);
  });

  it('leaves uploaded and Bunny videos to their own checks', () => {
    expect(videoUrlProblem('upload', undefined)).toBeNull();
    expect(videoUrlProblem('bunny', undefined)).toBeNull();
    expect(videoUrlProblem(undefined, 'javascript:alert(1)')).toBeNull();
  });

  it('extracts the same id the player embeds', () => {
    expect('https://www.youtube.com/watch?v=rfscVS0vtbw'.match(YOUTUBE_ID)?.[1]).toBe('rfscVS0vtbw');
    expect('https://youtu.be/rfscVS0vtbw?t=4'.match(YOUTUBE_ID)?.[1]).toBe('rfscVS0vtbw');
    expect('https://vimeo.com/76979871'.match(VIMEO_ID)?.[1]).toBe('76979871');
  });
});
