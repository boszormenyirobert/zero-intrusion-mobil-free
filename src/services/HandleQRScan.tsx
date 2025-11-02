import * as i from '../services/Interfaces/interfaces';
import { RequestHandler } from './HTTP/RequestHandler';

export async function handleQRScan(data: string) {
  const handler = new RequestHandler();
  const handleRoute = {
    systemHubLogin: handler.systemHubLogin,
    systemHubRegistration: handler.systemHubRegistration,
    registrationDomain: handler.registrationDomain,
    registrationApplication: handler.registrationApplication,
    domainLogin: handler.domainLogin,
    deleteDomain: (qrInput: i.QRData) => console.log("delete_domain", qrInput),
    listApplications: (qrInput: i.QRData) => console.log("list_applications", qrInput)
  };

  try {
    const qrInput: i.QRData = JSON.parse(data);
    console.log('Scanned QR Data:', JSON.stringify(data));
    const routeHandler = handleRoute[toCamelCase(qrInput.type)];
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

