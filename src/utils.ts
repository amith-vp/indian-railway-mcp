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
  function processStatus(status: string): string {
    if (typeof status !== 'string') return status;
    if (status.startsWith("REGRET")) return "REGRET";
    if (status.includes('/')) return status.split('/').pop()?.trim() || status;
    return status;
  }
  if (data.status === "success" && data.classes && data.train_info) {
    const trainInfo = data.train_info;
    formattedText += `SEAT AVAILABILITY: ${trainInfo.train_number} ${trainInfo.train_name}\n`;
    formattedText += `Route: ${trainInfo.from_station} → ${trainInfo.to_station} | Quota: ${data.quota}\n\n`;
    const classNames = Object.keys(data.classes);
    formattedText += "Date       | Class | Status\n";
    formattedText += "-----------------------------\n";
    // Collect all dates for all classes
    const dateSet = new Set<string>();
    classNames.forEach(className => {
      const availArr = data.classes[className].availability;
      if (Array.isArray(availArr)) {
        availArr.forEach((entry: any) => dateSet.add(entry.date));
      }
    });
    const allDates = Array.from(dateSet).sort();
    // For each date, print status for each class
    allDates.forEach(date => {
      classNames.forEach((className, idx) => {
        const availArr = data.classes[className].availability;
        const entry = Array.isArray(availArr) ? availArr.find((e: any) => e.date === date) : undefined;
        const status = entry ? processStatus(entry.status) : "N/A";
        const dateDisplay = idx === 0 ? date : '          ';
        formattedText += `${dateDisplay} | ${className.padEnd(5)} | ${status}\n`;
      });
      formattedText += "-----------------------------\n";
    });
  } else if (data.status ==="error" && data.message ==="Invalid SOURCE/DESTINATION") {
    formattedText += "Invalid source or destination station.\n";
  }else if (data.status ==="error" && data.message ==="NO CLASS") {
    formattedText += "No reservation class available for this train.\n";
  }
  else {
    formattedText += "No seat availability information found for this train.\n";
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
