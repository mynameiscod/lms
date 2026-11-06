import UniversalEngine from './UniversalEngine';
export * from './searchAlgorithms/binary';

export default function BinarySearchVisualizer({ onBack }: { onBack?: () => void } = {}) {
  return <UniversalEngine initialAlgorithm="binary_search" onBack={onBack}/>;
}
