const normalizeHeaders = (headers?: HeadersInit) => {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return headers;
};

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const parseResponseBody = async (response: Response) => {
  const rawBody = await response.clone().text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
};

export const logHttpRequest = (label: string, url: string, options: RequestInit) => {
  console.log(`[${getTimestamp()}] [HTTP] ${label} request`, {
    url,
    method: options.method ?? 'GET',
    headers: normalizeHeaders(options.headers),
  });
};

export const logHttpResponse = async (label: string, response: Response) => {
  console.log(`[${getTimestamp()}] [HTTP] ${label} response`, {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    body: await parseResponseBody(response),
  });
};