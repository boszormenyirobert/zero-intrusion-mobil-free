import * as i from '../services/Interfaces/interfaces';
import { QRHandler } from './HTTP/mapper';

export async function handleQRScan(data: string) {
  const handler = new QRHandler();
  const handleRoute = {
    systemHubLogin: handler.systemHubLogin,
    systemHubRegistration: handler.systemHubRegistration,
    registrationDomain: handler.registrationDomain,
    registrationApplication: handler.registrationApplication,
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

function toCamelCase(str: string): string {
  return str.replace(/[-_]([a-z])/g, (_, c) => c.toUpperCase());
}

