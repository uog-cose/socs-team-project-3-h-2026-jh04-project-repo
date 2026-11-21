FROM node:24-slim

WORKDIR /app

# Install dependencies from the lockfile first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# --host so it's reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]