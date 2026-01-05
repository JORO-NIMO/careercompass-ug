# MCP Integration Guide: PlacementBridge

To allow and AI Assistant (like me) to manage your database directly using the **Model Context Protocol (MCP)**, you should configure an MCP Server in your IDE (Cursor/Claude Desktop/Windsurf).

## 1. Supabase MCP Server
This is the most powerful tool for this project. It allows the AI to:
*   `list_tables`: See your current listings.
*   `execute_query`: Approve jobs, fix data, and run analytics.

### Configuration (Cursor/Claude Desktop)
Add this to your `mcpConfig.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server"
      ],
      "env": {
        "SUPABASE_URL": "YOUR_SUPABASE_URL",
        "SUPABASE_API_KEY": "YOUR_SERVICE_ROLE_KEY"
      }
    }
  }
}
```

## 2. n8n MCP Server (Optional)
If you want the AI to trigger your n8n workflows directly:
1.  Install the `n8n-mcp` server.
2.  Provide your n8n API Key.

---

## Why use MCP instead of a Dashboard?
1.  **Speed**: You can just say *"Hey, look at the jobs n8n found and approve the ones from NSSF"* and it's done.
2.  **Customization**: No need to write complex React code for every new filter or button.
3.  **Security**: You control the database access via your local MCP config.
