import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoicesEditor } from './ChoicesEditor';
import type { Choice } from '../../../../shared/types/catalog.types';

function ControlledChoicesEditor({ initial }: { initial: Choice[] }) {
  const [choices, setChoices] = useState(initial);
  return <ChoicesEditor choiceLabel="Sabor" choices={choices} onChange={setChoices} />;
}

describe('ChoicesEditor', () => {
  it('pegar tres líneas con un duplicado agrega dos y avisa el repetido', async () => {
    const user = userEvent.setup();
    render(<ControlledChoicesEditor initial={[{ value: 'Grape', available: true }]} />);

    await user.click(screen.getByText('Pegar varios'));
    await user.type(screen.getByLabelText('Pegar varios, uno por línea'), 'Grape\nMint\nMango');
    await user.click(screen.getByText('Agregar todos'));

    expect(screen.getByText('Mint')).toBeInTheDocument();
    expect(screen.getByText('Mango')).toBeInTheDocument();
    expect(screen.getAllByText('Grape')).toHaveLength(1);
    expect(await screen.findByText(/Ya existían: Grape/)).toBeInTheDocument();
    expect(screen.getByText('3 disponibles de 3')).toBeInTheDocument();
  });

  it('el switch cambia available', async () => {
    const user = userEvent.setup();
    render(<ControlledChoicesEditor initial={[{ value: 'Grape', available: true }]} />);

    const toggle = screen.getByRole('switch', { name: 'Disponible: Grape' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('0 disponibles de 1')).toBeInTheDocument();
  });

  it('agrega un valor con el botón Agregar y con Enter', async () => {
    const user = userEvent.setup();
    render(<ControlledChoicesEditor initial={[]} />);

    const input = screen.getByLabelText('Agregar sabor');
    await user.type(input, 'Mint{Enter}');
    expect(screen.getByText('Mint')).toBeInTheDocument();

    await user.type(input, 'Mango');
    await user.click(screen.getByText('Agregar'));
    expect(screen.getByText('Mango')).toBeInTheDocument();
  });
});
