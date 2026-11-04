# Stage 1: Build React App
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build production assets
ARG VITE_API_URL
ARG VITE_AI_SERVICE_URL
ARG VITE_USE_REAL_API
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:5000/api/v1}
ENV VITE_AI_SERVICE_URL=${VITE_AI_SERVICE_URL:-http://localhost:8000/api/v1}
ENV VITE_USE_REAL_API=${VITE_USE_REAL_API:-true}

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

