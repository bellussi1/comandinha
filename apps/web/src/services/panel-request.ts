export class PanelRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PanelRequestError';
  }
}

type ErrorPayload = { message?: unknown };

export async function requestPanelJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: 'no-store',
      headers: {
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new PanelRequestError(0, 'Não foi possível conectar ao painel.');
  }

  if (!response.ok) {
    let message: string | undefined;
    try {
      const payload = (await response.json()) as ErrorPayload;
      if (typeof payload.message === 'string') message = payload.message;
    } catch {
      // Keep non-JSON responses generic at the browser boundary.
    }
    throw new PanelRequestError(
      response.status,
      message ?? 'Não foi possível concluir esta operação.',
    );
  }

  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new PanelRequestError(502, 'O servidor retornou uma resposta inválida.');
  }
}
