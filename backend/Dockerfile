FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads whatsapp-sessions

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]