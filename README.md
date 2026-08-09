# Rintis - Stage 1 (3D Terrain Map & OSM Integration)

Rintis adalah *decision-support layer* untuk pendakian gunung di Indonesia, menampilkan peta 3D terrain, rute, dan waypoint penting secara interaktif. Proyek ini diorganisasikan sebagai monorepo yang memisahkan aplikasi frontend (Next.js) dan backend API (FastAPI).

## Tech Stack
* **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS)
* **Backend**: FastAPI (Python 3.11+)
* **Peta**: MapLibre GL JS & MapTiler Terrain RGB-DEM (exaggeration ~1.5, encoding terrarium)
* **Database**: Supabase (PostgreSQL)
* **Sumber Data**: OpenStreetMap (OSM) via Overpass API

---

## Folder Structure

```text
rintis/
├── .gitignore
├── README.md                           # Panduan setup & deployment ini
├── apps/
│   ├── api/                            # Backend API (FastAPI)
│   │   ├── app/
│   │   │   ├── main.py                 # Entry point & CORS
│   │   │   ├── config.py               # Konfigurasi environment (Pydantic)
│   │   │   ├── database.py             # Supabase Client
│   │   │   ├── routers/trails.py       # Endpoint Import & Get
│   │   │   └── services/overpass_client.py  # Query Overpass & parsing GeoJSON
│   │   ├── migrations/
│   │   │   └── 0001_init.sql           # Schema SQL Supabase
│   │   ├── .env.example
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── fly.toml
│   └── web/                            # Frontend App (Next.js)
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css         # Reset style & custom popup
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx            # Halaman Dashboard
│       │   └── components/
│       │       └── MapView.tsx         # Komponen Peta 3D MapLibre
│       ├── .env.local.example
│       ├── package.json
│       ├── tailwind.config.js
│       └── tsconfig.json
```

---

## Langkah Setup & Penggunaan Lokal

### 1. Inisialisasi Database (Supabase)
1. Buat proyek baru di [Supabase Dashboard](https://supabase.com/).
2. Buka menu **SQL Editor** pada dashboard Supabase Anda.
3. Jalankan SQL dari file `apps/api/migrations/0001_init.sql` untuk membuat tabel `trails` dan `waypoints`.
4. Jalankan SQL dari file `apps/api/migrations/0002_conditions.sql` untuk membuat tabel `condition_reports` dan `scrape_cache`.

### 2. Setup Backend API (`apps/api`)
1. Buka terminal baru dan masuk ke folder API:
   ```bash
   cd apps/api
   ```
2. Buat Python Virtual Environment dan aktifkan:
   * **Windows (PowerShell)**:
     ```powershell
     py -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependensi:
   ```bash
   pip install -r requirements.txt
   ```
4. Buat file `.env` dari `.env.example`:
   ```bash
   cp .env.example .env
   ```
5. Isi variabel environment di file `.env` dengan kredensial dari project Supabase, Firecrawl, dan Groq Anda:
   * `SUPABASE_URL`: API URL Supabase Anda.
   * `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key Supabase.
   * `FIRECRAWL_API_KEY`: API Key dari [Firecrawl](https://firecrawl.dev).
   * `GROQ_API_KEY`: API Key dari [Groq Console](https://console.groq.com).
6. Jalankan server backend lokal:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Server backend akan berjalan di `http://localhost:8000`.

### 3. Import Data Jalur Gunung dari OSM
Sebelum membuka frontend, Anda perlu memasukkan data jalur pendakian ke database. Anda dapat memanggil endpoint `/api/trails/import-osm` menggunakan cURL atau REST client (Postman/Thunder Client):

* **Endpoint**: `POST http://localhost:8000/api/trails/import-osm`
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "osm_relation_id": 17254443,
    "slug": "gunung-merbabu-selo",
    "name": "Gunung Merbabu via Selo",
    "region": "Jawa Tengah"
  }
  ```

*Contoh pemanggilan via cURL (PowerShell):*
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/trails/import-osm" -ContentType "application/json" -Body '{"osm_relation_id": 17254443, "slug": "gunung-merbabu-selo", "name": "Gunung Merbabu via Selo", "region": "Jawa Tengah"}'
```

Endpoint ini akan menarik jalur (LineString) dan secara otomatis mencari pos/camp/sumber air di sekitar jalur dalam radius 500 meter, lalu menyimpannya ke Supabase.

### 4. Import Laporan Kondisi (Scrape & LLM Pipeline - Stage 2)
Untuk mengisi laporan kondisi pendakian (misal cuaca, hazard, penutupan jalur) dari sumber artikel berita, postingan komunitas, atau pengumuman pemerintah, panggil endpoint berikut:

* **Endpoint**: `POST http://localhost:8000/api/trails/{slug}/condition-sources` (ganti `{slug}` dengan `gunung-merbabu-selo`)
* **Headers**: `Content-Type: application/json`
* **Body**:
  ```json
  {
    "urls": [
      "https://example.com/berita-merbabu-cuaca-buruk",
      "https://example.com/laporan-jalur-selo-longsor"
    ],
    "source_type": "established_media",
    "force_refresh": false
  }
  ```

*Pilihan `source_type`*: `official_govt` | `established_media` | `verified_community` | `individual_post`

Sistem akan otomatis meng-cache konten (tidak mengulang scrape dalam 24 jam kecuali `force_refresh: true`), memproses teks mentah menggunakan LLM Groq (`openai/gpt-oss-120b` dengan schema terstruktur), mencocokkan pos/waypoint secara fuzzy, menghitung confidence score, dan menyimpannya.

### 5. Setup Frontend Web (`apps/web`)
1. Buka terminal baru dan masuk ke folder web:
   ```bash
   cd apps/web
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env.local` dari `.env.local.example`:
   ```bash
   cp .env.local.example .env.local
   ```
4. Buka file `.env.local` dan masukkan kunci MapTiler API Key Anda:
   * `NEXT_PUBLIC_MAPTILER_KEY`: Dapatkan kunci gratis dengan mendaftar di [MapTiler Cloud](https://cloud.maptiler.com/).
   * *(Opsional)* Jika backend tidak menggunakan port default `8000`, tambahkan: `NEXT_PUBLIC_API_URL=http://localhost:your_port/api` (default bernilai `http://localhost:8000/api`).
5. Jalankan server frontend lokal:
   ```bash
   npm run dev
   ```
6. Buka browser Anda di `http://localhost:3000`. Peta 3D terrain akan memuat rute Gunung Merbabu berserta marker waypoint yang interaktif. Klik pos yang memiliki laporan kondisi untuk melihat ringkasan kondisi dan badge persentase confidence.

---

## Panduan Deployment Backend ke Fly.io

Deployment API backend dikelola menggunakan Fly.io sesuai dengan instruksi konfigurasi berkas `fly.toml` dan `Dockerfile` di folder `apps/api`. Eksekusi dilakukan secara manual menggunakan tool `flyctl`:

1. Pastikan Anda sudah menginstal `flyctl` dan login:
   ```bash
   flyctl auth login
   ```
2. Buka folder `apps/api`:
   ```bash
   cd apps/api
   ```
3. Inisialisasi aplikasi Fly.io (tanpa deploy langsung):
   ```bash
   fly launch --no-deploy
   ```
   *Ikuti petunjuk di terminal, beri nama aplikasi Anda (misal `rintis-api`) dan pilih region terdekat (misal `sin` - Singapura).*

4. Set environment secrets (kredensial Supabase, Firecrawl, & Groq) ke Fly.io:
   ```bash
   fly secrets set SUPABASE_URL="https://your-supabase-project.supabase.co" SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" FIRECRAWL_API_KEY="your-firecrawl-key" GROQ_API_KEY="your-groq-key"
   ```
5. Deploy aplikasi:
   ```bash
   fly deploy
   ```
6. Setelah deploy sukses, catat URL API produksi Anda (misal `https://rintis-api.fly.dev`) dan konfigurasikan variable `NEXT_PUBLIC_API_URL` di env frontend Next.js agar mengarah ke domain produksi tersebut.
