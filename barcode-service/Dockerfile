FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 9002

# Start service
CMD ["node", "src/index.js"]
