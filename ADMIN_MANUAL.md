# Ludo Arena — Admin Manual

## Access

Admin panel is available at: `/admin`  
Login with an account that has `role: ADMIN` in the database.

---

## Dashboard (Overview)

**URL**: `/admin`

Displays:
- **Pending Deposits** — deposits submitted by players awaiting admin approval
- **Pending Withdrawals** — player withdrawal requests awaiting admin processing
- **Live Tables** — active in-game matches (currently shows when connected to realtime)

All items refresh on page load. Use the individual sections for bulk management.

---

## Users

**URL**: `/admin/users`

- Displays a searchable list of all registered players
- Search by **name** or **mobile number**
- Shows: Name, mobile, join date, account status
- **Block** button (currently disabled; intended for future account suspension feature)

---

## Deposits

**URL**: `/admin/deposits`

Manage all pending player deposit requests.

### Workflow
1. Player submits a deposit with amount and UTR number
2. It appears here with status `PENDING`
3. Admin verifies UTR with payment provider
4. Click **Approve** → player's Main Wallet is credited instantly
5. Click **Reject** → deposit is declined, funds are not credited

### Table Columns
| Column | Description |
|---|---|
| Request ID | Internal deposit reference |
| Player | Name and mobile number |
| Amount | Rupee amount requested |
| UTR | UPI transfer reference number |
| Submitted | Date/time of request |
| Status | PENDING / APPROVED / REJECTED |
| Actions | Approve or Reject buttons |

---

## Withdrawals

**URL**: `/admin/withdrawals`

Manage all pending player withdrawal requests.

### Workflow
1. Player submits withdrawal request with amount and UPI ID
2. It appears here with status `PENDING`
3. Admin initiates UPI transfer to the player's UPI ID
4. Click **Approve** and enter the UTR number of the transfer
5. Click **Reject** with reason if the request is declined

### Table Columns
| Column | Description |
|---|---|
| Request ID | Internal withdrawal reference |
| Player | Name and UPI ID |
| Amount | Rupee amount to transfer |
| Submitted | Date/time of request |
| Status | PENDING / APPROVED / REJECTED |
| Actions | Approve / Reject |

> **Important**: Approval deducts from the player's Winning Wallet. Ensure the player has enough balance before approving.

---

## Wallet (Manual Adjustments)

**URL**: `/admin/wallet`

Allows admin to manually **credit** or **debit** any player's wallet.

### Credit
1. Enter Player ID (from Users section)
2. Select wallet type: Main, Winning, or Referral
3. Enter amount and reason
4. Click **Credit**

### Debit
1. Same as credit, but decrements balance
2. Will fail if the player has insufficient balance

> Use this for manual dispute resolutions, bonus credits, or corrections.

---

## Referral Configuration

**URL**: `/admin/referral`

- View the current referral reward amount
- Update the amount (applied to all future referrals immediately)
- Current config shows: reward amount per referred user who plays

### Updating Reward
1. Enter new reward amount in rupees
2. Click **Save**
3. All future referral rewards will use the new amount

---

## Reports

**URL**: `/admin/reports`

Currently shows platform summary charts. Charts are in place for:
- Revenue over time
- Deposit vs Withdrawal volume
- Active player trends

> Note: Data population requires backend analytics endpoints (planned for future sprint).

---

## Settings

**URL**: `/admin/settings`

Platform configuration panel. Currently shows:
- House commission rate
- Minimum/maximum entry fees
- Withdrawal processing windows

> These are display-only in the current build. Backend enforcement is already in the game engine.

---

## Audit Log

All admin actions (deposit approve/reject, withdrawal approve/reject, wallet adjustments) are written to the `audit_log` table in the database. This is backend-enforced and cannot be disabled.

---

## Security Notes

- Admin routes require `role: ADMIN` on the JWT
- All admin mutations are logged to the audit table with timestamp and actor
- Session expires after the JWT access token lifetime (configurable)
- Never share admin credentials — each admin should have their own account
