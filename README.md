# 🏦 EliteTrust Bank — Enterprise Digital Banking Platform

EliteTrust Bank is a production-grade, secure, and modern digital banking web application. It features a complete Spring Boot backend, a React client frontend, and database persistency, bundled with automated transaction validations, security protocols, and an administrative pipeline for bank employees and managers.

---

## 🚀 Tech Stack

### Backend
- **Core**: Java 17, Spring Boot 3
- **Security**: Spring Security (JWT tokens, Password Encryptions, MFA OTP triggers)
- **Database**: JPA / Hibernate, MySQL (with local in-memory fallback for caching)
- **Scheduling**: Spring Scheduled Tasks (Auto-debits, maturity checking, loan processing)
- **Monitoring**: Spring Boot Actuator, Prometheus metrics integration

### Frontend
- **Core**: React 18, Vite
- **Styling**: Modern Vanilla CSS (tailored HSL colors, sleek dark-theme cards, smooth micro-animations)
- **Icons**: Lucide React
- **HTTP Client**: Axios (configured with interceptors to capture OTP headers)

---

## 💎 Core Features

1. **🔐 Secure Authentication & MFA**:
   - JWT-based authentication (15-min Access Tokens, 7-day Refresh Tokens).
   - Multi-Factor Authentication (MFA) OTP codes required on login, registration, and password resets.
   - 3-strike login locking (account locks for 30 seconds after 3 failed attempts).
   - **Google OAuth Login**: Auto-registers new customers or logs in existing users seamlessly.

2. **📄 KYC Submission & Approvals Pipeline**:
   - Customers submit PAN Card, Aadhaar Card, and document uploads.
   - Bank Employees can review, approve, or reject KYC submissions via their portal.

3. **💳 Bank Accounts Management**:
   - Customers can apply for new Savings or Current accounts with Nominee details.
   - Auto-linked to the dashboard upon employee approval.

4. **💸 Transactions & Beneficiary Cooling Period**:
   - Inter-bank and intra-bank fund transfers.
   - **24h Cooling Period**: Newly added beneficiaries are capped at a ₹10,000 transfer limit for the first 24 hours to prevent immediate fraud.
   - **Maker-Checker Pipeline**: Single transactions exceeding ₹50,000 are flagged and require Manager approval before being executed.

5. **📱 UPI QR Payments**:
   - Register Virtual Payment Address (VPA/UPI ID).
   - Generate static/dynamic QR codes.
   - Pay via scanning QR codes or entering recipient VPA.

6. **🃏 Virtual Debit & Credit Cards**:
   - Instantly generate virtual Visa (Debit) or Mastercard (Credit) cards.
   - Freeze/unfreeze cards, update spending and daily withdrawal limits, change PINs, and toggle international usage.

7. **📈 Fixed Deposits (FD)**:
   - Book FDs with structured interest rates (6.5% - 8.0%) depending on tenure.
   - Auto-maturing cron scheduler.
   - Support for **premature closure** with a 1% interest penalty deduction.

8. **🏦 Lending Platform (Loans)**:
   - Check CIBIL credit scores locally (computed securely from PAN card hashes).
   - Estimate monthly payments using the built-in Loan EMI Calculator.
   - Submit personal, home, auto, or education loan applications.
   - Manager portal review pipeline with auto-disbursement of approved loan funds.

9. **📊 AI Spending Coach & Smart Insights**:
   - Local spending analysis by category (bill payments, transfers, cards).
   - Financial health suggestions based on balances and outflows.
   - Anomaly detection (flags transactions 3x higher than average or logins from untrusted device fingerprints).

10. **⏱️ Scheduled Transactions & Bill Payments**:
    - Pay utilities, recharges, and schedule recurring transfers (Daily, Weekly, Monthly).

---

## ⚡ Zero-Configuration Simulation (Free & Working)

To allow developers to run, test, and audit the application end-to-end for **free**, the system utilizes zero-cost local simulations for third-party integrations:
1. **Google OAuth**: If no `VITE_GOOGLE_CLIENT_ID` is set, the frontend renders `"Continue with Google (Simulated)"`. Clicking it bypasses external OAuth popups and auto-registers/logs in a simulated customer using the backend's developer OAuth fallback.
2. **Twilio SMS & Gmail SMTP**: If API credentials are left blank, both services automatically catch the exception and print the messages/OTPs directly to the backend terminal log.
3. **In-App Toast Alerts**: When the backend triggers an OTP code, it injects it into the response headers (`X-Simulated-OTP`). The frontend captures this and pops up a 15-second toast notification, meaning you can register and log in without looking at the terminal logs!

---

## 🛠️ How to Run Locally

### Prerequisites
- Java 17 JDK
- Node.js (v18+)
- MySQL Server (port 3306)

### 1. Database Setup
Create the database schema in your MySQL client:
```sql
CREATE DATABASE bank_database;
```

### 2. Run the Backend (Spring Boot)
Configure your MySQL credentials in `backend/src/main/resources/application.properties` (or set `DB_PASSWORD` environment variable), then execute:
```bash
cd backend
.\mvnw.cmd spring-boot:run
```
The server will start on port `9090`.

### 3. Run the Frontend (React Client)
Install the packages and launch the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
The client will open at `http://localhost:5173`.

---

## 🔑 Test Credentials (Default password: `Password@123`)

The database is seeded with these default user roles:

| Role | Mobile Number | Purpose |
| :--- | :--- | :--- |
| **Customer** | `9828267001` | Test accounts, cards, FDs, UPI, and transfers |
| **Employee** | `9828267002` | Approve KYC and Bank Account applications |
| **Manager** | `9828267003` | Review Maker-Checker transactions and disburse loans |
