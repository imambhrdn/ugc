
## `project_requirements_document.md`

```markdown
# 1. Dokumen Kebutuhan Proyek (Project Requirements Document)

## 1.1 Pendahuluan

Dokumen ini menguraikan kebutuhan fungsional dan non-fungsional untuk platform Generasi AI (selanjutnya disebut "Aplikasi"). Aplikasi ini bertujuan untuk menyediakan layanan AI generatif (Teks-ke-Teks, Teks-ke-Gambar, Teks-ke-Video) kepada pengguna terdaftar melalui arsitektur web modern.

## 1.2 Tujuan Proyek

* Membangun aplikasi web full-stack yang aman, skalabel, dan responsif.
* Menyediakan antarmuka yang intuitif bagi pengguna untuk membuat konten AI.
* Mengimplementasikan sistem autentikasi yang aman menggunakan Clerk.
* Menggunakan Supabase murni sebagai database Postgres untuk menyimpan data pengguna dan hasil generasi.
* Mengintegrasikan API eksternal (Kie.ai) untuk pemrosesan AI secara asinkron.
* Menerapkan sistem kredit untuk memonetisasi atau mengatur penggunaan fitur.

## 1.3 Target Pengguna

* Kreator konten yang membutuhkan materi visual (gambar/video).
* Penulis atau pemasar yang membutuhkan bantuan pembuatan prompt (Teks-ke-Teks).
* Pengembang atau hobiis yang tertarik untuk bereksperimen dengan teknologi AI generatif.

## 1.4 Tumpukan Teknologi (Tech Stack)

* **Framework:** Next.js (App Router)
* **Autentikasi:** Clerk
* **Database:** Supabase (Postgres)
* **UI/Styling:** shadcn/ui & Tailwind CSS
* **API Generatif:** Kie.ai
* **Deployment:** Vercel

## 1.5 Kebutuhan Fungsional (Functional Requirements)

### 1.5.1 Autentikasi Pengguna (via Clerk)
* Pengguna harus dapat mendaftar (`sign-up`) menggunakan email/password atau penyedia OAuth (Google, dll.).
* Pengguna harus dapat masuk (`sign-in`) dan keluar (`sign-out`).
* Pengguna harus dapat mengelola profil mereka (misal: ganti nama, foto profil).
* Rute aplikasi tertentu (misal: `/dashboard`) harus dilindungi dan hanya dapat diakses oleh pengguna yang sudah login.

### 1.5.2 Sinkronisasi Database
* Saat pengguna baru berhasil mendaftar di Clerk, data mereka (Clerk ID, email) harus secara otomatis disinkronkan ke tabel `profiles` di Supabase.
* Setiap pengguna baru di tabel `profiles` harus menerima alokasi kredit awal (misal: 20 kredit).

### 1.5.3 Fitur Generasi AI (Asinkron)
* Pengguna harus dapat memasukkan *prompt* teks.
* Pengguna harus dapat memilih tipe generasi:
    1.  Penyempurnaan Prompt (Teks-ke-Teks)
    2.  Generasi Gambar (Teks-ke-Gambar)
    3.  Generasi Video (Teks-ke-Video)
* Saat mengirimkan permintaan, aplikasi harus menangani proses secara asinkron (pengguna tidak perlu menunggu).
* Aplikasi harus melakukan *polling* untuk memeriksa status pekerjaan dan menampilkan hasilnya (gambar/video/teks) setelah selesai.

### 1.5.4 Manajemen Kredit
* Setiap tindakan generasi AI (misal: generasi gambar) harus mengurangi saldo kredit pengguna.
* Pengguna harus dapat melihat sisa kredit mereka (misal: di sidebar atau halaman profil).
* Pengguna dengan kredit 0 tidak dapat melakukan generasi.

### 1.5.5 Riwayat Generasi
* Pengguna harus dapat melihat riwayat dari semua generasi yang telah mereka buat di halaman terpisah (misal: `/history`).
* Riwayat harus menampilkan prompt, tipe, status, dan hasil (jika sudah selesai).

## 1.6 Kebutuhan Non-Fungsional

* **Keamanan:**
    * Koneksi ke API Kie.ai dan Supabase harus diamankan menggunakan *environment variables*.
    * API Route harus memvalidasi bahwa pengguna yang diautentikasi hanya dapat mengakses data mereka sendiri.
* **Performa:**
    * Waktu muat halaman awal harus cepat (dibantu oleh Next.js).
    * Proses *polling* status tidak boleh membebani server atau klien secara berlebihan.
* **UI/UX:**
    * Desain harus bersih, modern, dan intuitif (mengikuti prinsip shadcn/ui).
    * Aplikasi harus responsif penuh (berfungsi di desktop dan seluler).
```

-----

## `app_flow_document.md`

```markdown
# 2. Dokumen Alur Aplikasi (App Flow Document)

Dokumen ini merinci alur interaksi pengguna dan sistem di dalam aplikasi, dengan fokus pada proses autentikasi dan alur generasi AI.

## 2.1 Alur Autentikasi & Sinkronisasi Pengguna

Ini adalah alur kritis yang menghubungkan Clerk (Auth) dengan Supabase (DB).

1.  **Pendaftaran (Sign-up):**
    * Pengguna mengunjungi rute `/sign-up` (disediakan oleh Clerk).
    * Pengguna mendaftar. Clerk berhasil membuat entitas pengguna di *database Clerk*.
    * Clerk **mengirimkan webhook** `user.created` ke endpoint backend kita: `POST /api/webhooks/clerk`.
    * *Handler* webhook di `route.ts` menerima data (termasuk `clerk_id` dan `email`).
    * Backend **menjalankan `INSERT`** ke tabel `profiles` di Supabase, menyimpan `clerk_id`, `email`, dan `credits` (default).
    * **Hasil:** Pengguna ada di Clerk (untuk login) dan di Supabase (untuk data aplikasi).

2.  **Masuk (Sign-in):**
    * Pengguna mengunjungi rute `/sign-in` (disediakan oleh Clerk).
    * Clerk menangani proses login dan membuat sesi (cookie).
    * `middleware.ts` mengenali sesi dan mengizinkan akses ke rute yang dilindungi (misal: `/dashboard`).

3.  **Akses Rute Terproteksi:**
    * Pengguna mencoba mengakses `/dashboard`.
    * `middleware.ts` mencegat permintaan.
    * Jika tidak ada sesi (tidak login), pengguna dialihkan ke `/sign-in`.
    * Jika ada sesi, pengguna diizinkan masuk.
    * Di *server-side* (Server Component atau API Route), `auth()` dari `@clerk/nextjs/server` digunakan untuk mengambil `userId` (Clerk ID) dari sesi.

## 2.2 Alur Inti: Generasi AI Asinkron (Polling)

Ini adalah alur "Pull Request" (Submit) dan "Get" (Polling) yang diminta.

1.  **Tahap 1: Submit Pekerjaan (Client -> Server)**
    * Pengguna (di `/dashboard`) mengisi *prompt* dan tipe (misal: "image"), lalu menekan "Generate".
    * UI Client mengirimkan `POST /api/generate` dengan *body*: `{ "prompt": "...", "type": "image" }`.
    * Aplikasi menampilkan *loading spinner* atau status "processing...".

2.  **Tahap 2: Proses Backend Awal (Server -> DB -> Kie.ai)**
    * API Route `POST /api/generate` menerima permintaan.
    * **Validasi 1 (Auth):** Memanggil `auth()` untuk mendapatkan `userId` (Clerk ID). Jika tidak ada, kembalikan error 401.
    * **Validasi 2 (Kredit):** Memeriksa tabel `profiles` di Supabase (`SELECT credits WHERE clerk_id = userId`). Jika kredit <= 0, kembalikan error 402.
    * **Submit API Eksternal:** Mengirim *prompt* ke API Kie.ai (`POST /v1/jobs/...`).
    * Kie.ai merespons **segera** dengan `job_id_external`.
    * **Transaksi DB:**
        1.  `INSERT` ke tabel `generations` (mencatat `user_id`, `prompt`, `type`, `job_id_external`, dan status `pending`). Ambil `id` (UUID internal) dari *job* ini.
        2.  `UPDATE` tabel `profiles` (mengurangi kredit: `credits = credits - 1 WHERE clerk_id = userId`).
    * Backend merespons ke Client dengan ID job internal: `Response.json({ internal_job_id: "..." })`.

3.  **Tahap 3: Polling Status (Client <-> Server <-> Kie.ai)**
    * Client (UI), setelah menerima `internal_job_id`, memulai *polling* (misal: setiap 3 detik) ke `GET /api/status/[internal_job_id]`.
    * API Route `GET /api/status/[jobId]` menerima permintaan.
    * **Validasi (Auth):** Memanggil `auth()` untuk mendapatkan `userId`.
    * **Cek DB Internal:** Mengambil data *job* dari Supabase (`SELECT * FROM generations WHERE id = [jobId] AND user_id = userId`). Ini juga memastikan pengguna hanya bisa mengecek *job* miliknya.
    * **Cek Status:**
        * **Jika status di DB adalah `completed`:** Langsung kembalikan `Response.json({ status: 'completed', url: job.result_url })`. **Polling berhenti.**
        * **Jika status di DB adalah `pending` atau `processing`:**
            1.  Ambil `job.job_id_external`.
            2.  Panggil API Kie.ai: `GET /v1/jobs/[job_id_external]`.
            3.  **Jika Kie.ai merespons `processing`:** Kembalikan `Response.json({ status: 'processing' })`. Client lanjut *polling*.
            4.  **Jika Kie.ai merespons `failed`:** Update DB Supabase (`status = 'failed'`). Kembalikan `Response.json({ status: 'failed' })`. **Polling berhenti.**
            5.  **Jika Kie.ai merespons `completed`:**
                * Ambil `result_url` dari respon Kie.ai.
                * Update DB Supabase (`status = 'completed'`, `result_url = '...'`).
                * Kembalikan `Response.json({ status: 'completed', url: '...' })`. **Polling berhenti.**

4.  **Tahap 4: Tampilkan Hasil (Client)**
    * *Hook* *polling* (misal: `react-query` atau `SWR`) menerima data `status: 'completed'`.
    * UI Client menyembunyikan *loading spinner* dan menampilkan gambar/video dari `result_url`.
```

-----

## `frontend_guideline_document.md`

```markdown
# 3. Panduan Frontend (Frontend Guideline Document)

Dokumen ini menetapkan standar dan praktik terbaik untuk pengembangan antarmuka (Frontend) aplikasi.

## 3.1 Tumpukan Teknologi Frontend

* **Framework:** Next.js (App Router)
* **Bahasa:** TypeScript
* **UI Library:** shadcn/ui
* **Styling:** Tailwind CSS
* **Manajemen State (Fetch):** SWR atau React Query (Sangat direkomendasikan untuk *polling*).
* **Formulir:** React Hook Form (dengan resolver Zod).

## 3.2 Struktur Direktori

Struktur direktori utama mengikuti standar Next.js App Router.

```

/app/
├── (auth)/             \# Rute publik untuk autentikasi (grup rute)
│   ├── sign-in/
│   └── sign-up/
├── (app)/              \# Rute terproteksi (grup rute)
│   ├── dashboard/      \# Halaman utama generasi
│   ├── history/        \# Halaman riwayat
│   └── layout.tsx      \# Layout untuk rute terproteksi (termasuk Sidebar)
├── api/                \# API Routes (Backend)
└── layout.tsx          \# Root layout (termasuk \<ClerkProvider\>)
/components/
├── ui/                 \# Komponen shadcn/ui (dihasilkan oleh CLI)
├── shared/             \# Komponen yang digunakan di banyak tempat (Navbar, Sidebar)
└── features/           \# Komponen spesifik untuk fitur (PromptForm, ResultDisplay)
/lib/
├── supabase.ts         \# Inisialisasi Supabase client (browser-safe key)
├── utils.ts            \# Fungsi utilitas (termasuk `cn` dari shadcn)
└── types.ts            \# Definisi tipe TypeScript (Profile, Generation)

```

## 3.3 Pedoman Penggunaan Komponen

### 3.3.1 shadcn/ui
* **Filosofi:** shadcn/ui BUKAN library komponen biasa. Ini adalah koleksi komponen yang dapat Anda salin-tempel.
* **Instalasi:** Gunakan CLI `npx shadcn-ui@latest add [component-name]`.
* **Kustomisasi:** Komponen akan muncul di `/components/ui`. Anda **didorong** untuk memodifikasi file-file ini sesuai kebutuhan branding. JANGAN mengimpor langsung dari `shadcn-ui`.
* **Komposisi:** Buat komponen yang lebih kompleks (misal: `PromptForm.tsx`) dengan menggabungkan komponen shadcn (misal: `Input`, `Button`, `Select`).

### 3.3.2 Komponen Clerk
* Gunakan komponen Clerk untuk fungsionalitas UI autentikasi:
    * `<UserButton />`: Untuk avatar pengguna dan menu *dropdown* (termasuk link "Sign Out").
    * `<SignIn />`: Gunakan di `app/(auth)/sign-in/page.tsx`.
    * `<SignUp />`: Gunakan di `app/(auth)/sign-up/page.tsx`.

## 3.4 Manajemen State

* **State Lokal UI:** Gunakan `useState` dan `useReducer` untuk state sederhana (misal: *toggle* modal, *input* formulir).
* **State Formulir:** Gunakan **React Hook Form** dengan **Zod** untuk validasi skema.
* **State Server (Fetch/Cache):** Gunakan **SWR** atau **React Query**.
    * Ini sangat penting untuk alur *polling* `GET /api/status/[jobId]`.
    * Konfigurasikan *hook* untuk melakukan *refetch* secara berkala (`refreshInterval: 3000`) dan berhenti (`revalidateOnFocus: false`) ketika status `completed` atau `failed`.

## 3.5 Aturan Styling
* **Utamakan Utilitas:** Selalu gunakan kelas utilitas Tailwind (`className="..."`) terlebih dahulu.
* **CSS Kustom:** Hanya gunakan file CSS (`globals.css`) untuk *base styles* (font, variabel CSS) atau *layout* yang sangat kompleks.
* **`cn` Utility:** Selalu gunakan fungsi `cn` (dari `/lib/utils.ts`) saat menggabungkan kelas Tailwind, terutama untuk *props* komponen.
```

-----

## `backend_structure_document.md`

````markdown
# 4. Dokumen Struktur Backend (Backend Structure Document)

Dokumen ini merinci arsitektur sisi server (backend) yang dibangun menggunakan Next.js API Routes, Clerk, dan Supabase.

## 4.1 Tumpukan Teknologi Backend

* **Runtime:** Next.js API Routes (Serverless Functions di Vercel)
* **Autentikasi:** Clerk (Validasi via `middleware.ts` dan `auth()` di API Route)
* **Database:** Supabase (Postgres)
* **Klien DB:** `supabase-js`
* **API Eksternal:** Kie.ai

## 4.2 Endpoint API (API Routes)

Lokasi: `/app/api/`

### 1. `POST /api/webhooks/clerk`
* **Tujuan:** Menerima *event* dari Clerk (terutama `user.created`).
* **Proteksi:** Verifikasi *signature* webhook menggunakan `Webhook` dari `svix`.
* **Logika:**
    1.  Validasi *request* berasal dari Clerk.
    2.  Jika `event.type === 'user.created'`:
    3.  Ekstrak `id` (Clerk ID) dan `email`.
    4.  `INSERT` data ke tabel `profiles` di Supabase.
* **Penting:** Endpoint ini HARUS publik, tetapi terproteksi oleh verifikasi *signature*.

### 2. `POST /api/generate`
* **Tujuan:** Memulai *job* generasi AI baru.
* **Proteksi:** Wajib autentikasi (Clerk).
* **Logika:**
    1.  Panggil `auth()` untuk mendapatkan `userId` (Clerk ID). Jika tidak ada, kembalikan 401.
    2.  Ambil *body* (prompt, type).
    3.  Panggil Supabase (dengan *Service Key*) untuk memeriksa kredit (`SELECT credits FROM profiles...`). Jika kredit 0, kembalikan 402.
    4.  Panggil API Kie.ai (`POST /v1/jobs/...`) untuk memulai *job*.
    5.  Terima `job_id_external` dari Kie.ai.
    6.  Jalankan transaksi DB:
        * `INSERT` ke `generations` (status `pending`, `job_id_external`).
        * `UPDATE` `profiles` (kurangi kredit).
    7.  Kembalikan `internal_job_id` (dari tabel `generations`) ke client.

### 3. `GET /api/status/[jobId]`
* **Tujuan:** Melakukan *polling* status *job* yang sedang berjalan.
* **Proteksi:** Wajib autentikasi (Clerk).
* **Logika:**
    1.  Panggil `auth()` untuk mendapatkan `userId`.
    2.  Ambil `[jobId]` (UUID internal) dari URL.
    3.  Panggil Supabase: `SELECT * FROM generations WHERE id = [jobId] AND user_id = userId`. (Kritis untuk keamanan).
    4.  Jika *job* tidak ditemukan atau bukan milik pengguna, kembalikan 404.
    5.  Jika `status === 'completed'`, kembalikan data.
    6.  Jika `status === 'pending'/'processing'`:
        * Panggil API Kie.ai (`GET /v1/jobs/[job_id_external]`).
        * Jika Kie.ai selesai, update DB (`status = 'completed'`, `result_url = ...`).
        * Kembalikan status terbaru ke client.

## 4.3 Interaksi Database (Supabase)

* **Koneksi Backend:** Di API Routes, Supabase client HARUS diinisialisasi menggunakan **Service Role Key** (`process.env.SUPABASE_SERVICE_KEY`).
* **Keamanan (RLS):** Karena kita menggunakan *Service Key* di backend, **Row Level Security (RLS) TIDAK DIGUNAKAN** untuk tabel `profiles` dan `generations`.
* **Prinsip Keamanan:** Keamanan data (memastikan pengguna A tidak bisa melihat data pengguna B) **diterapkan di level API Route**, dengan secara manual menambahkan klausa `WHERE user_id = [userIdDariClerk]` pada setiap *query* `SELECT`, `UPDATE`, atau `DELETE`.

## 4.4 Skema Database

Definisi tipe dan tabel utama (dijalankan di Supabase SQL Editor).

```sql
-- Tipe Kustom (ENUM)
CREATE TYPE public.generation_type AS ENUM ('text_to_prompt', 'image', 'video');
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Tabel 1: Profiles
CREATE TABLE public.profiles (
    clerk_id TEXT NOT NULL PRIMARY KEY, -- ID dari Clerk (bukan UUID)
    email TEXT,
    credits INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel 2: Generations
CREATE TABLE public.generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID internal
    user_id TEXT NOT NULL REFERENCES public.profiles(clerk_id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    type public.generation_type NOT NULL,
    status public.job_status NOT NULL DEFAULT 'pending',
    job_id_external TEXT, -- ID dari Kie.ai
    result_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks untuk query yang lebih cepat
CREATE INDEX idx_generations_user_id ON public.generations(user_id);
````

```
```