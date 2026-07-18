---
name: Receipt step — manual entry
description: Step 2 of the pipeline uses manual form input instead of vision/OCR; no image upload.
---

## Rule
Receipt analysis (Step 2) is manual entry — the user types vendor, total, date, and category in the form. The backend structures this instantly via `buildReceiptFromManual()` with no API call.

**Why:** No vision-capable models are available on the Groq account (no llama-4-scout/maverick). Gemini was removed. Tesseract was rejected. Manual entry was the chosen approach.

**How to apply:**
- Backend: `POST /api/expenses` accepts JSON body (not multipart). Fields: `transcript`, `receiptVendor`, `receiptTotal`, `receiptDate` (optional), `receiptCategory`, `policyNotes` (optional).
- `analyzeReceipt` function was removed; replaced by `buildReceiptFromManual()` in `artifacts/api-server/src/lib/groq-pipeline.ts`.
- Frontend: `artifacts/heva-ai/src/pages/expenses/New.tsx` — no file upload, manual receipt form with vendor/total/date/category fields. Submits as `application/json`.
- If vision is ever needed in future, the account needs a Groq plan with llama-4-scout or llama-4-maverick access.
