import * as XLSX from 'xlsx';

export interface ColumnMetadata {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  uniqueCount: number;
  nullCount: number;
  min?: number | string;
  max?: number | string;
  avg?: number;
}

export interface SheetData {
  name: string;
  rows: any[];
  columns: ColumnMetadata[];
  rowCount: number;
}

export interface WorkbookData {
  sheets: SheetData[];
  activeSheetName: string;
}

/**
 * Parses raw array buffer from Excel file upload and extracts tabular structures and metadata.
 */
export function parseExcelWorkbook(arrayBuffer: ArrayBuffer): WorkbookData {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheets: SheetData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Convert worksheet to JSON (array of objects)
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    
    if (rows.length === 0) {
      continue;
    }

    // Get all unique columns across all rows
    const columnSet = new Set<string>();
    rows.forEach(row => {
      Object.keys(row as object).forEach(key => columnSet.add(key));
    });
    const columnNames = Array.from(columnSet);

    // Compute column metadata
    const columns: ColumnMetadata[] = columnNames.map(colName => {
      const values = rows
        .map(row => (row as any)[colName])
        .filter(val => val !== null && val !== undefined && val !== '');

      const nullCount = rows.length - values.length;

      // Inferred Type Check
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
          // Double check if all look like numbers
          const allNumeric = values.every(v => !isNaN(Number(v)) && typeof v !== 'boolean');
          if (allNumeric) {
            type = 'number';
          }
        }
      }

      // Unique values count
      const uniqueVals = new Set(values.map(v => (v instanceof Date ? v.getTime() : v)));
      const uniqueCount = uniqueVals.size;

      // Calculate stats for numbers
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
      } else if (type === 'date') {
        const dateValues = values.map(v => (v instanceof Date ? v.getTime() : new Date(v).getTime())).filter(t => !isNaN(t));
        if (dateValues.length > 0) {
          min = new Date(Math.min(...dateValues)).toISOString().split('T')[0];
          max = new Date(Math.max(...dateValues)).toISOString().split('T')[0];
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

    sheets.push({
      name: sheetName,
      rows,
      columns,
      rowCount: rows.length
    });
  }

  if (sheets.length === 0) {
    throw new Error('No readable data sheets found in Excel file.');
  }

  return {
    sheets,
    activeSheetName: sheets[0].name
  };
}

export interface AggregationRequest {
  chartType: 'bar' | 'horizontalBar' | 'line' | 'pie' | 'scatter' | 'bubble' | 'radar' | 'box' | 'stackedBar' | 'percentStackedBar' | 'area';
  title: string;
  xAxisColumn: string;
  yAxisColumn: string;
  aggregation: 'sum' | 'avg' | 'count' | 'none';
  zAxisColumn?: string;
  stackByColumn?: string;
  excludedCategories?: string[];
}

export interface AggregatedDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

/**
 * Aggregates raw sheet rows based on an aggregation request to produce chart-ready datasets.
 */
export function aggregateDataset(rows: any[], request: AggregationRequest): AggregatedDataPoint[] {
  const { xAxisColumn, yAxisColumn, aggregation } = request;
  const isStackedType = ['stackedBar', 'percentStackedBar', 'area', 'line', 'bar', 'horizontalBar', 'radar'].includes(request.chartType);
  const stackBy = isStackedType ? request.stackByColumn : undefined;

  // 1. Filter rows by excludedCategories at the source level
  let sourceRows = rows;
  if (request.excludedCategories && request.excludedCategories.length > 0 && xAxisColumn) {
    const exSet = new Set(request.excludedCategories.map(c => String(c).trim().toLowerCase()));
    sourceRows = rows.filter(row => {
      const xVal = String(row[xAxisColumn] ?? '').trim().toLowerCase();
      return !exSet.has(xVal);
    });
  }

  const computeFinal = (): AggregatedDataPoint[] => {
    // Handle pivot aggregation if stackBy is defined and exists in the request
    if (stackBy && xAxisColumn && yAxisColumn) {
      const groups: Record<string, Record<string, { sum: number; count: number }>> = {};

      for (const row of sourceRows) {
        let xVal = row[xAxisColumn];
        if (xVal === null || xVal === undefined) {
          xVal = 'N/A';
        } else if (xVal instanceof Date) {
          xVal = xVal.toLocaleDateString();
        } else {
          xVal = String(xVal);
        }

        let sVal = row[stackBy];
        if (sVal === null || sVal === undefined) {
          sVal = 'Unspecified';
        } else if (sVal instanceof Date) {
          sVal = sVal.toLocaleDateString();
        } else {
          sVal = String(sVal);
        }

        const rawYVal = row[yAxisColumn];
        const yVal = rawYVal !== null && rawYVal !== undefined ? Number(rawYVal) : 0;
        const finalY = isNaN(yVal) ? 0 : yVal;

        if (!groups[xVal]) {
          groups[xVal] = {};
        }
        if (!groups[xVal][sVal]) {
          groups[xVal][sVal] = { sum: 0, count: 0 };
        }

        groups[xVal][sVal].sum += finalY;
        groups[xVal][sVal].count += 1;
      }

      const results: AggregatedDataPoint[] = Object.keys(groups).map(xKey => {
        const sGroups = groups[xKey];
        const point: AggregatedDataPoint = {
          name: xKey,
          value: 0
        };

        let totalSum = 0;
        let totalCount = 0;

        Object.keys(sGroups).forEach(sKey => {
          const sub = sGroups[sKey];
          let val = 0;
          if (aggregation === 'sum' || aggregation === 'none') {
            val = sub.sum;
          } else if (aggregation === 'avg') {
            val = sub.sum / sub.count;
          } else if (aggregation === 'count') {
            val = sub.count;
          }
          point[sKey] = Number(val.toFixed(2));

          totalSum += sub.sum;
          totalCount += sub.count;
        });

        if (aggregation === 'sum' || aggregation === 'none') {
          point.value = Number(totalSum.toFixed(2));
        } else if (aggregation === 'avg') {
          point.value = totalCount > 0 ? Number((totalSum / totalCount).toFixed(2)) : 0;
        } else if (aggregation === 'count') {
          point.value = totalCount;
        }

        return point;
      });

      // Sort values descending (useful for bar/pie charts to show top categories)
      results.sort((a, b) => b.value - a.value);

      let finalResults = results;
      // If there are too many categories (e.g. >15), take top 10 and group the rest into "Other"
      if (results.length > 15) {
        const topTen = results.slice(0, 10);
        const rest = results.slice(10);
        const otherPoint: AggregatedDataPoint = {
          name: 'Other',
          value: 0
        };

        const allStackKeys = new Set<string>();
        rest.forEach(r => {
          Object.keys(r).forEach(k => {
            if (k !== 'name' && k !== 'value' && k !== 'z') {
              allStackKeys.add(k);
            }
          });
        });

        allStackKeys.forEach(sKey => {
          let sum = 0;
          let count = 0;
          rest.forEach(r => {
            if (r[sKey] !== undefined) {
              sum += r[sKey];
              count += 1;
            }
          });

          if (aggregation === 'avg') {
            otherPoint[sKey] = count > 0 ? Number((sum / count).toFixed(2)) : 0;
          } else {
            otherPoint[sKey] = Number(sum.toFixed(2));
          }
        });

        const sKeys = Array.from(allStackKeys);
        if (aggregation === 'avg') {
          const sum = sKeys.reduce((acc, k) => acc + (otherPoint[k] || 0), 0);
          otherPoint.value = sKeys.length > 0 ? Number((sum / sKeys.length).toFixed(2)) : 0;
        } else {
          otherPoint.value = Number(sKeys.reduce((acc, k) => acc + (otherPoint[k] || 0), 0).toFixed(2));
        }

        topTen.push(otherPoint);
        finalResults = topTen;
      }

      // Normalize stack values to sum to 100 if percentStackedBar
      if (request.chartType === 'percentStackedBar') {
        finalResults.forEach(point => {
          const sKeys = Object.keys(point).filter(k => k !== 'name' && k !== 'value' && k !== 'z');
          const pointSum = sKeys.reduce((sum, k) => sum + (point[k] || 0), 0);
          if (pointSum > 0) {
            sKeys.forEach(k => {
              point[k] = Number(((point[k] / pointSum) * 100).toFixed(2));
            });
          } else {
            sKeys.forEach(k => {
              point[k] = 0;
            });
          }
        });
      }

      return finalResults;
    }

    // Handle scatter plot or raw records (no aggregation required)
    if (aggregation === 'none' || !xAxisColumn || !yAxisColumn) {
      // Just map and sort raw records, limit to first 50 rows to keep graph readable
      return sourceRows
        .map(row => {
          const xVal = row[xAxisColumn];
          const yVal = Number(row[yAxisColumn]);
          const zVal = request.zAxisColumn ? Number(row[request.zAxisColumn]) : undefined;
          return {
            name: xVal instanceof Date ? xVal.toLocaleDateString() : String(xVal ?? 'Unknown'),
            value: isNaN(yVal) ? 0 : yVal,
            z: zVal !== undefined && !isNaN(zVal) ? zVal : 10 // Fallback size
          };
        })
        .slice(0, 50);
    }

    // Create groupings
    const groups: Record<string, { sum: number; count: number; values: number[] }> = {};

    for (const row of sourceRows) {
      let xVal = row[xAxisColumn];
      if (xVal === null || xVal === undefined) {
        xVal = 'N/A';
      } else if (xVal instanceof Date) {
        xVal = xVal.toLocaleDateString();
      } else {
        xVal = String(xVal);
      }

      const rawYVal = row[yAxisColumn];
      const yVal = rawYVal !== null && rawYVal !== undefined ? Number(rawYVal) : 0;
      const finalY = isNaN(yVal) ? 0 : yVal;

      if (!groups[xVal]) {
        groups[xVal] = { sum: 0, count: 0, values: [] };
      }

      groups[xVal].sum += finalY;
      groups[xVal].count += 1;
      groups[xVal].values.push(finalY);
    }

    const results: AggregatedDataPoint[] = Object.keys(groups).map(key => {
      const group = groups[key];
      let value = 0;

      if (aggregation === 'sum') {
        value = Number(group.sum.toFixed(2));
      } else if (aggregation === 'avg') {
        value = Number((group.sum / group.count).toFixed(2));
      } else if (aggregation === 'count') {
        value = group.count;
      }

      return {
        name: key,
        value
      };
    });

    // Sort values descending (useful for bar/pie charts to show top categories)
    results.sort((a, b) => b.value - a.value);

    // If there are too many categories (e.g. >15), take top 10 and group the rest into "Other"
    if (results.length > 15) {
      const topTen = results.slice(0, 10);
      const rest = results.slice(10);
      const otherSum = rest.reduce((sum, item) => sum + item.value, 0);

      let otherVal = otherSum;
      if (aggregation === 'avg') {
        otherVal = Number((otherSum / rest.length).toFixed(2));
      }

      topTen.push({
        name: 'Other',
        value: otherVal
      });

      return topTen;
    }

    return results;
  };

  let finalOutput = computeFinal();

  // 2. Post-filter results (e.g. removing synthetic categories like 'Other')
  if (request.excludedCategories && request.excludedCategories.length > 0) {
    const exSet = new Set(request.excludedCategories.map(c => String(c).trim().toLowerCase()));
    finalOutput = finalOutput.filter(item => !exSet.has(item.name.trim().toLowerCase()));
  }

  return finalOutput;
}
