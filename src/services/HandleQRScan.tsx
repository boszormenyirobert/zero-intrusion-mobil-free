import * as i from '../services/Interfaces/interfaces';
import { RequestHandler } from './HTTP/RequestHandler';

type ParsedQRInput = i.QRData | (Partial<i.Access> & { type: 'domain-login' });

function parseQRInput(data: string): ParsedQRInput | null {
  const trimmedData = data.trim();

  // Keep malformed JSON invalid, but allow opaque token payloads from scanner QR values.
  if (trimmedData.startsWith('{') || trimmedData.startsWith('[')) {
    return JSON.parse(trimmedData) as i.QRData;
  }

  return {
    type: 'domain-login',
    qrCacheKey: trimmedData,
    credentialCacheKey: trimmedData,
    source: 'extension',
    rawQrData: trimmedData,
  } as ParsedQRInput;
}

export async function handleQRScan(data:string) {
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
    const qrInput = parseQRInput(data);
    if (!qrInput) {
      return false;
    }
    const routeHandler = handleRoute[toCamelCase(qrInput.type)];

  //  if(routeHandler === 'clone'){      
  //    await handler.clone(qrInput as i.Clone);
  //    return "clone";
  //  }

    if (routeHandler) {
      const result = await routeHandler(qrInput);  
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

