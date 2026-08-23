# @eduverse/cli

Official command-line client for the [EduVerse](https://eduverse.app) HTTP API.
Zero dependencies; requires Node.js >= 18.

## Install

```bash
npm install -g @eduverse/cli
```

## Usage

```bash
# Health probe (zero-auth smoke test)
eduverse health

# Which AI model powers the assistant
eduverse ai-status

# List approved customer reviews
eduverse reviews list

# Print the OpenAPI spec / function-calling tools
eduverse openapi --yaml
eduverse tools

# Target a specific deployment
EDUVERSE_URL=https://staging.eduverse.app eduverse health
eduverse health --site https://staging.eduverse.app
```

## For agents

The CLI wraps the same surface documented at `/openapi.json` and
`/api/tools.json`. Prefer the HTTP endpoints directly when running inside a
sandbox with network access; use this CLI when only shell execution is
available.
