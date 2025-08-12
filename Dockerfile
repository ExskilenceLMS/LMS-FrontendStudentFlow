# Stage 1: Build React App
FROM node:20 as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and env file
COPY . .
COPY .env.prod .env

# Build React app using production environment
RUN npm run build:prod

# Stage 2: Serve with NGINX
FROM nginx:alpine

# Clean default NGINX HTML folder
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend from Stage 1
COPY --from=build /app/build /usr/share/nginx/html

# Optional: Add custom NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

