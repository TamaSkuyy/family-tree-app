## 📊 Demo Data

Aplikasi sudah include dengan demo data untuk testing. Setelah menjalankan `go run cmd/seed.go`, Anda akan mendapatkan:

### Family Structure:

- **Grandparents**: Robert & Mary Johnson (born 1945, 1948)
- **Parents**:
  - David & Lisa Johnson (born 1972, 1978)
  - Sarah & Michael Smith (born 1975, 1970)
- **Children**:
  - James Johnson (born 2000)
  - Emma Johnson (born 2003)
  - Oliver Johnson (born 2005)
  - Sophia Johnson (born 2008)

### Relationships:

- Robert ↔ Mary (spouses)
- David ↔ Lisa (spouses)
- Sarah ↔ Michael (spouses)
- Robert & Mary → David & Sarah (parents)
- David & Lisa → James & Emma (parents)
- Sarah & Michael → Oliver & Sophia (parents)

Anda bisa menggunakan data ini untuk explore fitur family tree visualization!

## 📚 API Documentation

# Install dependencies

go mod tidy

# (Optional) Create demo data

go run cmd/seed.go

# Jalankan server

go run cmd/main.go

````

Backend akan berjalan di `http://localhost:8080`

### 2. Setup Frontend (Vite)

```bash
# Buka terminal baru, masuk ke folder frontend
cd frontend

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend akan berjalan di `http://localhost:3000` (Vite dev server)

### 3. Quick Start (Recommended)

Jika Anda ingin menjalankan semua dengan satu command:

```bash
# Install Go jika belum ada (Linux)
curl -fsSL https://golang.org/dl/go1.21.5.linux-amd64.tar.gz -o go1.21.5.linux-amd64.tar.gz
mkdir -p ~/go && tar -C ~/go -xzf go1.21.5.linux-amd64.tar.gz --strip-components=1
export PATH=$PATH:~/go/bin

# Setup backend
cd backend
export PATH=$PATH:~/go/bin
export GOPATH=~/go-workspace
go mod tidy
go run cmd/seed.go  # Create demo data

# Start backend (terminal 1)
go run cmd/main.go

# Setup frontend (terminal 2)
cd ../frontend
npm install
npm start
```

### 4. Test API

```bash
# Health check
curl http://localhost:8080/health

# Get all persons
curl http://localhost:8080/api/v1/persons

# Get family tree
curl http://localhost:8080/api/v1/family-tree/[PERSON_ID]
```

### Authentication

The backend exposes `/api/v1/auth/register`, `/api/v1/auth/login` and `/api/v1/auth/me`.

By default a development JWT secret is used. For development you can set your own secret:

```bash
export JWT_SECRET="replace-this-with-a-strong-secret"
go run cmd/main.go
```

The frontend stores the JWT in `localStorage.ft_token` and automatically adds it to requests.
If the token expires or is invalid, the frontend will clear it and redirect to `/login`.

````
