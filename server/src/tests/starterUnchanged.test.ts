import { codeSignature, isStarterUnchanged, JudgeProblem } from '../services/problemJudgeService';

const slow = `import sys

def solve(g, k):
    # recount every block from scratch
    best = 10**9
    for s in range(len(g) - k + 1):
        best = min(best, len(set(g[s:s + k])))
    return best

print(solve(list(map(int, sys.stdin.read().split())), 2))
`;
const problem: JudgeProblem = { kind: 'code', languages: [{ language: 'python', starterCode: slow }, { language: 'java', starterCode: '' }] };

describe('a starter that is already a complete solution', () => {
  it('is refused when the learner has written nothing', () => {
    expect(isStarterUnchanged(problem, 'python', slow)).toBe(true);
  });

  it('is still refused after only reformatting it or adding comments', () => {
    const dressed = slow.replace(/    /g, '\t').replace('# recount every block from scratch', '# my notes\n    # more notes') + '\n\n\n# end\n';
    expect(isStarterUnchanged(problem, 'python', dressed)).toBe(true);
  });

  it('is accepted once the code really changes', () => {
    expect(isStarterUnchanged(problem, 'python', slow.replace('len(set(g[s:s + k]))', 'len({*g[s:s + k]})'))).toBe(false);
    expect(isStarterUnchanged(problem, 'python', slow + '\nprint("extra")')).toBe(false);
  });

  it('never blocks a language with no starter, or SQL', () => {
    expect(isStarterUnchanged(problem, 'java', 'class A {}')).toBe(false);
    expect(isStarterUnchanged({ kind: 'sql', languages: [{ language: 'sql', starterCode: 'select 1;' }] }, 'sql', 'select 1;')).toBe(false);
  });

  it('compares C-style comments the same way', () => {
    expect(codeSignature('int main(){ /* a */ return 0; } // x', 'cpp')).toBe(codeSignature('int main(){return 0;}', 'cpp'));
  });
});
