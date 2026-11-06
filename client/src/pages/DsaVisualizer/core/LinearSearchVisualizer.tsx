import UniversalEngine from './UniversalEngine';
export * from './searchAlgorithms/linear';

export default function LinearSearchVisualizer({ onBack }: { onBack?: () => void } = {}) {
  return <UniversalEngine initialAlgorithm="linear_search" onBack={onBack}/>;
}
