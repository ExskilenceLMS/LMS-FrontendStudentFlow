# Stage 1: Build React App
FROM node:20 as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Accept build args for env file and build command
ARG ENV_FILE=.env.prod
ARG BUILD_COMMAND=build:prod

# Copy source code (but exclude .env files to avoid conflicts)
COPY . .

# Remove only .env file (keep .env.* files for env-cmd to use)
RUN rm -f .env 2>/dev/null || true

# Copy the correct environment file into .env
# The original ${ENV_FILE} is already in the container from COPY . . above
# This creates .env for React build, while keeping ${ENV_FILE} for env-cmd
COPY ${ENV_FILE} .env

# Extract BACKEND_URL from .env file and save it for nginx stage
# Remove quotes and trailing slashes, fail if not found
RUN echo "=== DEBUG: Extracting BACKEND_URL from ${ENV_FILE} ===" && \
    grep -E "^REACT_APP_BACKEND_URL=" .env && \
    grep -E "^REACT_APP_BACKEND_URL=" .env | sed 's/^REACT_APP_BACKEND_URL=//' | sed 's/^["'\'']//' | sed 's/["'\'']$//' | sed 's|/$||' > /tmp/backend_url.txt && \
    echo "=== DEBUG: Extracted BACKEND_URL ===" && \
    cat /tmp/backend_url.txt && \
    echo "=== DEBUG: End of BACKEND_URL ===" && \
    if [ ! -s /tmp/backend_url.txt ]; then \
        echo "ERROR: REACT_APP_BACKEND_URL not found in ${ENV_FILE}" && exit 1; \
    fi

# # Build React app using production environment
# RUN npm run build:prod

# Debug: Show what env files exist and their contents
RUN echo "=== DEBUG: Checking environment files ===" && \
    ls -la .env* 2>/dev/null || echo "No .env files found" && \
    echo "=== DEBUG: Contents of .env file ===" && \
    cat .env 2>/dev/null || echo ".env file not found" && \
    echo "=== DEBUG: Contents of ${ENV_FILE} ===" && \
    cat ${ENV_FILE} 2>/dev/null || echo "${ENV_FILE} not found" && \
    echo "=== DEBUG: REACT_APP_BACKEND_URL from .env ===" && \
    grep -E "^REACT_APP_BACKEND_URL=" .env 2>/dev/null || echo "Not found in .env" && \
    echo "=== DEBUG: REACT_APP_BACKEND_URL from ${ENV_FILE} ===" && \
    grep -E "^REACT_APP_BACKEND_URL=" ${ENV_FILE} 2>/dev/null || echo "Not found in ${ENV_FILE}"

# Debug: Verify environment before build
RUN echo "=== DEBUG: Environment check before build ===" && \
    echo "ENV_FILE=${ENV_FILE}" && \
    echo "BUILD_COMMAND=${BUILD_COMMAND}" && \
    echo "=== DEBUG: All REACT_APP_BACKEND_URL entries in .env ===" && \
    grep -n "REACT_APP_BACKEND_URL" .env 2>/dev/null || echo "None found" && \
    echo "=== DEBUG: Testing env-cmd ===" && \
    node -e "console.log('REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL || 'NOT SET')" && \
    npx env-cmd -f ${ENV_FILE} node -e "console.log('REACT_APP_BACKEND_URL from env-cmd:', process.env.REACT_APP_BACKEND_URL || 'NOT SET')"

# Build React app using selected build command
# Verify the built bundle contains the correct URL (for debugging)
RUN npm run ${BUILD_COMMAND} && \
    echo "=== DEBUG: Checking built JavaScript for backend URL ===" && \
    grep -r "REACT_APP_BACKEND_URL\|skillshala\|staging.api" build/static/js/main.*.js 2>/dev/null | head -3 || echo "Could not search built files"

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
RUN echo "=== DEBUG: Substituting BACKEND_URL in nginx config ===" && \
    export BACKEND_URL=$(cat /tmp/backend_url.txt) && \
    echo "BACKEND_URL for nginx: $BACKEND_URL" && \
    envsubst '$$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && \
    echo "=== DEBUG: Final nginx config ===" && \
    cat /etc/nginx/conf.d/default.conf && \
    echo "=== DEBUG: End of nginx config ===" && \
    rm -f /etc/nginx/templates/default.conf.template /tmp/backend_url.txt

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

