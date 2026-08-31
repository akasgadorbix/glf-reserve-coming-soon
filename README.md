# GLF Reserve — Vercel + Google Sheets

This project contains:

- `index.html` — existing GLF Reserve landing page with signup form
- `api/join.js` — Vercel Function that validates submissions, detects country, and forwards the lead
- `google-apps-script.gs` — Google Apps Script webhook that writes to the supplied Google Sheet

## Google Sheet destination

Spreadsheet ID: `1OlFPkgrIDzwPYBF2EyusMq0mAQ7AQzmVv-P-38UtgCs`

The script creates/uses a tab named `Website Leads` with columns:

`Date | Time (IST) | Email | Country`

Duplicate emails are not inserted twice.

## 1. Set up Google Apps Script

1. Open the Google Sheet.
2. Extensions → Apps Script.
3. Replace the editor code with `google-apps-script.gs`.
4. Open Project Settings → Script properties.
5. Add a property:
   - Name: `WEBHOOK_SECRET`
   - Value: create a long random secret, e.g. 40+ random characters.
6. Deploy → New deployment → Web app.
7. Execute as: **Me**.
8. Who has access: **Anyone**.
9. Deploy and copy the `/exec` Web App URL.

The webhook is still protected because every request must contain the secret stored in Script Properties.

## 2. Push to GitHub

Keep this structure at the repository root:

```
index.html
api/join.js
google-apps-script.gs
README.md
```

## 3. Import the GitHub repo into Vercel

No framework is required. Vercel will serve `index.html` and expose `/api/join` as a serverless function.

In Vercel → Project → Settings → Environment Variables, add:

- `GOOGLE_SHEETS_WEBHOOK_URL` = the Apps Script `/exec` URL
- `GOOGLE_SHEETS_WEBHOOK_SECRET` = exactly the same value as `WEBHOOK_SECRET`

Add both variables to Production (and Preview if you want preview deployments to submit leads).

Redeploy after adding/changing environment variables.

## Country detection

In production, `/api/join.js` uses Vercel's `x-vercel-ip-country` request header. This is more reliable than browser language settings and does not request GPS/location permission.

The browser also sends its locale-derived country code as a fallback for local/non-Vercel testing.

## Test

1. Open the deployed site.
2. Click `Join the Reserve`.
3. Submit a new email.
4. Confirm a row appears in the `Website Leads` tab.
5. Submit the same email again; the site should show `You are already on the Reserve list.` and no duplicate row should be added.
