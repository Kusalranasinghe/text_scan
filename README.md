# Application Form Scanner

A web app for scanning the same handwritten application form, reviewing and editing the extracted answers, and saving confirmed records to Google Sheets.

## What it extracts

The Gemini Vision model reads the fixed form fields and returns an editable review form:

- Center name and center city
- Q1 full name, Q2 address, Q3 school, Q4 date of birth
- Q5 residential city, Q6 residential district
- Q7 phone and WhatsApp numbers
- Q8 national ID number, Q9 Chemistry with Charitha logging number
- Q10 A/L study section, Q11 gender, Q12 Digital ID Card status, Q13 A/L attempt
- Q14 additional written response

Signature and the date beside the signature are excluded. Date of birth is included. Checkbox answers that are unclear or not marked remain blank for manual review.

## Configure Gemini

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open the app's Settings and paste the key.

The application image is sent to Google Gemini for extraction. The app sends only the extracted field values to the Google Sheets script, not the image.

## Connect Google Sheets

The Apps Script creates a new spreadsheet in your Google account when `setup()` is run.

1. Create a standalone project at [script.google.com](https://script.google.com/home/start).
2. Copy [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) into `Code.gs` and save.
3. Select `setup` in the function menu and click **Run**. Approve the Google Sheets permissions. In the execution log, copy `APP_SCRIPT_TOKEN` and the spreadsheet URL.
4. Choose **Deploy → New deployment → Web app**. Set **Execute as** to yourself and **Who has access** to **Anyone**, then deploy and copy the Web app URL ending in `/exec`.
5. In the app, open **Settings** and paste the Web app URL and `APP_SCRIPT_TOKEN`, then save.
6. Scan a form, review/edit the extracted fields, and choose **Confirm & Save to Google Sheets**. After Apps Script confirms the row was saved, a success message appears in the review form; choose **Next application** to return to the first screen.

The spreadsheet has an `Applications` tab. Each confirmed application is saved as one row, with a submission timestamp. Phone and ID fields are stored as text to preserve leading zeroes.

### Access and token safety

The web app is callable by anyone who has both its URL and token. Keep the token private. It is stored in this browser's local storage. If it is exposed, run `rotateToken()` in Apps Script and update the token in the app's Settings.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Stack

- React + TypeScript + Vite
- Gemini 3.1 Flash-Lite for fixed-field Sinhala/English handwritten form extraction
- Google Apps Script + Google Sheets for confirmed records
