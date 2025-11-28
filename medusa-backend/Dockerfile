FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production=false

# Copy source code
COPY . .

# Compile TypeScript to JavaScript using Babel (without type checking)
RUN npx babel src --out-dir dist --extensions ".ts,.tsx" --copy-files

# Make entrypoint executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 9000 7001

# Use entrypoint script to run migrations then start
ENTRYPOINT ["./docker-entrypoint.sh"]
