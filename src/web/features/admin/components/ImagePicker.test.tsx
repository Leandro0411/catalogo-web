import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImagePicker } from './ImagePicker';

function fakeBitmap(): ImageBitmap {
  return { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
}

function mockCanvasEncoding(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);

  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string,
  ) {
    callback(new Blob(['x'], { type: type ?? 'image/webp' }));
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ImagePicker', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    if (!('createObjectURL' in URL)) {
      Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(), writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
    } else {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('muestra la foto actual a partir de imageKey', () => {
    render(<ImagePicker imageKey="t/tenant/abc" onChange={vi.fn()} onBusyChange={vi.fn()} />);

    expect(screen.getByRole('presentation')).toHaveAttribute('src', '/img/t/tenant/abc-480');
  });

  it('no muestra vista previa ni botón de quitar sin imageKey', () => {
    render(<ImagePicker imageKey={null} onChange={vi.fn()} onBusyChange={vi.fn()} />);

    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
    expect(screen.queryByText('Quitar foto')).not.toBeInTheDocument();
  });

  it('al elegir una foto la comprime, la sube y llama a onChange con el imageKey', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => fakeBitmap()),
    );
    mockCanvasEncoding();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(201, { imageKey: 't/tenant/nueva' }));

    const onChange = vi.fn();
    const onBusyChange = vi.fn();
    render(<ImagePicker imageKey={null} onChange={onChange} onBusyChange={onBusyChange} />);

    const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Foto') as HTMLInputElement;
    await user.upload(input, file);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('t/tenant/nueva'));
    expect(onBusyChange).toHaveBeenCalledWith(true);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('muestra un error si no puede decodificar la foto', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('boom');
      }),
    );

    render(<ImagePicker imageKey={null} onChange={vi.fn()} onBusyChange={vi.fn()} />);

    const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Foto') as HTMLInputElement;
    await user.upload(input, file);

    expect(await screen.findByText(/No pudimos leer la foto/)).toBeInTheDocument();
  });

  it('el botón "Quitar foto" llama a onChange con null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ImagePicker imageKey="t/tenant/abc" onChange={onChange} onBusyChange={vi.fn()} />);

    await user.click(screen.getByText('Quitar foto'));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
