import {
  APPLICATION_FORM_FIELDS,
  createEmptyApplicationForm,
  type ApplicationFormData,
} from '../../types/applicationForm';

/**
 * Extracts base64 data and mimeType from a data URL
 */
const parseDataUrl = (dataUrl: string): { mimeType: string; data: string } => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data URL format');
  }
  return {
    mimeType: match[1],
    data: match[2],
  };
};

const parseApplicationFormResponse = (response: string): ApplicationFormData => {
  const cleaned = response
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      const partialData = extractCompleteFields(cleaned);
      if (Object.values(partialData).some(Boolean)) return partialData;
      if (/blank|no handwriting|no handwritten answers|nothing filled|no responses/i.test(cleaned)) {
        return createEmptyApplicationForm();
      }
      throw new Error(
        `Gemini returned unstructured form data. Make sure the uploaded application is filled in and scan it again. Response: ${cleaned.slice(0, 180)}`
      );
    }
    try {
      parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    } catch {
      const partialData = extractCompleteFields(cleaned);
      if (Object.values(partialData).some(Boolean)) return partialData;
      throw new Error('Gemini returned incomplete form data. Please scan the application again.');
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The AI response was not a valid application form. Please scan the form again.');
  }

  return normalizeApplicationFields(parsed as Record<string, unknown>);
};

const normalizeApplicationFields = (source: Record<string, unknown>): ApplicationFormData => {
  const formData = createEmptyApplicationForm();
  for (const field of APPLICATION_FORM_FIELDS) {
    const { key } = field;
    const value = source[key];
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      formData[key] = 'options' in field
        ? field.options.find((option) => option === trimmedValue) ?? ''
        : trimmedValue;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      formData[key] = 'options' in field
        ? ''
        : String(value);
    }
  }
  return formData;
};

const extractCompleteFields = (response: string): ApplicationFormData => {
  const source: Record<string, unknown> = {};
  for (const { key } of APPLICATION_FORM_FIELDS) {
    const fieldPattern = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
    const match = response.match(fieldPattern);
    if (!match) continue;

    try {
      source[key] = JSON.parse(`"${match[1]}"`);
    } catch {
      continue;
    }
  }

  return normalizeApplicationFields(source);
};

/**
 * Extracts the fixed application form fields using Google Gemini Vision.
 */
export const extractApplicationFormWithGemini = async (
  imageDataUrl: string,
  apiKey: string
): Promise<ApplicationFormData> => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Google Gemini API Key is required. Please set it in Settings or your .env file (VITE_GEMINI_API_KEY).');
  }

  const { mimeType, data } = parseDataUrl(imageDataUrl);

  const prompt = `Read this application form. The printed form layout is fixed. Extract the handwritten answer for each field below. The form contains Sinhala and English.

Rules:
- Return exactly one JSON object with the keys shown below. Every value must be a string; use "" when a field is blank, unclear, or not selected.
- If the page is an unfilled template, still return the complete JSON object with every value set to "".
- Copy handwriting faithfully. Keep Sinhala in Sinhala script, English in Latin script, and preserve digits exactly.
- For checkbox choices, return only the selected printed option. If no box is clearly selected, return "".
- Do not infer answers from nearby fields. Do not include printed questions as answers.
- Exclude the signature and the date beside the signature at the bottom. Keep the date of birth field (Q4).
- Map fields: Center Name; Center City; Q1 full name; Q2 address; Q3 school; Q4 date of birth; Q5 residential city; Q6 residential district; Q7 phone and WhatsApp numbers; Q8 national ID number; Q9 Chemistry with Charitha logging number; Q10 A/L study section (විද්‍යා අංශය or ගණිත අංශය); Q11 gender (ස්ත්‍රී or පුරුෂ); Q12 Digital ID Card created (ඔව් or නැත); Q13 A/L exam attempt (1st Shy, 2nd Shy, or 3rd Shy); Q14 additional written response.

JSON keys and exact shape:
${JSON.stringify(createEmptyApplicationForm())}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: Object.fromEntries(APPLICATION_FORM_FIELDS.map((field) => [
          field.key,
          { type: 'STRING' },
        ])),
        required: APPLICATION_FORM_FIELDS.map(({ key }) => key),
      },
    },
  };

  const modelName = 'gemini-3.1-flash-lite';
  let responseData: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null = null;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorJson = await response.json() as { error?: { message?: string } };
      const detail = errorJson.error?.message || JSON.stringify(errorJson);
      if (/quota exceeded|exceeded your current quota|generate_content_free_tier_requests/i.test(detail)) {
        throw new Error(`Gemini 3.1 Flash-Lite quota reached. ${detail}`);
      }
      throw new Error(`Gemini Vision API error: ${detail}`);
    }
    responseData = await response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Gemini 3.1 Flash-Lite is taking longer than 20 seconds. Please try again shortly.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!responseData) {
    throw new Error('Gemini 3.1 Flash-Lite did not return a response.');
  }

  const candidate = responseData.candidates?.[0];
  const rawTextResponse = candidate?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();

  if (!rawTextResponse) {
    throw new Error('No recognition output returned from Gemini Vision model');
  }

  return parseApplicationFormResponse(rawTextResponse);
};
