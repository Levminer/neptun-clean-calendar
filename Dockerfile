FROM denoland/deno:latest

# Create working directory
WORKDIR /app

# Copy source
COPY . .

# Run the app
CMD ["deno", "run", "--allow-net", "main.ts"]

EXPOSE 8000