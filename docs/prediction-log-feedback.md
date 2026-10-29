# Prediction log and feedback loop

In short: every answer from the model server now has an id in its prediction log. When the user changes
a category, the app sends the change back with that id. A person then runs a review script that lists the
merchants many different users corrected the same way, and adds them to the model server's verified list.
Nothing changes for other users until that review.

## 1. How it flows
1. The app asks `/predict`. The server logs the answer in `prediction_logs.csv` with a new `prediction_id`
   and returns it. The app keeps it on the transaction (`prediction_id` column).
2. The user changes the category (Task 10). The feedback row now also keeps the `prediction_id`.
3. While signed in, the app sends the feedback to `POST /api/ai-service/feedback` (the gateway adds
   `X-User-Id`). Triggers: app start, back to the foreground, after a category change.
4. The model server writes it to `feedback_logs.csv` with a hash of the user id, never the id itself.
5. Someone runs `scripts/review_feedback.py` on the model server, checks the list, and runs it again with
   `--apply` to update `verified_merchants.csv`.

## 2. What is sent, and what stays on the phone
Sent only when all of these are true:
- money out (DEBIT) with a merchant name
- the old category came from a prediction: `model`, `llm` or `lookup`
- the old category is not `Person` or `Transfers`, and the new one is one of the model's 15 categories

Everything else stays on the phone (`synced = 2`): changes to the user's own choices (`user`, `rule`),
`fallback` rows (the model was never asked, so the name may be a person), income, and transfers.
Only the merchant name and the categories leave the phone: no amount, date, bank or SMS text.

`category_feedback.synced`: 0 = to send, 1 = sent, 2 = stays on the phone (also when the server refused it).
A failure with no reply, 401, 408, 429 or 5xx stops the run, and the rest is sent next time.

## 3. Model server (`merchant_api_project`)
| Change | What it does |
|---|---|
| `/predict` | Returns `prediction_id`; the log has a new `prediction_id` column (old logs get it added) |
| `POST /feedback` | Saves a correction. 401 without `X-User-Id`, 400/413 for a bad merchant, 422 for an unsupported category, a source that was not a prediction, or no change. 503 if it cannot be saved |
| `scripts/review_feedback.py` | Lists candidates and how often each prediction source was corrected; `--apply` writes them |

A candidate needs at least 3 different users (`--min-users`) and at least 80% of the users who corrected
that merchant (`--min-share`). Each user counts once per merchant, with their latest change.

## 4. Known gaps
- **A verified merchant is only used when the model is unsure** (below 70%). A merchant the model gets
  wrong *with* high confidence is not fixed by the verified list. Fixing those needs retraining on the
  feedback, or checking the verified list before the model.
- The model server trusts `X-User-Id`. That is safe only while it is reached through the gateway; anyone who
  can call it directly can pretend to be many users. The review step is the safety net.
- The app's own merchant list (`merchantLookup.json`) is built from a separate workbook, so reviewed
  feedback does not reach it.

## 5. Commands
```bash
npm test
npx tsc --noEmit
npx expo lint
# model server
venv/Scripts/python -m unittest discover tests
venv/Scripts/python scripts/review_feedback.py           # look
venv/Scripts/python scripts/review_feedback.py --apply   # write
```
