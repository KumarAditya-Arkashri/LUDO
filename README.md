# Ludo Arena Pro

You are a Senior Full Stack Engineer, Senior UI/UX Designer, Product Architect, and System Designer.

Build a production-ready Progressive Web Application (PWA) called "Ludo Arena" (temporary name).

This is a Real-Time 2 Player Online Ludo Web Application.

IMPORTANT:

Do NOT build Android or iOS apps.

Only build a Responsive Web Application.

The project must follow enterprise-grade architecture and clean code principles.

Tech Stack

• Next.js 15 (App Router)

• TypeScript

• Tailwind CSS

• shadcn/ui

• Zustand

• React Query

• Socket.IO Client

• NestJS Backend Ready

• PostgreSQL Ready

• JWT Authentication

• Responsive Mobile First Design

------------------------------------------------

Pages Required

1. Landing Page

2. Login

3. Register

4. Dashboard

5. Wallet

6. Deposit

7. Withdraw

8. Referral

9. Match History

10. Profile

11. Waiting Room

12. Game Screen

13. Result Screen

------------------------------------------------

Admin Pages

Dashboard

Users

Wallet

Deposits

Withdrawals

Matches

Referral

Reports

Settings

------------------------------------------------

Authentication

Mobile Number

Password Login

JWT

Profile

------------------------------------------------

Wallet System

Main Wallet

Winning Wallet

Referral Wallet

Transaction History

------------------------------------------------

Deposit Flow

User clicks Deposit

↓

Show Admin QR Code

↓

User Pays

↓

User uploads payment screenshot OR enters UTR

↓

Deposit Status = Pending

↓

Admin verifies

↓

Wallet Credit

------------------------------------------------

Withdrawal Flow

User enters

UPI ID

Amount

↓

Submit

↓

Pending

↓

Admin approves

↓

Paid

↓

Store UTR

------------------------------------------------

Referral Flow

Every user gets

Unique Referral Code

Referral Link

Referral Wallet

Referral History

------------------------------------------------

Game Flow

Entry Fee

₹50

₹100

₹200

₹500

User joins room

↓

Waiting

↓

Second player joins

↓

Game Starts

↓

Winner

↓

Winning Wallet

------------------------------------------------

Ludo Rules

Only 2 Players

4 Tokens

Standard Ludo Rules

Six = Extra Turn

Token Kill

Safe Cells

Home Entry

Winner Detection

Turn Timer

Server decides every move

Frontend only renders game state

------------------------------------------------

Socket Events

Join Room

Leave Room

Game Start

Roll Dice

Move Token

Turn Change

Winner

Game End

------------------------------------------------

Match History

Entry Fee

Opponent

Winner

Amount Won

Date

------------------------------------------------

Dashboard

Wallet

Winning Wallet

Referral Wallet

Current Matches

Recent Games

------------------------------------------------

UI Design

Premium

Modern

Dark Theme

Gaming Theme

Smooth Animations

Glassmorphism

Responsive

No unnecessary gradients

Professional Dashboard

------------------------------------------------

Do NOT build

Tournament

AI Bot

Voice Chat

Replay

Leaderboard

4 Player Mode

Multiple Game Modes

------------------------------------------------

Generate complete project structure.

Generate reusable components.

Generate beautiful responsive UI.

Generate clean folder structure.

Do NOT generate backend implementation yet.

Only create frontend architecture and screens.

Everything must be production quality.



## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
