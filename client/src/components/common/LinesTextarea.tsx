import React, { useEffect, useRef, useState } from 'react';

/**
 * A textarea for a "one per line" list — choices, colleges, prizes, outcomes, domains.
 *
 * WHY THIS EXISTS. Every such box used to be driven straight from the parsed list, and parsing
 * drops blank lines. So pressing Enter made a blank line that vanished on the same keystroke:
 * the cursor never moved, and a new item could not be started without typing it on the end of
 * the previous one. The fix is to keep the text exactly as typed and only DERIVE the list.
 *
 * The typed text is reset from `value` only when the list changes from outside (switching to
 * another record, a reload) — never because of the admin's own typing.
 */
type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string[];
  onChange: (lines: string[]) => void;
  /** Trim each line. On by default; off keeps leading spaces (e.g. indented code-ish lines). */
  trim?: boolean;
};

const parse = (text: string, trim: boolean) =>
  text.split('\n').map(l => (trim ? l.trim() : l)).filter(l => l.trim().length > 0);

const LinesTextarea: React.FC<Props> = ({ value, onChange, trim = true, ...rest }) => {
  const [text, setText] = useState(() => (value || []).join('\n'));
  /** The list this component last reported, so its own echo is not mistaken for an outside change. */
  const lastEmitted = useRef<string>(JSON.stringify(value || []));

  useEffect(() => {
    const incoming = JSON.stringify(value || []);
    if (incoming !== lastEmitted.current) {
      lastEmitted.current = incoming;
      setText((value || []).join('\n'));
    }
  }, [value]);

  return (
    <textarea
      {...rest}
      value={text}
      onChange={e => {
        const next = e.target.value;
        setText(next);
        const lines = parse(next, trim);
        lastEmitted.current = JSON.stringify(lines);
        onChange(lines);
      }}
    />
  );
};

export default LinesTextarea;
