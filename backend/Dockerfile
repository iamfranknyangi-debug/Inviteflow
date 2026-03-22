FROM node:20-alpine
RUN apk add --no-cache wget curl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p uploads logs
EXPOSE 5000
CMD ["node", "src/server.js"]
