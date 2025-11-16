import * as i from '../services/Interfaces/interfaces';
import { RequestHandler } from './HTTP/RequestHandler';

export async function handleQRScan(data:string) {
  const handler = new RequestHandler();

  // System Hub operations
  const systemHubRoutes = {
    systemHubRegistration: handler.systemHubRegistration,
    systemHubLogin: handler.systemHubLogin,   
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
    const qrInput: i.QRData = JSON.parse(data);
    const routeHandler = handleRoute[toCamelCase(qrInput.type)];
    if(routeHandler === 'clone'){
      handler.clone(qrInput as i.Clone);
      return;
    }

    if (routeHandler) {
      const result = await routeHandler(qrInput);  
      console.log('Handled QR Result:', result);
    } else {
      console.error('Unknown QR type:', qrInput.type);
    }
  } catch (error) {
    console.error('Error parsing QR data:', error);
  }
}

function toCamelCase(requestType: string): string {
  return requestType.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
}

