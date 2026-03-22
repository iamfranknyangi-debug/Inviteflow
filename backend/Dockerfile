# ============================================================
#  InviteFlow Backend — Railway-Optimized Dockerfile
# ============================================================
FROM node:20-alpine

# System deps for canvas
RUN apk add --no-cache \
    python3 make g++ \
    cairo-dev pango-dev jpeg-dev \
    giflib-dev librsvg-dev \
    pixman-dev wget curl

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN mkdir -p uploads logs

EXPOSE 5000
CMD ["node", "src/server.js"]
