# Merchants that failed to categorize

Built from the Metro logs of 2026-11-04. Not read from the phone's database, so a merchant may have been
resolved by a later retry. Names are as the SMS parser read them.

## 1. Model unavailable (HTTP 503, then the app's 30 s cooldown) — retried automatically

These got no answer because the model server was busy or rate limited. They stay "Uncategorized for now"
and are retried when the model answers again (or when the app restarts).

| Merchant |
| --- |
| PUNJAB PHA |
| KINGS SWEETS AND BAKERSLahore |
| M S NAQSHBANO INTERN LAHORE PBPK |
| MART ZONE PAYSA Lahore |
| MART ZONE |
| FAISAL MOV |
| GOGA NAQIB |
| EURO 8 Lahore |
| REHMAT TRA |
| UMER CASH AND CARRY LAHORE PBPK |
| PRIME PHARMACY LAHORE PBPK |

## 2. Server answered "Unknown" (not classifiable)

| Merchant |
| --- |
| CHURN STAT |

## 3. No merchant in the SMS (nothing to classify)

| Sender | Message kind |
| --- | --- |
| 83863 | "You have withdrawn Rs. … from your Digitt Plus account via ATM" (ATM withdrawal; the server has no cash/ATM category) |
| 8079 | "PKR … has been debited at …" (bank debit alert without a merchant name) |

## 4. Failed earlier while the gateway returned 404 — may be resolved by now

Check these in the app; the retry of 12 rows resolved some of them.

| Merchant |
| --- |
| AL FAISAL RESTAURANT LAHORE PBPK |
| APEX FOOD SERVICES PRIVATE LIM JS-xxxBANK |
| TOTAL PARC |
| ARAMCO |
| EUROSTORER |
| UMER BAKER |
| M SHARJEEL UBL-xxx0488 (a transfer; stays Uncategorized on the server until re-synced) |
