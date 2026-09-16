import { useState } from 'react';
import { pluralize } from '../../../shared/text';
import { Switch } from './Switch';
import type { Choice } from '../../../../shared/types/catalog.types';

const PLURAL_TITLE_COUNT = 2;

interface ChoicesEditorProps {
  choiceLabel: string;
  choices: Choice[];
  onChange: (choices: Choice[]) => void;
}

function titleFor(choiceLabel: string): string {
  const plural = pluralize(choiceLabel, PLURAL_TITLE_COUNT);
  return plural.charAt(0).toUpperCase() + plural.slice(1);
}

export function ChoicesEditor({ choiceLabel, choices, onChange }: ChoicesEditorProps) {
  const [newValue, setNewValue] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const availableCount = choices.filter((choice) => choice.available).length;

  const addValue = (value: string): boolean => {
    const trimmed = value.trim();

    if (!trimmed) {
      return false;
    }

    const exists = choices.some((choice) => choice.value.toLowerCase() === trimmed.toLowerCase());

    if (exists) {
      return false;
    }

    onChange([...choices, { value: trimmed, available: true }]);
    return true;
  };

  const handleAdd = (): void => {
    if (addValue(newValue)) {
      setNewValue('');
    }
  };

  const handlePasteMany = (): void => {
    const lines = pasteText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const seen = new Set(choices.map((choice) => choice.value.toLowerCase()));
    const duplicates: string[] = [];
    const additions: Choice[] = [];

    for (const line of lines) {
      const key = line.toLowerCase();

      if (seen.has(key)) {
        duplicates.push(line);
        continue;
      }

      seen.add(key);
      additions.push({ value: line, available: true });
    }

    onChange([...choices, ...additions]);
    setPasteText('');
    setDuplicateWarning(duplicates.length > 0 ? `Ya existían: ${duplicates.join(', ')}` : null);
  };

  const toggleAvailable = (index: number): void => {
    onChange(
      choices.map((choice, i) =>
        i === index ? { ...choice, available: !choice.available } : choice,
      ),
    );
  };

  const removeChoice = (index: number): void => {
    onChange(choices.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">{titleFor(choiceLabel)}</h3>
      <p className="text-sm text-gray-600">
        {availableCount} disponibles de {choices.length}
      </p>

      {choices.map((choice, index) => (
        <div key={`${choice.value}-${index}`} className="flex items-center gap-2">
          <Switch
            checked={choice.available}
            onChange={() => toggleAvailable(index)}
            label={`Disponible: ${choice.value}`}
          />
          <span className="flex-1">{choice.value}</span>
          <button
            type="button"
            onClick={() => removeChoice(index)}
            className="text-sm text-red-600 underline"
          >
            Quitar
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAdd();
            }
          }}
          placeholder={`Agregar ${choiceLabel.toLowerCase()}`}
          aria-label={`Agregar ${choiceLabel.toLowerCase()}`}
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="button" onClick={handleAdd} className="rounded border px-3 py-2">
          Agregar
        </button>
      </div>

      <button
        type="button"
        onClick={() => setPasteMode((prev) => !prev)}
        className="w-fit text-sm underline"
      >
        Pegar varios
      </button>

      {pasteMode ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="Uno por línea"
            aria-label="Pegar varios, uno por línea"
            className="rounded border px-3 py-2"
          />
          <button
            type="button"
            onClick={handlePasteMany}
            className="w-fit rounded border px-3 py-2"
          >
            Agregar todos
          </button>
        </div>
      ) : null}

      {duplicateWarning ? <p className="text-sm text-amber-600">{duplicateWarning}</p> : null}
    </div>
  );
}
