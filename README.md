# 🚀 Tender Validator

A modern full-stack web application built with **Next.js** and **Supabase** to manage projects and handle secure file uploads.

---

## 📌 Features

- ✅ **Create and manage projects** – Organize and track tender progress.
- 📁 **Supabase Storage** – Upload and manage files directly in the cloud.
- 🔐 **Secure Operations** – Server-side logic using the Supabase Service Role for protected actions.
- ⚡ **Next.js App Router** – High-performance UI with efficient routing and layouts.
- 🧩 **Modular API** – Dedicated server-side routes for backend business logic.

---

## 🏗️ Tech Stack

| Category     | Technology                  |
|--------------|-----------------------------|
| **Frontend** | Next.js (App Router), React |
| **Backend**  | Next.js API Routes          |
| **Database & Storage** | Supabase          |
| **Language** | TypeScript                  |

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/tender-validator.git
cd tender-validator
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **Important Security Notes:**
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.
- Ensure `.env.local` is added to your `.gitignore`.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---
