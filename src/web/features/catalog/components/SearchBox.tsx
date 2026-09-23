import { useEffect, useState } from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

const DEBOUNCE_MS = 200;

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const [text, setText] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(value);
  }

  useEffect(() => {
    const timer = setTimeout(() => onChange(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, onChange]);

  return (
    <input
      type="search"
      value={text}
      onChange={(event) => setText(event.target.value)}
      placeholder="Buscar…"
      aria-label="Buscar…"
      className="rounded-full border px-4 py-2"
    />
  );
}
