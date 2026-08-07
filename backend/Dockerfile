FROM node:20-alpine

RUN apk add --no-cache openssl libssl3

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]
