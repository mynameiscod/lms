import SoundToggle from './SoundToggle';

interface ConceptBannerProps {
  readonly title:string;
  readonly definition:string;
  readonly time:string;
  readonly space:string;
}

/** Keep the title, complexity and shared persistent speaker control together. */
export default function ConceptBanner({title,definition,time,space}:ConceptBannerProps) {
  return <><SoundToggle/><div className="ue-concept"><strong>{title}</strong><p>{definition}</p></div>
    <span className="ue-badge">Time {time}</span>
    <span className="ue-badge">Space {space}</span></>;
}
