FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile && pnpm build && pnpm prune --prod
FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/gcp-delivery-insights/dist/server.cjs ./server.cjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.status===200||r.status===403?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.cjs"]
