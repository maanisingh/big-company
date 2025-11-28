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

EXPOSE 3000

# Run in production mode
CMD ["npm", "run", "start"]
