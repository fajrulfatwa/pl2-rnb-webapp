# RnB Evaluation — Promotion Level 2 (2026)

**Aplikasi web React + Supabase untuk sistem penilaian GDO, GDB, GDD UKM Research 'n Business Universitas Diponegoro.** Aplikasi ini didasarkan pada workbook Matriks Penilaian PL2 V2.0, *Guidebook Promotion Level 2 Kabinet Lentera Cipta*, dan Buku Putih *Journey to the Bright Nation*.

> Status: **proyek siap dikonfigurasi dan dideploy**. Database Supabase, akun penguji, URL publik dan realtime produksi **belum dibuat** karena membutuhkan akun dan kredensial pemilik proyek. Source code dan skema disediakan; pengujian fungsi perhitungan tersedia (`npm test`).

## Fitur

- Login menggunakan Supabase Auth, peran **admin** dan **examiner**.
- **19 peminatan**: 2 GDO (President, Vice President), 3 GDB (HRD, R&D, Networking), dan 14 GDD (Manager/Vice Manager dari tujuh divisi).
- Impor awal **72 peserta** dari `Plottingan Kelompok.xlsx`; peminatan yang kosong tetap tersedia.
- Rubrik **11 kriteria dokumen (60%)** dan **5 kriteria pemaparan per jabatan (40%)**, dengan nilai 0–4 dan panduan penilaian.
- Draf penguji tersimpan di PostgreSQL; penilai lain tidak bisa membaca skor penguji pertama sebelum admin melakukan konsolidasi.
- Dua penguji independen atau satu penguji + moderator, ambang kalibrasi (default **10 poin**), keputusan panel, catatan alasan, dan audit database.
- Peringkat per peminatan (utama); peringkat global diberi label hanya informatif.
- Pengumpulan/kehadiran/izin dan kategori D administratif disahkan lewat keputusan panitia, bukan penalti ganda otomatis.
- Feedback per penguji, feedback final individu yang disetujui admin, dan feedback kelompok; ekspor feedback **tanpa skor rahasia**.
- Realtime Postgres Changes: layar memuat ulang data ketika ada perubahan yang terlihat berdasarkan kebijakan Row Level Security (RLS).
- Responsif di laptop maupun ponsel. CSV hasil rahasia hanya tersedia untuk admin.

## 1. Pilih hosting gratis

| Layanan | Kegunaan | Catatan |
|---|---|---|
| [Supabase Free](https://supabase.com/pricing) | PostgreSQL + Auth + Realtime | Pada Oktober 2026: database 500 MB, 50.000 MAU, realtime 2 juta pesan/bulan, 200 koneksi puncak. Project Free dapat dipause akibat aktivitas rendah sekitar 7 hari. |
| [Vercel Hobby](https://vercel.com/pricing) | Hosting front-end dan deploy via GitHub | Gratis khusus penggunaan **personal/non-komersial**; pastikan kegiatan organisasi memenuhi ketentuan plan sebelum memilihnya. |
| [GitHub Pages](https://docs.github.com/en/pages) | Hosting statis alternatif | Dapat memakai repository publik GitHub Free. Backend tetap Supabase. Ingat kode repo publik terlihat umum—**JANGAN commit file roster peserta.** |

Tidak diperlukan server VPS, server Node yang selalu menyala, atau WebSocket server buatan sendiri. Tidak perlu menyimpan API key yang bersifat rahasia di frontend.

## 2. Siapkan Supabase (sekitar 10–20 menit)

1. Buat proyek di https://supabase.com/dashboard . Simpan **Project URL** dan **publishable / anon key** di Project Settings → API Keys. **Jangan** gunakan `service_role` atau `secret` key pada browser.
2. Buka Supabase **SQL Editor** dan jalankan keseluruhan isi `supabase/schema.sql`. Ini membuat tabel, login profile trigger, seluruh kebijakan RLS, realtime, audit, dan pengaturan.
3. Buka berkas `private/roster-seed.sql` secara **lokal** lalu jalankan di SQL Editor (72 nama peserta, 19 kelompok). Setelah itu jalankan `private/case-seed.sql` yang berisi bank soal dan indikator jawabannya. **KEDUA file bersifat rahasia dan diabaikan `.gitignore`: jangan commit ke repository publik.** File di ZIP tetap memuatnya dan harus disimpan dengan akses terbatas.
4. Pada **Authentication → Users**, buat atau undang email administrator. Jika fitur e-mail invite mengalami rate limit, gunakan opsi pembuatan pengguna secara manual di Dashboard sesuai kebijakan akun Supabase.
5. Setelah akun administrator ada, jalankan SQL ini untuk menaikkan peran. **Ganti alamat email secara tepat**:

```sql
update public.profiles
set role = 'admin', display_name = 'Administrator PL2'
where id = (select id from auth.users where email = 'email-admin@contoh.com');
```

6. Untuk penguji lain, buat akun di Authentication → Users. Secara default profilnya berperan `examiner`, tanpa akses peminatan sampai admin memberi penugasan melalui menu **Penguji & akses**.
7. Buka Authentication → URL Configuration, masukkan URL website yang sudah dideploy ke **Site URL**, dan tambahkan domain Vercel/GitHub Pages ke daftar Redirect URLs jika menggunakan alur redirect auth. Aplikasi dasar ini menggunakan email dan password tanpa redirect OAuth.
8. **Penting:** uji dua akun penguji berbeda dan satu akun admin sebelum digunakan resmi; pastikan penguji A tidak dapat membaca hasil penilaian penguji B.

**Catatan keamanan:** Supabase anon/publishable key memang ditujukan untuk client-side, tetapi data dijaga oleh RLS (terpasang di `schema.sql`). Jangan pernah mematikan RLS pada tabel peserta, skor, maupun bank studi kasus. Untuk produksi, sebaiknya nonaktifkan self-signup publik bila semua akun dibuat oleh panitia.

## 3. Jalankan di komputer

Pasang Node.js **20.19+ atau 22+**, lalu:

```bash
npm install
cp .env.example .env
# edit .env menggunakan Project URL dan publishable key Supabase
npm run dev
```

Buka `http://localhost:5173`. Login dengan email/password akun yang diundang.

**Konfigurasi `.env`** (hanya 2 variabel frontend):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_your_key_here
```

`VITE_` membuat variabel dapat terlihat di browser; gunakan **hanya key publik**, tidak pernah key service/secret. `.env` otomatis diabaikan oleh Git.

## 4A. Deploy ke Vercel

1. Buat repository GitHub kosong lalu upload semua file proyek **kecuali** `private/roster-seed.sql`, `.env`, dan `node_modules`.
2. Buka Vercel → **Add New Project**, pilih repository tersebut.
3. Framework Preset: **Vite**; Build Command: `npm run build`; Output Directory: `dist`.
4. Settings → Environment Variables: isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (keduanya key yang bisa tersedia di frontend).
5. Deploy. Setelah selesai, perbarui Authentication URL Configuration di Supabase agar domain deployment dikenal bila memakai autentikasi yang memerlukan redirect.

> **Batas penggunaan:** Vercel Hobby diberikan untuk penggunaan personal/nonkomersial. Untuk situs kegiatan organisasi, verifikasi kelayakan menurut ketentuan Vercel. Alternatif gratis untuk frontend statis adalah GitHub Pages.

## 4B. Deploy ke GitHub Pages

Workflow disediakan di `.github/workflows/deploy-pages.yml`.

1. Push proyek (pastikan **seluruh `private/*.sql`** tidak ikut ter-push!).
2. Repository Settings → **Secrets and variables → Actions → Variables** (bukan Secrets, karena key ini bersifat public di frontend): tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
3. Repository Settings → **Pages**, pilih Source **GitHub Actions**.
4. Push branch `main`, tunggu workflow `Deploy Vite to Pages` berhasil. Website biasanya di `https://USERNAME.github.io/REPO/`.
5. Update URL konfigurasi pada Supabase bila memakai flow redirect. Vite menggunakan `GITHUB_PAGES_BASE` yang disetel workflow.

## 5. Alur penggunaan panitia

1. **Admin:** login → **Penguji & akses**. Tugaskan penguji 1 dan penguji 2 pada peminatan terkait.
2. **Penguji:** login → **Penilaian**, pilih peminatan dan peserta, beri skor 0–4 pada 11 indikator dokumen dan 5 indikator pemaparan, sertakan bukti, tulis feedback, lalu klik **Kirim nilai**. Tombol **Simpan draf** tersedia untuk skor yang belum selesai.
3. **Admin:** pantau Overview. Selisih nilai dua penguji yang lebih dari ambang otomatis diberi status **Perlu kalibrasi** dan tidak masuk pemeringkatan sampai keputusan panel dicatat.
4. **Admin:** halaman **Hasil & peringkat** → **Panel kalibrasi** untuk menyetujui rerata, menentukan skor konsensus dengan alasan, atau memvalidasi skema satu penguji + moderator.
5. **Admin:** verifikasi pengumpulan di tab **Administrasi** peserta. Untuk keterlambatan atau ketidakhadiran, masukkan kasus ke **Perlu keputusan rapat**; putusan izin/disahkan kategori D harus tercatat. Kasus administratif tidak masuk peringkat numerik.
6. **Admin:** gabungkan masukan para penguji pada **Feedback individual**, lengkapi feedback kelompok, lalu ekspor CSV tanpa skor untuk disampaikan kepada peserta.
7. **Admin:** periksa **Jejak audit** dan ekspor rekap internal sebelum hasil disahkan.

## 6. Cara hitung nilai

Bobot dari Guidebook: dokumen 60%, pemaparan 40%. Bobot 11 subkriteria berasal dari penguraian lima aspek dokumen pada workbook V2.0.

```text
Skor dokumen  = Σ ((Skor D01..D11 / 4) × bobot internal)
Skor pemaparan = Σ ((Skor P01..P05 / 4) × bobot per jabatan)
Nilai evaluator = (0,60 × Skor dokumen) + (0,40 × Skor pemaparan)
Nilai final      = rerata nilai dua evaluator yang selesai (atau keputusan panel)
A = 86–100 | B = 76–<86 | C = 61–<76 | D = <61
```

Dalam mode **single_moderator**, nilai tidak final sampai admin memilih keputusan **Validasi satu penguji + moderator**. Dalam mode dual, nilai selisih di atas ambang perlu kalibrasi. Keputusan panel yang sudah tercatat akan **dibatalkan otomatis di database** jika skor substansial evaluator direvisi.

**Catatan konsistensi Guidebook:** rentang nominal tercetak 76–85 dan 61–75. Karena nilai desimal didukung, aplikasi menggunakan 76 ≤ B < 86 serta 61 ≤ C < 76. Konfirmasi penanganan batas desimal dengan panitia jika ingin pembulatan sebelum kategori.

Nilai kategori **D administratif** dicatat sebagai status khusus tanpa mengarang skor numerik jika peserta tidak menjalani penilaian, serta tidak diperingkat. Penilaian grup adalah **rerata hasil individual yang sudah sah**, bukan unsur baru 60:40.

## 7. Pengujian, backup, dan keamanan

```bash
npm test       # pengujian aturan skor, 10 skenario; tidak butuh Supabase
npm run build  # perlu npm install
```

**Uji manual penting setelah deploy:**

- Akun yang belum ditugaskan tidak bisa melihat peserta peminatan lain.
- Penguji pertama tidak bisa membaca skor penguji kedua, termasuk via query Supabase client.
- Penguji tidak bisa mengubah role sendiri, status administratif, moderasi, atau hasil penguji lain.
- Perubahan skor dari tab browser A muncul pada tab browser B melalui realtime jika RLS mengizinkan.
- Skor tidak lengkap tidak memunculkan nilai akhir/peringkat; kalibrasi memblokir finalisasi.
- Admin memutus kategori D untuk kasus administrasi melalui rapat, dengan bukti alasan.
- UI dapat dibuka di laptop dan HP.

**Backup:** unduh export CSV rekap dari halaman Hasil & Peringkat dan export audit secara berkala. Untuk backup database lengkap gunakan ekspor resmi PostgreSQL/Supabase oleh admin; jangan menyimpan dump berisi nama dan nilai peserta pada repo publik. Supabase Free dapat menghentikan sementara proyek yang tidak cukup aktif dan tidak mencakup fitur backup setara tier berbayar.

**Privasi:** Supabase menyimpan PII nama peserta dan penilaian personal. Berikan akses minimal, gunakan undangan tertutup, hindari mengirimkan CSV nilai melalui grup umum, dan atur retensi data setelah program berakhir. Proteksi RLS perlu diuji sebelum aplikasi digunakan pada data peserta sesungguhnya.

## 8. Struktur folder

```text
src/App.jsx                 Tampilan seluruh modul dan operasi Supabase
src/styles.css              Antarmuka responsif
src/lib/scoring.js          Aturan pembobotan, kalibrasi, kategori, ranking
src/data/rubric.json        11+5 indikator dan 19 lingkup jabatan (tanpa PII atau bank soal)
supabase/schema.sql         Skema PostgreSQL, RLS, trigger audit & realtime
private/roster-seed.sql     72 nama peserta — RAHASIA, di-gitignore
private/case-seed.sql       19 bank studi kasus + kunci jawaban — RAHASIA, di-gitignore
.github/workflows/          Otomatis deploy ke GitHub Pages
vercel.json                 Konfigurasi hosting Vercel
tests/scoring.test.mjs       10 pengujian logika nilai
.env.example                Template konfigurasi publik
```

## Referensi

- Guidebook PL 2, halaman 2–9 (lampiran internal).
- Workbook *Matriks Penilaian PL2 UKM R’nB V2.0* (lampiran internal).
- Buku Putih *Journey to the Bright Nation* (lampiran internal).
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://vercel.com/legal/terms
- https://docs.github.com/en/pages
