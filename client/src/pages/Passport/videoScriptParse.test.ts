import { parseVideoScript } from './videoScriptParse';

describe('parseVideoScript', () => {
  it('reads Scene markers with On screen / Say / Notes labels, and the details on top', () => {
    const r = parseVideoScript(`Title: How Files Are Organised
Presenter: Priya
Duration: 8 min

Scene 1: Hook — why folders exist
On screen: Presenter to camera.
Say: Every file on your laptop lives somewhere.
It lives in one tree.

Notes: Slow down here.

SCENE 2 - The root
Visual: Terminal, run ls /
VO: This is the root.`);
    expect(r.title).toBe('How Files Are Organised');
    expect(r.presenter).toBe('Priya');
    expect(r.targetMinutes).toBe(8);
    expect(r.scenes).toHaveLength(2);
    expect(r.scenes[0]).toEqual({ heading: 'Hook — why folders exist', visual: 'Presenter to camera.', narration: 'Every file on your laptop lives somewhere.\nIt lives in one tree.', notes: 'Slow down here.' });
    expect(r.scenes[1]).toEqual({ heading: 'The root', visual: 'Terminal, run ls /', narration: 'This is the root.', notes: '' });
  });

  it('takes Markdown headings and bracketed screen directions, unlabelled text is said', () => {
    const r = parseVideoScript(`# How Files Are Organised

## Intro
[Presenter to camera]
Hello and welcome.

## Paths
**On screen:** a folder tree
A path is a route.`);
    expect(r.title).toBe('How Files Are Organised');
    expect(r.scenes).toEqual([
      { heading: 'Intro', visual: 'Presenter to camera', narration: 'Hello and welcome.', notes: '' },
      { heading: 'Paths', visual: 'a folder tree\nA path is a route.', narration: '', notes: '' },
    ]);
  });

  it('reads a two-column table pasted from Google Docs (tabs), header row named', () => {
    const r = parseVideoScript('Visual\tNarration\nPresenter to camera\tHello.\nTerminal: ls\tThis lists files.');
    expect(r.scenes).toEqual([
      { heading: '', visual: 'Presenter to camera', narration: 'Hello.', notes: '' },
      { heading: '', visual: 'Terminal: ls', narration: 'This lists files.', notes: '' },
    ]);
  });

  it('reads a Markdown table with a scene column', () => {
    const r = parseVideoScript('| Scene | On screen | Say |\n|---|---|---|\n| Hook | Camera | Hi there |\n| Root | Terminal | The root |');
    expect(r.scenes.map(s => [s.heading, s.visual, s.narration])).toEqual([['Hook', 'Camera', 'Hi there'], ['Root', 'Terminal', 'The root']]);
  });

  it('with no markers, blank lines or a repeated On screen label start a new scene', () => {
    expect(parseVideoScript('First paragraph to say.\n\nSecond paragraph to say.').scenes.map(s => s.narration))
      .toEqual(['First paragraph to say.', 'Second paragraph to say.']);
    const r = parseVideoScript('On screen: camera\nSay: hi\nOn screen: terminal\nSay: ls');
    expect(r.scenes.map(s => [s.visual, s.narration])).toEqual([['camera', 'hi'], ['terminal', 'ls']]);
  });

  it('does not take ordinary sentences for scene markers or labels', () => {
    const r = parseVideoScript('Scene 1\nSay: Scene changes are hard.\nRemember: a path is a route.\nShot: wide angle');
    expect(r.scenes).toHaveLength(1);
    expect(r.scenes[0].narration).toBe('Scene changes are hard.\nRemember: a path is a route.');
    expect(r.scenes[0].visual).toBe('wide angle');
  });
});
