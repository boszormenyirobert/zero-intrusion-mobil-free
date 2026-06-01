import * as i from '../services/Interfaces/interfaces';
import { buildAccessCacheKey, normalizeAccessType } from './qrPayload';
import { RequestHandler } from './HTTP/RequestHandler';

type ParsedQRInput = i.QRData | (Partial<i.Access> & { type: string });

const tryParseJson = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const pickType = (candidates: Array<unknown>, fallbackType?: string) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return fallbackType || 'domain-login';
};

const shouldDefaultAccessSource = (type: unknown, fallbackType?: string) => {
  const resolvedType = pickType([type], fallbackType);
  const normalizedType = normalizeAccessType(resolvedType) || resolvedType;
  return normalizedType === 'domain-login' || normalizedType === 'applications';
};

const normalizeWrappedAccessPayload = (
  parsed: Record<string, unknown>,
  rawData: string,
  fallbackType?: string,
): ParsedQRInput => {
  const applicationProcessId = tryParseJson(parsed.applicationProcessId);
  const nestedPayload = applicationProcessId && tryParseJson(applicationProcessId.payload);
  const payload = nestedPayload ?? (applicationProcessId?.payload && typeof applicationProcessId.payload === 'object'
    ? applicationProcessId.payload as Record<string, unknown>
    : null);

  const normalizedType = pickType(
    [
      applicationProcessId?.type,
      payload?.type,
      parsed.type,
    ],
    fallbackType,
  );

  return {
    ...parsed,
    ...(applicationProcessId ?? {}),
    ...(payload ?? {}),
    type: normalizedType,
    qrCacheKey: buildAccessCacheKey(
      (parsed.qrCacheKey as string | undefined) ?? rawData,
      normalizedType,
    ) ?? rawData,
    credentialCacheKey: (parsed.credentialCacheKey as string | undefined) ?? rawData,
    rawQrData: rawData,
  } as ParsedQRInput;
};

function parseQRInput(data: string, fallbackType?: string): ParsedQRInput | null {
  const trimmedData = data.trim();
  console.log('[QR][HandleQRScan] parseQRInput:start', {
    fallbackType: fallbackType || null,
    valueLength: trimmedData.length,
    looksLikeJson: trimmedData.startsWith('{') || trimmedData.startsWith('['),
  });

  // Keep malformed JSON invalid, but allow opaque token payloads from scanner QR values.
  if (trimmedData.startsWith('{') || trimmedData.startsWith('[')) {
    const parsed = JSON.parse(trimmedData);
    if (parsed && typeof parsed === 'object') {
      const parsedObject = parsed as Record<string, unknown>;
      const applicationProcessId = tryParseJson(parsedObject.applicationProcessId);
      if (applicationProcessId || parsedObject.applicationProcessId) {
        const normalized = applicationProcessId
          ? normalizeWrappedAccessPayload(parsedObject, trimmedData, fallbackType)
          : ({
            ...parsedObject,
            type: pickType([parsedObject.type], fallbackType),
            qrCacheKey: buildAccessCacheKey(
              (parsedObject.qrCacheKey as string | undefined) ?? trimmedData,
              pickType([parsedObject.type], fallbackType),
            ) ?? trimmedData,
            credentialCacheKey: (parsedObject.credentialCacheKey as string | undefined) ?? trimmedData,
            source: shouldDefaultAccessSource(parsedObject.type, fallbackType)
              ? (parsedObject.source as string | undefined) ?? 'extension'
              : (parsedObject.source as string | undefined),
            rawQrData: trimmedData,
          } as ParsedQRInput);

        console.log('[QR][HandleQRScan] parseQRInput:json', {
          type: (normalized as any)?.type,
          wrapped: Boolean(applicationProcessId),
        });
        return normalized;
      }
    }

    if (parsed && typeof parsed === 'object') {
      const parsedObject = parsed as Record<string, unknown>;
      const sourceValue = shouldDefaultAccessSource(parsedObject.type, fallbackType)
        ? (parsedObject.source as string | undefined) ?? 'extension'
        : (parsedObject.source as string | undefined);

      return {
        ...parsedObject,
        ...(sourceValue !== undefined ? { source: sourceValue } : {}),
      } as ParsedQRInput;
    }

    return parsed as i.QRData;
  }

  const fallbackParsed = {
    type: fallbackType || 'domain-login',
    qrCacheKey: buildAccessCacheKey(trimmedData, fallbackType || 'domain-login') ?? trimmedData,
    credentialCacheKey: trimmedData,
    source: 'extension',
    rawQrData: trimmedData,
  } as ParsedQRInput;

  console.log('[QR][HandleQRScan] parseQRInput:opaque', {
    type: (fallbackParsed as any).type,
    qrCacheKey: (fallbackParsed as any).qrCacheKey,
  });

  return fallbackParsed;
}

export async function handleQRScan(data:string, fallbackType?: string) {
  console.log('[QR][HandleQRScan] handleQRScan:start', {
    fallbackType: fallbackType || null,
    valueLength: data?.length ?? 0,
  });
  console.log('[Notification][HandleQRScan] incoming', data);
  const handler = new RequestHandler();

  // System Hub operations
  const systemHubRoutes = {
    systemHubRegistration: handler.systemHubRegistration,
    systemHubLogin: handler.systemHubLogin,  
    secure: handler.systemHubSecureDevice, 
  };

  // Domain operations - Password Manager
  const domainRoutes = {
    registrationDomain: handler.sharedRegistration,
    domainLogin: handler.access,
    deleteDomain: handler.delete,
  };

  // Application operations - Software credentials
  const applicationRoutes = {
    registrationApplication: handler.sharedRegistration,
    applications: handler.access,
    updateApplications: handler.sharedRegistration,
    deleteApplications: handler.delete,
  };

  // Clone device
  const cloneRoutes = {
    clone: handler.clone
  }

  // Merge all route groups into handleRoute
  const handleRoute = {
    ...systemHubRoutes,
    ...domainRoutes,
    ...applicationRoutes,
    ...cloneRoutes
  };

  try {
    if(!data) return; 
    const qrInput = parseQRInput(data, fallbackType);
    if (!qrInput) {
      return false;
    }
    const routeKey = toCamelCase(normalizeAccessType(qrInput.type) || qrInput.type);
    const routeHandler = handleRoute[routeKey];

    console.log('[QR][HandleQRScan] handleQRScan:routing', {
      type: qrInput.type,
      routeKey,
      hasHandler: Boolean(routeHandler),
    });

  //  if(routeHandler === 'clone'){      
  //    await handler.clone(qrInput as i.Clone);
  //    return "clone";
  //  }

    if (routeHandler) {
      const result = await routeHandler(qrInput);  
      console.log('[QR][HandleQRScan] handleQRScan:done', {
        type: qrInput.type,
        result,
      });
      return {"type": qrInput.type, result};
    } else {
      console.error('Unknown QR type:', qrInput.type);
      return false;
    }
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return false;
  }
}

function toCamelCase(requestType: string): string {
  return requestType.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
}

