FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build
RUN npm run build || true

EXPOSE 9000 7001

CMD ["npm", "run", "dev"]
