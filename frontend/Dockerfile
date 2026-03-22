# ============================================================
#  InviteFlow Frontend — Railway-Optimized Dockerfile
# ============================================================
FROM node:20-alpine AS builder

# REACT_APP_API_URL will be set as Railway env variable at build time
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV CI=false
ENV GENERATE_SOURCEMAP=false

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
