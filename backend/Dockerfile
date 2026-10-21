FROM node:20-alpine

WORKDIR /app

# Salin file dependensi
COPY package*.json ./

# Install dependensi produksi
RUN npm ci --omit=dev

# Salin seluruh kode sumber backend beserta migrasi
COPY . .

# Port default yang diekspos
ENV PORT=8000
EXPOSE 8000

# Jalankan migrasi database PostgreSQL secara otomatis saat container start, lalu jalankan server Express
CMD ["sh", "-c", "npm run migrate:up && npm start"]
