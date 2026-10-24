FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile && pnpm build && pnpm package:azure \
    && cd work/azure-package && npm ci --omit=dev --ignore-scripts
FROM mcr.microsoft.com/azure-functions/node:4-node22
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true
COPY --from=build /app/work/azure-package /home/site/wwwroot
# Local host verification only; the approved cloud design uses code deployment
# to Windows Consumption, not this Linux container hosting plan.
