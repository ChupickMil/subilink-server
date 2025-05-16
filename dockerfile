# Stage 1: Build
FROM node:20.9.0-alpine AS builder

WORKDIR /app

COPY package*.json prisma ./

RUN npm install --legacy-peer-deps

# Генерация Prisma Client
RUN npx prisma generate

COPY . .

RUN npm run build

# Stage 2: Runtime
FROM node:20.9.0-alpine

WORKDIR /app

COPY package*.json ./

# Только прод-зависимости
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./

COPY ./entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 7000

ENTRYPOINT ["./entrypoint.sh"]
