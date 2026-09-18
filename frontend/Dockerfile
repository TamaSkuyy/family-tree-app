FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# --legacy-peer-deps: @testing-library/react@13 declares a peer of react@^18 while
# the project uses react@19. `npm install` only warns about this, but `npm ci`
# treats it as a hard error (ERESOLVE) and aborts the image build. These testing
# packages are not used by `vite build`, so relaxing peer resolution is safe here.
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
