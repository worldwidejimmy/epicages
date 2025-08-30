FROM node:18-alpine AS build
WORKDIR /app
COPY .. /app
WORKDIR /app/server
RUN npm ci || npm i
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/server/dist ./dist
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "dist/index.js"]
