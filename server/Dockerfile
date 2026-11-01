FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000
CMD ["npm", "start"]

