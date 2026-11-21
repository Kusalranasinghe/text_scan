export const APPLICATION_FORM_FIELDS = [
  { key: 'centerName', label: 'Center Name', kind: 'text' },
  { key: 'centerCity', label: 'Center City', kind: 'text' },
  { key: 'fullName', label: 'Full Name (Q1)', kind: 'text' },
  { key: 'address', label: 'Address (Q2)', kind: 'text' },
  { key: 'school', label: 'School (Q3)', kind: 'text' },
  { key: 'dateOfBirth', label: 'Date of Birth (Q4)', kind: 'text' },
  { key: 'residentialCity', label: 'Residential City (Q5)', kind: 'text' },
  { key: 'residentialDistrict', label: 'Residential District (Q6)', kind: 'text' },
  { key: 'phoneNumber', label: 'Phone Number (Q7)', kind: 'text' },
  { key: 'whatsappNumber', label: 'WhatsApp Number (Q7)', kind: 'text' },
  { key: 'nationalId', label: 'National ID Number (Q8)', kind: 'text' },
  { key: 'loggingNumber', label: 'Chemistry with Charitha Logging Number (Q9)', kind: 'text' },
  {
    key: 'studySection',
    label: 'A/L Study Section (Q10)',
    kind: 'choice',
    options: ['විද්‍යා අංශය', 'ගණිත අංශය'],
  },
  {
    key: 'gender',
    label: 'Gender (Q11)',
    kind: 'choice',
    options: ['ස්ත්‍රී', 'පුරුෂ'],
  },
  {
    key: 'digitalIdCard',
    label: 'Digital ID Card Created? (Q12)',
    kind: 'choice',
    options: ['ඔව්', 'නැත'],
  },
  {
    key: 'examAttempt',
    label: 'A/L Exam Attempt (Q13)',
    kind: 'choice',
    options: ['1st Shy', '2nd Shy', '3rd Shy'],
  },
  { key: 'additionalAnswer', label: 'Additional Written Response (Q14)', kind: 'text' },
] as const;

export type ApplicationFieldKey = (typeof APPLICATION_FORM_FIELDS)[number]['key'];
export type ApplicationFormData = Record<ApplicationFieldKey, string>;

export const createEmptyApplicationForm = (): ApplicationFormData =>
  Object.fromEntries(APPLICATION_FORM_FIELDS.map(({ key }) => [key, ''])) as ApplicationFormData;
