FROM node:22-alpine
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm install
RUN npm run -w @cottonwood/shared build
RUN npm run -w @cottonwood/api prisma:generate
RUN npm run -w @cottonwood/api build

WORKDIR /app/apps/api
CMD sh -c "npx prisma migrate deploy && npm run seed && npm run start"
