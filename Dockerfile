FROM node:22-alpine

# Create working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Set environment variable to use extra CA certificates
ENV NODE_EXTRA_CA_CERTS=/app/test.pem

# Run the app
CMD ["node", "dist/main.js"]

EXPOSE 8000