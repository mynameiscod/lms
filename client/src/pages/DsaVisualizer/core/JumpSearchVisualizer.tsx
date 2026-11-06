import UniversalEngine from './UniversalEngine';
export * from './searchAlgorithms/jump';

export default function JumpSearchVisualizer({ onBack }: { onBack?: () => void } = {}) {
  return <UniversalEngine initialAlgorithm="jump_search" onBack={onBack}/>;
}
