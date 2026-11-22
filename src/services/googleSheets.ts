import { APPLICATION_FORM_FIELDS, type ApplicationFormData } from '../types/applicationForm';

const RESPONSE_TYPE = 'application-form-sheet-response';
const RESPONSE_TIMEOUT_MS = 60000;
const POLL_INTERVAL_MS = 1000;

interface GoogleSheetsResponse {
  type: typeof RESPONSE_TYPE;
  requestId: string;
  pending?: boolean;
  success?: boolean;
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

  const requestId = crypto.randomUUID();
  const responseFrameName = `application-sheet-${requestId}`;
  const responseFrame = document.createElement('iframe');
  responseFrame.name = responseFrameName;
  responseFrame.title = 'Google Sheets submission';
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
    let pollTimeoutId = 0;
    let pollCount = 0;
    let activeScript: HTMLScriptElement | null = null;
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(pollTimeoutId);
      activeScript?.remove();
      form.remove();
      responseFrame.remove();
      Reflect.deleteProperty(window, callbackName);
    };

    const handleResponse = (result: GoogleSheetsResponse) => {
      if (result.type !== RESPONSE_TYPE || result.requestId !== requestId) return;
      activeScript?.remove();
      activeScript = null;
      if (result.pending) {
        pollTimeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      cleanup();
      if (result.success) resolve();
      else reject(new Error(result.message || 'Google Sheets could not save this application.'));
    };

    const callbackName = `__chemscan_${requestId.replace(/-/g, '')}`;
    Object.defineProperty(window, callbackName, {
      configurable: true,
      value: handleResponse,
    });

    const poll = () => {
      pollCount += 1;
      const pollUrl = new URL(parsedEndpoint);
      pollUrl.searchParams.set('requestId', requestId);
      pollUrl.searchParams.set('callback', callbackName);
      pollUrl.searchParams.set('_poll', String(pollCount));

      const script = document.createElement('script');
      script.async = true;
      script.src = pollUrl.toString();
      activeScript = script;
      script.onerror = () => {
        script.remove();
        activeScript = null;
        pollTimeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
      };
      script.onload = () => {
        script.remove();
        if (activeScript === script) {
          activeScript = null;
          pollTimeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      };
      document.head.appendChild(script);
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheets did not confirm the result. Check the Applications sheet before submitting again to avoid a duplicate.'));
    }, RESPONSE_TIMEOUT_MS);

    try {
      form.submit();
      poll();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};
