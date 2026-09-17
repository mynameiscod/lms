import { submissionKindFor, projectSubmissionProblem } from './submissionKind';

describe('how the workspace hands an attempt in', () => {
  it('hands in a project as a written submission, so the attempt is actually submitted', () => {
    expect(submissionKindFor('project')).toBe('written');
  });

  it('keeps every other type on the path it already had', () => {
    expect(submissionKindFor('coding')).toBe('code');
    expect(submissionKindFor('sql')).toBe('code');
    expect(submissionKindFor('web')).toBe('code');
    expect(submissionKindFor('mcq')).toBe('mcq');
    expect(submissionKindFor('theory')).toBe('written');
    expect(submissionKindFor('file_upload')).toBe('none');
  });

  it('asks for where the work is and what was built before a project can be submitted', () => {
    expect(projectSubmissionProblem('')).not.toBeNull();
    expect(projectSubmissionProblem('   done   ')).not.toBeNull();
    expect(projectSubmissionProblem('https://github.com/me/trip-splitter — splits a bill three ways')).toBeNull();
  });
});
