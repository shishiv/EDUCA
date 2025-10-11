{
  "mcpServers": {
    "n8n-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://n8n.triangulotec.com.br/",
        "N8N_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyZjdkNDkxYS05MGU4LTQyNGQtOGIzZS0zYmMxZWMxNGM1ZWIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYwMTQ3OTA0fQ.RsCM02j3tudKbEhYNBR4sbAzx-1uwZzdGNH8aUFwwmk"
      }
    }
  }
}