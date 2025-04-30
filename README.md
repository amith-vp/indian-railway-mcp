# Indian Railway MCP



## Claude Desktop Integration

> **Important:**
> First, install the latest version of `mcp-remote` globally:
>
> ```sh
> npm i -g mcp-remote
> ```


### Access the remote MCP server from Claude Desktop

1. **Open Claude Desktop** and go to:  
   `Settings` → `Developer` → `Edit Config`

2. **Replace/Add the config content** with:

```json
{
  "mcpServers": {
    "railways": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://railway-mcp.amithv.xyz/mcp"
      ]
    }
  }
}
```

3. **Restart Claude Desktop.**  
The tools will be available in Claude.

---

## Available Tools

Below are the available tools exposed by this MCP server, with a sample response for each. (Order: search, seat, train info, live status, delay, station code, train code)

### 1. Search-trains
- **Description:** Searches for available trains between two stations on a given date.
- **Sample response:**
  ```
  TRAINS FROM ERS TO SBC (20250415)
  
  Train    Name                Departure      Arrival        Duration  Classes  Days
  ---------------------------------------------------------------------------------
  12677    YPR SAMPARK KRANTI  ERS 06:45 → SBC 20:30  13h45m  2A,3A,SL  SMTWTFS
  16525    ISLAND EXPRESS      ERS 09:00 → SBC 23:55  14h55m  2A,3A,SL  SMTWTFS
  ...
  ```

### 2. Get-seat-availability
- **Description:** Checks seat availability for a train between two stations on upcoming dates. Returns a formatted text with train details, seat availability status (available or waitlisted), and fare information for different classes and dates.
- **Sample response:**
  ```
  SEAT AVAILABILITY: 12617 MANGALA LDWEEP EXP
  Route: ERS → NZM | Quota: GN
  
  Date       | Class | Status
  -----------------------------
  2025-04-16 | 2A    | AVAILABLE 2
             | 3A    | WL 5
             | SL    | AVAILABLE 10
  -----------------------------
  2025-04-17 | 2A    | AVAILABLE 5
             | 3A    | WL 5
             | SL    | REGRET
  -----------------------------
  ...
  ```

### 3. Get-train-info
- **Description:** Fetches detailed information about a specific Indian Railways train, including its route and schedule.
- **Sample response:**
  ```
  TRAIN 12617 MANGALA LDWEEP EXP (Superfast)
  Route: ERS-NZM
  Runs: SMTWTFS | Classes: 2A,3A,SL | Zone: SR
  Pantry Available | Booking: 120 days in advance
  
  COACH POSITION: EOG-SLR-2A-3A-3A-SLR
  
  SCHEDULE:
  Stn   Station Name       Dist   Arr    Dep    Platform  Halt
  --------------------------------------------------------------
  ERS   Ernakulam Jn       0     Origin 10:00   1        -
  MAJN  Mangalore Jn       400   14:00  14:10  2        10
  ...
  NZM   Hazrat Nizamuddin  2760  13:15  Terminus 5      -
  ```

### 4. Get-train-live-status
- **Description:** Fetches the current live running status of a specific train, including location, delays, and expected arrivals.
- **Sample response:**
  ```
  LIVE STATUS: Train 12617 on 2025-04-15
  
  Stn  Name            Dist    Platform  Arrival           Departure
  -------------------------------------------------------------------
  1.  Ernakulam Jn     0       PF:1      10:00 (On-time)   10:00 (On-time)
  2.  Mangalore Jn     400     PF:2      14:00 (14:05)     14:10 (14:15)
  ...
  25. Hazrat Nizamuddin 2760   PF:5      13:20 (13:25)     TERMINUS
  ```

### 5. Get-train-delay-info
- **Description:** Retrieves average delay information for a specific train at each station for a specified time period.
- **Sample response:**
  ```
  TRAIN 12617 MANGALA LDWEEP EXP (Superfast)
  Route: ERS-NZM | Runs: SMTWTFS
  Classes: 2A,3A,SL | Zone: SR
  
  DELAY STATISTICS (Period: Last Month)
  Station        Code   Avg Delay (mins)
  --------------------------------------
  Ernakulam Jn   ERS    2
  Mangalore Jn   MAJN   5
  ...
  Hazrat Nizamuddin NZM 10
  ```

### 6. Get-live-station-info
- **Description:** Retrieves live train schedule information for a specific Indian Railway station.
- **Sample response:**
  ```
  TRAINS AT NDLS STATION
  
  12002 BHOPAL SHTBDI (NDLS-BPL)
  PF:1 A:06:00/D:06:10 [Arr:On-time/Dep:On-time]
  ---
  12952 MUMBAI RAJDHANI (NDLS-BCT)
  PF:3 A:16:25/D:16:35 [Arr:+10/Dep:+10]
  ---
  ...
  ```

### 7. Get-station-code
- **Description:** Finds station code(s) by station name(s). Supports multiple names, variations, and case-insensitive matching.
- **Sample response:**
  ```
  Station search results:
  New Delhi: NDLS
  Trivandrum: TVC
  Matching 'Delhi':
  New Delhi: NDLS
  Old Delhi: DLI
  ...
  ```

### 8. Get-train-code
- **Description:** Finds train code (number) by train name. Supports multiple train names, variations, and case-insensitive matching.
- **Sample response:**
  ```
  Train search results:
  Rajdhani Express: 12951
  Shatabdi Express: 12001
  Matching 'Rajdhani':
  12951: Mumbai Rajdhani
  12952: Delhi Rajdhani
  ...
  ```

---

Each tool returns a formatted text response suitable for direct use in Claude or other MCP-compatible clients.
