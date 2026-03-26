# Tutorial Alur Aplikasi Tukang Go

Dokumen ini dibuat untuk membantu presentasi ke client tentang bagaimana aplikasi Tukang Go berjalan dari sisi:

- Admin Dashboard (web)
- Client App (mobile)
- Partner App / Mitra (mobile)

## 1. Gambaran Besar Sistem

Tukang Go mempertemukan client yang butuh jasa dengan partner/mitra yang siap bekerja.

Aktor utama:

- Admin: mengelola akun partner, verifikasi, layanan, dan monitoring.
- Client: memilih layanan, membuat order, tracking progress, melakukan pembayaran, dan memberi ulasan.
- Partner: online/offline, menerima order, menjalankan pekerjaan, update status hingga selesai.

## 2. Alur Admin: Membuat dan Mengelola Partner

### 2.1 Membuat akun partner dari Admin Dashboard

1. Admin login ke dashboard.
2. Masuk ke menu Partners.
3. Klik Add Partner.
4. Isi data partner: nama, email, telepon, status aktif, status verifikasi.
5. Sistem membuat akun auth partner dan profile partner.
6. Sistem menampilkan temporary password untuk diberikan ke partner.

Hasil:

- Partner bisa login ke Partner App menggunakan email + temporary password.
- Akun bisa langsung diatur verified/unverified dan active/inactive oleh admin.

### 2.2 Verifikasi dan aktivasi partner

Di halaman detail partner, admin dapat:

- Verify/Unverify partner.
- Set Active/Inactive partner.
- Melihat riwayat order partner.
- Mengelola detail profile (identitas, pengalaman, area layanan, data bank, kontak darurat).

### 2.3 Menentukan layanan yang bisa dikerjakan partner

Di detail partner, admin dapat assign service ke partner.
Contoh:

- Partner A hanya service AC dan listrik.
- Partner B service pipa dan cat.

Ini penting karena order hanya akan ditawarkan ke partner yang punya service sesuai.

## 3. Alur Client: Dari Pilih Layanan Sampai Selesai

### 3.1 Registrasi dan login client

1. Client register akun (nama, telepon, email, password).
2. Login ke aplikasi client.
3. Masuk ke Home untuk melihat daftar layanan aktif.

### 3.2 Membuat order

1. Client pilih layanan (mis. Tukang AC).
2. Isi form order:

- deskripsi masalah,
- durasi hari kerja,
- lampiran foto (opsional),
- pilih alamat tersimpan (wajib).

3. Client submit order.

Setelah submit:

- Order dibuat dengan status antrean pencarian partner.
- Sistem memanggil proses matching agar partner yang relevan segera mendapat notifikasi.
- Client masuk ke layar waiting/tracking.

### 3.3 Menunggu partner menerima

Di layar waiting:

- client melihat proses pencarian partner,
- client bisa cancel order jika diperlukan.

Ketika ada partner menerima:

- status order berubah,
- client otomatis diarahkan ke halaman tracking progress.

### 3.4 Tracking pekerjaan

Client memantau status real-time:

- accepted (partner menuju lokasi)
- arrived (partner sudah tiba)
- in_progress (pekerjaan sedang dikerjakan)
- payment_pending (pekerjaan selesai, menunggu pembayaran)
- completed (transaksi selesai)

Client juga bisa:

- melihat detail partner,
- menghubungi partner via telepon.

### 3.5 Pembayaran dan review

Saat status payment_pending:

1. Client buka halaman Payment.
2. Pilih metode bayar:

- Wallet,
- Bank Transfer,
- Cash.

3. Sistem proses pembayaran.
4. Client dapat memberi rating + review untuk partner.
5. Setelah selesai, status order menjadi completed dan client melihat receipt.

## 4. Alur Partner: Menerima dan Menjalankan Pekerjaan

### 4.1 Registrasi/login partner

Partner bisa:

- daftar sendiri dari Partner App, atau
- dibuatkan akun oleh admin.

Setelah login:

- partner melihat status akun.
- jika belum verified, partner belum bisa aktif online untuk menerima order.

### 4.2 Online/offline dan update lokasi

1. Partner menyalakan toggle Online.
2. Aplikasi meminta izin lokasi.
3. Lokasi partner diupdate berkala saat online.

Catatan:

- Hanya partner verified + online + punya service yang sesuai yang bisa menerima order.

### 4.3 Menerima order

Saat ada order cocok:

- partner menerima notifikasi real-time,
- modal incoming order muncul (dengan countdown),
- partner bisa Accept atau Reject.

Jika accept berhasil:

- order di-claim partner yang paling cepat (first come first served),
- client mendapat notifikasi bahwa partner sudah ditemukan.

### 4.4 Menjalankan pekerjaan

Di halaman detail order partner, partner update status bertahap:

1. accepted (on the way)
2. arrived
3. in_progress
4. payment_pending (selesai kerja + bisa tambah biaya tambahan jika ada)

Saat pindah status, client otomatis mendapat notifikasi status update.

### 4.5 Menunggu pembayaran

Jika sudah payment_pending:

- partner menunggu client membayar.
- setelah payment sukses, status jadi completed.

## 5. Mekanisme Matching Partner (Inti Operasional)

Secara bisnis, logika matching bekerja seperti ini:

1. Ambil partner yang:

- role mitra,
- verified,
- online,
- memiliki service sesuai.

2. Exclude partner yang masih sibuk di order aktif.
3. Urutkan prioritas dengan fairness:

- sebaran job harian (yang job hari ini lebih sedikit diprioritaskan),
- rating kualitas,
- bonus pengalaman.

4. Kirim notifikasi order ke kandidat partner.
5. Partner tercepat yang accept akan mengunci order tersebut.

Manfaat:

- order lebih cepat ketemu partner,
- pembagian order lebih adil,
- kualitas layanan tetap terjaga.

### 5.1 Implementasi backend di Supabase Edge Function

Di production flow saat ini, proses matching dijalankan oleh edge function `match-order-queue`:

1. Client membuat order dari app.
2. Client app memanggil edge function `match-order-queue` dengan `orderId`.
3. Function memuat detail order + service.
4. Function memanggil RPC `get_available_partners` untuk mengambil kandidat mitra sesuai fairness rule.
5. Jika tidak ada mitra tersedia:

- client mendapat notifikasi "No Partners Available",
- order diubah menjadi `cancelled`.

6. Jika ada mitra:

- notifikasi `new_order` dikirim ke semua kandidat mitra sekaligus,
- mitra tercepat yang accept akan mengunci order (first come first served).

Catatan:

- Ada function `match-order` (versi lama berbasis jarak/lokasi).
- Flow aplikasi sekarang lebih mengarah ke `match-order-queue` (queue + fairness).

## 6. Status Order (Bahasa Bisnis)

Gunakan istilah ini saat presentasi ke client:

- Pending/Searching: sistem sedang mencari partner.
- Accepted: partner menerima order dan menuju lokasi.
- Arrived: partner sudah tiba.
- In Progress: pekerjaan sedang dilakukan.
- Payment Pending: pekerjaan selesai, menunggu pembayaran.
- Completed: pembayaran selesai, order ditutup.
- Cancelled: order dibatalkan.

## 7. Notifikasi Real-Time

Notifikasi digunakan untuk menjaga pengalaman real-time:

- Partner menerima notifikasi order baru.
- Client menerima notifikasi ketika:
- partner menerima order,
- partner update progres,
- order siap dibayar.

### 7.1 Komponen notifikasi di backend

Sumber notifikasi di sistem:

- Insert ke tabel `notifications` (dipakai untuk realtime subscription di app).
- Edge function `send-push-notification` untuk kirim push notification via Expo Push API (jika token tersedia).

Artinya, sistem sudah menyiapkan dua jalur:

- notifikasi in-app realtime,
- notifikasi push (untuk device yang tidak sedang aktif membuka layar terkait).

## 8. Alur Pembayaran di Backend

Saat client menekan tombol bayar, app memanggil edge function `process-payment`.

Langkah backend:

1. Validasi metode pembayaran (`wallet`, `bank_transfer`, `cash`).
2. Pastikan status order masih `payment_pending`.
3. Jika metode `wallet`:

- cek saldo wallet client,
- potong saldo client,
- catat transaksi `payment_out` di `wallet_transactions`.

4. Hitung pendapatan mitra (`price_total - commission_amount`).
5. Tambahkan saldo wallet mitra + increment total job.
6. Catat transaksi `income_job` untuk mitra.
7. Ubah status order jadi `completed`, simpan metode pembayaran dan timestamp selesai.
8. Kirim notifikasi sukses ke client dan mitra.

## 9. Skenario End-to-End (Contoh Cepat)

1. Admin membuat partner baru + assign layanan AC.
2. Partner login, akun sudah verified, lalu set Online.
3. Client pilih layanan AC, isi deskripsi kerusakan, pilih alamat, submit order.
4. Sistem mencari partner yang cocok dan mengirim notifikasi.
5. Partner accept order.
6. Client melihat status berubah ke Accepted lalu tracking.
7. Partner tiba (Arrived), kerja (In Progress), lalu selesai dan kirim tagihan (Payment Pending).
8. Client membayar, memberikan rating/review.
9. Order selesai (Completed), masuk histori client dan partner.

## 10. Demo Mode (Untuk Kebutuhan Demo ke Client)

Project juga punya edge function `demo-order-handler` untuk simulasi otomatis:

- assign order ke dummy mitra,
- update status bertahap (accepted -> arrived -> in_progress -> payment_pending),
- cocok untuk kebutuhan demo cepat tanpa menunggu mitra real.

## 11. Nilai Jual ke Client (Poin Presentasi)

- Full workflow end-to-end dari onboarding partner sampai payment dan review.
- Real-time status untuk transparansi client dan partner.
- Matching yang adil dan terkontrol (verified, online, service fit, fairness).
- Admin punya kontrol penuh untuk kualitas operasional.
- Siap dikembangkan untuk fitur lanjutan (promo, SLA, analytics, anti-fraud).

---

Jika Anda mau, saya bisa lanjutkan dokumen ini menjadi versi presentasi bisnis (lebih non-teknis) atau versi SOP operasional tim CS/ops.
