import type { WorkbookData, SheetData, ColumnMetadata } from './dataEngine';

function createMockWorkbook(sheetName: string, rows: any[]): WorkbookData {
  const columnSet = new Set<string>();
  rows.forEach(row => {
    Object.keys(row).forEach(key => columnSet.add(key));
  });
  const columnNames = Array.from(columnSet);

  const columns: ColumnMetadata[] = columnNames.map(colName => {
    const values = rows
      .map(row => row[colName])
      .filter(val => val !== null && val !== undefined && val !== '');

    const nullCount = rows.length - values.length;
    let type: 'number' | 'string' | 'date' | 'boolean' = 'string';

    if (values.length > 0) {
      const firstVal = values[0];
      if (typeof firstVal === 'number') {
        type = 'number';
      } else if (firstVal instanceof Date) {
        type = 'date';
      } else if (typeof firstVal === 'boolean') {
        type = 'boolean';
      } else {
        const allNumeric = values.every(v => !isNaN(Number(v)) && typeof v !== 'boolean');
        if (allNumeric) {
          type = 'number';
        }
      }
    }

    const uniqueVals = new Set(values.map(v => (v instanceof Date ? v.getTime() : v)));
    const uniqueCount = uniqueVals.size;

    let min: any = undefined;
    let max: any = undefined;
    let avg: number | undefined = undefined;

    if (type === 'number') {
      const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
      if (numericValues.length > 0) {
        min = Math.min(...numericValues);
        max = Math.max(...numericValues);
        const sum = numericValues.reduce((a, b) => a + b, 0);
        avg = Number((sum / numericValues.length).toFixed(2));
      }
    }

    return {
      name: colName,
      type,
      uniqueCount,
      nullCount,
      min,
      max,
      avg
    };
  });

  const sheet: SheetData = {
    name: sheetName,
    rows,
    columns,
    rowCount: rows.length
  };

  return {
    sheets: [sheet],
    activeSheetName: sheetName
  };
}

// 1. PEMT Data (Public Emergency Medical Transportation)
const pemtRows = [
  { Month: 'July 2024', 'Run Volume': 1250, 'Transport Fee': 450, 'Avg Cost Per Transport': 620, 'Total Revenue': 562500, 'PEMT Supplement': 212500 },
  { Month: 'August 2024', 'Run Volume': 1310, 'Transport Fee': 450, 'Avg Cost Per Transport': 615, 'Total Revenue': 589500, 'PEMT Supplement': 216000 },
  { Month: 'September 2024', 'Run Volume': 1190, 'Transport Fee': 450, 'Avg Cost Per Transport': 630, 'Total Revenue': 535500, 'PEMT Supplement': 214200 },
  { Month: 'October 2024', 'Run Volume': 1420, 'Transport Fee': 460, 'Avg Cost Per Transport': 605, 'Total Revenue': 653200, 'PEMT Supplement': 206000 },
  { Month: 'November 2024', 'Run Volume': 1280, 'Transport Fee': 460, 'Avg Cost Per Transport': 625, 'Total Revenue': 588800, 'PEMT Supplement': 211000 },
  { Month: 'December 2024', 'Run Volume': 1350, 'Transport Fee': 460, 'Avg Cost Per Transport': 620, 'Total Revenue': 621000, 'PEMT Supplement': 215000 },
  { Month: 'January 2025', 'Run Volume': 1410, 'Transport Fee': 470, 'Avg Cost Per Transport': 610, 'Total Revenue': 662700, 'PEMT Supplement': 198000 },
  { Month: 'February 2025', 'Run Volume': 1200, 'Transport Fee': 470, 'Avg Cost Per Transport': 635, 'Total Revenue': 564000, 'PEMT Supplement': 198000 },
  { Month: 'March 2025', 'Run Volume': 1330, 'Transport Fee': 470, 'Avg Cost Per Transport': 615, 'Total Revenue': 625100, 'PEMT Supplement': 193000 },
  { Month: 'April 2025', 'Run Volume': 1290, 'Transport Fee': 470, 'Avg Cost Per Transport': 620, 'Total Revenue': 606300, 'PEMT Supplement': 193500 },
  { Month: 'May 2025', 'Run Volume': 1380, 'Transport Fee': 480, 'Avg Cost Per Transport': 610, 'Total Revenue': 662400, 'PEMT Supplement': 179400 },
  { Month: 'June 2025', 'Run Volume': 1450, 'Transport Fee': 480, 'Avg Cost Per Transport': 600, 'Total Revenue': 696000, 'PEMT Supplement': 174000 }
];

// 2. Personnel Hours and Pay
const personnelRows = [
  { 'Job Title': 'EMT-Basic', 'FTE Count': 18, 'Avg Hourly Rate': 24.50, 'Regular Hours': 37440, 'Overtime Hours': 5200, 'Total Regular Pay': 917280, 'Total Overtime Pay': 191100 },
  { 'Job Title': 'Paramedic', 'FTE Count': 24, 'Avg Hourly Rate': 31.00, 'Regular Hours': 49920, 'Overtime Hours': 8300, 'Total Regular Pay': 1547520, 'Total Overtime Pay': 385950 },
  { 'Job Title': 'Firefighter/EMT', 'FTE Count': 32, 'Avg Hourly Rate': 26.00, 'Regular Hours': 66560, 'Overtime Hours': 9400, 'Total Regular Pay': 1730560, 'Total Overtime Pay': 366600 },
  { 'Job Title': 'Captain/Shift Supervisor', 'FTE Count': 6, 'Avg Hourly Rate': 38.50, 'Regular Hours': 12480, 'Overtime Hours': 1850, 'Total Regular Pay': 480480, 'Total Overtime Pay': 106840 },
  { 'Job Title': 'Dispatcher', 'FTE Count': 8, 'Avg Hourly Rate': 21.00, 'Regular Hours': 16640, 'Overtime Hours': 2100, 'Total Regular Pay': 349440, 'Total Overtime Pay': 66150 },
  { 'Job Title': 'Fire Chief', 'FTE Count': 1, 'Avg Hourly Rate': 62.00, 'Regular Hours': 2080, 'Overtime Hours': 0, 'Total Regular Pay': 128960, 'Total Overtime Pay': 0 }
];

// 3. Emergency Room Arrival / CAD Data
const cadRows = [
  { 'Call Source': '911 Emergency Medical', 'Dispatch Time (sec)': 45, 'Response Time (min)': 6.2, 'Scene Time (min)': 14.5, 'Transport Time (min)': 11.2 },
  { 'Call Source': '911 Non-Urgent Response', 'Dispatch Time (sec)': 110, 'Response Time (min)': 14.8, 'Scene Time (min)': 9.8, 'Transport Time (min)': 17.3 },
  { 'Call Source': 'Mutual Aid Request', 'Dispatch Time (sec)': 90, 'Response Time (min)': 12.5, 'Scene Time (min)': 16.0, 'Transport Time (min)': 13.5 },
  { 'Call Source': 'Inter-Facility Transport', 'Dispatch Time (sec)': 175, 'Response Time (min)': 19.2, 'Scene Time (min)': 8.2, 'Transport Time (min)': 21.0 }
];

// Export pre-loaded workbooks matching the portal files
export const getMockWorkbook = (fileName: string): WorkbookData => {
  if (fileName.includes('PEMT Data')) {
    return createMockWorkbook('PEMT Reimbursement Summary', pemtRows);
  }
  if (fileName.includes('Personnel Hours')) {
    return createMockWorkbook('Personnel Expenses', personnelRows);
  }
  if (fileName.includes('Arrival Time') || fileName.includes('CAD Data')) {
    return createMockWorkbook('CAD Responses', cadRows);
  }
  // Default fallback PEMT Data
  return createMockWorkbook('PEMT Reimbursement Summary', pemtRows);
};
