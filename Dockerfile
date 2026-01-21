# Stage 1: Build React App
FROM node:20 as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Accept build args for env file and build command
ARG ENV_FILE=.env.prod
ARG BUILD_COMMAND=build:prod

# Copy source code and env file
COPY . .
# COPY .env.prod .env

# Copy the correct environment file into .env
COPY ${ENV_FILE} .env

# Extract BACKEND_URL from .env file and save it for nginx stage
# Remove quotes and trailing slashes, fail if not found
RUN grep -E "^REACT_APP_BACKEND_URL=" .env | sed 's/^REACT_APP_BACKEND_URL=//' | sed 's/^["'\'']//' | sed 's/["'\'']$//' | sed 's|/$||' > /tmp/backend_url.txt && \
    if [ ! -s /tmp/backend_url.txt ]; then \
        echo "ERROR: REACT_APP_BACKEND_URL not found in ${ENV_FILE}" && exit 1; \
    fi

# # Build React app using production environment
# RUN npm run build:prod

# Build React app using selected build command
RUN npm run ${BUILD_COMMAND}

# Stage 2: Serve with NGINX
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Clean default NGINX HTML folder
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend from Stage 1
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config template and backend URL
COPY --from=build /app/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /tmp/backend_url.txt /tmp/backend_url.txt

# Substitute backend URL in nginx config
RUN export BACKEND_URL=$(cat /tmp/backend_url.txt) && \
    envsubst '$$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && \
    rm -f /etc/nginx/templates/default.conf.template /tmp/backend_url.txt

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

