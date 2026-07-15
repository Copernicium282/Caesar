FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY dist/ dist/
COPY contracts/ contracts/

RUN mkdir -p /home/node/.caesar/ipfs/blocks /home/node/.caesar/ipfs/datastore && \
    chown -R node:node /home/node/.caesar

USER node
EXPOSE 9876

CMD ["node", "dist/commands/serve.js"]
