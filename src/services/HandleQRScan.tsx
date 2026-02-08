import * as i from '../services/Interfaces/interfaces';
import { RequestHandler } from './HTTP/RequestHandler';

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
    const qrInput: i.QRData = JSON.parse(data);
    console.log('Parsed QR Input:', qrInput);

    const routeHandler = handleRoute[toCamelCase(qrInput.type)];

    console.log("Route handler: " + routeHandler);

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

