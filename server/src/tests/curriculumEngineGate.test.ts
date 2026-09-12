/**
 * One engine per student, and the proof that nothing switched over by accident.
 *
 * Two engines can answer "what should this student learn next". The failure mode when both do is
 * not a crash — it is a student shown a plan that disagrees with the plan the system believes
 * they are on, which has happened on this codebase twice. These tests hold the two properties
 * that make the cutover safe: the default never moves on its own, and a named account can be
 * switched without moving anybody else.
 *
 * The second half is a structural test rather than a behavioural one. It asserts that the
 * retired L4 model is genuinely gone rather than merely unused, because a model nobody imports
 * today is a model somebody imports next month.
 */

import fs from 'fs';
import path from 'path';
import {
  curriculumEngineFor, megaCurriculumInUse, DEFAULT_CURRICULUM_ENGINE,
} from '../data/curriculumEnginePolicy';

const SRC = path.resolve(__dirname, '..');

describe('which engine plans a student', () => {
  it('is TOPIC when nothing has been configured', () => {
    // The shipped state, and the one every tenant is in today. Off is not a degraded mode.
    expect(DEFAULT_CURRICULUM_ENGINE).toBe('TOPIC');
    expect(curriculumEngineFor({ config: null })).toBe('TOPIC');
    expect(curriculumEngineFor({ config: {} })).toBe('TOPIC');
    expect(curriculumEngineFor({ config: { megaCurriculumEnabled: false } })).toBe('TOPIC');
  });

  it('moves a named account without moving the tenant', () => {
    const config = { megaCurriculumEnabled: false, megaCurriculumStudentIds: ['stu_1'] };

    expect(curriculumEngineFor({ config, studentId: 'stu_1' })).toBe('UNIT');
    // The entire point of gating rather than deploying: everybody else stays put.
    expect(curriculumEngineFor({ config, studentId: 'stu_2' })).toBe('TOPIC');
  });

  it('moves one stage without moving the others', () => {
    const config = { megaCurriculumStages: ['foundation'] };

    expect(curriculumEngineFor({ config, stageKey: 'foundation' })).toBe('UNIT');
    expect(curriculumEngineFor({ config, stageKey: 'FOUNDATION' })).toBe('UNIT');
    expect(curriculumEngineFor({ config, stageKey: 'intermediate' })).toBe('TOPIC');
  });

  it('switches the whole tenant when asked to', () => {
    expect(curriculumEngineFor({ config: { megaCurriculumEnabled: true }, studentId: 'anyone' }))
      .toBe('UNIT');
  });

  it('reports whether anything at all has been switched', () => {
    expect(megaCurriculumInUse(null)).toBe(false);
    expect(megaCurriculumInUse({})).toBe(false);
    expect(megaCurriculumInUse({ megaCurriculumStudentIds: [] })).toBe(false);
    expect(megaCurriculumInUse({ megaCurriculumStudentIds: ['x'] })).toBe(true);
    expect(megaCurriculumInUse({ megaCurriculumEnabled: true })).toBe(true);
  });
});

/* ------------------------------------------------------------------ */

/** Every .ts file under server/src, so a stale import cannot hide in a directory nobody reads. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('exactly one L4 curriculum node exists', () => {
  const files = sourceFiles(SRC);

  it('has retired the CurriculumDayUnit model', () => {
    expect(fs.existsSync(path.join(SRC, 'models/CurriculumDayUnit.ts'))).toBe(false);
  });

  it('has the canonical model in its place', () => {
    expect(fs.existsSync(path.join(SRC, 'models/CurriculumLearningUnit.ts'))).toBe(true);
  });

  it('leaves nothing importing the retired model', () => {
    const importers = files.filter(f =>
      /from\s+'[^']*\/CurriculumDayUnit'/.test(fs.readFileSync(f, 'utf8')));
    // A model nobody imports today is a model somebody imports next month. It has to be gone.
    expect(importers.map(f => path.relative(SRC, f))).toEqual([]);
  });

  it('keeps the legacy hierarchy untouched by the new node', () => {
    const unitModel = fs.readFileSync(path.join(SRC, 'models/CurriculumLearningUnit.ts'), 'utf8');
    // Coupling to any of these would re-anchor a curriculum unit to one course, which is the
    // mistake CareerSkill rejected in writing.
    for (const forbidden of ["ref: 'Course'", "ref: 'Subject'", "ref: 'Chapter'", "ref: 'Topic'", "ref: 'SubTopic'"]) {
      expect(unitModel).not.toContain(forbidden);
    }
  });

  it('gives the unit no way to hold a schedule', () => {
    const unitModel = fs.readFileSync(path.join(SRC, 'models/CurriculumLearningUnit.ts'), 'utf8');
    const schemaStart = unitModel.indexOf('const CurriculumLearningUnitSchema');
    const schema = unitModel.slice(schemaStart);

    // A day belongs to one student's plan. A field for it here would make the master curriculum
    // a fixed syllabus with personalisation bolted on, which is the system this replaces.
    for (const forbidden of ['dayNumber', 'scheduledDay', 'scheduledDate', 'startTime', 'endTime', 'studentId']) {
      expect(schema).not.toContain(forbidden);
    }
  });
});
