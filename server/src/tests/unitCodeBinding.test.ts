/**
 * Binding a quiz or an assignment to a Learning Unit.
 *
 * These two engines are the only parts of a content bundle that do not live in
 * LearningContentLibrary, and they had no hook to a unit at all — only `primaryTech`, which is a
 * language category rather than a curriculum position. A `unitCode` field is the whole change.
 *
 * WHY A FIELD RATHER THAN A JOIN COLLECTION. A quiz belongs to at most one unit, so a join would
 * add a second place for that fact to live and a second thing to keep in step. It also mirrors
 * how LearningContentLibrary binds, which means one rule for an author to learn rather than two.
 *
 * THE PROPERTY THAT MATTERS MOST IS THE ABSENCE OF ONE. Every existing quiz and assignment has no
 * unitCode, and none of them may change behaviour because of it. A schema addition that quietly
 * altered an existing query would be a migration wearing a field's clothing.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const MODELS = path.resolve(__dirname, '../models');

/**
 * Read the schema definitions as source rather than instantiating the models.
 *
 * Quiz and Assignment pull in a large dependency graph and a live connection; the questions here
 * are about the schema's shape, which the source answers directly and without a database.
 */
const source = (file: string): string => fs.readFileSync(path.join(MODELS, file), 'utf8');

describe.each(['Quiz.ts', 'Assignment.ts'])('%s', (file) => {
  const src = source(file);

  it('declares unitCode as optional', () => {
    expect(src).toMatch(/unitCode\?: string;/);
  });

  it('stores it trimmed and uppercased, matching every other code in the system', () => {
    // Codes are compared as strings across three collections. One of them storing a lowercase
    // variant is the bug that makes a join silently return nothing.
    expect(src).toMatch(/unitCode:\s*\{\s*type: String, trim: true, uppercase: true \}/);
  });

  it('does not make it required, and gives it no default', () => {
    // The declaration LINE, not a fixed window: a window wide enough to be safe also reaches the
    // next field, and `startDate: { required: true }` would fail this for the wrong reason.
    const decl = src
      .split('\n')
      .find(l => /^\s*unitCode:\s*\{/.test(l))!;

    expect(decl).toBeDefined();
    // A default would write the field onto every existing row on its next save, which is a
    // migration wearing a field's clothing.
    expect(decl).not.toMatch(/required/);
    expect(decl).not.toMatch(/default/);
  });

  it('indexes it sparsely, because most rows will never carry one', () => {
    expect(src).toMatch(/index\(\{\s*tenantId: 1,\s*unitCode: 1\s*\},\s*\{\s*sparse: true\s*\}\)/);
  });

  it('leaves the legacy hooks alone', () => {
    // primaryTech and the course hierarchy are how these are organised today. The unit binding
    // sits beside them; replacing them would break every existing screen.
    expect(src).toMatch(/primaryTech/);
  });
});

describe('the binding behaves like the library’s', () => {
  /** A throwaway schema with the same declaration, so the behaviour is tested and not just read. */
  const Bound = mongoose.model(
    'UnitCodeBindingProbe',
    new mongoose.Schema({
      tenantId: { type: String, required: true },
      title: { type: String, required: true },
      unitCode: { type: String, trim: true, uppercase: true },
    }),
  );

  it('is absent on a row that never set it', () => {
    const doc = new Bound({ tenantId: 't1', title: 'Old quiz' });
    // Absent, not empty string and not null: an existing row is untouched by the addition.
    expect(doc.toObject().unitCode).toBeUndefined();
    expect(doc.validateSync()).toBeUndefined();
  });

  it('uppercases and trims what it is given', () => {
    const doc = new Bound({ tenantId: 't1', title: 'Bound quiz', unitCode: '  t_html_forms  ' });
    expect(doc.unitCode).toBe('T_HTML_FORMS');
  });

  it('accepts a row with no unit even when others have one', () => {
    const bound = new Bound({ tenantId: 't1', title: 'A', unitCode: 'T_HTML_INTRO' });
    const unbound = new Bound({ tenantId: 't1', title: 'B' });
    expect(bound.validateSync()).toBeUndefined();
    expect(unbound.validateSync()).toBeUndefined();
  });
});
