import { APPLICATION_FORM_FIELDS, type ApplicationFormData } from '../types/applicationForm';

const RESPONSE_TYPE = 'application-form-sheet-response';
const RESPONSE_TIMEOUT_MS = 30000;

interface GoogleSheetsResponse {
  type: typeof RESPONSE_TYPE;
  requestId: string;
  success: boolean;
  message?: string;
  spreadsheetUrl?: string;
}

export const submitApplicationToGoogleSheets = (
  endpointUrl: string,
  token: string,
  fields: ApplicationFormData
): Promise<void> => {
  const endpoint = endpointUrl.trim();
  if (!endpoint || !token.trim()) {
    throw new Error('Add the Apps Script URL and token in Settings before saving to Google Sheets.');
  }

  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    throw new Error('The Google Apps Script URL is invalid.');
  }
  if (
    parsedEndpoint.protocol !== 'https:' ||
    parsedEndpoint.hostname !== 'script.google.com' ||
    !parsedEndpoint.pathname.startsWith('/macros/s/') ||
    !parsedEndpoint.pathname.endsWith('/exec')
  ) {
    throw new Error('Use the deployed Google Apps Script Web App URL ending in /exec.');
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const responseFrameName = `application-sheet-${requestId}`;
  const responseFrame = document.createElement('iframe');
  responseFrame.name = responseFrameName;
  responseFrame.title = 'Google Sheets submission response';
  responseFrame.setAttribute('aria-hidden', 'true');
  responseFrame.tabIndex = -1;
  responseFrame.style.position = 'absolute';
  responseFrame.style.width = '1px';
  responseFrame.style.height = '1px';
  responseFrame.style.left = '-10000px';
  responseFrame.style.border = '0';
  document.body.appendChild(responseFrame);

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = parsedEndpoint.toString();
  form.target = responseFrameName;
  form.hidden = true;

  const payload = {
    requestId,
    token: token.trim(),
    fields: Object.fromEntries(
      APPLICATION_FORM_FIELDS.map(({ key }) => [key, fields[key].trim()])
    ),
  };
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'payload';
  input.value = JSON.stringify(payload);
  form.appendChild(input);
  document.body.appendChild(form);

  return new Promise<void>((resolve, reject) => {
    let timeoutId = 0;
    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(timeoutId);
      form.remove();
      responseFrame.remove();
    };

    const handleMessage = (event: MessageEvent<GoogleSheetsResponse>) => {
      if (
        !isGoogleAppsScriptOrigin(event.origin) ||
        event.data?.type !== RESPONSE_TYPE ||
        event.data.requestId !== requestId
      ) {
        return;
      }

      cleanup();
      if (event.data.success) {
        resolve();
      } else {
        reject(new Error(event.data.message || 'Google Sheets could not save this application.'));
      }
    };

    window.addEventListener('message', handleMessage);
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheets did not confirm the result. Check the Applications sheet before submitting again to avoid a duplicate.'));
    }, RESPONSE_TIMEOUT_MS);

    try {
      form.submit();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

const isGoogleAppsScriptOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' &&
      (url.hostname === 'script.google.com' || url.hostname.endsWith('.googleusercontent.com'));
  } catch {
    return false;
  }
};
