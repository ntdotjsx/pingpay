FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install && bun run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]