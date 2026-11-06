import UniversalEngine from './UniversalEngine';
export * from './searchAlgorithms/ternary';

export default function TernarySearchVisualizer({ onBack }: { onBack?: () => void } = {}) {
  return <UniversalEngine initialAlgorithm="ternary_search" onBack={onBack}/>;
}
