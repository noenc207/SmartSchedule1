FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_API_MODE=real
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_MODE=$VITE_API_MODE

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
