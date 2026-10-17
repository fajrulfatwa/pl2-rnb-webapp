# Checklist Deployment PL 2 UKM R’nB — 2026

## 1. Database (Supabase Free)

- [ ] Buat project Supabase.
- [ ] Jalankan `supabase/schema.sql` melalui SQL Editor.
- [ ] Jalankan `private/roster-seed.sql` (72 peserta dan 19 peminatan) secara privat.
- [ ] Jalankan `private/case-seed.sql` (19 soal pemaparan beserta standar jawaban) secara privat.
- [ ] Pastikan semua tabel public yang berisi data internal mengaktifkan RLS.
- [ ] Buat akun admin menggunakan Supabase Auth → Users.
- [ ] Jadikan akun pertama role `admin` dengan SQL pada README.
- [ ] Buat akun penguji, berikan akses peminatan di menu Penguji & akses.

## 2. Hosting (pilih satu)

**Vercel:**
- [ ] Push proyek ke GitHub, tanpa `private/*.sql` dan `.env`.
- [ ] Import repository di Vercel; preset Vite, output `dist`.
- [ ] Set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
- [ ] Pastikan ketentuan Vercel Hobby membolehkan jenis penggunaan.

**GitHub Pages:**
- [ ] Aktifkan GitHub Actions pada Pages.
- [ ] Atur dua variabel Actions pada Settings → Secrets and variables → Actions → Variables.
- [ ] Push ke `main` dan periksa workflow `Deploy Vite to Pages`.

## 3. Quality Assurance sebelum 26–31 Oktober 2026

- [ ] Coba login admin + 2 penguji pada browser terpisah.
- [ ] Periksa bahwa penguji A **tidak dapat membaca** skor penguji B.
- [ ] Isi dan submit penilaian simulasi untuk satu peserta, lalu hapus nilai simulasi di Supabase SQL Editor sebelum penilaian riil.
- [ ] Uji selisih nilai >10 poin → status *Perlu kalibrasi*, tidak masuk peringkat.
- [ ] Uji keputusan panel → rerata/override tercatat pada audit.
- [ ] Uji terlambat/absen → *Menunggu rapat*, baru jadi D jika keputusan sah.
- [ ] Uji feedback export tidak menampilkan nilai atau peringkat rahasia.
- [ ] Pastikan Realtime bekerja di dua tab.
- [ ] Uji tampilan di HP dan desktop.
- [ ] Lakukan backup/export rutin dari panel admin.

**Penting:** daftar peserta dan bank soal tidak boleh ditaruh di repository publik. File ZIP aslinya memuat keduanya dalam folder `private`, jadi simpan ZIP dengan akses terbatas.
