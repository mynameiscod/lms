import UniversalEngine from './UniversalEngine';
export * from './searchAlgorithms/exponential';

export default function ExponentialSearchVisualizer({ onBack }: { onBack?: () => void } = {}) {
  return <UniversalEngine initialAlgorithm="exponential_search" onBack={onBack}/>;
}
