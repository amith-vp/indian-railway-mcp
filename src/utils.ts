// Helper to generate the layout
import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";
import { marked } from "marked";

// This file mainly exists as a dumping ground for uninteresting html and CSS
// to remove clutter and noise from the auth logic. You likely do not need
// anything from this file.

export const layout = (content: HtmlEscapedString | string, title: string) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1.0"
			/>
			<title>${title}</title>
			<script src="https://cdn.tailwindcss.com"></script>
			<script>
				tailwind.config = {
					theme: {
						extend: {
							colors: {
								primary: "#3498db",
								secondary: "#2ecc71",
								accent: "#f39c12",
							},
							fontFamily: {
								sans: ["Inter", "system-ui", "sans-serif"],
								heading: ["Roboto", "system-ui", "sans-serif"],
							},
						},
					},
				};
			</script>
			<style>
				@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap");

				/* Custom styling for markdown content */
				.markdown h1 {
					font-size: 2.25rem;
					font-weight: 700;
					font-family: "Roboto", system-ui, sans-serif;
					color: #1a202c;
					margin-bottom: 1rem;
					line-height: 1.2;
				}

				.markdown h2 {
					font-size: 1.5rem;
					font-weight: 600;
					font-family: "Roboto", system-ui, sans-serif;
					color: #2d3748;
					margin-top: 1.5rem;
					margin-bottom: 0.75rem;
					line-height: 1.3;
				}

				.markdown h3 {
					font-size: 1.25rem;
					font-weight: 600;
					font-family: "Roboto", system-ui, sans-serif;
					color: #2d3748;
					margin-top: 1.25rem;
					margin-bottom: 0.5rem;
				}

				.markdown p {
					font-size: 1.125rem;
					color: #4a5568;
					margin-bottom: 1rem;
					line-height: 1.6;
				}

				.markdown a {
					color: #3498db;
					font-weight: 500;
					text-decoration: none;
				}

				.markdown a:hover {
					text-decoration: underline;
				}

				.markdown blockquote {
					border-left: 4px solid #f39c12;
					padding-left: 1rem;
					padding-top: 0.75rem;
					padding-bottom: 0.75rem;
					margin-top: 1.5rem;
					margin-bottom: 1.5rem;
					background-color: #fffbeb;
					font-style: italic;
				}

				.markdown blockquote p {
					margin-bottom: 0.25rem;
				}

				.markdown ul,
				.markdown ol {
					margin-top: 1rem;
					margin-bottom: 1rem;
					margin-left: 1.5rem;
					font-size: 1.125rem;
					color: #4a5568;
				}

				.markdown li {
					margin-bottom: 0.5rem;
				}

				.markdown ul li {
					list-style-type: disc;
				}

				.markdown ol li {
					list-style-type: decimal;
				}

				.markdown pre {
					background-color: #f7fafc;
					padding: 1rem;
					border-radius: 0.375rem;
					margin-top: 1rem;
					margin-bottom: 1rem;
					overflow-x: auto;
				}

				.markdown code {
					font-family: monospace;
					font-size: 0.875rem;
					background-color: #f7fafc;
					padding: 0.125rem 0.25rem;
					border-radius: 0.25rem;
				}

				.markdown pre code {
					background-color: transparent;
					padding: 0;
				}
			</style>
		</head>
		<body
			class="bg-gray-50 text-gray-800 font-sans leading-relaxed flex flex-col min-h-screen"
		>
			<header class="bg-white shadow-sm mb-8">
				<div
					class="container mx-auto px-4 py-4 flex justify-between items-center"
				>
					<a
						href="/"
						class="text-xl font-heading font-bold text-primary hover:text-primary/80 transition-colors"
						>MCP Remote Auth Demo</a
					>
				</div>
			</header>
			<main class="container mx-auto px-4 pb-12 flex-grow">
				${content}
			</main>
			<footer class="bg-gray-100 py-6 mt-12">
				<div class="container mx-auto px-4 text-center text-gray-600">
					<p>
						&copy; ${new Date().getFullYear()} MCP Remote Auth Demo.
						All rights reserved.
					</p>
				</div>
			</footer>
		</body>
	</html>
`;

export const homeContent = async (req: Request): Promise<HtmlEscapedString> => {
	// We have the README symlinked into the static directory, so we can fetch it
	// and render it into HTML
	const origin = new URL(req.url).origin;
	const res = await fetch(`${origin}/README.md`);
	const markdown = await res.text();
	const content = await marked(markdown);
	return html`
		<div class="max-w-4xl mx-auto markdown">${raw(content)}</div>
	`;
};

// Formatting helpers for MCP tool outputs

export function formatStationInfo(data: any, station_code: string): string {
  let formattedText = `TRAINS AT ${station_code} STATION\n\n`;
  if (data.status === "success" && Array.isArray(data.data) && data.data.length > 0) {
    (data.data as any[]).forEach((train: any) => {
      formattedText += `${train.train_no} ${train.train_name} (${train.src}-${train.dest})\n`;
      let schedInfo = "";
      if (train.tt_arr === "--") schedInfo = `D:${train.tt_dept}`;
      else if (train.tt_dept === "--") schedInfo = `A:${train.tt_arr}`;
      else schedInfo = `A:${train.tt_arr}/D:${train.tt_dept}`;
      formattedText += `PF:${train.tt_pf} ${schedInfo} `;
      if (train.exp_arr === "Source") formattedText += `[ORIGIN]`;
      else if (train.exp_dept === "Destination") formattedText += `[TERMINUS]`;
      else {
        const arrStatus = train.exp_arr_delay === "RT" ? "On-time" : `+${train.exp_arr_delay}`;
        const deptStatus = train.exp_dept_delay === "RT" ? "On-time" : `+${train.exp_dept_delay}`;
        formattedText += `[Arr:${arrStatus}/Dep:${deptStatus}]`;
      }
      formattedText += `\n---\n`;
    });
  } else {
    formattedText += "No train information available for this station.\n";
  }
  return formattedText;
}

export function formatTrainInfo(data: any): string {
  let formattedText = "";
  if (data.trainInfo) {
    const ti = data.trainInfo;
    formattedText += `TRAIN ${ti.number} ${ti.name} (${ti.type})\n`;
    formattedText += `Route: ${ti.route}\n`;
    formattedText += `Runs: ${ti.runningDays} | Classes: ${ti.availableClasses} | Zone: ${ti.zone}\n`;
    formattedText += `${ti.pantryAvailable ? "Pantry Available" : "No Pantry"} | Booking: ${ti.arp} days in advance\n\n`;
    if (ti.coachPosition) {
      formattedText += "COACH POSITION: ";
      const coaches = Object.entries(ti.coachPosition).map(([_, code]) => code).join("-");
      formattedText += `${coaches}\n\n`;
    }
    formattedText += "SCHEDULE:\n";
    formattedText += "Stn   Station Name       Dist   Arr    Dep    Platform  Halt\n";
    formattedText += "--------------------------------------------------------------\n";
    if (Array.isArray(data.scheduleDetails)) {
      (data.scheduleDetails as any[]).forEach((station: any) => {
        const arrTime = station.arrivalTime === "Source" ? "Origin" : station.arrivalTime;
        const depTime = station.departureTime === "Destination" ? "Terminus" : station.departureTime;
        const stationName = station.stationName.padEnd(18).substring(0, 18);
        formattedText += `${station.stationCode.padEnd(6)}${stationName} ${station.distance.toString().padStart(5)} ${arrTime.padStart(6)} ${depTime.padStart(6)} ${station.platform.padStart(6)}   ${station.haltTime || "-"}\n`;
      });
    }
  } else {
    formattedText = "No train information available.";
  }
  return formattedText;
}

export function formatTrainLiveStatus(data: any, train_no: string, date: string): string {
  let formattedText = `LIVE STATUS: Train ${train_no} on ${date}\n\n`;
  if (data.status === "success" && Array.isArray(data.data) && data.data.length > 0) {
    formattedText += "Stn  Name            Dist    Platform  Arrival           Departure\n";
    formattedText += "-------------------------------------------------------------------\n";
    (data.data as any[]).forEach((station: any) => {
      const stationName = station.name.length > 14 ? station.name.substring(0, 14) : station.name.padEnd(14);
      formattedText += `${station.index.padStart(2)}. ${stationName} `;
      formattedText += `${station.s_dist.padEnd(8)} ${("PF:" + station.pf).padEnd(6)} `;
      const arrTime = station.tt_arr === "Source" ? "ORIGIN" : formatTimeStatus(station.tt_arr, station.act_arr);
      const depTime = station.tt_dept === "Destination" ? "TERMINUS" : formatTimeStatus(station.tt_dept, station.act_dept);
      formattedText += `${arrTime.padEnd(16)} ${depTime}\n`;
    });
  } else {
    formattedText += "No live status available for this train on the specified date.\n";
  }
  return formattedText;
  function formatTimeStatus(scheduled: string, actual: string): string {
    if (scheduled === "N/A" || actual === "N/A") return "N/A";
    const getTimeOnly = (dateTimeStr: string) => {
      const timeMatch = dateTimeStr.match(/T(\d{2}:\d{2}):/);
      return timeMatch ? timeMatch[1] : "??:??";
    };
    const schedTime = getTimeOnly(scheduled);
    const actTime = getTimeOnly(actual);
    if (schedTime === actTime) return schedTime + " (On-time)";
    else return schedTime + " (" + actTime + ")";
  }
}

export function formatSearchTrains(data: any, from_station: string, to_station: string, date?: string): string {
  let formattedText = `TRAINS FROM ${from_station} TO ${to_station} (${date || 'Today'})\n\n`;
  if (data.trains && Array.isArray(data.trains) && data.trains.length > 0) {
    formattedText += "Train    Name                Departure      Arrival        Duration  Classes  Days\n";
    formattedText += "---------------------------------------------------------------------------------\n";
    (data.trains as any[]).forEach((train: any) => {
      const trainName = train.trainName.length > 20 ? train.trainName.substring(0, 17) + "..." : train.trainName.padEnd(20);
      formattedText += `${train.trainNumber} ${trainName} `;
      formattedText += `${train.departureStation} ${train.departureTime} → ${train.arrivalStation} ${train.arrivalTime} `;
      formattedText += `${train.duration.padEnd(9)}`;
      formattedText += `${train.classAvailability.join(",").padEnd(8)} `;
      const days = train.runningDays.map((day: string) => day.charAt(0)).join("");
      formattedText += `${days}\n`;
    });
  } else {
    formattedText += "No trains found between these stations on the specified date.\n";
  }
  return formattedText;
}

export function formatStationCodeResults(matchingStations: any[], resultsByTerm: Record<string, string[]>): string {
  let resultText = '';
  if (Object.keys(resultsByTerm).length > 1) {
    for (const [term, matches] of Object.entries(resultsByTerm)) {
      resultText += `Matching '${term}':\n${matches.join('\n')}\n\n`;
    }
  } else {
    resultText = matchingStations.map(station => `${station.name}: ${station.code}`).join('\n');
  }
  return `Station search results:\n${resultText}`;
}

export function formatTrainDelayInfo(data: any, period: string): string {
  let formattedText = "";
  if (data.trainInfo) {
    const ti = data.trainInfo;
    formattedText += `TRAIN ${ti.number} ${ti.name} (${ti.type})\n`;
    formattedText += `Route: ${ti.route} | Runs: ${ti.runningDays}\n`;
    formattedText += `Classes: ${ti.availableClasses} | Zone: ${ti.zone}\n\n`;
  }
  formattedText += `DELAY STATISTICS (Period: ${getPeriodText(period)})\n`;
  formattedText += "Station        Code   Avg Delay (mins)\n";
  formattedText += "--------------------------------------\n";
  if (data.delayDetails && Array.isArray(data.delayDetails)) {
    (data.delayDetails as any[]).forEach((station: any) => {
      const stationName = station.stationName.length > 13 ? station.stationName.substring(0, 12) + "." : station.stationName.padEnd(13);
      const stationCode = station.stationCode.padEnd(6);
      const delayMinutes = station.avgDelayMinutes.toString().padStart(3);
      formattedText += `${stationName} ${stationCode} ${delayMinutes}\n`;
    });
  } else {
    formattedText += "No delay data available for this train.\n";
  }
  if (data.timestamp) formattedText += `\nData as of: ${data.timestamp}\n`;
  return formattedText;
  function getPeriodText(period: string): string {
    const periodMap: {[key: string]: string} = {
      '1w': 'Last Week', '1m': 'Last Month', '3m': 'Last 3 Months', '6m': 'Last 6 Months', '1y': 'Last Year'
    };
    return periodMap[period] || period;
  }
}

export function formatSeatStatus(data: any): string {
  let formattedText = "";
  if (data.status === "success" && data.data) {
    const trainData = data.data;
    formattedText += `SEAT AVAILABILITY: ${trainData.train_no} ${trainData.train_name}\n`;
    formattedText += `Route: ${trainData.from_station} → ${trainData.to_station} | Quota: ${trainData.quota}\n\n`;
    const fareByClass: Record<string, string> = {};
    if (Array.isArray(trainData.availability) && trainData.availability.length > 0) {
      const firstDateClasses = trainData.availability[0].classes;
      Object.entries(firstDateClasses).forEach(([className, info]: [string, any]) => {
        fareByClass[className] = info.fare;
      });
    }
    formattedText += "Available Classes and Fares:\n";
    Object.entries(fareByClass).forEach(([className, fare]) => {
      formattedText += `${className}: ₹${fare}  `;
    });
    formattedText += "\n\n";
    formattedText += "Date       | Class | Status\n";
    formattedText += "-----------------------------\n";
    if (Array.isArray(trainData.availability)) {
      trainData.availability.forEach((dateData: { date: string; classes: Record<string, { status: string; fare: string }> }) => {
        const date = dateData.date;
        const classes = dateData.classes;
        Object.entries(classes).forEach(([className, info]: [string, any], idx) => {
          const status = info.status;
          const dateDisplay = idx === 0 ? date : '          ';
          formattedText += `${dateDisplay} | ${className.padEnd(5)} | ${status}\n`;
        });
        formattedText += "-----------------------------\n";
      });
    }
  } else {
    formattedText += "No seat availability information found for this train and route.\n";
  }
  return formattedText;
}

export function formatTrainCodeResults(matchingTrains: any[], resultsByTerm: Record<string, string[]>): string {
  let resultText = '';
  if (Object.keys(resultsByTerm).length > 1) {
    for (const [term, matches] of Object.entries(resultsByTerm)) {
      resultText += `Matching '${term}':\n${matches.join('\n')}\n\n`;
    }
  } else {
    resultText = matchingTrains.map(train => `${train.code}: ${train.name}`).join('\n');
  }
  return `Train search results:\n${resultText}`;
}
