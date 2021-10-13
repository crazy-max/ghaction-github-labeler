# syntax=docker/dockerfile:1.3
ARG NODE_VERSION
ARG GITHUB_REPOSITORY

FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache git
WORKDIR /src

FROM base AS deps
RUN --mount=type=bind,target=.,rw \
  --mount=type=cache,target=/src/node_modules \
  yarn install

FROM deps AS test
ENV RUNNER_TEMP=/tmp/github_runner
ENV RUNNER_TOOL_CACHE=/tmp/github_tool_cache
ARG GITHUB_REPOSITORY
ENV GITHUB_REPOSITORY=${GITHUB_REPOSITORY}
RUN --mount=type=bind,target=.,rw \
  --mount=type=cache,target=/src/node_modules \
  --mount=type=secret,id=GITHUB_TOKEN \
  GITHUB_TOKEN=$(cat /run/secrets/GITHUB_TOKEN) yarn run test --coverageDirectory=/tmp/coverage

FROM scratch AS test-coverage
COPY --from=test /tmp/coverage /
