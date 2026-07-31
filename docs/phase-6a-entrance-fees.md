# Phase 6A.3: Entrance fees and payments

## Scope

This slice connects submitted admission applications to an auditable entrance-payment workflow.

- Owners and campus admins configure entrance form and entrance examination fees by campus and class.
- A submitted applicant first sees only the entrance form fee.
- The entrance examination fee is created and revealed only after the form fee is fully verified.
- Applicants submit bank-transfer or online-payment references for verification.
- School staff record cash, POS, transfer and manually confirmed online payments.
- Part payments are supported up to the outstanding charge balance.
- Verified payments receive campus/year sequenced receipt numbers.
- Applicants can print receipts or download PDF copies.
- Corrections use append-only payment reversals; posted charges and ledger entries are never edited or deleted.
- Both fees must be fully verified before the application moves to `AWAITING_EXAMINATION`.

A direct Paystack or Flutterwave integration is not included yet. `ONLINE` currently represents a provider reference that staff verifies, matching the existing Phase 3 manual-reconciliation boundary.

## Payment sequence

1. Applicant submits a complete application.
2. Applicant opens the payment stage.
3. The system snapshots the active form-fee schedule into an immutable applicant charge.
4. Applicant submits transfer/online details, or pays cash/POS at the school office.
5. Staff verifies or records the payment and the system issues a receipt.
6. When the form charge is settled, the system snapshots and reveals the exam charge.
7. When both charges are settled, application status becomes `AWAITING_EXAMINATION`.

## Database

The migration adds:

- `entrance_fee_schedules`
- `applicant_charges`
- `applicant_payments`
- `applicant_payment_reversals`
- `applicant_fee_ledger_entries`
- `applicant_receipt_sequences`

The models are declared in `prisma/entrance-payments.prisma` and registered as external tables in Prisma Config. Continue evolving them only through reviewed SQL migrations mirrored in that Prisma file.

## Financial controls

- Charge and ledger amounts use decimal columns and positive-amount constraints.
- Ledger signs are enforced: charges and reversals are positive; verified payments are negative.
- Charge, ledger and reversal records have database mutation guards.
- Payment verification requires a receipt number, verifier and verification timestamp.
- Cross-school, cross-campus, cross-application and schedule mismatches are rejected by database triggers.
- Duplicate form/exam charges and duplicate ledger postings are prevented by unique indexes.
- Overpayments are rejected after accounting for verified and pending payments.
- Receipt sequence gaps are acceptable; duplicate receipt numbers are not.

## Acceptance checks

- Configure both fee types for one Awka class and one Nnewi class.
- Confirm an applicant cannot see the exam fee before the form fee is settled.
- Submit a part transfer payment and verify it from the admin workspace.
- Confirm the balance reduces and a printable/PDF receipt is available.
- Complete the form fee and confirm the exam fee appears.
- Record a cash or POS exam payment and confirm status changes to `AWAITING_EXAMINATION` only when fully paid.
- Reverse one verified payment and confirm the balance and application status return to payment required.
- Confirm a campus admin cannot configure, verify or reverse another campus's records.
- Confirm posted charge/ledger/reversal records reject update and delete operations.
- Run `npm run check` before merge.
