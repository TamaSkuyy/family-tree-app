# Deploy ke VPS (Docker + HTTPS otomatis)

Panduan ini untuk Ubuntu 22.04/24.04 atau Debian 12, dengan domain sendiri.
Hasil akhirnya: `https://domain-kamu` dengan sertifikat Let's Encrypt yang
diperbarui otomatis, database SQLite yang persisten, dan satu akun admin.

---

## 1. Prasyarat

| Yang dibutuhkan | Keterangan |
|---|---|
| VPS | Ubuntu 22.04/24.04 atau Debian 12, RAM ≥ 1 GB (build butuh ~1 GB) |
| Domain | Mis. `family.example.com` |
| DNS A record | `family.example.com` → **IP publik VPS** (wajib, kalau tidak HTTPS gagal) |
| Port terbuka | 22 (SSH), 80 dan 443 |
| Akses root | `sudo` |

Cek IP publik VPS:

```bash
curl -4 ifconfig.me
```

Buat A record di DNS provider (Cloudflare, Niagahoster, dll). Kalau pakai
Cloudflare, **matikan dulu proxy/orange-cloud** (set ke "DNS only") sampai
sertifikat terbit, atau biarkan Caddy memakai mode HTTP-01 dengan proxy aktif —
paling mudah: DNS only saat instalasi pertama.

Verifikasi DNS sudah benar dari VPS:

```bash
getent hosts family.example.com   # harus menampilkan IP publik VPS
```

---

## 2. Ambil kode ke VPS

Pilihan A — clone dari GitHub (butuh repo sudah di-push):

```bash
sudo apt-get update && sudo apt-get install -y git
sudo git clone https://github.com/TamaSkuyy/family-tree-app.git /opt/family-tree
cd /opt/family-tree
```

Pilihan B — kirim dari komputer lokal (termasuk perubahan yang belum di-commit):

```bash
rsync -avz --exclude node_modules --exclude .git --exclude '*.db' \
  ./ user@IP_VPS:/opt/family-tree/
```

---

## 3. Jalankan installer

```bash
cd /opt/family-tree
sudo ./install-vps.sh --domain family.example.com --email kamu@example.com
```

Installer melakukan, berurutan:

1. Cek OS, DNS, dan apakah port 80/443 bebas.
2. Install Docker Engine + Compose plugin dari repo resmi Docker.
3. Generate `JWT_SECRET` acak 96 karakter → tulis `.env` (permission `600`).
4. Build 3 image: backend (Go), frontend (nginx), Caddy.
5. Set ownership folder `data/` ke user non-root di dalam container.
6. Jalankan stack dan tunggu backend `healthy`.
7. Terbitkan sertifikat HTTPS dan cek `https://domain/health`.
8. Buat akun admin pertama dan tampilkan password-nya.

Opsi berguna:

```bash
# Uji dulu tanpa mengubah apa pun (cek DNS/port + tulis .env saja)
sudo ./install-vps.sh --domain family.example.com --email kamu@example.com --dry-run

# Non-interaktif, tentukan sendiri akun admin
sudo ./install-vps.sh --domain family.example.com --email kamu@example.com \
  --admin-email kamu@example.com --admin-password 'PasswordKuat123' --yes

# Izinkan pengunjung anonim membaca silsilah (tanpa login)
sudo ./install-vps.sh --domain family.example.com --email kamu@example.com --public-mode

# Dua hostname sekaligus
sudo ./install-vps.sh --domain example.com,www.example.com --email kamu@example.com
```

Kalau repo belum ada di VPS, installer bisa clone sendiri:

```bash
sudo ./install-vps.sh --repo-url https://github.com/TamaSkuyy/family-tree-app.git \
  --dir /opt/family-tree --domain family.example.com --email kamu@example.com
```

---

## 3b. Kalau VPS sudah menjalankan nginx di port 80/443

Gejalanya seperti ini:

```
[ERROR] Port 80 is already in use by: users:(("nginx",pid=31341,fd=7))
```

**Jangan** memindahkan Caddy ke port lain (mis. 8443): Let's Encrypt hanya bisa
memverifikasi domain lewat port **80** atau **443**, jadi HTTPS otomatis tidak akan
pernah terbit di port lain. Yang benar adalah memakai nginx yang sudah ada sebagai
reverse proxy, dan menaruh app ini di `127.0.0.1:8080`.

```bash
cd /var/www/family-tree-app        # atau di mana repo-nya berada
git pull                            # ambil dukungan --behind-nginx

# Lihat dulu tanpa mengubah apa pun
sudo ./install-vps.sh --behind-nginx --port 8080 \
  --domain family-tree.sekuyy.my.id --email yomanf48@gmail.com --dry-run

# Jalankan sungguhan; vhost nginx ditulis + dites + reload otomatis
sudo ./install-vps.sh --behind-nginx --port 8080 --install-nginx-vhost \
  --domain family-tree.sekuyy.my.id --email yomanf48@gmail.com
```

Apa yang dilakukan mode ini:

1. Build dan jalankan backend + frontend saja (**tanpa** container Caddy).
2. Frontend hanya dipublikasikan ke `127.0.0.1:8080` — tidak terbuka ke internet.
3. Menulis `/etc/nginx/sites-available/family-tree.conf` (dari
   `deploy/nginx-family-tree.conf`), menyalakan symlink di `sites-enabled`,
   menjalankan `nginx -t`, lalu `systemctl reload nginx`.
   Kalau `nginx -t` gagal, vhost lama dikembalikan dan nginx **tidak** disentuh.
4. Menjalankan `certbot --nginx` kalau DNS sudah mengarah ke VPS ini.

Kalau nginx-mu tidak memakai `sites-available`/`sites-enabled`, vhost ditulis ke
`/etc/nginx/conf.d/family-tree.conf`.

### DNS dulu, baru HTTPS

Selama `family-tree.sekuyy.my.id` belum punya A record ke IP VPS, certbot tidak
akan berhasil. Buat dulu record-nya:

| Type | Name | Value |
|---|---|---|
| A | `family-tree` | `103.89.4.192` (IP publik VPS-mu) |

Cek dari VPS (harus muncul IP VPS, bukan kosong):

```bash
getent hosts family-tree.sekuyy.my.id
```

Setelah DNS benar, terbitkan sertifikatnya:

```bash
sudo certbot --nginx -d family-tree.sekuyy.my.id \
  --agree-tos -m yomanf48@gmail.com --redirect
```

Sementara belum ada HTTPS, app tetap bisa diakses lewat `http://family-tree.sekuyy.my.id`
setelah vhost terpasang.

### Kalau tidak ingin script menyentuh nginx

Jalankan tanpa `--install-nginx-vhost`; installer hanya akan mencetak perintah
manual-nya, dan kamu bisa memasang vhost sendiri:

```bash
sudo cp deploy/nginx-family-tree.conf /etc/nginx/sites-available/family-tree.conf
sudo sed -i 's/__DOMAIN__/family-tree.sekuyy.my.id/; s/__APP_PORT__/8080/' \
  /etc/nginx/sites-available/family-tree.conf
sudo ln -sf /etc/nginx/sites-available/family-tree.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Ganti port app

Kalau `8080` sudah dipakai proses lain di VPS:

```bash
sudo ./install-vps.sh --behind-nginx --port 9090 --install-nginx-vhost \
  --domain family-tree.sekuyy.my.id --email yomanf48@gmail.com
```

Nilai `APP_PORT` disimpan di `.env`, jadi jalankan ulang tanpa `--port` akan
memakai port yang sama seperti sebelumnya.

---

## 4. Selesai — cek hasilnya

```bash
curl -I https://family.example.com/health
```

Buka `https://family.example.com` dan login dengan akun admin dari output
installer. Halaman admin user ada di `/admin/users`, dokumentasi API di
`/swagger/index.html`.

---

## 5. Operasional harian

```bash
cd /opt/family-tree

# Lihat status & log
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f caddy   # khusus masalah HTTPS

# Restart / stop
docker compose -f docker-compose.prod.yml restart
docker compose -f docker-compose.prod.yml down

# Update aplikasi ke versi terbaru
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Backup database (file tunggal, aman disalin saat app jalan)
cp data/family_tree.db ~/backup-family-tree-$(date +%F).db

# Restore
docker compose -f docker-compose.prod.yml stop backend
cp ~/backup-family-tree-2026-01-01.db data/family_tree.db
docker compose -f docker-compose.prod.yml start backend

# Tambah / promosikan admin lain
docker compose -f docker-compose.prod.yml exec backend \
  family-tree-createadmin -email orang@example.com -password 'PasswordKuat123'

# Reset password admin yang sudah ada
docker compose -f docker-compose.prod.yml exec backend \
  family-tree-createadmin -email kamu@example.com -password 'PasswordBaru123' -reset-password

# Ganti JWT_SECRET (semua user harus login ulang)
sudo ./install-vps.sh --domain family.example.com --email kamu@example.com --rotate-secret
```

---

## 6. Kalau ada masalah

**Sertifikat HTTPS tidak terbit**

```bash
docker compose -f docker-compose.prod.yml logs --tail 50 caddy
```

Penyebab umum: A record belum mengarah ke IP VPS, port 80 diblokir firewall
provider, atau Cloudflare proxy aktif. Setelah DNS diperbaiki:

```bash
docker compose -f docker-compose.prod.yml restart caddy
```

**`502 Bad Gateway`**

Backend belum siap atau crash. Cek:

```bash
docker compose -f docker-compose.prod.yml ps          # backend harus "healthy"
docker compose -f docker-compose.prod.yml logs --tail 50 backend
```

**Backend error `unable to open database file`**

Folder `data/` tidak bisa ditulis. Ulangi perintah ownership berikut:

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps \
  --user root --entrypoint chown backend -R app:app /data
docker compose -f docker-compose.prod.yml restart backend
```

**Port 80/443 sudah dipakai nginx atau apache host**

Jangan matikan nginx yang mungkin sedang melayani situs lain. Pakai mode
reverse-proxy — lihat [bagian 3b](#3b-kalau-vps-sudah-menjalankan-nginx-di-port-80443):

```bash
sudo ./install-vps.sh --behind-nginx --port 8080 --install-nginx-vhost \
  --domain family.example.com --email kamu@example.com
```

Hanya kalau nginx host itu memang tidak dipakai untuk apa pun:

```bash
sudo systemctl disable --now nginx apache2
```

**Database di mode behind-nginx**

Semua perintah `docker compose` di dokumen ini memakai `-f docker-compose.prod.yml`.
Di mode `--behind-nginx`, ganti dengan `-f docker-compose.nginx.yml`, misalnya:

```bash
docker compose -f docker-compose.nginx.yml ps
docker compose -f docker-compose.nginx.yml logs -f
docker compose -f docker-compose.nginx.yml up -d --build
```

**Build frontend gagal di `npm ci`**

Sudah ditangani di `frontend/Dockerfile` dengan `--legacy-peer-deps`
(`@testing-library/react@13` mendeklarasikan peer `react@^18`, sedangkan project
memakai React 19; `npm ci` menganggapnya error fatal).

---

## 7. Catatan teknis penting

- **`VITE_API_BASE_URL`** di-set ke `/api/v1` lewat `frontend/.env.production`
  supaya browser memanggil domain yang sama (same-origin), bukan
  `http://localhost:8080`. Jangan diubah menjadi URL absolut.
- **Backend butuh CGO.** `gorm.io/driver/sqlite` memakai `mattn/go-sqlite3`.
  Image dibangun di Debian dengan `CGO_ENABLED=1`. Membangun dengan
  `CGO_ENABLED=0` menghasilkan binary stub yang gagal start.
- **Hanya Caddy yang terekspos** ke internet (80/443). Port backend dan frontend
  tidak dipublikasikan ke host.
- **Database**: `data/family_tree.db` (bind mount ke `/data` di container).
  Folder `data/` tidak masuk git.
- **Arsitektur**: `Caddy → frontend (nginx, static SPA) → backend (Go)`,
  dengan `/api/*`, `/health`, `/swagger/*` diarahkan Caddy langsung ke backend.
