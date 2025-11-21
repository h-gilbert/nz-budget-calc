FROM node:18-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create directory for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3200

# Start the server
CMD ["node", "server.js"]
