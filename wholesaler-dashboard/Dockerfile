FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build for production
ENV NODE_ENV=production
RUN npm run build || echo "Build step - development mode"

EXPOSE 3002

# Run Vite preview for production or dev mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3002"]
