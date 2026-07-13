FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY dist/ dist/
COPY contracts/ contracts/

USER node
EXPOSE 9876

CMD ["node", "dist/commands/serve.js"]
