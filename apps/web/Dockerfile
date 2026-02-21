FROM node:22-alpine
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm install
RUN npm run -w @cottonwood/shared build
RUN npm run -w @cottonwood/web build

WORKDIR /app/apps/web
CMD ["npm", "run", "preview"]
