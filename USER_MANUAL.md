# Ludo Arena — User Manual

Welcome to **Ludo Arena** — the real-money 1v1 Ludo platform. This guide will walk you through every feature of the app.

---

## Getting Started

### Register
1. Go to the home page and click **Play Now** or navigate to `/register`
2. Enter your **name**, **mobile number**, and a **password**
3. If you have a referral code, enter it in the "Referral Code" field
4. Click **Create account**
5. You'll be logged in automatically

### Login
1. Navigate to `/login`
2. Enter your registered mobile number and password
3. Click **Sign in**
4. Your session is restored automatically even after closing the browser

---

## Your Wallet

### Wallet Types
| Wallet | Purpose |
|---|---|
| **Main Wallet** | Funded by deposits and refunds. Used to pay entry fees. |
| **Winning Wallet** | Funded by match winnings. Can only be withdrawn. |
| **Referral Wallet** | Funded by referral bonuses. Displayed for information. |

### Depositing Money
1. Go to **Wallet → Deposit** or click the "Deposit" button
2. Select an amount (₹10 to ₹10,000 per deposit)
3. Make a UPI payment to the platform UPI ID shown on screen
4. Enter your **UTR number** from the payment confirmation
5. Click **Submit deposit**
6. Wait for admin approval (typically within a few minutes)
7. Once approved, your Main Wallet is credited instantly

### Withdrawing Money
1. Go to **Wallet → Withdraw**
2. Enter the amount you want to withdraw (minimum ₹50)
3. Enter your **UPI ID** (e.g., `name@okaxis`)
4. Click **Request withdrawal**
5. Admin will process the transfer and mark it as approved
6. You'll receive funds in your UPI-linked bank account

> **Note**: Only Winning Wallet balance can be withdrawn. Main Wallet balance is used only for entry fees.

---

## Playing a Match

### Joining the Queue
1. From the Dashboard, select an entry fee table (e.g., ₹10, ₹50, ₹100)
2. Click **Join Table**
3. The entry fee is deducted immediately from your wallet (Main first, then Winning)
4. You'll enter the waiting room

### Waiting Room
- The waiting room shows your matchmaking status
- When another player joins the same fee table, the match begins automatically
- If no opponent is found within the timeout, you'll be refunded

### Game Screen
- **Board**: The classic Ludo board is shown in the center
- **Dice**: Click the dice on your turn to roll
- **Timer**: You have **20 seconds** per turn — if you don't act, your turn is skipped
- **Move Log**: Shows recent moves on the right panel

### Game Rules
- Each player has **4 tokens** starting in their home yard
- Roll **6** to spawn a token onto the board
- Roll **6** again and you get an extra turn
- Land on an opponent's token to **capture** it (sends them back to yard)
- **Safe cells** (highlighted) protect tokens from capture
- First player to move all 4 tokens to the **finish** wins!
- Rolling three consecutive sixes forfeits your turn

---

## Winning & Settlement

- The **winner** receives the prize pool automatically (both entry fees minus house commission)
- Prize is credited to the winner's **Winning Wallet** instantly
- The loser's entry fee is already deducted at join time
- If a player disconnects and doesn't reconnect within the timeout, they forfeit the match

---

## Referral Program

### How It Works
1. Go to **Referral** in the navigation
2. Copy your unique **referral code** or **referral link**
3. Share it with friends
4. When a friend registers using your code and plays a match, you earn a referral bonus
5. The bonus is credited to your **Referral Wallet**

### Referral Dashboard Shows
- Your referral code and link
- Total amount earned from referrals
- Number of friends who joined
- List of referred players

---

## Match History

Go to **History** to see all your past matches:
- Match ID and date
- Opponent name
- Entry fee paid
- Winner of the match
- Amount won (if you won)
- Filter by: All, Won, Lost, Cancelled

---

## Profile

Go to **Profile** to see:
- Your name and mobile number
- Account statistics (wins, losses, earnings)
- Account creation date

---

## Troubleshooting

### "Insufficient balance"
Your wallet balance is too low for the selected table. Deposit more funds.

### "Already in queue"
You are already waiting in a queue for this table. Wait for a match or check the waiting room.

### Deposit not credited
Deposits require admin approval. Please wait 5–15 minutes. If it doesn't appear after 30 minutes, contact support with your UTR number.

### Game disconnected
If you lose your connection during a game, the app will attempt to reconnect. The server holds your game state. If you reconnect within the timeout window (typically 30 seconds), the match resumes normally.

---

## Support

Contact us at **support@ludoarena.app** with:
- Your registered mobile number
- The issue you're facing
- Any transaction IDs or match IDs involved
