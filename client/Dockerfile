FROM node:22-alpine

# Set working directory
WORKDIR /app

# Expose Astro development server port
EXPOSE 4321

# Start command (install dependencies and start dev server)
CMD npm install && npm run dev -- --host 0.0.0.0
