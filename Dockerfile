FROM node:20-alpine

# Install bash as the app relies on it
RUN apk add --no-cache bash

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
