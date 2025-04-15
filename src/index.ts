import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import Fuse from "fuse.js";
import { stationsData } from "./stationsData";
import { trainsData } from "./trainsData";
import {
  formatStationInfo,
  formatTrainInfo,
  formatTrainLiveStatus,
  formatSearchTrains,
  formatStationCodeResults,
  formatTrainDelayInfo,
  formatSeatStatus,
  formatTrainCodeResults
} from "./utils";

import { env } from "cloudflare:workers";

export class MyMCP extends McpAgent {
  server = new McpServer(
    {
      name: "Indian Railway MCP",
      version: "1.0.0",
    },
    {
      instructions:
        "Indian Railway MCP to fetch train and station information. Use the tools to get live status, schedule, and other details.",
    }
  );

  async init() {
  const apiURL = "https://railwayapi.amithv.xyz";
  
    // Tool: Get-live-station-info
    this.server.tool(
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
      async ({ station_code, exclude_memu, exclude_local, exclude_fast_emu, exclude_parcel_services, limit }) => {
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
              'Content-Type': 'application/json',            },
            body: JSON.stringify(requestBody)
          });
          const data = await response.json() as any;
          const formattedText = formatStationInfo(data, station_code);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't retrieve station information for ${station_code}. Error: ${errorMessage}` }] };
        }
      }
    );

    // Tool: Get-train-info
    this.server.tool(
      "Get-train-info",
      "Fetches detailed information about a specific Indian Railways train, including its route and schedule. Example: schedules for train 12617.",
      {
        train_number: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
      },
      async ({ train_number }) => {
        try {
          const requestBody = { train_number };
          const response = await fetch(`${apiURL}/train-schedule`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          const data = await response.json() as any;
          const formattedText = formatTrainInfo(data);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't retrieve train information for ${train_number}. Error: ${errorMessage}` }] };
        }
      }
    );

    // Tool: Get-train-live-status
    this.server.tool(
      "Get-train-live-status",
      "Fetches the current live running status of a specific train including location, delays, and expected arrivals. Returns a formatted text with station names, platforms, scheduled/actual arrival and departure times. Example: live status/live location for train 12617.",
      {
        train_no: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
        date: z.string().describe("The date in YYYY-MM-DD format for which to get live status"),
      },
      async ({ train_no, date }) => {
        try {
          const requestBody = { train_no, date };
          const response = await fetch(`${apiURL}/train-live`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          const data = await response.json() as any;
          const formattedText = formatTrainLiveStatus(data, train_no, date);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't retrieve live status for train ${train_no} on ${date} from. Error: ${errorMessage}` }] };
        }
      }
    );

    // Tool: Search-trains
    this.server.tool(
      "Search-trains",
      "Searches for available Indian Railways trains between two specified stations on a given date. Example: searchTrains from ERS to SBC on 20250415. Returns a formatted text list of trains with train numbers, names, departure/arrival stations and times, duration, running days, and available classes.",
      {
        from_station: z.string().describe("The official Indian Railways station code for the origin station (e.g., 'ERS')."),
        to_station: z.string().describe("The official Indian Railways station code for the destination station (e.g., 'SBC' for KSR Bengaluru)."),
        date: z.string().optional().describe("The date of travel in YYYYMMDD format (e.g., '20250415'). If omitted, the backend service defaults to the current date.")
      },
      async ({ from_station, to_station, date }) => {
        try {
          if (date && !/^\d{8}$/.test(date)) throw new Error("Invalid date format. Please use YYYYMMDD.");
          const requestBody: any = { from_station, to_station };
          if (date) requestBody.date = date;
          const response = await fetch(`${apiURL}/search-trains`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          const data = await response.json() as any;
          const formattedText = formatSearchTrains(data, from_station, to_station, date);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't search for trains between ${from_station} and ${to_station}. Error: ${errorMessage}` }] };
        }
      }
    );

    // Tool: Get-station-code
    this.server.tool(
      "Get-station-code",
      "Find station code by station name. Supports multiple station names, variations, and case-insensitive matching. Example: getStationCode for 'Delhi,Trivandrum' would return codes for both cities.",
      {
        station_name: z.string().describe("The name(s) of the railway station(s) (e.g., 'New Delhi' or multiple names separated by commas like 'Delhi,Mumbai,Chennai')."),
        variations: z.string().optional().describe("Variations of station names to search for (e.g., for 'Calcutta,Bangalore' specify 'Kolkata,Bengaluru').")
      },
      async ({ station_name, variations }) => {
        try {
          if (!station_name || station_name.trim() === '') throw new Error("Station name cannot be empty");
          const fuse = new Fuse<any>(stationsData, { includeScore: true, threshold: 0.4, keys: ['name'] });
          const stationNames = station_name.split(',').map(name => name.trim()).filter(name => name !== '');
          let variationNames: string[] = [];
          if (variations) variationNames = variations.split(',').map(name => name.trim()).filter(name => name !== '');
          const searchTerms = [...stationNames, ...variationNames];
          const uniqueStations: Record<string, any> = {};
          for (const term of searchTerms) {
            const searchResults = fuse.search(term).slice(0, 6);
            searchResults.forEach((result: any) => { uniqueStations[result.item.code] = result.item; });
          }
          const matchingStations = Object.values(uniqueStations);
          if (matchingStations.length === 0) {
            const termsText = searchTerms.join("', '");
            return { content: [{ type: "text", text: `No stations found matching '${termsText}'. Please try different names.` }] };
          }
          const resultsByTerm: Record<string, string[]> = {};
          for (const term of searchTerms) {
            const termResults = matchingStations.filter(station => station.name.toLowerCase().includes(term.toLowerCase()));
            if (termResults.length > 0) {
              resultsByTerm[term] = termResults.map(station => `${station.name}: ${station.code}`);
            }
          }
          const allTermMatches = Object.values(resultsByTerm).flat();
          const otherMatches = matchingStations.map(station => `${station.name}: ${station.code}`).filter(entry => !allTermMatches.includes(entry));
          if (otherMatches.length > 0) resultsByTerm['Other matches'] = otherMatches;
          const formattedText = formatStationCodeResults(matchingStations, resultsByTerm);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't retrieve station codes for '${station_name}'. Error: ${errorMessage}` }], isError: true };
        }
      }
    );

    // Tool: Get-train-delay-info
    this.server.tool(
      "Get-train-delay-info",
      "Retrieves average delay information for a specific train at each station. Shows train basic info and station-wise delay statistics for the specified time period. Example: any delay for train 12617 for the last month. Returns a formatted text with train name, number, route, and average delay at each station.",
      {
        train_number: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
        period: z.enum(['1w', '1m', '3m', '6m', '1y']).describe("Time period for delay statistics: '1w' (1 week), '1m' (1 month), '3m' (3 months), '6m' (6 months), or '1y' (1 year).")
      },
      async ({ train_number, period }) => {
        try {
          const requestBody = { train_number, period };
          const response = await fetch(`${apiURL}/train-delay`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          const data = await response.json() as any;
          const formattedText = formatTrainDelayInfo(data, period);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't retrieve delay information for train ${train_number} (period: ${period}). Error: ${errorMessage}` }] };
        }
      }
    );

    // Tool: Get-seat-availability
    this.server.tool(
      "Get-seat-availability",
      "Checks seat availability for a train between two stations on upcoming dates. Returns a formatted text with train details, seat availability status (available or waitlisted), and fare information for different classes and dates. Example: seat availability for train 12617 from NDLS to MAS.",
      {
        train_no: z.string().describe("The 5-digit Indian Railways train number (e.g., '12617' for Mangala Lakshadweep Exp)."),
        src_stn_code: z.string().describe("The official Indian Railways station code for the origin station (e.g., 'NDLS')."),
        dst_stn_code: z.string().describe("The official Indian Railways station code for the destination station (e.g., 'PNBE').")
      },
      async ({ train_no, src_stn_code, dst_stn_code }) => {
        try {
          const requestBody = { train_no, src_stn_code, dst_stn_code };
          const response = await fetch(`${apiURL}/seat-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          const data = await response.json() as any;
          const formattedText = formatSeatStatus(data);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't retrieve seat availability for train ${train_no} between ${src_stn_code} and ${dst_stn_code}. Error: ${errorMessage}` }] };
        }
      }
    );

    // Tool: Get-train-code
    this.server.tool(
      "Get-train-code",
      "Find train code (train number) by train name. Supports multiple train names, variations, and case-insensitive matching. Example: getTrainCode for 'Rajdhani,Shatabdi' would return codes for trains containing these names.",
      {
        train_name: z.string().describe("The name(s) of the train(s) to search for (e.g., 'Rajdhani' or multiple names separated by commas like 'Rajdhani,Shatabdi,Duronto')."),
        variations: z.string().optional().describe("Variations of train names to search for (e.g., for 'Express' specify 'Exp,SF Exp').")
      },
      async ({ train_name, variations }) => {
        try {
          if (!train_name || train_name.trim() === '') throw new Error("Train name cannot be empty");
          const fuse = new Fuse<any>(trainsData, { includeScore: true, threshold: 0.4, keys: ['name'] });
          const trainNames = train_name.split(',').map(name => name.trim()).filter(name => name !== '');
          let variationNames: string[] = [];
          if (variations) variationNames = variations.split(',').map(name => name.trim()).filter(name => name !== '');
          const searchTerms = [...trainNames, ...variationNames];
          const uniqueTrains: Record<string, any> = {};
          const MAX_RESULTS_PER_TERM = 6;
          for (const term of searchTerms) {
            const searchResults = fuse.search(term).slice(0, MAX_RESULTS_PER_TERM);
            searchResults.forEach((result: any) => { uniqueTrains[result.item.code] = result.item; });
          }
          const matchingTrains = Object.values(uniqueTrains);
          if (matchingTrains.length === 0) {
            const termsText = searchTerms.join("', '");
            return { content: [{ type: "text", text: `No trains found matching '${termsText}'. Please try different names.` }] };
          }
          const resultsByTerm: Record<string, string[]> = {};
          for (const term of searchTerms) {
            const termResults = matchingTrains.filter(train => train.name.toLowerCase().includes(term.toLowerCase()));
            if (termResults.length > 0) {
              resultsByTerm[term] = termResults.map(train => `${train.code}: ${train.name}`);
            }
          }
          const allTermMatches = Object.values(resultsByTerm).flat();
          const otherMatches = matchingTrains.map(train => `${train.code}: ${train.name}`).filter(entry => !allTermMatches.includes(entry));
          if (otherMatches.length > 0) resultsByTerm['Other matches'] = otherMatches;
          const formattedText = formatTrainCodeResults(matchingTrains, resultsByTerm);
          return { content: [{ type: "text", text: formattedText }] };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return { content: [{ type: "text", text: `Sorry, I couldn't retrieve train codes for '${train_name}'. Error: ${errorMessage}` }], isError: true };
        }
      }
    );
  }
}

// Export the mounted MCP handler
export default MyMCP.mount("/sse");
