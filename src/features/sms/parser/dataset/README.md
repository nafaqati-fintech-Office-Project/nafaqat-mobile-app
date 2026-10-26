# SMS parser test set

`samples.json` is the single test set for the parser. `evaluate.ts` scores it; `accuracy.test.ts` guards it.

## What is in it (400 samples, 27 of them negatives)

| source | count | what it is | how far to trust it |
|---|---|---|---|
| `email` | 17 | Real alert text from bank emails and app receipts; names and account numbers replaced. | Real wording, but email layout, not SMS. |
| `synthetic` | 77 | Written by hand: generic styles for PK/SA/AE, a batch of 31 from other banks (`fresh-1`), and negatives (OTPs, ads, declined, future charges). | Our guess at real formats. |
| `synthetic_variation` | 306 | A stratified sample of the 2,000-row Pakistani CSV, which is a variation of the 17 email templates. | Measures robustness to template variation only. Not independent. |
| `real` | 0 | Real SMS from real phones. | None yet: add them first. |

## What "accuracy" means here

- **Core accuracy**: a transaction counts as correct only if **type, amount and currency are all right**. This is the number to quote.
- **Merchant accuracy**: scored only when the sample states an expected merchant (`null` means "there should be none"). Description labels such as "Salary Credit" are not scored.
- **Date accuracy**: scored only when the text contains a date.
- **Negatives ignored**: share of OTPs, ads, failed payments and chat that the parser correctly ignores. A miss here is a false positive, a fake transaction in the user's books.
- **Missed**: a real transaction the parser returned nothing for.

## The rule that keeps the number honest

- `dev` samples may be used to tune the parser.
- `holdout` samples must not be looked at while fixing. Measure on them first, write the number down, then fix, then move them to `dev`.
- New real SMS always go into `holdout` first.

## History of measured holdout results

| date | batch | result on first run (before any fix) |
|---|---|---|
| 2026-10-26 | `fresh-1` (31 hand-written messages from 22 other banks and wallets, never run against the parser) | core 21/24 (88%), merchant 17/24 (71%), negatives ignored 6/7. 3 missed, 1 false positive. |

The 7 failures were fixed the same day (`against` as a merchant terminator, "paid via X to", "POS PURCHASE <merchant>", "used for/at", "transaction of ... made", ATM location is not a merchant, "I sent you" is chat). The batch was then moved to `dev`. Its earlier number is the honest one; the current number is flattering.

Current holdout is only the 48 CSV rows that hash to the holdout bucket. They share templates with `dev`, so they measure variation robustness, not generalization. **Real generalization is unmeasured until real Pakistani SMS arrive.**

## Commands

```
npx vitest run src/features/sms/parser/dataset        # regression guard
$env:REPORT='1'; npx vitest run scripts/accuracyReport.test.ts   # rewrite REPORT.txt
```

`REPORT.txt` has the per-source, per-split and per-bank breakdown and every failure.
