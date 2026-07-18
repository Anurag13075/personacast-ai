---
name: Groq model availability
description: Which models are accessible on this account's Groq API key and what they support.
---

## Rule
This Groq account has **no vision models**. All models reject `image_url` content (respond with "messages[0].content must be a string").

**Why:** The account is on a free or restricted tier. llama-4-scout-17b-16e-instruct, llama-4-maverick-17b-128e-instruct, and meta-llama/* vision variants all return 404 "model not found". openai/gpt-oss-120b and groq/compound-mini also reject image arrays.

**Available models (verified July 2026):**
- `whisper-large-v3` — audio transcription
- `whisper-large-v3-turbo` — audio transcription (faster)
- `llama-3.1-8b-instant` — text, fast
- `llama-3.3-70b-versatile` — text, best quality on this account
- `openai/gpt-oss-120b` — text only (no vision despite name)
- `openai/gpt-oss-20b` — text only
- `groq/compound`, `groq/compound-mini` — text only
- `qwen/qwen3.6-27b` — text

**How to apply:** Use `llama-3.3-70b-versatile` for reasoning tasks, `whisper-large-v3` for audio. Do not attempt image_url content with any model on this account.
