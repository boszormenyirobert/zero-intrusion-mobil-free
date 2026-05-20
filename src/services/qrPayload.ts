export const buildTypedQrPayload = <T extends Record<string, unknown>>(
  payload: T,
  type: string,
) => ({
  ...payload,
  type,
});

export const normalizeAccessType = (type?: string) => {
  switch (type) {
    case 'domain-read':
      return 'domain-login';
    case 'vault-read':
      return 'applications';
    default:
      return type;
  }
};

export const buildAccessCacheKey = (qrCacheKey?: string, type?: string) => {
  if (!qrCacheKey) {
    return undefined;
  }

  const normalizedType = normalizeAccessType(type) || type;
  if (!normalizedType) {
    return qrCacheKey;
  }

  if (
    qrCacheKey.endsWith(`::${type}`)
    || qrCacheKey.endsWith(`::${normalizedType}`)
  ) {
    return qrCacheKey;
  }

  return `${qrCacheKey}::${normalizedType}`;
};
