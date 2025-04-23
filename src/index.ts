import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { date, z } from 'zod';
import { CallToolResult, GetPromptResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import Fuse from 'fuse.js';
import { stationsData } from './stationsData';
import { trainsData } from './trainsData';
import {
  formatStationInfo,
  formatTrainInfo,
  formatTrainLiveStatus,
  formatSearchTrains,
  formatStationCodeResults,
  formatTrainDelayInfo,
  formatSeatStatus,
  formatTrainCodeResults
} from './utils';

const apiURL = "https://railwayapi.amithv.xyz";
const API_KEY = process.env.API_KEY || '';

// Create an MCP server with implementation details
const server = new McpServer({
  name: 'stateless-streamable-http-server',
  version: '1.0.0',
}, { capabilities: { logging: {} } });


// Tool: Get-live-station-info
server.tool(
  "Get-live-station-info",
  "Retrieves live train schedule information for a specific Indian Railway station. Example: Live station for ERS (Ernakulam Jn). Returns a formatted text list of trains including their numbers, names, arrival/departure times, platforms, and delay information.",
  {
    station_code: z.string().describe("The official Indian Railways station code (e.g., 'ERS' for Ernakulam Jn, 'NDLS' for New Delhi)."),
    exclude_memu: z.boolean().optional().describe("Exclude MEMU trains from the station schedule"),
    exclude_local: z.boolean().optional().describe("Exclude local trains from the station schedule"),
    exclude_fast_emu: z.boolean().optional().describe("Exclude fast EMU trains from the station schedule"),
    exclude_parcel_services: z.boolean().optional().describe("Exclude parcel services from the station schedule"),
    limit: z.number().optional().describe("Limit the number of trains returned (default: 15)")
  },
  async ({ station_code, exclude_memu, exclude_local, exclude_fast_emu, exclude_parcel_services, limit }): Promise<CallToolResult> => {
    try {
      const requestBody = {
        stn_code: station_code,
        exclude_memu: exclude_memu || false,
        exclude_local: exclude_local || false,
        exclude_fast_emu: exclude_fast_emu || false,
        exclude_parcel_services: exclude_parcel_services || true,
        limit: limit || 15
      };
      const response = await fetch(`${apiURL}/station-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      const formattedText = formatStationInfo(data, station_code);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't retrieve station information for ${station_code}. Error: ${errorMessage}` }] };
    }
  }
);

// Tool: Get-train-info
server.tool(
  "Get-train-info",
  "Fetches detailed information about a specific Indian Railways train, including its route and schedule. Example: schedules for train 12617.",
  {
    train_number: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
  },
  async ({ train_number }): Promise<CallToolResult> => {
    try {
      const requestBody = { train_number };
      const response = await fetch(`${apiURL}/train-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      const formattedText = formatTrainInfo(data);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't retrieve train information for ${train_number}. Error: ${errorMessage}` }] };
    }
  }
);

// Tool: Get-train-live-status
server.tool(
  "Get-train-live-status",
  "Fetches the current live running status of a specific train including location, delays, and expected arrivals. Returns a formatted text with station names, platforms, scheduled/actual arrival and departure times. Example: live status/live location for train 12617.",
  {
    train_no: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
    date: z.string().describe("The date in YYYY-MM-DD format for which to get live status"),
  },
  async ({ train_no, date }): Promise<CallToolResult> => {
    try {
      const requestBody = { train_no, date };
      const response = await fetch(`${apiURL}/train-live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      const formattedText = formatTrainLiveStatus(data, train_no, date);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't retrieve live status for train ${train_no} on ${date} from. Error: ${errorMessage}` }] };
    }
  }
);

// Tool: Search-trains
server.tool(
  "Search-trains",
  "Searches for available Indian Railways trains between two specified stations on a given date. Example: searchTrains from ERS to SBC on 20250415. Returns a formatted text list of trains with train numbers, names, departure/arrival stations and times, duration, running days, and available classes.",
  {
    from_station: z.string().describe("The official Indian Railways station code for the origin station (e.g., 'ERS')."),
    to_station: z.string().describe("The official Indian Railways station code for the destination station (e.g., 'SBC' for KSR Bengaluru)."),
    date: z.string().optional().describe("The date of travel in YYYYMMDD format (e.g., '20250415'). If omitted, the backend service defaults to the current date.")
  },
  async ({ from_station, to_station, date }): Promise<CallToolResult> => {
    try {
      if (date && !/^[0-9]{8}$/.test(date)) throw new Error("Invalid date format. Please use YYYYMMDD.");
      const requestBody: { from_station: string; to_station: string; date?: string } = { from_station, to_station };
      if (date) requestBody.date = date;
      const response = await fetch(`${apiURL}/search-trains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      const formattedText = formatSearchTrains(data, from_station, to_station, date);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't search for trains between ${from_station} and ${to_station}. Error: ${errorMessage}` }] };
    }
  }
);

// Tool: Get-station-code
server.tool(
  "Get-station-code",
  "Find station code by station name. Supports multiple station names, variations, and case-insensitive matching. Example: getStationCode for 'Delhi,Trivandrum' would return codes for both cities.",
  {
    station_name: z.string().describe("The name(s) of the railway station(s) (e.g., 'New Delhi' or multiple names separated by commas like 'Delhi,Mumbai,Chennai')."),
    variations: z.string().optional().describe("Variations and alternate names of station to search for (e.g., for 'Calcutta,Bangalore,Majestic' return 'Kolkata,Bengaluru,KSR etc').")
  },
  async ({ station_name, variations }): Promise<CallToolResult> => {
    try {
      if (!station_name || station_name.trim() === '') throw new Error("Station name cannot be empty");
      const fuse = new Fuse(stationsData, { includeScore: true, threshold: 0.4, keys: ['name'] });
      const stationNames = station_name.split(',').map(name => name.trim()).filter(name => name !== '');
      let variationNames: string[] = [];
      if (variations) variationNames = variations.split(',').map(name => name.trim()).filter(name => name !== '');
      const searchTerms = [...stationNames, ...variationNames];
      const uniqueStations: Record<string, any> = {};
      for (const term of searchTerms) {
        const searchResults = fuse.search(term).slice(0, 6);
        searchResults.forEach(result => { uniqueStations[result.item.code] = result.item; });
      }
      const matchingStations = Object.values(uniqueStations) as { name: string; code: string }[];
      if (matchingStations.length === 0) {
        const termsText = searchTerms.join("', '");
        return { content: [{ type: "text", text: `No stations found matching '${termsText}'. Please try different names.` }] };
      }
      const resultsByTerm: Record<string, string[]> = {};
      for (const term of searchTerms) {
        const termResults = matchingStations.filter(station => (station as { name: string }).name.toLowerCase().includes(term.toLowerCase()));
        if (termResults.length > 0) {
          resultsByTerm[term] = termResults.map(station => `${(station as { name: string; code: string }).name}: ${(station as { name: string; code: string }).code}`);
        }
      }
      const allTermMatches = Object.values(resultsByTerm).flat();
      const otherMatches = matchingStations.map(station => `${station.name}: ${station.code}`).filter(entry => !allTermMatches.includes(entry));
      if (otherMatches.length > 0) resultsByTerm['Other matches'] = otherMatches;
      const formattedText = formatStationCodeResults(matchingStations, resultsByTerm);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't retrieve station codes for '${station_name}'. Error: ${errorMessage}` }], isError: true };
    }
  }
);

// Tool: Get-train-code
server.tool(
  "Get-train-code",
  "Find train code (train number) by train name. Supports multiple train names, variations, and case-insensitive matching. Example: getTrainCode for 'Rajdhani,Shatabdi' would return codes for trains containing these names.",
  {
    train_name: z.string().describe("The name(s) of the train(s) to search for (e.g., 'Rajdhani' or multiple names separated by commas like 'Rajdhani,Shatabdi,Duronto')."),
    variations: z.string().optional().describe("Variations and alternative train names to search for (e.g., for 'Express' specify 'Exp,SF Exp').")
  },
  async ({ train_name, variations }): Promise<CallToolResult> => {
    try {
      if (!train_name || train_name.trim() === '') throw new Error("Train name cannot be empty");
      const fuse = new Fuse(trainsData, { includeScore: true, threshold: 0.4, keys: ['name'] });
      const trainNames = train_name.split(',').map(name => name.trim()).filter(name => name !== '');
      let variationNames: string[] = [];
      if (variations) variationNames = variations.split(',').map(name => name.trim()).filter(name => name !== '');
      const searchTerms = [...trainNames, ...variationNames];
      const uniqueTrains: Record<string, any> = {};
      const MAX_RESULTS_PER_TERM = 6;
      for (const term of searchTerms) {
        const searchResults = fuse.search(term).slice(0, MAX_RESULTS_PER_TERM);
        searchResults.forEach(result => { uniqueTrains[result.item.code] = result.item; });
      }
      const matchingTrains = Object.values(uniqueTrains) as { name: string; code: string }[];
      if (matchingTrains.length === 0) {
        const termsText = searchTerms.join("', '");
        return { content: [{ type: "text", text: `No trains found matching '${termsText}'. Please try different names.` }] };
      }
      const resultsByTerm: Record<string, string[]> = {};
      for (const term of searchTerms) {
        const termResults = matchingTrains.filter(train => (train as { name: string }).name.toLowerCase().includes(term.toLowerCase()));
        if (termResults.length > 0) {
          resultsByTerm[term] = termResults.map(train => `${(train as { code: string; name: string }).code}: ${(train as { code: string; name: string }).name}`);
        }
      }
      const allTermMatches = Object.values(resultsByTerm).flat();
      const otherMatches = matchingTrains.map(train => `${train.code}: ${train.name}`).filter(entry => !allTermMatches.includes(entry));
      if (otherMatches.length > 0) resultsByTerm['Other matches'] = otherMatches;
      const formattedText = formatTrainCodeResults(matchingTrains, resultsByTerm);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't retrieve train codes for '${train_name}'. Error: ${errorMessage}` }], isError: true };
    }
  }
);

// Tool: Get-seat-availability
server.tool(
  "Get-seat-availability",
  "Checks seat availability for a train between two stations on upcoming dates. Returns a formatted text with train details, seat availability status (available or waitlisted), and fare information for different classes and dates. Example: seat availability for train 12617 from NDLS to MAS.",
  {
    train_no: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
    src_stn_code: z.string().describe("The official Indian Railways station code for the origin station (e.g., 'NDLS')."),
    dst_stn_code: z.string().describe("The official Indian Railways station code for the destination station (e.g., 'PNBE')."),
    quota: z.enum(['GN', 'TQ']).describe("Quota for seat availability: 'GN' (General), 'TQ' (Tatkal). Default is 'GN'."),
    date: z.string().optional().describe("The date of travel in DD-MM-YYYY format (e.g., '30-04-2025'). If omitted, the backend service defaults to the current date.")
  },
  async ({ train_no, src_stn_code, dst_stn_code,quota,date }): Promise<CallToolResult> => {
    try {
      const requestBody = { train_no, src_stn_code, dst_stn_code, quota, date };
      const response = await fetch(`${apiURL}/all-seat-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      
      const formattedText = formatSeatStatus(data);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't retrieve seat availability for train ${train_no} between ${src_stn_code} and ${dst_stn_code}. Error: ${errorMessage}` }] };
    }
  }
);

server.tool(
  "Get-train-delay-info",
  "Retrieves average delay information for a specific train at each station. Shows train basic info and station-wise delay statistics for the specified time period. Example: any delay for train 12617 for the last month. Returns a formatted text with train name, number, route, and average delay at each station.",
  {
    train_number: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
    period: z.enum(['1w', '1m', '3m', '6m', '1y']).describe("Time period for delay statistics: '1w' (1 week), '1m' (1 month), '3m' (3 months), '6m' (6 months), or '1y' (1 year).")
  },
  async ({ train_number, period }): Promise<CallToolResult> => {
    try {
      const requestBody = { train_number, period };
      const response = await fetch(`${apiURL}/train-delay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      const formattedText = formatTrainDelayInfo(data, period);
      return { content: [{ type: "text", text: formattedText }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Sorry, I couldn't retrieve delay information for train ${train_number} (period: ${period}). Error: ${errorMessage}` }] };
    }
  }
);

const app = express();
app.use(express.json());

const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

// Setup routes for the server
const setupServer = async () => {
  await server.connect(transport);
};

app.post('/mcp', async (req: Request, res: Response) => {
  console.log('Received MCP request:', req.body);
  try {
      await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

// Start the server
const PORT = 1235;
setupServer().then(() => {
  app.listen(PORT, () => {
    console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to set up the server:', error);
  process.exit(1);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
    try {
      console.log(`Closing transport`);
      await transport.close();
    } catch (error) {
      console.error(`Error closing transport:`, error);
    }

  await server.close();
  console.log('Server shutdown complete');
  process.exit(0);
});