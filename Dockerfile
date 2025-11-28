# Specify base image
FROM node:22-alpine

# Specify the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY pnpm-lock.yaml ./

RUN npm install pnpm@10.8.1
RUN pnpm install

COPY . .

EXPOSE 3000

# Run the app
CMD ["pnpm", "start"]
