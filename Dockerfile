FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY bin ./bin
COPY data ./data

ENTRYPOINT ["node", "bin/mcp.js"]
