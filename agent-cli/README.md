# Tahcom Agent CLI (Puppeteer + Claude)

Run an interactive agent that logs into the Tahcom Portal, chats in the Email Expert area, analyzes emails, and sends messages. The code you provided is placed in `src/index.ts`.

## Setup

1) Install dependencies
```powershell
cd tahcom-kpi-portal/agent-cli
npm install
```

2) Configure environment
- Create a `.env` file next to `package.json`
- Set `ANTHROPIC_API_KEY=sk-ant-...`
- Optionally set:
  - `TAHCOM_URL=http://localhost:5173`
  - `EMPLOYEE_EMAIL=...`
  - `EMPLOYEE_PASSWORD=...`
  - `EMPLOYEE_NAME=...`

## Run (development)
```powershell
npm run dev
```

## Build and start
```powershell
npm run build
npm start
```

The CLI will prompt for employee credentials and action if not provided via env.

## MCP Server (Email Expert)

Run the MCP server for Email Expert:
```powershell
npm run mcp:email
```

This starts an MCP server over stdio that exposes:
- `generateEmail` tool: Generate professional emails with Claude

**Note:** Make sure `ANTHROPIC_API_KEY` is set in `.env` before running.



