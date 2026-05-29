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
  // EMT-Basic
  { 'Employee ID': 'EMP-001', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 23.50, 'Regular Hours': 2080, 'Overtime Hours': 120, 'Total Regular Pay': 48880, 'Total Overtime Pay': 4230 },
  { 'Employee ID': 'EMP-002', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 24.00, 'Regular Hours': 2080, 'Overtime Hours': 250, 'Total Regular Pay': 49920, 'Total Overtime Pay': 9000 },
  { 'Employee ID': 'EMP-003', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 25.50, 'Regular Hours': 2080, 'Overtime Hours': 450, 'Total Regular Pay': 53040, 'Total Overtime Pay': 17210 },
  { 'Employee ID': 'EMP-004', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 22.00, 'Regular Hours': 2080, 'Overtime Hours': 80, 'Total Regular Pay': 45760, 'Total Overtime Pay': 2640 },
  { 'Employee ID': 'EMP-005', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 28.50, 'Regular Hours': 2080, 'Overtime Hours': 320, 'Total Regular Pay': 59280, 'Total Overtime Pay': 13680 },
  { 'Employee ID': 'EMP-006', 'Job Title': 'EMT-Basic', 'FTE Count': 0.5, 'Avg Hourly Rate': 24.50, 'Regular Hours': 1040, 'Overtime Hours': 40, 'Total Regular Pay': 25480, 'Total Overtime Pay': 1470 },
  { 'Employee ID': 'EMP-007', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 23.00, 'Regular Hours': 2080, 'Overtime Hours': 180, 'Total Regular Pay': 47840, 'Total Overtime Pay': 6210 },
  { 'Employee ID': 'EMP-008', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 24.50, 'Regular Hours': 2080, 'Overtime Hours': 290, 'Total Regular Pay': 50960, 'Total Overtime Pay': 10650 },
  { 'Employee ID': 'EMP-009', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 26.00, 'Regular Hours': 2080, 'Overtime Hours': 310, 'Total Regular Pay': 54080, 'Total Overtime Pay': 12090 },
  { 'Employee ID': 'EMP-010', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 15.00, 'Regular Hours': 2080, 'Overtime Hours': 150, 'Total Regular Pay': 31200, 'Total Overtime Pay': 3375 },
  { 'Employee ID': 'EMP-011', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 25.00, 'Regular Hours': 2080, 'Overtime Hours': 140, 'Total Regular Pay': 52000, 'Total Overtime Pay': 5250 },
  { 'Employee ID': 'EMP-012', 'Job Title': 'EMT-Basic', 'FTE Count': 1.0, 'Avg Hourly Rate': 23.50, 'Regular Hours': 2080, 'Overtime Hours': 200, 'Total Regular Pay': 48880, 'Total Overtime Pay': 7050 },

  // Paramedic
  { 'Employee ID': 'EMP-013', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 30.50, 'Regular Hours': 2080, 'Overtime Hours': 310, 'Total Regular Pay': 63440, 'Total Overtime Pay': 14180 },
  { 'Employee ID': 'EMP-014', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 32.00, 'Regular Hours': 2080, 'Overtime Hours': 420, 'Total Regular Pay': 66560, 'Total Overtime Pay': 20160 },
  { 'Employee ID': 'EMP-015', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 29.50, 'Regular Hours': 2080, 'Overtime Hours': 150, 'Total Regular Pay': 61360, 'Total Overtime Pay': 6630 },
  { 'Employee ID': 'EMP-016', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 34.00, 'Regular Hours': 2080, 'Overtime Hours': 480, 'Total Regular Pay': 70720, 'Total Overtime Pay': 24480 },
  { 'Employee ID': 'EMP-017', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 31.00, 'Regular Hours': 2080, 'Overtime Hours': 220, 'Total Regular Pay': 64480, 'Total Overtime Pay': 10230 },
  { 'Employee ID': 'EMP-018', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 28.00, 'Regular Hours': 2080, 'Overtime Hours': 180, 'Total Regular Pay': 58240, 'Total Overtime Pay': 7560 },
  { 'Employee ID': 'EMP-019', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 31.50, 'Regular Hours': 2080, 'Overtime Hours': 350, 'Total Regular Pay': 65520, 'Total Overtime Pay': 16530 },
  { 'Employee ID': 'EMP-020', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 35.00, 'Regular Hours': 2080, 'Overtime Hours': 510, 'Total Regular Pay': 72800, 'Total Overtime Pay': 26770 },
  { 'Employee ID': 'EMP-021', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 46.00, 'Regular Hours': 2080, 'Overtime Hours': 200, 'Total Regular Pay': 95680, 'Total Overtime Pay': 13800 },
  { 'Employee ID': 'EMP-022', 'Job Title': 'Paramedic', 'FTE Count': 1.0, 'Avg Hourly Rate': 30.00, 'Regular Hours': 2080, 'Overtime Hours': 280, 'Total Regular Pay': 62400, 'Total Overtime Pay': 12600 },

  // Firefighter/EMT
  { 'Employee ID': 'EMP-023', 'Job Title': 'Firefighter/EMT', 'FTE Count': 1.0, 'Avg Hourly Rate': 25.00, 'Regular Hours': 2080, 'Overtime Hours': 240, 'Total Regular Pay': 52000, 'Total Overtime Pay': 9000 },
  { 'Employee ID': 'EMP-024', 'Job Title': 'Firefighter/EMT', 'FTE Count': 1.0, 'Avg Hourly Rate': 26.50, 'Regular Hours': 2080, 'Overtime Hours': 380, 'Total Regular Pay': 55120, 'Total Overtime Pay': 15100 },
  { 'Employee ID': 'EMP-025', 'Job Title': 'Firefighter/EMT', 'FTE Count': 1.0, 'Avg Hourly Rate': 27.00, 'Regular Hours': 2080, 'Overtime Hours': 450, 'Total Regular Pay': 56160, 'Total Overtime Pay': 18225 },
  { 'Employee ID': 'EMP-026', 'Job Title': 'Firefighter/EMT', 'FTE Count': 1.0, 'Avg Hourly Rate': 24.50, 'Regular Hours': 2080, 'Overtime Hours': 190, 'Total Regular Pay': 50960, 'Total Overtime Pay': 6980 },
  { 'Employee ID': 'EMP-027', 'Job Title': 'Firefighter/EMT', 'FTE Count': 1.0, 'Avg Hourly Rate': 26.00, 'Regular Hours': 2080, 'Overtime Hours': 310, 'Total Regular Pay': 54080, 'Total Overtime Pay': 12090 },
  { 'Employee ID': 'EMP-028', 'Job Title': 'Firefighter/EMT', 'FTE Count': 1.0, 'Avg Hourly Rate': 28.00, 'Regular Hours': 2080, 'Overtime Hours': 400, 'Total Regular Pay': 58240, 'Total Overtime Pay': 16800 },
  { 'Employee ID': 'EMP-029', 'Job Title': 'Firefighter/EMT', 'FTE Count': 1.0, 'Avg Hourly Rate': 25.50, 'Regular Hours': 2080, 'Overtime Hours': 220, 'Total Regular Pay': 53040, 'Total Overtime Pay': 8415 },

  // Captain/Shift Supervisor
  { 'Employee ID': 'EMP-030', 'Job Title': 'Captain/Shift Supervisor', 'FTE Count': 1.0, 'Avg Hourly Rate': 37.00, 'Regular Hours': 2080, 'Overtime Hours': 150, 'Total Regular Pay': 76960, 'Total Overtime Pay': 8325 },
  { 'Employee ID': 'EMP-031', 'Job Title': 'Captain/Shift Supervisor', 'FTE Count': 1.0, 'Avg Hourly Rate': 39.00, 'Regular Hours': 2080, 'Overtime Hours': 280, 'Total Regular Pay': 81120, 'Total Overtime Pay': 16380 },
  { 'Employee ID': 'EMP-032', 'Job Title': 'Captain/Shift Supervisor', 'FTE Count': 1.0, 'Avg Hourly Rate': 38.00, 'Regular Hours': 2080, 'Overtime Hours': 210, 'Total Regular Pay': 79040, 'Total Overtime Pay': 11970 },
  { 'Employee ID': 'EMP-033', 'Job Title': 'Captain/Shift Supervisor', 'FTE Count': 1.0, 'Avg Hourly Rate': 41.50, 'Regular Hours': 2080, 'Overtime Hours': 340, 'Total Regular Pay': 86320, 'Total Overtime Pay': 21160 },

  // Dispatcher
  { 'Employee ID': 'EMP-034', 'Job Title': 'Dispatcher', 'FTE Count': 1.0, 'Avg Hourly Rate': 20.00, 'Regular Hours': 2080, 'Overtime Hours': 120, 'Total Regular Pay': 41600, 'Total Overtime Pay': 3600 },
  { 'Employee ID': 'EMP-035', 'Job Title': 'Dispatcher', 'FTE Count': 1.0, 'Avg Hourly Rate': 21.50, 'Regular Hours': 2080, 'Overtime Hours': 280, 'Total Regular Pay': 44720, 'Total Overtime Pay': 9030 },
  { 'Employee ID': 'EMP-036', 'Job Title': 'Dispatcher', 'FTE Count': 1.0, 'Avg Hourly Rate': 22.50, 'Regular Hours': 2080, 'Overtime Hours': 190, 'Total Regular Pay': 46800, 'Total Overtime Pay': 6410 },
  { 'Employee ID': 'EMP-037', 'Job Title': 'Dispatcher', 'FTE Count': 1.0, 'Avg Hourly Rate': 19.50, 'Regular Hours': 2080, 'Overtime Hours': 80, 'Total Regular Pay': 40560, 'Total Overtime Pay': 2340 },
  { 'Employee ID': 'EMP-038', 'Job Title': 'Dispatcher', 'FTE Count': 1.0, 'Avg Hourly Rate': 21.00, 'Regular Hours': 2080, 'Overtime Hours': 220, 'Total Regular Pay': 43680, 'Total Overtime Pay': 6930 },

  // Fire Chief
  { 'Employee ID': 'EMP-039', 'Job Title': 'Fire Chief', 'FTE Count': 1.0, 'Avg Hourly Rate': 62.00, 'Regular Hours': 2080, 'Overtime Hours': 0, 'Total Regular Pay': 128960, 'Total Overtime Pay': 0 }
];

// 3. Emergency Room Arrival / CAD Data
const cadRows = [
  // 911 Emergency Medical
  { 'Incident ID': 'CAD-001', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 42, 'Response Time (min)': 5.5, 'Scene Time (min)': 13.0, 'Transport Time (min)': 10.5 },
  { 'Incident ID': 'CAD-002', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 48, 'Response Time (min)': 6.8, 'Scene Time (min)': 15.2, 'Transport Time (min)': 12.0 },
  { 'Incident ID': 'CAD-003', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 35, 'Response Time (min)': 4.2, 'Scene Time (min)': 12.5, 'Transport Time (min)': 8.5 },
  { 'Incident ID': 'CAD-004', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 55, 'Response Time (min)': 8.5, 'Scene Time (min)': 18.0, 'Transport Time (min)': 14.2 },
  { 'Incident ID': 'CAD-005', 'Call Source': '911 Emergency Medical', 'Disposition': 'Refusal of Care', 'Dispatch Time (sec)': 40, 'Response Time (min)': 6.0, 'Scene Time (min)': 14.0, 'Transport Time (min)': 0 },
  { 'Incident ID': 'CAD-006', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 44, 'Response Time (min)': 5.8, 'Scene Time (min)': 14.8, 'Transport Time (min)': 11.0 },
  { 'Incident ID': 'CAD-007', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 50, 'Response Time (min)': 7.2, 'Scene Time (min)': 16.5, 'Transport Time (min)': 11.5 },
  { 'Incident ID': 'CAD-008', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 46, 'Response Time (min)': 6.4, 'Scene Time (min)': 13.8, 'Transport Time (min)': 12.5 },
  { 'Incident ID': 'CAD-009', 'Call Source': '911 Emergency Medical', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 52, 'Response Time (min)': 14.2, 'Scene Time (min)': 15.0, 'Transport Time (min)': 13.0 },

  // 911 Non-Urgent Response
  { 'Incident ID': 'CAD-010', 'Call Source': '911 Non-Urgent Response', 'Disposition': 'Refusal of Care', 'Dispatch Time (sec)': 120, 'Response Time (min)': 13.5, 'Scene Time (min)': 10.5, 'Transport Time (min)': 0 },
  { 'Incident ID': 'CAD-011', 'Call Source': '911 Non-Urgent Response', 'Disposition': 'Refusal of Care', 'Dispatch Time (sec)': 110, 'Response Time (min)': 15.0, 'Scene Time (min)': 9.0, 'Transport Time (min)': 0 },
  { 'Incident ID': 'CAD-012', 'Call Source': '911 Non-Urgent Response', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 130, 'Response Time (min)': 16.5, 'Scene Time (min)': 11.2, 'Transport Time (min)': 18.0 },
  { 'Incident ID': 'CAD-013', 'Call Source': '911 Non-Urgent Response', 'Disposition': 'Refusal of Care', 'Dispatch Time (sec)': 95, 'Response Time (min)': 12.0, 'Scene Time (min)': 8.5, 'Transport Time (min)': 0 },
  { 'Incident ID': 'CAD-014', 'Call Source': '911 Non-Urgent Response', 'Disposition': 'Refusal of Care', 'Dispatch Time (sec)': 105, 'Response Time (min)': 14.2, 'Scene Time (min)': 9.8, 'Transport Time (min)': 0 },
  { 'Incident ID': 'CAD-015', 'Call Source': '911 Non-Urgent Response', 'Disposition': 'Refusal of Care', 'Dispatch Time (sec)': 115, 'Response Time (min)': 15.8, 'Scene Time (min)': 10.0, 'Transport Time (min)': 0 },

  // Mutual Aid Request
  { 'Incident ID': 'CAD-016', 'Call Source': 'Mutual Aid Request', 'Disposition': 'Transferred to Partner', 'Dispatch Time (sec)': 85, 'Response Time (min)': 11.5, 'Scene Time (min)': 15.5, 'Transport Time (min)': 12.0 },
  { 'Incident ID': 'CAD-017', 'Call Source': 'Mutual Aid Request', 'Disposition': 'Transferred to Partner', 'Dispatch Time (sec)': 95, 'Response Time (min)': 13.0, 'Scene Time (min)': 16.8, 'Transport Time (min)': 14.0 },
  { 'Incident ID': 'CAD-018', 'Call Source': 'Mutual Aid Request', 'Disposition': 'Transferred to Partner', 'Dispatch Time (sec)': 90, 'Response Time (min)': 12.5, 'Scene Time (min)': 16.0, 'Transport Time (min)': 13.5 },
  { 'Incident ID': 'CAD-019', 'Call Source': 'Mutual Aid Request', 'Disposition': 'Transferred to Partner', 'Dispatch Time (sec)': 100, 'Response Time (min)': 14.0, 'Scene Time (min)': 17.5, 'Transport Time (min)': 15.0 },

  // Inter-Facility Transport
  { 'Incident ID': 'CAD-020', 'Call Source': 'Inter-Facility Transport', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 180, 'Response Time (min)': 19.5, 'Scene Time (min)': 8.0, 'Transport Time (min)': 22.0 },
  { 'Incident ID': 'CAD-021', 'Call Source': 'Inter-Facility Transport', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 170, 'Response Time (min)': 18.2, 'Scene Time (min)': 7.5, 'Transport Time (min)': 20.5 },
  { 'Incident ID': 'CAD-022', 'Call Source': 'Inter-Facility Transport', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 160, 'Response Time (min)': 17.0, 'Scene Time (min)': 8.5, 'Transport Time (min)': 19.5 },
  { 'Incident ID': 'CAD-023', 'Call Source': 'Inter-Facility Transport', 'Disposition': 'Transported to ER', 'Dispatch Time (sec)': 190, 'Response Time (min)': 22.0, 'Scene Time (min)': 9.0, 'Transport Time (min)': 23.0 }
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
