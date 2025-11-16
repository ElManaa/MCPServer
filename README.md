# MCP API Converter

Convert REST APIs into Model Context Protocol (MCP) tools with a simple, extensible TypeScript framework.

## Overview

The MCP API Converter provides a framework for wrapping REST APIs as MCP tools, making them accessible to AI assistants and other MCP clients. The system uses an extensible class-based architecture where each API implementation extends a base class to automatically integrate with the MCP server.

## Features

- **Extensible Tool Framework**: Simple base class for creating new API tools
- **HTTP Transport**: Expose tools via HTTP with MCP protocol support
- **Multi-Level Logging**: Comprehensive logging with configurable levels
- **Type-Safe**: Built with TypeScript for robust type checking
- **Weather API Example**: Includes a working weather API tool implementation

## Architecture

The MCP API Converter uses a layered architecture:

```
┌─────────────────────────────────────────┐
│         HTTP Client (MCP Client)        │
└──────────────────┬──────────────────────┘
                   │ MCP Protocol
┌──────────────────▼──────────────────────┐
│         HTTP Transport Layer            │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│            MCP Server                   │
│  ┌────────────────────────────────┐    │
│  │      Tool Registry             │    │
│  └────────────────────────────────┘    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         Base Tool Class                 │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼─────────┐
│ Weather API    │   │  Your Custom     │
│     Tool       │   │   API Tools      │
└────────────────┘   └──────────────────┘
```

**Component Layers:**
1. **Transport Layer**: HTTP server handling MCP protocol messages
2. **MCP Server Layer**: Core server managing tool registration and execution
3. **Tool Framework Layer**: Base class and registry for API tools
4. **Implementation Layer**: Concrete API tool implementations

**Cross-Cutting Concerns:**
- **Logging System**: Monitors all operations across layers
- **Documentation Generator**: Automatically creates task documentation

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-api-converter
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Edit `.env` and configure your environment variables (see Configuration section below)

5. Build the project:
```bash
npm run build
```

## Configuration

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

#### Server Configuration

- **PORT** (optional, default: 3000)
  - HTTP server port number
  - Must be between 1 and 65535
  - Example: `PORT=3000`

#### Logging Configuration

- **LOG_LEVEL** (optional, default: info)
  - Controls logging verbosity
  - Valid values: `debug`, `info`, `warning`, `error`
  - Example: `LOG_LEVEL=info`

#### Weather API Configuration

- **WEATHER_API_KEY** (required for weather tool)
  - API key for WeatherAPI.com
  - Get your free API key at: https://www.weatherapi.com/signup.aspx
  - Example: `WEATHER_API_KEY=your_api_key_here`

- **WEATHER_API_URL** (optional)
  - Base URL for weather API
  - Default: `http://api.weatherapi.com/v1/current.json`
  - Example: `WEATHER_API_URL=http://api.weatherapi.com/v1/current.json`

### Example .env File

```env
PORT=3000
LOG_LEVEL=info
WEATHER_API_KEY=abc123def456
WEATHER_API_URL=http://api.weatherapi.com/v1/current.json
```

## Usage

### Starting the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server will start and display:
```
[2024-11-16T10:30:45.123Z] [INFO] MCP API Converter started successfully {"serverUrl":"http://localhost:3000","port":3000,"registeredTools":["get-weather"],"toolCount":1}
```

### Connecting MCP Clients

The server exposes an HTTP endpoint that accepts MCP protocol messages via POST requests.

#### Health Check

You can verify the server is running with a GET request:

```bash
curl http://localhost:3000
```

Response:
```json
{
  "status": "ok",
  "service": "MCP API Converter",
  "timestamp": "2024-11-16T10:30:45.123Z",
  "toolCount": 1
}
```

#### List Available Tools

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

Response:
```json
{
  "result": {
    "tools": [
      {
        "name": "get-weather",
        "description": "Get current weather information for a specified location",
        "inputSchema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name (e.g., \"London\", \"New York\") or city with country code (e.g., \"London,UK\")"
            }
          },
          "required": ["location"]
        }
      }
    ]
  }
}
```

#### Call a Tool

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get-weather",
      "arguments": {
        "location": "London"
      }
    }
  }'
```

Response:
```json
{
  "result": {
    "location": "London",
    "temperature": 15.3,
    "temperatureUnit": "celsius",
    "conditions": "partly cloudy",
    "humidity": 72,
    "windSpeed": 5.2,
    "timestamp": "2024-11-16T10:30:45.123Z"
  }
}
```

#### Error Responses

When an error occurs, the server returns an error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid parameters: location is required"
  }
}
```

Common error codes:
- `VALIDATION_ERROR`: Invalid parameters provided
- `TOOL_NOT_FOUND`: Requested tool doesn't exist
- `EXECUTION_ERROR`: Tool execution failed
- `EXTERNAL_API_ERROR`: External API request failed

## Weather Tool Examples

The included weather tool supports various location formats:

**City name:**
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"get-weather","arguments":{"location":"Paris"}}}'
```

**City with country code:**
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"get-weather","arguments":{"location":"Tokyo,JP"}}}'
```

**Multiple word city names:**
```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"get-weather","arguments":{"location":"New York"}}}'
```

## Extending with New API Tools

To add a new API tool:

1. Create a new class extending `BaseTool` in `src/tools/`:

```typescript
import { BaseTool } from '../core/BaseTool';

export class MyAPITool extends BaseTool {
  readonly name = 'my-api-tool';
  readonly description = 'Description of what this tool does';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      param1: {
        type: 'string',
        description: 'Description of parameter'
      }
    },
    required: ['param1']
  };

  async execute(params: { param1: string }): Promise<any> {
    // Implement your API logic here
    return { result: 'success' };
  }
}
```

2. Register the tool in `src/index.ts`:

```typescript
import { MyAPITool } from './tools/MyAPITool';

// In the main() function:
const myTool = new MyAPITool();
mcpServer.registerTool(myTool);
```

3. Rebuild and restart the server

## Project Structure

```
mcp-api-converter/
├── src/
│   ├── core/              # Core framework components
│   │   ├── BaseTool.ts    # Abstract base class for tools
│   │   ├── MCPServer.ts   # MCP server implementation
│   │   └── HTTPTransport.ts # HTTP transport layer
│   ├── tools/             # API tool implementations
│   │   └── WeatherAPITool.ts
│   ├── utils/             # Utility classes
│   │   ├── Logger.ts      # Logging system
│   │   └── DocumentationGenerator.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   └── index.ts           # Main entry point
├── docs/                  # Generated documentation
├── tests/                 # Test files
├── .env                   # Environment configuration (create from .env.example)
├── .env.example           # Example environment configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

Output will be in the `dist/` directory.

### Logging

The application uses a multi-level logging system. Set `LOG_LEVEL` in your `.env` file:

- **debug**: Verbose logging for development
- **info**: General operational messages (default)
- **warning**: Warning messages for potential issues
- **error**: Error messages only

## Troubleshooting

### Server won't start

**Issue**: `Error: WEATHER_API_KEY is required`
- **Solution**: Ensure you've created a `.env` file and added your OpenWeatherMap API key

**Issue**: `Error: Port 3000 is already in use`
- **Solution**: Change the `PORT` in your `.env` file or stop the process using port 3000

### Weather tool returns errors

**Issue**: `External API error: 401 Unauthorized`
- **Solution**: Verify your `WEATHER_API_KEY` is valid and active

**Issue**: `External API error: 404 Not Found`
- **Solution**: Check the location spelling or try using the format "City,CountryCode" (e.g., "London,UK")

### Connection issues

**Issue**: Cannot connect to the server
- **Solution**: Verify the server is running and check the port in your request matches the `PORT` in `.env`

**Issue**: `Invalid MCP protocol message`
- **Solution**: Ensure your request includes the correct `method` field and follows the MCP protocol format

### Logging

For debugging, set `LOG_LEVEL=debug` in your `.env` file to see detailed logs:
```env
LOG_LEVEL=debug
```

This will show:
- All HTTP requests and responses
- Tool registration events
- Parameter validation details
- External API calls and responses

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
