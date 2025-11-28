FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build for production - Set NEXT_PUBLIC env vars BEFORE build so they're baked into client-side JS
ENV NODE_ENV=production
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://bigcompany-api.alexandratechlab.com
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG MEDUSA_BACKEND_URL=http://bigcompany-medusa:9000
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
RUN npm run build

EXPOSE 3000

# Run in production mode
CMD ["npm", "run", "start"]
