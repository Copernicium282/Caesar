FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY contracts/package.json contracts/
RUN npm ci --omit=dev

COPY dist/ dist/
COPY contracts/ contracts/

EXPOSE 9876

CMD ["node", "dist/commands/serve.js"]
