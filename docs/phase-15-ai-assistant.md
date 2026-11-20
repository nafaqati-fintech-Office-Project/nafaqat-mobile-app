# Phase 15 – Personalized AI financial assistant (mobile, web, model service)

## In one paragraph
The Assistant tab (and the web's AI Assistant page) answers questions about the user's own money: spending on a
category or shop, top expenses, month comparisons, rising categories, budget status, savings rate, where to cut,
goal planning (for example a Dubai trip in a month) and general investing steps. **Our code computes every figure**
(the facts engine); the model only explains those figures in the user's language. When the model cannot be
reached (offline, limit reached, server not yet updated, every key exhausted) the app shows the facts engine's own
answer, so the assistant never goes dead.

## 1. How an answer is made

1. On the device, `loadAssistantData()` collects this month and the two before it (reports), the current budget,
   active goals and confirmed subscriptions. It is reused for 5 minutes.
2. `answerQuestion()` detects the intent (English and Arabic keywords) and computes the exact facts, for example
   "Spent at Starbucks in 2026-10: SAR 392.00 over 14 payments.", plus a fallback text and action buttons.
3. The app sends the question, the last 6 messages, a compact summary (`toContext()`: totals only, no ids, SMS
   text, card or account numbers, e-mail or username) and the facts to `POST /api/ai-service/assistant/chat`.
4. The server calls the model with strict rules: answer only from the data, copy figures exactly, say so when the
   data does not contain it, reply in the user's language, general investing guidance only with a disclaimer.
5. The reply is shown with up to 3 buttons (Edit budget, Add to *goal*, View subscriptions, View reports ...).
   A reply that came from the facts engine alone is marked "Answered from your data on this phone".

### Goal planning (the Dubai example)
Remaining = target − saved; days left until the target date; needed per day, per week and per 30 days.
Free cash flow = average net (income − spending) of the finished months. By the target date the usual surplus
adds up to `free × days / 30`; if that covers the remaining amount the goal is realistic, otherwise the gap is
closed with cuts (lifestyle categories trimmed by 25% and confirmed subscriptions, biggest saving first) until
the needed monthly saving is covered.

## 2. Model service (merchant_api_project)

| Part | What it does |
|---|---|
| `POST /assistant/chat` | Validates (question ≤ 500 chars, summary + facts ≤ 24 000 chars), checks a per-user daily cap, builds the prompt, returns `{ reply, actions, source }`. 400/413 for bad input, 429 when the user's cap is reached, 503 when no provider answered: the app then uses its fallback. |
| `assistant.py` | System prompt, prompt building, redaction of long digit runs and e-mails in the question and history, parsing of the optional `ACTIONS:` line (only known ids are kept). |
| Provider pool (`llm_response()`) | Tries **every key of every provider** in order until one answers. A key that is out of credit, rate limited or rejected (HTTP 400/401/402/403/429, or quota/billing errors) rests for an hour and the next key is used. Errors are logged as provider + status + reason only, never the key or the provider's text. Stops before the gateway's 30 s timeout. The categorizer and merchant extraction use the same pool. |
| Separate daily limits | `ASSISTANT_DAILY_CALL_LIMIT` (default 300) for the assistant, `GEMINI_DAILY_CALL_LIMIT` (default 100) stays the categorizer's own, so chatting can never stop categorization. |

### Adding keys or providers (no code change)
- More keys: `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, … `GEMINI_API_KEY_<n>` with no upper limit,
  or a comma-separated `GEMINI_API_KEYS`. The same for Groq: `GROQ_API_KEY`, `GROQ_API_KEY_2`, …
- Default order: all Gemini keys, then all Groq keys (`GROQ_MODEL`, default `llama-3.3-70b-versatile`).
- Another OpenAI-compatible provider: set `<NAME>_API_KEY` (and `_2`, `_3` …), `<NAME>_BASE_URL` and
  `<NAME>_MODEL`; it is tried after Groq and Gemini. `LLM_PROVIDER_ORDER=groq,gemini,<name>` changes the order.

### Settings
| Variable | Default | Meaning |
|---|---|---|
| `ASSISTANT_DAILY_CALL_LIMIT` | 300 | Model calls a day for the assistant, all users together |
| `ASSISTANT_USER_DAILY_LIMIT` | 40 | Messages a day per user (by the gateway's `X-User-Id`, hashed) |
| `LLM_KEY_COOLDOWN_SECONDS` | 3600 | How long a failed key rests |
| `LLM_TOTAL_DEADLINE_SECONDS` | 25 | Stop trying keys after this long |
| `LLM_PROVIDER_ORDER` | groq,gemini | Provider order |

## 3. Mobile

### New files
| Path | What it does |
|---|---|
| `src/features/assistant/types.ts` | Data, answer, action and message types |
| `src/features/assistant/assistantContext.ts` | Loads the data (sample goals in auth bypass) |
| `src/features/assistant/assistantSummary.ts` | The compact summary sent to the server |
| `src/features/assistant/assistantFacts.ts` | Facts engine: intents, figures, fallback text, goal plan, cuts |
| `src/features/assistant/assistantFacts.test.ts` | 25 tests, including the Dubai-goal maths |
| `src/features/assistant/assistantApi.ts` | Calls the chat endpoint; null means "use the fallback" |
| `src/features/assistant/assistantStore.ts` | Conversation (last 60 messages) and consent, per account (AsyncStorage) |
| `src/features/assistant/useAssistant.ts` | Ties it together |
| `src/features/assistant/ChatBubble.tsx`, `TypingIndicator.tsx` | UI |
| `src/features/goals/mock.ts` | Sample goals for auth bypass |

### Changed files
| Path | What changed |
|---|---|
| `src/app/(tabs)/assistant.tsx` | The chat screen: one-time privacy notice, bubbles, suggestion chips, typing indicator, action buttons, clear chat |
| `src/i18n/en.ts`, `src/i18n/ar.ts` | `assistant.*` strings (Arabic right-to-left follows the app's layout direction) |

## 4. Web (nafaqati-web)
The AI Assistant page now uses the same endpoint and the same rules: `assistantFacts.js` (port of the mobile
engine), `assistantData.js` (loads monthly comparison, expense rows, budget, goals, subscriptions),
`assistantShape.js` (normalising and summary), `assistantApi.js`, `useAssistant.js`, `ASSISTANT_TEXT` in
`constants/appText.js`, and 9 tests in `tests/assistantFacts.test.js`. History and consent are kept in the
browser's localStorage per account.

## 5. Voice input (microphone)
A mic button next to Send turns speech into text in the box; the user can edit it, and nothing is sent until they
press Send. Recognition follows the app language (`en-US` or `ar-SA`).

| Where | How |
|---|---|
| Phone | `expo-speech-recognition` (58.x for SDK 58): the phone's own speech service (Google on Android, Apple on iOS). Loaded only on use, so Expo Go and older dev builds simply hide the button. `src/features/assistant/useVoiceInput.ts`. |
| Web site | The browser's speech recognition (`SpeechRecognition` / `webkitSpeechRecognition`) in `useSpeechInput.js`. Chrome, Edge and Safari; hidden in Firefox and Brave. Needs HTTPS or localhost. |

- `app.json`: the `expo-speech-recognition` plugin with the microphone and speech-recognition permission texts,
  and `android.permission.RECORD_AUDIO`. **A new development build is needed** (`npx expo run:android` or
  `eas build --profile development`); the current build will not show the mic.
- Privacy: the audio goes to the phone's or browser's speech service (Google, Microsoft or Apple), never to our
  servers or AI keys. The consent notice says so.
- Urdu is not offered yet (the app has English and Arabic only).

## 6. Privacy and limits
- A one-time notice explains that a spending summary is processed to answer (PDPL). Nothing is sent before it is accepted.
- Investing answers are general (emergency fund first, then savings accounts or Sharia-compliant funds as types of
  options), never specific products, always with a disclaimer. Personalised investment advice may need a licence
  in Saudi Arabia and the UAE.
- Answers cover only what the apps hold; shop totals are partial in months with more than 500 payments.
- Voice input: see section 5.
- **The server change must be deployed** before the assistant can use a model; until then both apps answer from
  the facts engine.

## 7. Checks
- Mobile: `npx tsc --noEmit` clean, `npx expo lint` clean, `npx vitest run` 466 passed.
- Web: `npm test` 37 passed, `npm run build` OK, no lint findings in the new files.
- Model service: `tests/test_assistant.py` and `tests/test_key_fallback.py` 18 passed. Nine older tests in
  `test_gemini_fallback.py`, `test_harden_classifier.py`, `test_extract_merchant.py` and
  `test_historical_lookup.py` were already failing before this phase (they share the real
  `gemini_usage.sqlite3` answer cache).
