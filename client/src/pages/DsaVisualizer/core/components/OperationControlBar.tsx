import { playSelectionSound } from '../utils/soundEffects';

export interface OperationOption<Id extends string> { readonly id:Id; readonly label:string }
interface OperationControlBarProps<Id extends string> {
  readonly operations:readonly OperationOption<Id>[];
  readonly value:Id;
  readonly onChange:(value:Id)=>void;
  readonly label:string;
  readonly variant?:'buttons'|'select';
  readonly note?:string;
  readonly className?:string;
}

/** One selection cue per action, shared by every operation family. Generation
 * callbacks stay silent; they can also be called by tests or background workers. */
export default function OperationControlBar<Id extends string>({operations,value,onChange,label,variant='buttons',note,className}:OperationControlBarProps<Id>) {
  const select=(id:Id)=>{playSelectionSound();onChange(id);};
  if(variant==='select') return <label className="ue-pattern-operation">Operation
    <select aria-label={label} value={value} onChange={event=>{
      const option=operations.find(item=>item.id===event.target.value);if(option) select(option.id);
    }}>{operations.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select>
    {note&&<small>{note}</small>}
  </label>;
  return <div className={className??'ue-operation-bar'} role="group" aria-label={label}>
    {operations.map(option=><button key={option.id} type="button" aria-pressed={value===option.id} onClick={()=>select(option.id)}>{option.label}</button>)}
  </div>;
}
