FROM node:22-alpine
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json tsconfig.base.json ./
COPY USER_MANUAL.md ./USER_MANUAL.md
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm install
RUN npm run -w @cottonwood/shared build
RUN npm run -w @cottonwood/web build

WORKDIR /app/apps/web
CMD ["npm", "run", "preview"]
