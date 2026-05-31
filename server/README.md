# Loan App — Guest Flow (Compat Layer)

ไฟล์ชุดนี้ **เพิ่มเข้าไปใน project ที่มีอยู่** โดยไม่แตะ schema เดิม (lender_id / borrower_id)

## ไฟล์ที่ต้องเพิ่ม / แทนที่

| ไฟล์ | Action |
|------|--------|
| `database/migrations/2026_05_28_000001_*` | ADD — guest_token + group_id ใน loans |
| `database/migrations/2026_05_28_000002_*` | ADD — groups + group_members |
| `database/migrations/2026_05_28_000003_*` | ADD — loan_proofs |
| `database/migrations/2026_05_28_000004_*` | ADD — proof_url + confirmation_status ใน loan_payments |
| `app/Models/Loan.php` | REPLACE — เพิ่ม group, proofs, guest helpers |
| `app/Models/LoanPayment.php` | REPLACE — เพิ่ม confirmation_status, proofs, confirm/reject |
| `app/Models/LoanProof.php` | ADD |
| `app/Models/Group.php` | ADD |
| `app/Models/GroupMember.php` | ADD |
| `app/Http/Middleware/ValidGuestToken.php` | REPLACE — fix namespace |
| `app/Http/Controllers/Api/LoanController.php` | ADD — guest-link + confirm/reject |
| `app/Http/Controllers/Api/GuestLoanController.php` | ADD |
| `routes/api.php` | REPLACE — merge routes ทั้งหมด |
| `bootstrap/app.php` | REPLACE — register middleware alias |

## Run

```bash
php artisan migrate
php artisan storage:link   # สำหรับ public disk (สลิปไฟล์)
```

## Flow ทั้งหมด

```
1. เจ้าหนี้ login ด้วย LINE
2. POST /api/loans  →  { loan, guest_link: "/api/guest/{token}/loan" }
3. ส่ง guest_link ให้ลูกหนี้ (LINE, SMS, ฯลฯ)

4. ลูกหนี้เปิด link (ไม่ต้อง login):
   GET  /api/guest/{token}/loan   →  ดูยอดหนี้ + ประวัติ
   POST /api/guest/{token}/pay    →  แจ้งจ่าย + สลิป
                                     payment.confirmation_status = 'pending'

5. เจ้าหนี้เห็น pending notification:
   GET  /api/pending-confirmations
   GET  /api/loans/{loan}/payments/pending

6. เจ้าหนี้ confirm/reject:
   POST /api/loans/{loan}/payments/{payment}/confirm
     → LoanPayment::booted() → loan.recalculate() → remaining_amount อัปเดต
   POST /api/loans/{loan}/payments/{payment}/reject
```

## backward_compat

- `loan_payments` เดิมไม่มี `confirmation_status` → migration ใช้ `default('confirmed')`
  ดังนั้น record เก่าทั้งหมดถือว่า confirmed อัตโนมัติ ไม่กระทบ remaining_amount
- `LoanPayment::booted()` ใหม่จะ recalculate เฉพาะเมื่อ `confirmation_status = 'confirmed'`
  หรือเมื่อ status เปลี่ยน → backward safe
