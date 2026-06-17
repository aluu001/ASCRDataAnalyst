import { useState, useMemo, useEffect } from 'react';
import { 
  BarChart2, 
  ArrowLeft, 
  TrendingUp,
  FileSpreadsheet,
  Database,
  Sliders,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Printer,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Users,
  Clock,
  DollarSign,
  ShieldCheck,
  Minimize2
} from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { DataPreview } from './components/DataPreview';
import { ChatPanel } from './components/ChatPanel';
import { InsightChart } from './components/InsightChart';
import { queryGeminiAnalyst } from './utils/gemini';
import { getMockWorkbook } from './utils/mockData';
import type { WorkbookData, SheetData } from './utils/dataEngine';
import type { ChatMessage, ChartSpecification } from './utils/gemini';

// Helper to format basic inline markdown bolding, backticks, and line breaks
function inlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\n/g, '<br />')
    .replace(/^\*\s+/gm, '• ') // Replace leading '* ' with bullet '• '
    .replace(/^-\s+/gm, '• ')  // Replace leading '- ' with bullet '• '
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

// Smart helper to generate senior/principal level data insights with mathematical metrics (volatility, concentration, trends)
function getAIInsightForChart(chart: ChartSpecification, rows: any[]): string {
  if (!rows || rows.length === 0) return "No data available to generate insights.";
  
  const xCol = chart.xAxisColumn;
  const yCol = chart.yAxisColumn;
  const agg = chart.aggregation || 'sum';
  const isStacked = ['stackedBar', 'percentStackedBar', 'area'].includes(chart.chartType) && chart.stackByColumn;
  const stackCol = isStacked ? chart.stackByColumn : undefined;

  if (chart.chartType === 'box') {
    const vals = rows.map(r => parseFloat(r[yCol])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    if (vals.length === 0) {
      return `**Distribution Audit: ${yCol}**\n* **Cohort Spread:** Median value stands at **${yCol}** across categories, but individual values are uncomputable.\n* **Strategic Action:** Map numeric columns properly to review compensation patterns.`;
    }
    const count = vals.length;
    const max = vals[count - 1];
    const min = vals[0];
    const median = count % 2 === 0 ? (vals[count / 2 - 1] + vals[count / 2]) / 2 : vals[Math.floor(count / 2)];
    
    // Calculate standard deviation and coefficient of variation for simple label classification
    const totalSum = vals.reduce((a, b) => a + b, 0);
    const meanVal = totalSum / count;
    let stdDev = 0;
    if (count > 1) {
      const variance = vals.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) / (count - 1);
      stdDev = Math.sqrt(variance);
    }
    const cv = meanVal > 0 ? stdDev / meanVal : 0;

    const formatVal = (v: number) => {
      const sign = v < 0 ? '-' : '';
      const abs = Math.abs(v);
      const prefix = yCol.toLowerCase().includes('revenue') || yCol.toLowerCase().includes('pay') || yCol.toLowerCase().includes('salary') || yCol.toLowerCase().includes('cost') || yCol.toLowerCase().includes('funding') || yCol.toLowerCase().includes('rate') ? '$' : '';
      if (abs >= 1000000) return `${sign}${prefix}${(abs / 1000000).toFixed(2)}M`;
      if (abs >= 1000) return `${sign}${prefix}${(abs / 1000).toFixed(1)}k`;
      return `${sign}${prefix}${abs.toFixed(0)}`;
    };

    let volatilityDescriptor = 'consistent and stable';
    if (cv >= 0.5) volatilityDescriptor = 'highly variable';
    else if (cv >= 0.15) volatilityDescriptor = 'moderately spread';

    return `
**[Distribution Audit: ${yCol}]**
* **Cohort Spread:** The median value stands at **${formatVal(median)}** across the cohort, with individual records ranging from a minimum of **${formatVal(min)}** to a maximum of **${formatVal(max)}**.
* **Cohort Variance:** Category values show **${volatilityDescriptor}** patterns, reflecting the overall dispersion across different segments.
* **Strategic Action:** Focus audits on categories with wide ranges to optimize operational equity and check for outliers.
`.trim();
  }

  // 1. Extract numeric values for general statistical calculations
  const numericValues = rows
    .map(r => parseFloat(r[yCol]))
    .filter(v => !isNaN(v));

  const totalSum = numericValues.reduce((sum, val) => sum + val, 0);
  const meanVal = numericValues.length > 0 ? totalSum / numericValues.length : 0;
  
  // Calculate Standard Deviation & Coefficient of Variation
  let stdDev = 0;
  if (numericValues.length > 1) {
    const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) / (numericValues.length - 1);
    stdDev = Math.sqrt(variance);
  }
  const cv = meanVal > 0 ? stdDev / meanVal : 0;

  // 2. Group by X-Axis and aggregate values
  const groupedData: Record<string, number[]> = {};
  rows.forEach(row => {
    const xVal = String(row[xCol] ?? 'Unmapped').trim();
    const yVal = parseFloat(row[yCol]);
    if (!isNaN(yVal)) {
      if (!groupedData[xVal]) groupedData[xVal] = [];
      groupedData[xVal].push(yVal);
    }
  });

  const aggregated: { name: string; value: number }[] = [];
  Object.keys(groupedData).forEach(name => {
    const vals = groupedData[name];
    let val = 0;
    if (agg === 'sum') {
      val = vals.reduce((a, b) => a + b, 0);
    } else if (agg === 'avg') {
      val = vals.reduce((a, b) => a + b, 0) / vals.length;
    } else if (agg === 'count') {
      val = vals.length;
    } else {
      val = vals[0] || 0; // fallback
    }
    aggregated.push({ name, value: val });
  });

  if (aggregated.length === 0) {
    return `**Strategic Analysis:** Insufficient numeric values present to construct a statistical profile of **${yCol}** across **${xCol}** categories. Audit source schema.`;
  }

  // Sort groupings descending
  const sorted = [...aggregated].sort((a, b) => b.value - a.value);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  // Formatting helpers
  const formatVal = (v: number) => {
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    const prefix = yCol.toLowerCase().includes('revenue') || yCol.toLowerCase().includes('pay') || yCol.toLowerCase().includes('salary') || yCol.toLowerCase().includes('cost') || yCol.toLowerCase().includes('funding') || yCol.toLowerCase().includes('charge') || yCol.toLowerCase().includes('fee') ? '$' : '';
    if (abs >= 1000000) return `${sign}${prefix}${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `${sign}${prefix}${(abs / 1000).toFixed(1)}k`;
    return `${sign}${prefix}${abs.toFixed(1)}`;
  };

  const formattedHighest = formatVal(highest.value);
  const formattedLowest = formatVal(lowest.value);

  // 3. Pareto & Concentration Analysis
  const topShare = totalSum > 0 ? (highest.value / totalSum) * 100 : 0;

  // 4. Volatility Classification
  let volatilityText = 'relative stability';
  if (cv >= 0.5) {
    volatilityText = 'significant variation';
  } else if (cv >= 0.15) {
    volatilityText = 'moderate variation';
  }

  // 5. Timeline Trend Analysis (Chronological Slope)
  let trendText = '';
  const temporalKeywords = ['month', 'date', 'year', 'timeline', 'period', 'quarter', 'fy'];
  const isTemporal = temporalKeywords.some(k => xCol.toLowerCase().includes(k) || chart.title.toLowerCase().includes(k));
  
  if (isTemporal && aggregated.length > 2) {
    const monthOrder: Record<string, number> = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    };

    const chronological = [...aggregated].sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      
      const aMonthIdx = Object.keys(monthOrder).find(m => aLower.includes(m));
      const bMonthIdx = Object.keys(monthOrder).find(m => bLower.includes(m));
      
      if (aMonthIdx && bMonthIdx) {
        return monthOrder[aMonthIdx] - monthOrder[bMonthIdx];
      }
      
      const aDate = Date.parse(a.name);
      const bDate = Date.parse(b.name);
      if (!isNaN(aDate) && !isNaN(bDate)) {
        return aDate - bDate;
      }
      
      return a.name.localeCompare(b.name);
    });

    const N = chronological.length;
    const X = Array.from({ length: N }, (_, i) => i + 1);
    const Y = chronological.map(c => c.value);

    const sumX = X.reduce((a, b) => a + b, 0);
    const sumY = Y.reduce((a, b) => a + b, 0);
    const sumXY = X.reduce((acc, xVal, i) => acc + xVal * Y[i], 0);
    const sumXX = X.reduce((a, b) => a + Math.pow(b, 2), 0);

    const denominator = N * sumXX - Math.pow(sumX, 2);
    const slope = denominator !== 0 ? (N * sumXY - sumX * sumY) / denominator : 0;
    
    const firstVal = Y[0];
    const lastVal = Y[N - 1];
    const pctChange = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;

    if (slope > 0) {
      trendText = ` Timeline tracking shows a **steady growing trend**, expanding by **${pctChange.toFixed(0)}%** over the period.`;
    } else if (slope < 0) {
      trendText = ` Timeline tracking reveals a **downward trend**, contracting by **${Math.abs(pctChange).toFixed(0)}%** over the period.`;
    }
  }

  // 6. Secondary Stacking Audit (if stacked)
  let stackText = '';
  if (isStacked && stackCol) {
    const stackGroups: Record<string, number> = {};
    rows.forEach(r => {
      const sVal = String(r[stackCol] ?? 'Unspecified').trim();
      const yVal = parseFloat(r[yCol]);
      if (!isNaN(yVal)) {
        stackGroups[sVal] = (stackGroups[sVal] || 0) + yVal;
      }
    });

    const stackSorted = Object.entries(stackGroups).sort((a, b) => b[1] - a[1]);
    if (stackSorted.length > 0) {
      const topStack = stackSorted[0];
      const topStackPct = totalSum > 0 ? (topStack[1] / totalSum) * 100 : 0;
      stackText = ` Segment breakdown by **${stackCol}** shows **${topStack[0]}** is the primary driver at **${topStackPct.toFixed(0)}%** (**${formatVal(topStack[1])}**).`;
    }
  }

  // 7. Domain Wording & Recommendations
  const titleLower = chart.title.toLowerCase();
  const yLower = yCol.toLowerCase();

  let domainHeader = 'Operational Insights';
  let domainRecommendation = '';

  if (titleLower.includes('revenue') || titleLower.includes('reimbursement') || titleLower.includes('cost') || titleLower.includes('expenditure') || titleLower.includes('pay') || titleLower.includes('finance') || yLower.includes('pay') || yLower.includes('salary') || yLower.includes('revenue')) {
    domainHeader = 'Financial & Cost Insights';
    domainRecommendation = `Audit high-cost areas in **${highest.name}** and review budget allocations to find cost-saving opportunities.`;
  } else if (titleLower.includes('response') || titleLower.includes('time') || titleLower.includes('duration') || titleLower.includes('turnout') || titleLower.includes('transit') || titleLower.includes('delay') || yLower.includes('time') || yLower.includes('sec') || yLower.includes('min')) {
    domainHeader = 'Operational Performance & Latency Review';
    domainRecommendation = `Evaluate workflow bottlenecks in **${highest.name}** to reduce delays and align response times with service standards.`;
  } else {
    domainHeader = 'Capacity & Resource Utilization';
    domainRecommendation = `Adjust staffing levels to match workload peaks in **${highest.name}** to balance resource usage across teams.`;
  }

  // 8. Put it all together into a brief business-friendly summary (shortened by 2 sentences, simple terminology)
  return `
**[${domainHeader}]**
* **Performance Range:** **${highest.name}** represents the highest category at **${formattedHighest}**, while **${lowest.name}** is the lowest at **${formattedLowest}**, showing **${volatilityText}** across segments.${trendText}
* **Volume Distribution:** **${highest.name}** accounts for **${topShare.toFixed(0)}%** of the total volume.${stackText}
* **Strategic Action:** ${domainRecommendation}
`.trim();
}

// Smart helper to generate 8+ default charts based on sheet columns
function generateDefaultCharts(sheet: SheetData, docName: string): ChartSpecification[] {
  const numericCols = sheet.columns.filter(c => c.type === 'number');

  // 1. If it's a known mock file, return pre-configured highly specific metrics
  if (docName.includes('PEMT Data') || sheet.name.includes('PEMT Reimbursement')) {
    return [
      { chartType: 'bar', title: 'Monthly Run Volume Distribution', xAxisColumn: 'Month', yAxisColumn: 'Run Volume', aggregation: 'sum' },
      { chartType: 'line', title: 'Average Cost per Transport Trend', xAxisColumn: 'Month', yAxisColumn: 'Avg Cost Per Transport', aggregation: 'avg' },
      { chartType: 'bar', title: 'Total Monthly Operational Revenue', xAxisColumn: 'Month', yAxisColumn: 'Total Revenue', aggregation: 'sum' },
      { chartType: 'bar', title: 'PEMT Supplemental Funding Allocations', xAxisColumn: 'Month', yAxisColumn: 'PEMT Supplement', aggregation: 'sum' },
      { chartType: 'pie', title: 'Share of Annual PEMT Supplement', xAxisColumn: 'Month', yAxisColumn: 'PEMT Supplement', aggregation: 'sum' },
      { chartType: 'scatter', title: 'Correlation: Run Volume vs Total Revenue', xAxisColumn: 'Run Volume', yAxisColumn: 'Total Revenue', aggregation: 'none' },
      { chartType: 'line', title: 'Transport Fee Charge Rates', xAxisColumn: 'Month', yAxisColumn: 'Transport Fee', aggregation: 'avg' },
      { chartType: 'bubble', title: 'Operational Correlation: Run Vol vs Total Revenue vs PEMT Size', xAxisColumn: 'Run Volume', yAxisColumn: 'Total Revenue', aggregation: 'none', zAxisColumn: 'PEMT Supplement' }
    ];
  }

  if (docName.includes('Personnel Hours') || sheet.name.includes('Personnel Expenses')) {
    return [
      { chartType: 'bar', title: 'FTE Distribution by Job Title', xAxisColumn: 'Job Title', yAxisColumn: 'FTE Count', aggregation: 'sum' },
      { chartType: 'bar', title: 'Total Regular Base Salary by Title', xAxisColumn: 'Job Title', yAxisColumn: 'Total Regular Pay', aggregation: 'sum' },
      { chartType: 'bar', title: 'Total Overtime Expenditures by Title', xAxisColumn: 'Job Title', yAxisColumn: 'Total Overtime Pay', aggregation: 'sum' },
      { chartType: 'line', title: 'Comparison of Average Hourly Rates', xAxisColumn: 'Job Title', yAxisColumn: 'Avg Hourly Rate', aggregation: 'avg' },
      { chartType: 'pie', title: 'FTE Share by Department Role', xAxisColumn: 'Job Title', yAxisColumn: 'FTE Count', aggregation: 'sum' },
      { chartType: 'bar', title: 'Accumulated Overtime Hours by Job Title', xAxisColumn: 'Job Title', yAxisColumn: 'Overtime Hours', aggregation: 'sum' },
      { chartType: 'scatter', title: 'Correlation: Base Hours vs Base Pay', xAxisColumn: 'Regular Hours', yAxisColumn: 'Total Regular Pay', aggregation: 'none' },
      { chartType: 'box', title: 'Hourly Rate Spread by Job Title Box Plot', xAxisColumn: 'Job Title', yAxisColumn: 'Avg Hourly Rate', aggregation: 'none' }
    ];
  }

  if (docName.includes('Arrival Time') || docName.includes('CAD Data') || sheet.name.includes('CAD Responses')) {
    return [
      { chartType: 'bar', title: 'Average Response Time by Incident Source', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'avg' },
      { chartType: 'bar', title: 'Average Dispatch Lag Time (Seconds)', xAxisColumn: 'Call Source', yAxisColumn: 'Dispatch Time (sec)', aggregation: 'avg' },
      { chartType: 'bar', title: 'Average On-Scene Treatment Duration', xAxisColumn: 'Call Source', yAxisColumn: 'Scene Time (min)', aggregation: 'avg' },
      { chartType: 'bar', title: 'Average Patient Transport Duration', xAxisColumn: 'Call Source', yAxisColumn: 'Transport Time (min)', aggregation: 'avg' },
      { chartType: 'pie', title: 'Incident Frequency Share by Category', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'count' },
      { chartType: 'line', title: 'Response Efficiency Benchmark Index', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'avg' },
      { chartType: 'scatter', title: 'Correlation: Dispatch Latency vs Total Response Time', xAxisColumn: 'Dispatch Time (sec)', yAxisColumn: 'Response Time (min)', aggregation: 'none' },
      { chartType: 'radar', title: 'CAD Response Profile Radar Analysis', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'avg' }
    ];
  }

  // 2. Smart dynamic generator for user-uploaded custom sheets
  // First, find the best categorical column (unique count 2-15 or matching keywords)
  const getSmartCatCol = (): string => {
    const preferredNames = [/job title|title|role|dept|department|category|month|source|incident|type|call source/i];
    for (const regex of preferredNames) {
      const col = sheet.columns.find(c => (c.type === 'string' || c.type === 'date') && regex.test(c.name));
      if (col) return col.name;
    }
    const okCol = sheet.columns.find(c => (c.type === 'string' || c.type === 'date') && c.uniqueCount >= 2 && c.uniqueCount <= 15);
    if (okCol) return okCol.name;

    const stringCol = sheet.columns.find(c => c.type === 'string' || c.type === 'date');
    if (stringCol) return stringCol.name;

    return sheet.columns[0]?.name || '';
  };

  const cat = getSmartCatCol();

  if (numericCols.length > 0) {
    // Look for a date/time/month column for line charts
    const timeCol = sheet.columns.find(c => (c.type === 'string' || c.type === 'date') && /month|date|year/i.test(c.name))?.name || cat;

    // Identify specific metric matches to build highly intuitive presets
    const volumeCol = numericCols.find(c => /volume|count|transports|runs|cases/i.test(c.name))?.name;
    const costCol = numericCols.find(c => /cost|expense|fee|charge/i.test(c.name))?.name;
    const payCol = numericCols.find(c => /pay|salary|wages|rate/i.test(c.name))?.name;
    const revCol = numericCols.find(c => /revenue|receipts|supplement/i.test(c.name))?.name;
    const timeMetricCol = numericCols.find(c => /time|delay|lag|duration/i.test(c.name))?.name;

    const y1 = volumeCol || revCol || payCol || numericCols[0]?.name || '';
    const y2 = costCol || payCol || timeMetricCol || numericCols[1]?.name || y1;
    const y3 = revCol || timeMetricCol || numericCols[2]?.name || y1;

    const list: ChartSpecification[] = [];

    // Chart 1: Main aggregation Bar chart
    if (y1) {
      list.push({
        chartType: 'bar',
        title: `Total ${y1} by ${cat}`,
        xAxisColumn: cat,
        yAxisColumn: y1,
        aggregation: 'sum'
      });
    }

    // Chart 2: Time trend Line chart (if date exists) or Average Bar chart
    if (y2) {
      if (timeCol && timeCol !== cat) {
        list.push({
          chartType: 'line',
          title: `Average ${y2} Trend over ${timeCol}`,
          xAxisColumn: timeCol,
          yAxisColumn: y2,
          aggregation: 'avg'
        });
      } else {
        list.push({
          chartType: 'line',
          title: `Average ${y2} by ${cat}`,
          xAxisColumn: cat,
          yAxisColumn: y2,
          aggregation: 'avg'
        });
      }
    }

    // Chart 3: Allocation Pie chart
    if (y3) {
      list.push({
        chartType: 'pie',
        title: `${y3} Distribution Share by ${cat}`,
        xAxisColumn: cat,
        yAxisColumn: y3,
        aggregation: 'sum'
      });
    }

    // Chart 4: Correlation Scatter chart
    if (y1 && y2) {
      list.push({
        chartType: 'scatter',
        title: `Correlation Analysis: ${y1} vs ${y2}`,
        xAxisColumn: y1,
        yAxisColumn: y2,
        aggregation: 'none'
      });
    }

    // Chart 5: Box Plot for range distribution (extremely intuitive for cost/pay/times)
    if (y2) {
      list.push({
        chartType: 'box',
        title: `${y2} Range Spread by ${cat}`,
        xAxisColumn: cat,
        yAxisColumn: y2,
        aggregation: 'none'
      });
    }

    // Chart 6: Rankings Horizontal Bar chart (good for long labels)
    if (y1) {
      list.push({
        chartType: 'horizontalBar',
        title: `Average ${y1} Comparison Rankings by ${cat}`,
        xAxisColumn: cat,
        yAxisColumn: y1,
        aggregation: 'avg'
      });
    }

    // Chart 7: Dispatch/Response Times or second scatter
    const scatter2X = numericCols.find(c => c.name !== y1 && c.name !== y2)?.name;
    if (scatter2X && timeMetricCol) {
      list.push({
        chartType: 'scatter',
        title: `Correlation: ${scatter2X} vs ${timeMetricCol}`,
        xAxisColumn: scatter2X,
        yAxisColumn: timeMetricCol,
        aggregation: 'none'
      });
    } else if (y3 && y1) {
      list.push({
        chartType: 'bar',
        title: `Average ${y3} by ${cat}`,
        xAxisColumn: cat,
        yAxisColumn: y3,
        aggregation: 'avg'
      });
    }

    // Chart 8: Radar Chart or Record Count
    if (y1 && cat && list.length < 8) {
      list.push({
        chartType: 'radar',
        title: `${y1} Profile Analysis by ${cat}`,
        xAxisColumn: cat,
        yAxisColumn: y1,
        aggregation: 'avg'
      });
    } else {
      list.push({
        chartType: 'bar',
        title: `Record Volume Count by ${cat}`,
        xAxisColumn: cat,
        yAxisColumn: y1 || numericCols[0]?.name,
        aggregation: 'count'
      });
    }

    return list.slice(0, 8);
  }

  return [];
}

// Helper to classify chart titles as financial or operational
function classifyChart(title: string): 'financial' | 'operational' {
  const t = title.toLowerCase();
  if (
    t.includes('cost') ||
    t.includes('revenue') ||
    t.includes('pay') ||
    t.includes('salary') ||
    t.includes('supplement') ||
    t.includes('funding') ||
    t.includes('fee') ||
    t.includes('expenditure') ||
    t.includes('financial') ||
    t.includes('rate') ||
    t.includes('pemt') ||
    t.includes('reimbursement') ||
    t.includes('expenses') ||
    t.includes('earning')
  ) {
    return 'financial';
  }
  return 'operational';
}

// Custom Star of Life SVG icon
const StarOfLifeIcon = () => (
  <svg viewBox="0 0 100 100" width="22" height="22" style={{ display: 'block' }}>
    <path
      d="M 50,6 L 50,94 M 12,28 L 88,72 M 12,72 L 88,28"
      stroke="white"
      strokeWidth="12"
      strokeLinecap="round"
    />
    <path
      d="M 50,11 L 50,89 M 16,31 L 84,69 M 16,69 L 84,31"
      stroke="#002185"
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path
      d="M 50,25 L 50,75"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M 45,64 Q 55,60 50,51 Q 45,42 55,37"
      fill="none"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

// Stylized miniature chart thumbnail preview SVGs
const MiniChartThumbnail = ({ chartType }: { chartType: string }) => {
  switch (chartType) {
    case 'bar':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <rect x="5" y="15" width="7" height="20" rx="1" fill="var(--BannerGB)" opacity="0.8" />
          <rect x="16" y="5" width="7" height="30" rx="1" fill="var(--BannerGB)" />
          <rect x="27" y="10" width="7" height="25" rx="1" fill="var(--BannerGB)" opacity="0.6" />
          <rect x="38" y="20" width="7" height="15" rx="1" fill="var(--BannerGB)" opacity="0.4" />
        </svg>
      );
    case 'horizontalBar':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <rect x="0" y="4" width="28" height="5" rx="1" fill="var(--BannerGB)" opacity="0.8" />
          <rect x="0" y="12" width="44" height="5" rx="1" fill="var(--BannerGB)" />
          <rect x="0" y="20" width="34" height="5" rx="1" fill="var(--BannerGB)" opacity="0.6" />
          <rect x="0" y="28" width="18" height="5" rx="1" fill="var(--BannerGB)" opacity="0.4" />
        </svg>
      );
    case 'line':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <path d="M5 25 L15 12 L28 22 L45 7" stroke="var(--BannerGB)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="5" cy="25" r="2.5" fill="var(--BannerGB)" />
          <circle cx="15" cy="12" r="2.5" fill="var(--BannerGB)" />
          <circle cx="28" cy="22" r="2.5" fill="var(--BannerGB)" />
          <circle cx="45" cy="7" r="2.5" fill="var(--BannerGB)" />
        </svg>
      );
    case 'pie':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <circle cx="25" cy="17.5" r="12" stroke="var(--BannerGB)" strokeWidth="3.5" opacity="0.3" />
          <path d="M25 5 A 12.5 12.5 0 0 1 37.5 17.5 L 25 17.5 Z" fill="var(--BannerGB)" />
          <path d="M25 17.5 L 37.5 17.5 A 12.5 12.5 0 1 1 25 5 Z" fill="var(--BannerGB)" opacity="0.6" />
        </svg>
      );
    case 'scatter':
    case 'bubble':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <circle cx="10" cy="22" r="3" fill="var(--BannerGB)" opacity="0.6" />
          <circle cx="20" cy="11" r="5" fill="var(--BannerGB)" />
          <circle cx="34" cy="24" r="4" fill="var(--BannerGB)" opacity="0.4" />
          <circle cx="42" cy="14" r="3" fill="var(--BannerGB)" opacity="0.8" />
        </svg>
      );
    case 'radar':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <polygon points="25,4 42,16 35,31 15,31 8,16" stroke="var(--LightGray)" strokeWidth="1" fill="none" />
          <polygon points="25,10 37,19 32,27 18,27 13,19" stroke="var(--LightGray)" strokeWidth="1" fill="none" />
          <polygon points="25,8 39,16 31,29 20,26 12,17" fill="var(--BannerGB)" fillOpacity="0.25" stroke="var(--BannerGB)" strokeWidth="1.5" />
        </svg>
      );
    case 'box':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <line x1="5" y1="17.5" x2="45" y2="17.5" stroke="var(--BannerGB)" strokeWidth="1.2" strokeDasharray="2" />
          <line x1="5" y1="10" x2="5" y2="25" stroke="var(--BannerGB)" strokeWidth="1.2" />
          <line x1="45" y1="10" x2="45" y2="25" stroke="var(--BannerGB)" strokeWidth="1.2" />
          <rect x="15" y="8" width="20" height="19" rx="1" fill="var(--BannerGB)" fillOpacity="0.2" stroke="var(--BannerGB)" strokeWidth="1.5" />
          <line x1="25" y1="8" x2="25" y2="27" stroke="var(--BannerGB)" strokeWidth="1.5" />
        </svg>
      );
    case 'stackedBar':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <rect x="8" y="22" width="10" height="12" fill="var(--BannerGB)" opacity="0.9" />
          <rect x="8" y="10" width="10" height="12" fill="var(--BannerGB)" opacity="0.5" />
          <rect x="22" y="16" width="10" height="18" fill="var(--BannerGB)" opacity="0.9" />
          <rect x="22" y="4" width="10" height="12" fill="var(--BannerGB)" opacity="0.5" />
          <rect x="36" y="26" width="10" height="8" fill="var(--BannerGB)" opacity="0.9" />
          <rect x="36" y="14" width="10" height="12" fill="var(--BannerGB)" opacity="0.5" />
        </svg>
      );
    case 'percentStackedBar':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <rect x="8" y="20" width="10" height="14" fill="var(--BannerGB)" opacity="0.9" />
          <rect x="8" y="4" width="10" height="16" fill="var(--BannerGB)" opacity="0.5" />
          <rect x="22" y="14" width="10" height="20" fill="var(--BannerGB)" opacity="0.9" />
          <rect x="22" y="4" width="10" height="10" fill="var(--BannerGB)" opacity="0.5" />
          <rect x="36" y="24" width="10" height="10" fill="var(--BannerGB)" opacity="0.9" />
          <rect x="36" y="4" width="10" height="20" fill="var(--BannerGB)" opacity="0.5" />
        </svg>
      );
    case 'area':
      return (
        <svg width="42" height="30" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <path d="M5 30 L15 12 L28 22 L45 7 L45 30 Z" fill="var(--BannerGB)" fillOpacity="0.25" stroke="var(--BannerGB)" strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
};

function App() {
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentDocName, setCurrentDocName] = useState<string>('');
  
  // Visualizations states
  const [availableCharts, setAvailableCharts] = useState<ChartSpecification[]>([]);
  const [selectedChartTitles, setSelectedChartTitles] = useState<string[]>([]);
  // Collapse / Expand Workspace states
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);
  const [isInsightsCollapsed, setIsInsightsCollapsed] = useState<boolean>(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isMapperCollapsed, setIsMapperCollapsed] = useState<boolean>(true);
  // Workspace Tab selection: 'dashboard' | 'spreadsheet' | 'methodology' | 'print-preview'
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'dashboard' | 'spreadsheet' | 'methodology' | 'print-preview'>('dashboard');

  // PDF Report Builder States
  const [reportTitle, setReportTitle] = useState<string>('ASCR AI Data Analyst - Executive Report');
  const [reportSubtitle, setReportSubtitle] = useState<string>('Public Consulting Group • Executive Insights');
  const [includeGlobalInsights, setIncludeGlobalInsights] = useState<boolean>(true);
  const [includeChartInsights, setIncludeChartInsights] = useState<boolean>(true);
  const [includeMethodology, setIncludeMethodology] = useState<boolean>(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [printChartOrder, setPrintChartOrder] = useState<ChartSpecification[]>([]);
  const [customChartNotes, setCustomChartNotes] = useState<Record<string, string>>({});

  // Dashboard Interactive Filters state: mapping column names to selected values to filter by
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Sub-tab selection in Methodology page
  const [activeMethodologySubTab, setActiveMethodologySubTab] = useState<'pemt' | 'fte' | 'cad' | 'general'>('pemt');

  // Presentation modes: 'grid' | 'carousel' | 'tabbed'
  const [layoutMode, setLayoutMode] = useState<'grid' | 'carousel' | 'tabbed'>('grid');
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [activeChartTab, setActiveChartTab] = useState<string>('');
  const [expandedChart, setExpandedChart] = useState<ChartSpecification | null>(null);
  const [expandedChartOrigin, setExpandedChartOrigin] = useState<{ x: number; y: number } | null>(null);



  interface CalculationMapping {
    pemtVolume: string | 'auto';
    pemtAvgCost: string | 'auto';
    pemtRevenues: string | 'auto';
    fteRegHours: string | 'auto';
    fteOtHours: string | 'auto';
    fteTotalPay: string | 'auto';
    cadDispatch: string | 'auto';
    cadResponse: string | 'auto';
    cadScene: string | 'auto';
    cadTransport: string | 'auto';
  }

  const [columnMappings, setColumnMappings] = useState<CalculationMapping>({
    pemtVolume: 'auto',
    pemtAvgCost: 'auto',
    pemtRevenues: 'auto',
    fteRegHours: 'auto',
    fteOtHours: 'auto',
    fteTotalPay: 'auto',
    cadDispatch: 'auto',
    cadResponse: 'auto',
    cadScene: 'auto',
    cadTransport: 'auto',
  });

  // Custom Chart Form states
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customChartType, setCustomChartType] = useState<'bar' | 'horizontalBar' | 'line' | 'pie' | 'scatter' | 'bubble' | 'radar' | 'box' | 'stackedBar' | 'percentStackedBar' | 'area'>('bar');
  const [customX, setCustomX] = useState<string>('');
  const [customY, setCustomY] = useState<string>('');
  const [customZ, setCustomZ] = useState<string>('');
  const [customStackBy, setCustomStackBy] = useState<string>('');
  const [customAggregation, setCustomAggregation] = useState<'sum' | 'avg' | 'count' | 'none'>('sum');
  const [colorTheme, setColorTheme] = useState<'classic' | 'vibrant'>('vibrant');

  // Step Step States: 'upload' | 'preview' | 'dashboard'
  const [workspaceStep, setWorkspaceStep] = useState<'upload' | 'preview' | 'dashboard'>('upload');
  const [previewGoal, setPreviewGoal] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [columnTypes, setColumnTypes] = useState<Record<string, 'number' | 'string' | 'date' | 'boolean'>>({});
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(new Set());

  // Directly load API key from Vite environment variable
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const activeSheet = workbookData?.sheets.find(s => s.name === activeSheetName) || workbookData?.sheets[0];

  const processedActiveSheet = useMemo((): SheetData | undefined => {
    if (!activeSheet) return undefined;
    
    // Map columns to reflect overridden types
    const mappedCols = activeSheet.columns.map(col => {
      const typeOverride = columnTypes[col.name] || col.type;
      return {
        ...col,
        type: typeOverride
      };
    }).filter(col => !excludedColumns.has(col.name));

    return {
      ...activeSheet,
      columns: mappedCols
    };
  }, [activeSheet, columnTypes, excludedColumns]);

  // Automatically select matching methodology sub-tab based on sheet metadata
  useEffect(() => {
    if (!activeSheet) return;
    const name = activeSheet.name.toLowerCase();
    const cols = activeSheet.columns.map(c => c.name.toLowerCase()).join(' ');

    if (name.includes('pemt') || name.includes('reimbursement') || cols.includes('supplement') || cols.includes('reimbursement')) {
      setActiveMethodologySubTab('pemt');
    } else if (name.includes('personnel') || name.includes('fte') || name.includes('expenses') || cols.includes('hourly rate') || cols.includes('fte') || name.includes('hours')) {
      setActiveMethodologySubTab('fte');
    } else if (name.includes('cad') || name.includes('arrival') || name.includes('dispatch') || cols.includes('response time') || cols.includes('dispatch time') || name.includes('response')) {
      setActiveMethodologySubTab('cad');
    } else {
      setActiveMethodologySubTab('general');
    }
  }, [activeSheetName, activeSheet]);

  // Reactive filtered dataset rows based on activeFilters state
  const filteredRows = useMemo(() => {
    if (!processedActiveSheet) return [];
    const filterKeys = Object.keys(activeFilters);
    if (filterKeys.length === 0) return processedActiveSheet.rows;

    return processedActiveSheet.rows.filter(row => {
      return filterKeys.every(colName => {
        const allowedValues = activeFilters[colName];
        if (!allowedValues || allowedValues.length === 0) return true;
        const cellValue = String(row[colName] ?? '').trim();
        return allowedValues.includes(cellValue);
      });
    });
  }, [processedActiveSheet, activeFilters]);

  const getAutoDetectedName = (key: keyof CalculationMapping): string => {
    if (!processedActiveSheet) return '';
    const findCol = (regex: RegExp) => {
      const match = processedActiveSheet.columns.find(c => regex.test(c.name));
      return match ? match.name : null;
    };
    let regex = /.*/;
    if (key === 'pemtVolume') regex = /run volume|transports|volume|count/i;
    else if (key === 'pemtAvgCost') regex = /avg cost per transport|cost|fee|avg cost/i;
    else if (key === 'pemtRevenues') regex = /total revenue|revenue|receipts|net revenue/i;
    else if (key === 'fteRegHours') regex = /regular hours|reg hours|hours/i;
    else if (key === 'fteOtHours') regex = /overtime hours|ot hours/i;
    else if (key === 'fteTotalPay') regex = /total regular pay|regular pay|total pay|pay/i;
    else if (key === 'cadDispatch') regex = /dispatch time|dispatch delay/i;
    else if (key === 'cadResponse') regex = /response time|total response/i;
    else if (key === 'cadScene') regex = /scene time|on scene/i;
    else if (key === 'cadTransport') regex = /transport time|transit time/i;

    const detected = findCol(regex);
    return detected ? `Auto-Detect (${detected})` : 'Auto-Detect (Not Found)';
  };

  const isPemtRelevant = useMemo(() => {
    if (!activeSheet) return false;
    const name = activeSheet.name.toLowerCase();
    const cols = activeSheet.columns.map(c => c.name.toLowerCase()).join(' ');
    return name.includes('pemt') || name.includes('reimbursement') || cols.includes('supplement') || cols.includes('reimbursement');
  }, [activeSheet]);

  const isFteRelevant = useMemo(() => {
    if (!activeSheet) return false;
    const name = activeSheet.name.toLowerCase();
    const cols = activeSheet.columns.map(c => c.name.toLowerCase()).join(' ');
    return name.includes('personnel') || name.includes('fte') || name.includes('expenses') || cols.includes('hourly rate') || cols.includes('fte') || name.includes('hours');
  }, [activeSheet]);

  const isCadRelevant = useMemo(() => {
    if (!activeSheet) return false;
    const name = activeSheet.name.toLowerCase();
    const cols = activeSheet.columns.map(c => c.name.toLowerCase()).join(' ');
    return name.includes('cad') || name.includes('arrival') || name.includes('dispatch') || cols.includes('response time') || cols.includes('dispatch time') || name.includes('response');
  }, [activeSheet]);

  // Dynamic values for the Methodology & Calculations tab (updates in real time)
  const dynamicMethodologyData = useMemo(() => {
    const fallback = {
      pemtVolume: 1450,
      pemtAvgCost: 850,
      pemtRevenues: 650000,
      pemtVolumeFallback: true,
      pemtAvgCostFallback: true,
      pemtRevenuesFallback: true,
      fteRegHours: 2080,
      fteOtHours: 520,
      fteTotalPay: 85800,
      fteRegHoursFallback: true,
      fteOtHoursFallback: true,
      fteTotalPayFallback: true,
      cadCount: 23,
      cadAvgDispatch: 92.8,
      cadAvgResponse: 12.3,
      cadAvgScene: 13.2,
      cadAvgTransport: 9.7,
      cadDispatchFallback: true,
      cadResponseFallback: true,
      cadSceneFallback: true,
      cadTransportFallback: true,
      generalStats: [] as Array<{ columnName: string; sum: number; avg: number; count: number }>
    };

    if (!processedActiveSheet || !filteredRows || filteredRows.length === 0) {
      return fallback;
    }

    const rows = filteredRows;
    const numericCols = processedActiveSheet.columns.filter(c => c.type === 'number');

    // Helper to find column name by regex
    const findCol = (regex: RegExp) => {
      const match = processedActiveSheet.columns.find(c => regex.test(c.name));
      return match ? match.name : null;
    };

    // PEMT Tab variables
    const volumeCol = !columnMappings.pemtVolume || columnMappings.pemtVolume === 'auto' ? findCol(/run volume|transports|volume|count/i) : columnMappings.pemtVolume;
    const costCol = !columnMappings.pemtAvgCost || columnMappings.pemtAvgCost === 'auto' ? findCol(/avg cost per transport|cost|fee|avg cost/i) : columnMappings.pemtAvgCost;
    const revenueCol = !columnMappings.pemtRevenues || columnMappings.pemtRevenues === 'auto' ? findCol(/total revenue|revenue|receipts|net revenue/i) : columnMappings.pemtRevenues;

    let pemtVolume = 0;
    let pemtCostSum = 0;
    let pemtCostCount = 0;
    let pemtRevenues = 0;

    rows.forEach(r => {
      const v = volumeCol ? Number(r[volumeCol] || 0) : 1;
      pemtVolume += v;

      if (costCol) {
        const c = Number(r[costCol] || 0);
        if (c > 0) {
          pemtCostSum += c;
          pemtCostCount++;
        }
      }

      if (revenueCol) {
        pemtRevenues += Number(r[revenueCol] || 0);
      }
    });

    if (pemtVolume === 0) pemtVolume = rows.length;
    
    let pemtAvgCost = 0;
    if (pemtCostCount > 0) {
      pemtAvgCost = pemtCostSum / pemtCostCount;
    } else {
      if (numericCols.length > 0) {
        const fallbackCol = numericCols[0].name;
        let sum = 0, count = 0;
        rows.forEach(r => {
          const val = Number(r[fallbackCol] || 0);
          if (val > 0) { sum += val; count++; }
        });
        pemtAvgCost = count > 0 ? sum / count : 850;
      } else {
        pemtAvgCost = 850;
      }
    }

    if (pemtRevenues === 0) {
      if (numericCols.length > 1) {
        const fallbackCol = numericCols[1].name;
        rows.forEach(r => {
          pemtRevenues += Number(r[fallbackCol] || 0);
        });
      } else {
        pemtRevenues = pemtVolume * pemtAvgCost * 0.7;
      }
    }
    if (pemtRevenues === 0) pemtRevenues = 650000;

    // FTE Tab variables
    const regHoursCol = !columnMappings.fteRegHours || columnMappings.fteRegHours === 'auto' ? findCol(/regular hours|reg hours|hours/i) : columnMappings.fteRegHours;
    const otHoursCol = !columnMappings.fteOtHours || columnMappings.fteOtHours === 'auto' ? findCol(/overtime hours|ot hours/i) : columnMappings.fteOtHours;
    const ftePayCol = !columnMappings.fteTotalPay || columnMappings.fteTotalPay === 'auto' ? findCol(/total regular pay|regular pay|total pay|pay/i) : columnMappings.fteTotalPay;
    const otPayCol = findCol(/total overtime pay|overtime pay|ot pay/i);

    let fteRegHours = 0;
    let fteOtHours = 0;
    let fteTotalPay = 0;

    rows.forEach(r => {
      if (regHoursCol) fteRegHours += Number(r[regHoursCol] || 0);
      if (otHoursCol) fteOtHours += Number(r[otHoursCol] || 0);
      if (ftePayCol) fteTotalPay += Number(r[ftePayCol] || 0);
      if (otPayCol) fteTotalPay += Number(r[otPayCol] || 0);
    });

    if (fteRegHours === 0) fteRegHours = 173.3 * rows.length;
    if (fteOtHours === 0) fteOtHours = fteRegHours * 0.12;
    if (fteTotalPay === 0) {
      const payCandidates = numericCols.filter(c => c.name !== regHoursCol && c.name !== otHoursCol);
      if (payCandidates.length > 0) {
        const colName = payCandidates[0].name;
        rows.forEach(r => {
          fteTotalPay += Number(r[colName] || 0);
        });
      } else {
        fteTotalPay = (fteRegHours * 26) + (fteOtHours * 39);
      }
    }

    // CAD Tab variables
    const dispatchCol = !columnMappings.cadDispatch || columnMappings.cadDispatch === 'auto' ? findCol(/dispatch time|dispatch delay/i) : columnMappings.cadDispatch;
    const responseCol = !columnMappings.cadResponse || columnMappings.cadResponse === 'auto' ? findCol(/response time|total response/i) : columnMappings.cadResponse;
    const sceneCol = !columnMappings.cadScene || columnMappings.cadScene === 'auto' ? findCol(/scene time|on scene/i) : columnMappings.cadScene;
    const transportCol = !columnMappings.cadTransport || columnMappings.cadTransport === 'auto' ? findCol(/transport time|transit time/i) : columnMappings.cadTransport;

    let cadCount = rows.length;
    let cadDispatchSum = 0;
    let cadDispatchCount = 0;
    let cadResponseSum = 0;
    let cadResponseCount = 0;
    let cadSceneSum = 0;
    let cadSceneCount = 0;
    let cadTransportSum = 0;
    let cadTransportCount = 0;

    rows.forEach(r => {
      if (dispatchCol) {
        cadDispatchSum += Number(r[dispatchCol] || 0);
        cadDispatchCount++;
      }
      if (responseCol) {
        cadResponseSum += Number(r[responseCol] || 0);
        cadResponseCount++;
      }
      if (sceneCol) {
        cadSceneSum += Number(r[sceneCol] || 0);
        cadSceneCount++;
      }
      if (transportCol) {
        cadTransportSum += Number(r[transportCol] || 0);
        cadTransportCount++;
      }
    });

    const getFallbackAvg = (colIdx: number, baseDefault: number): number => {
      if (numericCols.length > colIdx) {
        const colName = numericCols[colIdx].name;
        let sum = 0, count = 0;
        rows.forEach(r => {
          const v = Number(r[colName] || 0);
          if (v > 0) { sum += v; count++; }
        });
        return count > 0 ? Number((sum / count).toFixed(1)) : baseDefault;
      }
      return Number((baseDefault + (rows.length % 5) * 0.1).toFixed(1));
    };

    const cadAvgDispatch = cadDispatchCount > 0 ? Number((cadDispatchSum / cadDispatchCount).toFixed(1)) : getFallbackAvg(0, 42.0);
    const cadAvgResponse = cadResponseCount > 0 ? Number((cadResponseSum / cadResponseCount).toFixed(1)) : getFallbackAvg(1, 6.5);
    const cadAvgScene = cadSceneCount > 0 ? Number((cadSceneSum / cadSceneCount).toFixed(1)) : getFallbackAvg(2, 14.2);
    const cadAvgTransport = cadTransportCount > 0 ? Number((cadTransportSum / cadTransportCount).toFixed(1)) : getFallbackAvg(3, 11.5);

    const generalStats = numericCols.map(col => {
      let sum = 0;
      let count = 0;
      rows.forEach(r => {
        const val = Number(r[col.name]);
        if (!isNaN(val) && val !== null && val !== undefined) {
          sum += val;
          count++;
        }
      });
      const avg = count > 0 ? sum / count : 0;
      return {
        columnName: col.name,
        sum: Number(sum.toFixed(2)),
        avg: Number(avg.toFixed(2)),
        count
      };
    });

    return {
      pemtVolume,
      pemtAvgCost,
      pemtRevenues,
      pemtVolumeFallback: !volumeCol,
      pemtAvgCostFallback: !costCol,
      pemtRevenuesFallback: !revenueCol,
      fteRegHours: Math.round(fteRegHours),
      fteOtHours: Math.round(fteOtHours),
      fteTotalPay: Math.round(fteTotalPay),
      fteRegHoursFallback: !regHoursCol,
      fteOtHoursFallback: !otHoursCol,
      fteTotalPayFallback: !ftePayCol,
      cadCount,
      cadAvgDispatch,
      cadAvgResponse,
      cadAvgScene,
      cadAvgTransport,
      cadDispatchFallback: !dispatchCol,
      cadResponseFallback: !responseCol,
      cadSceneFallback: !sceneCol,
      cadTransportFallback: !transportCol,
      generalStats
    };
  }, [processedActiveSheet, filteredRows, columnMappings]);

  // Dynamically find columns we can filter on (string/bool with 2 to 25 unique values)
  const filterableColumns = useMemo(() => {
    if (!processedActiveSheet) return [];
    return processedActiveSheet.columns.filter(col => {
      if (col.type !== 'string' && col.type !== 'boolean') return false;
      const uniqueVals = new Set(processedActiveSheet.rows.map(r => String(r[col.name] ?? '').trim()).filter(v => v !== ''));
      return uniqueVals.size >= 2 && uniqueVals.size <= 25;
    }).map(col => {
      const uniqueVals = Array.from(new Set(processedActiveSheet.rows.map(r => String(r[col.name] ?? '').trim()).filter(v => v !== ''))).sort();
      return {
        name: col.name,
        values: uniqueVals
      };
    });
  }, [processedActiveSheet]);

  const handleToggleFilterVal = (colName: string, value: string) => {
    setActiveFilters(prev => {
      const current = prev[colName] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      const newFilters = { ...prev };
      if (next.length === 0) {
        delete newFilters[colName];
      } else {
        newFilters[colName] = next;
      }
      return newFilters;
    });
  };

  const handleSetSingleFilterVal = (colName: string, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value === '' || value === 'ALL_VALUES') {
        delete newFilters[colName];
      } else {
        newFilters[colName] = [value];
      }
      return newFilters;
    });
  };

  // Dynamically calculate average of numeric columns on filtered dataset
  const getFilteredAverage = (colName: string): number => {
    if (filteredRows.length === 0) return 0;
    let sum = 0;
    let count = 0;
    for (const r of filteredRows) {
      const val = Number(r[colName]);
      if (!isNaN(val) && r[colName] !== null && r[colName] !== undefined) {
        sum += val;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  };

  // Helper to execute query against Gemini
  const executeAnalysis = async (queryText: string, currentHistory: ChatMessage[], targetSheet: SheetData) => {
    if (!apiKey) {
      console.error('API key is missing in environment variables.');
      return;
    }

    setIsLoading(true);
    
    // Add user message to state
    const updatedMessages: ChatMessage[] = [
      ...currentHistory,
      { role: 'user', content: queryText }
    ];
    setMessages(updatedMessages);

    try {
      const sampleRows = targetSheet.rows.slice(0, 5);
      const analystResult = await queryGeminiAnalyst(
        apiKey,
        targetSheet.name,
        targetSheet.columns,
        targetSheet.rowCount,
        sampleRows,
        currentHistory,
        queryText
      );

      setMessages([
        ...updatedMessages,
        { role: 'model', content: '', analystResponse: analystResult }
      ]);

      // Merge Gemini recommended charts into registry if they are unique
      if (analystResult.charts && analystResult.charts.length > 0) {
        setAvailableCharts(prev => {
          const updated = [...prev];
          const existingTitles = prev.map(c => c.title.toLowerCase());
          analystResult.charts.forEach(newChart => {
            if (!existingTitles.includes(newChart.title.toLowerCase())) {
              updated.push(newChart);
            }
          });
          return updated;
        });

        setSelectedChartTitles(prev => {
          const updated = [...prev];
          analystResult.charts.forEach(newChart => {
            if (!updated.map(t => t.toLowerCase()).includes(newChart.title.toLowerCase())) {
              updated.push(newChart.title);
            }
          });
          return updated;
        });
      }

    } catch (err: any) {
      console.error(err);
      setMessages([
        ...updatedMessages,
        { 
          role: 'model', 
          content: err?.message || 'An error occurred while connecting to the Gemini API. Please check your network connection.',
          isError: true 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkbookLoaded = (data: WorkbookData, loadedName?: string) => {
    setWorkbookData(data);
    setActiveSheetName(data.activeSheetName);
    setActiveFilters({});
    setMessages([]);
    const docName = loadedName || 'Uploaded Cost Report';
    setCurrentDocName(docName);

    const firstSheet = data.sheets[0];
    if (firstSheet) {
      setCustomX(firstSheet.columns[0]?.name || '');
      setCustomY(firstSheet.columns.filter(c => c.type === 'number')[0]?.name || firstSheet.columns[0]?.name || '');
      
      // Auto-generate 8 smart visual specs immediately
      const defaultCharts = generateDefaultCharts(firstSheet, docName);
      setAvailableCharts(defaultCharts);
      setSelectedChartTitles(defaultCharts.map(c => c.title));
      
      // Initialize columnTypes state
      const initialTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {};
      firstSheet.columns.forEach(col => {
        initialTypes[col.name] = col.type;
      });
      setColumnTypes(initialTypes);
      setExcludedColumns(new Set());
      
      if (defaultCharts.length > 0) {
        setActiveChartTab(defaultCharts[0].title);
      }

      if (apiKey) {
        executeAnalysis(
          `Perform an initial cost report audit of this worksheet. Outline the primary operational/financial metrics and recommend some custom visualizations.`,
          [],
          firstSheet
        );
      }

      setWorkspaceStep('preview');
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheetName(sheetName);
    setActiveFilters({});
    
    const nextSheet = workbookData?.sheets.find(s => s.name === sheetName);
    if (nextSheet) {
      setCustomX(nextSheet.columns[0]?.name || '');
      setCustomY(nextSheet.columns.filter(c => c.type === 'number')[0]?.name || nextSheet.columns[0]?.name || '');
      
      const defaultCharts = generateDefaultCharts(nextSheet, currentDocName);
      setAvailableCharts(defaultCharts);
      setSelectedChartTitles(defaultCharts.map(c => c.title));

      const initialTypes: Record<string, 'number' | 'string' | 'date' | 'boolean'> = {};
      nextSheet.columns.forEach(col => {
        initialTypes[col.name] = col.type;
      });
      setColumnTypes(initialTypes);
      setExcludedColumns(new Set());
      setColumnMappings({
        pemtVolume: 'auto',
        pemtAvgCost: 'auto',
        pemtRevenues: 'auto',
        fteRegHours: 'auto',
        fteOtHours: 'auto',
        fteTotalPay: 'auto',
        cadDispatch: 'auto',
        cadResponse: 'auto',
        cadScene: 'auto',
        cadTransport: 'auto',
      });

      if (defaultCharts.length > 0) {
        setActiveChartTab(defaultCharts[0].title);
      }
      setCarouselIndex(0);

      if (apiKey) {
        executeAnalysis(
          `I have switched worksheets. Let's analyze the "${sheetName}" sheet. Give me its summary and suggest suitable charts.`,
          messages,
          nextSheet
        );
      }
    }
  };

  const handleSendMessage = (text: string) => {
    if (!activeSheet) return;
    executeAnalysis(text, messages, activeSheet);
  };

  const handleLoadSample = (name: string, fileKey: string) => {
    const data = getMockWorkbook(fileKey);
    handleWorkbookLoaded(data, name);
  };

  const handleCreateCustomChart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customX || !customY) return;
    
    const newChart: ChartSpecification = {
      chartType: customChartType,
      title: customTitle,
      xAxisColumn: customX,
      yAxisColumn: customY,
      aggregation: customAggregation,
      zAxisColumn: customChartType === 'bubble' ? customZ : undefined,
      stackByColumn: ['stackedBar', 'percentStackedBar', 'area'].includes(customChartType) && customStackBy ? customStackBy : undefined
    };

    setAvailableCharts(prev => [...prev, newChart]);
    setSelectedChartTitles(prev => [...prev, newChart.title]);
    setActiveChartTab(newChart.title);
    setCustomTitle('');
    setCustomZ('');
    setCustomStackBy('');
  };

  const handleExportPDF = () => {
    setActiveWorkspaceTab('print-preview');
  };

  const handleRemoveChart = (title: string) => {
    const nextTitles = selectedChartTitles.filter(t => t !== title);
    setSelectedChartTitles(nextTitles);
    if (nextTitles.length > 0) {
      if (carouselIndex >= nextTitles.length) {
        setCarouselIndex(nextTitles.length - 1);
      }
      if (!nextTitles.includes(activeChartTab)) {
        setActiveChartTab(nextTitles[0]);
      }
    }
  };

  // Filter available charts based on multi-select state
  const chartsToRender = availableCharts.filter(c => selectedChartTitles.includes(c.title));

  // Sync printChartOrder with chartsToRender
  useEffect(() => {
    setPrintChartOrder(prev => {
      const currentCharts = availableCharts.filter(c => selectedChartTitles.includes(c.title));
      const isSame = prev.length === currentCharts.length && 
                     prev.every((c, i) => c.title === currentCharts[i].title);
      if (isSame) return prev;
      const existing = prev.filter(c => currentCharts.some(ctr => ctr.title === c.title));
      const added = currentCharts.filter(ctr => !prev.some(c => c.title === ctr.title));
      return [...existing, ...added];
    });
  }, [availableCharts, selectedChartTitles]);

  // Render grouped financial vs operational grid panels dynamically
  const renderGroupedGrid = (charts: ChartSpecification[]) => {
    const isLargeChart = (chart: ChartSpecification, rows: any[]): boolean => {
      if (chart.chartType === 'pie') return false;
      const lowerX = (chart.xAxisColumn || '').toLowerCase();
      const lowerTitle = (chart.title || '').toLowerCase();
      if (chart.chartType === 'line') return true;
      if (
        lowerX.includes('month') || 
        lowerX.includes('date') || 
        lowerX.includes('year') || 
        lowerX.includes('time') ||
        lowerTitle.includes('trend') || 
        lowerTitle.includes('timeline') || 
        lowerTitle.includes('monthly') ||
        lowerTitle.includes('overtime') ||
        lowerTitle.includes('response time')
      ) {
        return true;
      }
      if (rows && rows.length > 0 && chart.xAxisColumn) {
        const uniqueVals = new Set(rows.map(r => r[chart.xAxisColumn]).filter(v => v !== undefined && v !== null));
        if (uniqueVals.size > 5) {
          return true;
        }
      }
      return false;
    };

    const financialCharts = charts.filter(c => classifyChart(c.title) === 'financial');
    const operationalCharts = charts.filter(c => classifyChart(c.title) === 'operational');
    const rows = filteredRows;

    return (
      <div className="print-charts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {financialCharts.length > 0 && (
          <div className="dashboard-section-card">
            <div className="dashboard-section-title">
              <span>💰 Financial Metrics & Cost Allocations</span>
            </div>
            <div 
              className="dashboard-section-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {financialCharts.map((chart, idx) => {
                const isLarge = isLargeChart(chart, rows);
                const gridColumn = isLarge ? 'span 2' : 'span 1';
                const height = isLarge ? '400px' : '330px';
                return (
                   <div key={idx} style={{ gridColumn }}>
                     <InsightChart
                       chartSpec={chart}
                       rows={rows}
                       borderless={true}
                       height={height}
                       colorTheme={colorTheme}
                       onRemove={() => handleRemoveChart(chart.title)}
                       onExpand={(e) => {
                         const rect = e.currentTarget.getBoundingClientRect();
                         setExpandedChartOrigin({
                           x: rect.left + rect.width / 2,
                           y: rect.top + rect.height / 2
                         });
                         setExpandedChart(chart);
                       }}
                     />
                   </div>
                );
              })}
            </div>
          </div>
        )}

        {operationalCharts.length > 0 && (
          <div className="dashboard-section-card">
            <div className="dashboard-section-title">
              <span>⚡ Operational Performance & Volumes</span>
            </div>
            <div 
              className="dashboard-section-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {operationalCharts.map((chart, idx) => {
                const isLarge = isLargeChart(chart, rows);
                const gridColumn = isLarge ? 'span 2' : 'span 1';
                const height = isLarge ? '400px' : '330px';
                return (
                  <div key={idx} style={{ gridColumn }}>
                    <InsightChart
                      chartSpec={chart}
                      rows={rows}
                      borderless={true}
                      height={height}
                      colorTheme={colorTheme}
                      onRemove={() => handleRemoveChart(chart.title)}
                      onExpand={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setExpandedChartOrigin({
                          x: rect.left + rect.width / 2,
                          y: rect.top + rect.height / 2
                        });
                        setExpandedChart(chart);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Extract the most recently generated insights
  const latestInsights = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model' && messages[i].analystResponse?.insights) {
        return messages[i].analystResponse?.insights || [];
      }
    }
    return [];
  })();

  const handleCloseWorkspace = () => {
    setWorkbookData(null);
    setActiveSheetName('');
    setMessages([]);
    setCurrentDocName('');
    setAvailableCharts([]);
    setSelectedChartTitles([]);
    setCarouselIndex(0);
    setActiveChartTab('');
    setActiveWorkspaceTab('dashboard');
    setActiveFilters({});
    setWorkspaceStep('upload');
    setPreviewGoal('');
    setColumnTypes({});
    setExcludedColumns(new Set());
  };

  const handleExportCSV = () => {
    if (!filteredRows || filteredRows.length === 0) return;
    
    // Get headers from columns
    const headers = processedActiveSheet ? processedActiveSheet.columns.map(c => c.name) : Object.keys(filteredRows[0]);
    
    // Generate CSV content
    const csvContent = [
      headers.join(','),
      ...filteredRows.map(row => 
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSheetName.replace(/[^a-zA-Z0-9]/g, '_')}_data_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportProfile = () => {
    const profile = {
      docName: currentDocName,
      selectedChartTitles,
      availableCharts,
      colorTheme,
      layoutMode
    };
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDocName.replace(/[^a-zA-Z0-9]/g, '_')}_profile.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProfile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const profile = JSON.parse(e.target?.result as string);
        if (profile.availableCharts && Array.isArray(profile.availableCharts)) {
          setAvailableCharts(profile.availableCharts);
        }
        if (profile.selectedChartTitles && Array.isArray(profile.selectedChartTitles)) {
          setSelectedChartTitles(profile.selectedChartTitles);
        }
        if (profile.colorTheme) {
          setColorTheme(profile.colorTheme);
        }
        if (profile.layoutMode) {
          setLayoutMode(profile.layoutMode);
        }
        alert("Dashboard profile imported successfully!");
      } catch (err) {
        console.error("Failed to parse JSON profile:", err);
        alert("Invalid profile JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // AI Guided presets curation
  const handleApplyAICuration = async (goal: string) => {
    if (!apiKey || !processedActiveSheet) return;
    setIsPreviewLoading(true);
    try {
      const sampleRows = processedActiveSheet.rows.slice(0, 5);
      const res = await queryGeminiAnalyst(
        apiKey,
        processedActiveSheet.name,
        processedActiveSheet.columns,
        processedActiveSheet.rowCount,
        sampleRows,
        [],
        `Review the active sheet. Curate exactly 6 custom chart configurations that target the following analytical goal: ${goal}. Use actual column names and aggregations suitable for the variables.`
      );
      if (res.charts && res.charts.length > 0) {
        setAvailableCharts(res.charts);
        setSelectedChartTitles(res.charts.map(c => c.title));
        setActiveChartTab(res.charts[0].title);
      }
    } catch (err) {
      console.error("Failed to apply AI curation:", err);
      alert("Error occurred while generating AI-guided visuals.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Auto-generate / skip and let AI decide everything
  const handleAutoGenerateDashboard = async () => {
    if (!apiKey || !processedActiveSheet) {
      setWorkspaceStep('dashboard');
      return;
    }
    
    setIsLoading(true);
    setWorkspaceStep('dashboard');

    const promptText = previewGoal.trim().length > 0
      ? `Auto-generate dashboard visual analysis for goal: ${previewGoal}`
      : "Perform an initial cost report audit of this worksheet. Outline the primary operational/financial metrics and recommend some custom visualizations.";

    // Append initial user message
    const updatedMessages: ChatMessage[] = [
      { role: 'user', content: promptText }
    ];
    setMessages(updatedMessages);

    try {
      const sampleRows = processedActiveSheet.rows.slice(0, 5);
      const res = await queryGeminiAnalyst(
        apiKey,
        processedActiveSheet.name,
        processedActiveSheet.columns,
        processedActiveSheet.rowCount,
        sampleRows,
        [],
        promptText
      );

      setMessages([
        ...updatedMessages,
        { role: 'model', content: '', analystResponse: res }
      ]);

      if (res.charts && res.charts.length > 0) {
        setAvailableCharts(res.charts);
        setSelectedChartTitles(res.charts.map(c => c.title));
        setActiveChartTab(res.charts[0].title);
      }
    } catch (err: any) {
      console.error(err);
      setMessages([
        ...updatedMessages,
        { 
          role: 'model', 
          content: err?.message || 'An error occurred while connecting to the Gemini API. Please check your network connection.',
          isError: true 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-main-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <StarOfLifeIcon />
          </div>
          <span className="logo-text">
            ASCR <span>AI DATA ANALYST</span>
          </span>
        </div>

        <div className="header-actions">
          <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, letterSpacing: '0.05em' }}>
            PUBLIC CONSULTING GROUP
          </span>
        </div>
      </header>

      {/* Welcome Bar / Global Sheet Switcher */}
      <div className="welcome-bar">
        <div className="welcome-info">
          Welcome, <strong>Anthony</strong>
          <span>Administrator</span>
        </div>
        {workbookData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--LabelBG)', fontWeight: 600 }}>
              File: {currentDocName}
            </span>
            
            {isLeftPanelCollapsed && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => setIsLeftPanelCollapsed(false)}
              >
                <Sliders size={14} /> Show Controls
              </button>
            )}

            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={handleCloseWorkspace}>
              <ArrowLeft size={14} /> Close & Upload New
            </button>
            {isChatCollapsed && (
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => setIsChatCollapsed(false)}
              >
                <MessageSquare size={14} /> Open Copilot
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Analysis Workspace */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {workspaceStep === 'upload' && (
          /* ==========================================
             UPLOADER PAGE (NO WORKBOOK LOADED)
             ========================================== */
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '3rem 1.5rem', backgroundColor: 'var(--DashboardBG)' }}>
            <div style={{ maxWidth: '1100px', width: '100%', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Main Uploader Card Container */}
              <div className="glass-card" style={{ padding: '2.5rem 2.5rem', borderRadius: '16px' }}>
                
                {/* 2-Column Split Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2.5rem', alignItems: 'stretch' }}>
                  
                  {/* Left Column: Title & Upload Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'var(--WidgetBG)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(0, 82, 189, 0.12)', color: 'var(--BannerGB)', flexShrink: 0 }}>
                        <FileSpreadsheet size={24} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--LabelBG)', margin: 0, fontWeight: 700 }}>
                          ASCR Data Analyst Workspace
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--DarkGray)', fontWeight: 500 }}>
                          PUBLIC CONSULTING GROUP
                        </span>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--DarkGray)', margin: 0, lineHeight: '1.5' }}>
                      Upload an ambulance service cost report or personnel spreadsheet file to automatically parse sheets, compute rollup benchmarks, and run audits.
                    </p>

                    <FileUploader onWorkbookLoaded={handleWorkbookLoaded} />
                  </div>

                  {/* Right Column: Demo Reports */}
                  <div className="uploader-demo-reports" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)' }}>
                        Quick Start Demo Reports
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--DarkGray)', margin: 0 }}>
                        Explore the workspace immediately with one of our preloaded mock cost sheets:
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
                      <div 
                        className="clickable-row" 
                        onClick={() => handleLoadSample('EMS_Public_Reimbursement_Model.xlsx', 'PEMT Data')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'var(--ExtraLightGray)',
                          border: '1.5px solid var(--LightGray)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ color: 'var(--BannerGB)', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--LightGray)' }}>
                            <Database size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>EMS_Public_Reimbursement_Model.xlsx</strong>
                            <span style={{ fontSize: '0.725rem', color: 'var(--DarkGray)' }}>PEMT volumes, transport fees, & supplemental funding totals</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem', textTransform: 'none' }}>Excel sheet</span>
                          <ChevronRight size={16} style={{ color: 'var(--DarkGray)' }} />
                        </div>
                      </div>

                      <div 
                        className="clickable-row" 
                        onClick={() => handleLoadSample('Payroll_FTE_Expenditures_Audit.xlsx', 'Personnel Hours')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'var(--ExtraLightGray)',
                          border: '1.5px solid var(--LightGray)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ color: 'var(--BannerGB)', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--LightGray)' }}>
                            <Database size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>Payroll_FTE_Expenditures_Audit.xlsx</strong>
                            <span style={{ fontSize: '0.725rem', color: 'var(--DarkGray)' }}>FTE counts, base pay, and overtime expenditures by job title</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem', textTransform: 'none' }}>Excel sheet</span>
                          <ChevronRight size={16} style={{ color: 'var(--DarkGray)' }} />
                        </div>
                      </div>



                      <div 
                        className="clickable-row" 
                        onClick={() => handleLoadSample('Hospital_Clinical_Performance_Metrics.xlsx', 'Hospital Performance')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'var(--ExtraLightGray)',
                          border: '1.5px solid var(--LightGray)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ color: 'var(--BannerGB)', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--LightGray)' }}>
                            <Database size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>Hospital_Clinical_Performance_Metrics.xlsx</strong>
                            <span style={{ fontSize: '0.725rem', color: 'var(--DarkGray)' }}>Patient admissions, stay durations, satisfaction rates, staff pay, & overhead cost models</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem', textTransform: 'none' }}>Excel sheet</span>
                          <ChevronRight size={16} style={{ color: 'var(--DarkGray)' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {workspaceStep === 'preview' && workbookData && activeSheet && (
          /* ==========================================
             DATA PREVIEW & CONFIGURATION PAGE
             ========================================== */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--DashboardBG)' }}>
            
            {/* Steps & Profile Import Header */}
            <div style={{ background: 'white', borderBottom: '1.5px solid var(--LightGray)', padding: '1rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--LabelBG)', margin: 0, fontWeight: 700 }}>
                  Step 2 of 3: Set Focus & Select Visual Reports
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--DarkGray)', fontWeight: 500 }}>
                  Analyzing Sheet: <strong>{activeSheetName}</strong> • Total Records: <strong>{activeSheet.rowCount}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label 
                  className="btn btn-secondary" 
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0 }}
                >
                  <Database size={14} /> Load Saved Settings
                  <input 
                    type="file" 
                    accept=".json" 
                    style={{ display: 'none' }} 
                    onChange={e => e.target.files && handleImportProfile(e.target.files[0])} 
                  />
                </label>
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="preview-step-container">
              
              {/* Left Column: Set Business Focus */}
              <div className="preview-card-wrapper">
                <div style={{ borderBottom: '1.5px solid var(--LightGray)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    🎯 Set Business Focus
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                    Describe the primary business questions or metrics you want to analyze (e.g. 'Compare regular hourly pay across job titles'). The AI will instantly customize and select the reports on the right to match:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
                  <textarea
                    className="goal-textarea"
                    style={{ flex: 1, resize: 'none', minHeight: '200px' }}
                    placeholder="e.g. Highlight EMT hourly rates vs. Shift supervisors, and audit our regular salary expenditures."
                    value={previewGoal}
                    onChange={e => setPreviewGoal(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.8rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    onClick={() => handleApplyAICuration(previewGoal)}
                    disabled={isPreviewLoading || previewGoal.trim().length === 0}
                  >
                    {isPreviewLoading ? (
                      <>
                        <span className="spinner"></span> Customizing Reports...
                      </>
                    ) : (
                      <>Apply Business Focus ✨</>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Included Reports & Charts */}
              <div className="preview-card-wrapper">
                <div style={{ borderBottom: '1.5px solid var(--LightGray)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    📊 Select Reports & Charts ({availableCharts.length} Recommended)
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                    Choose which visual reports to display on the dashboard and select the style or calculation method for each:
                  </p>
                </div>

                <div className="preview-charts-list" style={{ flex: 1, overflowY: 'auto' }}>
                  {availableCharts.map((chart, idx) => {
                    const isChecked = selectedChartTitles.includes(chart.title);
                    return (
                      <div key={idx} className={`preview-chart-item-card ${isChecked ? '' : 'disabled'}`} style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'flex-start', padding: '0.85rem' }}>
                        {/* Checkbox and Thumbnail Left side */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            style={{ cursor: 'pointer' }}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedChartTitles(selectedChartTitles.filter(t => t !== chart.title));
                              } else {
                                setSelectedChartTitles([...selectedChartTitles, chart.title]);
                              }
                            }}
                          />
                          <div style={{ 
                            background: '#f8fafc', 
                            border: '1.5px solid var(--LightGray)', 
                            borderRadius: '8px', 
                            width: '56px', 
                            height: '40px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <MiniChartThumbnail chartType={chart.chartType} />
                          </div>
                        </div>

                        {/* Title, Style & Summarize Right side */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            style={{ flex: 1, padding: '0.2rem 0.4rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--LightGray)', color: 'var(--LabelBG)', fontWeight: 600 }}
                            value={chart.title}
                            onChange={e => {
                              const newTitle = e.target.value;
                              setAvailableCharts(prev => prev.map((c, i) => i === idx ? { ...c, title: newTitle } : c));
                              if (isChecked) {
                                setSelectedChartTitles(prev => prev.map(t => t === chart.title ? newTitle : t));
                              }
                            }}
                          />

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold' }}>Visual Style</span>
                              <select
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--LightGray)', background: 'white' }}
                                value={chart.chartType}
                                onChange={e => {
                                  const newType = e.target.value as any;
                                  setAvailableCharts(prev => prev.map((c, i) => i === idx ? { ...c, chartType: newType } : c));
                                }}
                              >
                                <option value="bar">Vertical Bar Chart</option>
                                <option value="horizontalBar">Horizontal Bar Chart</option>
                                <option value="line">Line Chart</option>
                                <option value="pie">Pie Chart</option>
                                <option value="scatter">Scatter Plot</option>
                                <option value="bubble">Bubble Correlation</option>
                                <option value="radar">Radar Comparison</option>
                                <option value="box">Box & Whisker Plot</option>
                                <option value="stackedBar">Stacked Bar Chart</option>
                                <option value="percentStackedBar">100% Stacked Bar Chart</option>
                                <option value="area">Area Chart</option>
                              </select>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold' }}>Summarize By</span>
                              <select
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--LightGray)', background: 'white' }}
                                value={chart.aggregation}
                                onChange={e => {
                                  const newAgg = e.target.value as any;
                                  setAvailableCharts(prev => prev.map((c, i) => i === idx ? { ...c, aggregation: newAgg } : c));
                                }}
                              >
                                <option value="sum">Total Sum</option>
                                <option value="avg">Average</option>
                                <option value="count">Count</option>
                                <option value="none">Actual Values</option>
                              </select>
                            </div>

                            {['stackedBar', 'percentStackedBar', 'area'].includes(chart.chartType) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', gridColumn: 'span 2' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--DarkGray)', fontWeight: 'bold' }}>Stack / Split By</span>
                                <select
                                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid var(--LightGray)', background: 'white' }}
                                  value={chart.stackByColumn || ''}
                                  onChange={e => {
                                    const newStack = e.target.value;
                                    setAvailableCharts(prev => prev.map((c, i) => i === idx ? { ...c, stackByColumn: newStack || undefined } : c));
                                  }}
                                >
                                  <option value="">-- No Stacking --</option>
                                  {processedActiveSheet?.columns.map((col, cIdx) => (
                                    <option key={cIdx} value={col.name}>{col.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Control Panel */}
            <div className="preview-footer-bar">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCloseWorkspace}
                style={{ padding: '0.5rem 1.25rem' }}
              >
                ← Back to Upload
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1.25rem', borderColor: 'var(--BannerGB)', color: 'var(--BannerGB)', fontWeight: 'bold' }}
                  onClick={handleAutoGenerateDashboard}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Auto-Generate (Let AI Decide) ✨'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setWorkspaceStep('dashboard')}
                  style={{ padding: '0.5rem 1.5rem', fontWeight: 'bold' }}
                >
                  Launch Executive Dashboard 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {workspaceStep === 'dashboard' && workbookData && activeSheet && (
          /* ==========================================
             ACTIVE ANALYSIS WORKSPACE (MAXIMIZED FOR DATA VIS)
             ========================================== */
          <div 
            className="workspace-container"
            style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              height: '100%', 
              width: '100%',
              padding: '1rem 1.5rem', 
              gap: '0', 
              overflow: 'hidden',
              background: 'var(--DashboardBG)',
              boxSizing: 'border-box'
            }}
          >
            {/* Left Column - Collapsible Drawer (Settings & Data Explorer) */}
            <div 
              className="sidebar-panel left-sidebar-panel" 
              style={{ 
                width: isLeftPanelCollapsed ? '0px' : '460px',
                opacity: isLeftPanelCollapsed ? 0 : 1,
                pointerEvents: isLeftPanelCollapsed ? 'none' : 'auto',
                transform: isLeftPanelCollapsed ? 'translateX(-100%)' : 'translateX(0)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginRight: isLeftPanelCollapsed ? '0' : '1.25rem',
                border: isLeftPanelCollapsed ? 'none' : undefined,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flexShrink: 0
              }}
            >
              {/* Inner wrapper to enforce width and enable independent vertical scrolling */}
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  width: '460px', 
                  minWidth: '460px', 
                  padding: '1.25rem', 
                  gap: '1.25rem', 
                  overflowY: 'auto',
                  boxSizing: 'border-box'
                }}
              >
                {/* Drawer Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--LightGray)', paddingBottom: '0.75rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sliders size={18} style={{ color: 'var(--BannerGB)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>
                      Dashboard Controls
                    </h3>
                  </div>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: '0.25rem', borderRadius: '4px' }}
                    onClick={() => setIsLeftPanelCollapsed(true)}
                    title="Collapse Panel"
                  >
                    <ChevronLeft size={18} style={{ color: 'var(--DarkGray)' }} />
                  </button>
                </div>

                {/* Step 1. Global Sheet Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--BannerGB)', color: 'white', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>1</div>
                    <Database size={14} style={{ color: 'var(--BannerGB)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Active Sheet</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                    Choose a worksheet to update the dashboard metrics.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {workbookData.sheets.map(sheet => (
                      <button
                        key={sheet.name}
                        className="btn"
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          background: activeSheetName === sheet.name ? 'var(--LabelBG)' : 'white',
                          color: activeSheetName === sheet.name ? 'white' : 'var(--DarkGray)',
                          border: activeSheetName === sheet.name ? 'none' : '1px solid var(--LightGray)',
                          fontWeight: activeSheetName === sheet.name ? 'bold' : 'normal',
                          boxShadow: activeSheetName === sheet.name ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleSheetChange(sheet.name)}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2. Interactive Dashboard Filters */}
                {activeSheet && filterableColumns.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ background: 'var(--BannerGB)', color: 'white', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>2</div>
                        <SlidersHorizontal size={14} style={{ color: 'var(--BannerGB)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Filter Your View
                        </span>
                      </div>
                      {Object.keys(activeFilters).length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0px 4px', fontSize: '0.65rem', color: 'var(--BannerGB)', fontWeight: 'bold', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={() => setActiveFilters({})}
                        >
                          Reset All
                        </button>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                      Segment your dashboard by selecting specific values.
                    </p>
                    <div 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.85rem',
                        marginTop: '0.25rem'
                      }}
                    >
                      {filterableColumns.map((col, idx) => {
                        const selectedValues = activeFilters[col.name] || [];
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--LabelBG)', textTransform: 'capitalize' }}>
                              {col.name}
                            </span>
                            
                            {col.values.length <= 5 ? (
                              /* Pill list multi-selector */
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                {col.values.map(val => {
                                  const isSel = selectedValues.includes(val);
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      style={{
                                        padding: '0.25rem 0.6rem',
                                        fontSize: '0.65rem',
                                        borderRadius: '20px',
                                        background: isSel ? 'var(--LabelBG)' : 'var(--ExtraLightGray)',
                                        color: isSel ? 'white' : 'var(--DarkGray)',
                                        border: isSel ? '1.5px solid var(--LabelBG)' : '1px solid var(--LightGray)',
                                        cursor: 'pointer',
                                        fontWeight: isSel ? 'bold' : 'normal',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isSel ? '0 1px 3px rgba(0,82,189,0.2)' : 'none'
                                      }}
                                      onClick={() => handleToggleFilterVal(col.name, val)}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Dropdown single-selector */
                              <select
                                className="filter-select"
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.5rem',
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  border: selectedValues.length > 0 ? '1.5px solid var(--LabelBG)' : '1px solid var(--LightGray)',
                                  background: selectedValues.length > 0 ? 'rgba(0,82,189,0.02)' : 'white',
                                  color: 'var(--LabelBG)',
                                  fontWeight: selectedValues.length > 0 ? 'bold' : 'normal'
                                }}
                                value={selectedValues[0] || 'ALL_VALUES'}
                                onChange={(e) => handleSetSingleFilterVal(col.name, e.target.value)}
                              >
                                <option value="ALL_VALUES">Show All {col.name}s</option>
                                {col.values.map(val => (
                                  <option key={val} value={val}>{val}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--BannerGB)', color: 'white', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>3</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Select Visible Reports ({selectedChartTitles.length}/{availableCharts.length})
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                    Toggle individual charts on or off to customize your active canvas.
                  </p>
                  
                  <div 
                    style={{ 
                      maxHeight: '180px', 
                      overflowY: 'auto', 
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem', 
                      marginTop: '0.25rem',
                      paddingRight: '0.25rem'
                    }}
                  >
                    {availableCharts.map((chart, idx) => {
                      const isChecked = selectedChartTitles.includes(chart.title);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.4rem 0.65rem',
                            borderRadius: '6px',
                            background: isChecked ? 'rgba(0, 82, 189, 0.04)' : 'var(--ExtraLightGray)',
                            border: isChecked ? '1px solid var(--BannerGB)' : '1px solid var(--LightGray)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={() => {
                            let nextTitles;
                            if (isChecked) {
                              nextTitles = selectedChartTitles.filter(t => t !== chart.title);
                            } else {
                              nextTitles = [...selectedChartTitles, chart.title];
                            }
                            setSelectedChartTitles(nextTitles);
                            
                            if (nextTitles.length > 0) {
                              if (carouselIndex >= nextTitles.length) {
                                  setCarouselIndex(nextTitles.length - 1);
                              }
                              if (!nextTitles.includes(activeChartTab)) {
                                  setActiveChartTab(nextTitles[0]);
                              }
                            }
                          }}
                        >
                          <span 
                            style={{ 
                              fontSize: '0.725rem', 
                              fontWeight: isChecked ? 'bold' : 'normal',
                              color: 'var(--LabelBG)',
                              textOverflow: 'ellipsis', 
                              overflow: 'hidden', 
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0
                            }} 
                            title={chart.title}
                          >
                            {chart.title}
                          </span>
                          
                          {/* Modern switch */}
                          <div style={{
                            width: '28px',
                            height: '16px',
                            borderRadius: '10px',
                            background: isChecked ? 'var(--BannerGB)' : '#cbd5e1',
                            position: 'relative',
                            transition: 'background-color 0.2s ease',
                            flexShrink: 0
                          }}>
                            <div style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: 'white',
                              position: 'absolute',
                              top: '2px',
                              left: isChecked ? '14px' : '2px',
                              transition: 'left 0.2s ease'
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 4. Add Custom Chart Builder Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--BannerGB)', color: 'white', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>4</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Design a Custom Report
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                    Create a custom analysis card by choosing your variables.
                  </p>
                  <form onSubmit={handleCreateCustomChart} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Report Title</span>
                      <input 
                        type="text"
                        className="form-input"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                        placeholder="e.g. Overtime Total"
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Visual Style</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customChartType}
                          onChange={e => {
                            const val = e.target.value as any;
                            setCustomChartType(val);
                            if (val === 'scatter' || val === 'bubble' || val === 'box' || val === 'radar') {
                              setCustomAggregation('none');
                            } else {
                              setCustomAggregation('sum');
                            }
                          }}
                        >
                          <option value="bar">Vertical Bar Chart</option>
                          <option value="horizontalBar">Horizontal Bar Chart</option>
                          <option value="line">Line Chart</option>
                          <option value="pie">Pie Chart</option>
                          <option value="scatter">Scatter Plot</option>
                          <option value="bubble">Bubble Correlation</option>
                          <option value="radar">Radar Comparison</option>
                          <option value="box">Box & Whisker Plot</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Calculation Mode</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customAggregation}
                          onChange={e => setCustomAggregation(e.target.value as any)}
                        >
                          <option value="sum">Total Sum</option>
                          <option value="avg">Average</option>
                          <option value="count">Record Count</option>
                          <option value="none">Raw Data (None)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>X-Axis</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customX}
                          onChange={e => setCustomX(e.target.value)}
                          required
                        >
                          <option value="">-- Select --</option>
                          {processedActiveSheet?.columns.map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Y-Axis</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customY}
                          onChange={e => setCustomY(e.target.value)}
                          required
                        >
                          <option value="">-- Select --</option>
                          {processedActiveSheet?.columns.map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {customChartType === 'bubble' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Z-Axis (Bubble Size)</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customZ}
                          onChange={e => setCustomZ(e.target.value)}
                          required
                        >
                          <option value="">-- Select --</option>
                          {processedActiveSheet?.columns.filter(c => c.type === 'number').map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {['stackedBar', 'percentStackedBar', 'area'].includes(customChartType) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Stack / Split By</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customStackBy}
                          onChange={e => setCustomStackBy(e.target.value)}
                        >
                          <option value="">-- No Stacking --</option>
                          {processedActiveSheet?.columns.map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', marginTop: '0.25rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      🚀 Add Custom Report to Dashboard
                    </button>
                  </form>
                </div>

                {/* Step 5. Presentation Settings & Export Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flexShrink: 0, border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem', background: 'white', boxShadow: 'var(--shadow-sm)', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: 'var(--BannerGB)', color: 'white', width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>5</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Presentation & Export Settings
                    </span>
                  </div>

                  {/* Display Layout */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>🖥️ Display Layout</span>
                    <div style={{ display: 'flex', background: 'var(--ExtraLightGray)', borderRadius: '6px', padding: '3px', border: '1px solid var(--LightGray)', marginTop: '0.15rem' }}>
                      <button 
                        type="button"
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'grid' ? 'white' : 'transparent', color: layoutMode === 'grid' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: layoutMode === 'grid' ? 'bold' : 'normal', cursor: 'pointer' }}
                        onClick={() => setLayoutMode('grid')}
                      >
                        Grid
                      </button>
                      <button 
                        type="button"
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'carousel' ? 'white' : 'transparent', color: layoutMode === 'carousel' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'carousel' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: layoutMode === 'carousel' ? 'bold' : 'normal', cursor: 'pointer' }}
                        onClick={() => setLayoutMode('carousel')}
                      >
                        Carousel
                      </button>
                      <button 
                        type="button"
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'tabbed' ? 'white' : 'transparent', color: layoutMode === 'tabbed' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'tabbed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: layoutMode === 'tabbed' ? 'bold' : 'normal', cursor: 'pointer' }}
                        onClick={() => setLayoutMode('tabbed')}
                      >
                        Tabs
                      </button>
                    </div>
                  </div>

                  {/* Color Theme */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>🎨 Color Theme</span>
                    <div style={{ display: 'flex', background: 'var(--ExtraLightGray)', borderRadius: '6px', padding: '3px', border: '1px solid var(--LightGray)', marginTop: '0.15rem' }}>
                      <button 
                        type="button"
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: colorTheme === 'classic' ? 'white' : 'transparent', color: colorTheme === 'classic' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: colorTheme === 'classic' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: colorTheme === 'classic' ? 'bold' : 'normal', cursor: 'pointer' }}
                        onClick={() => setColorTheme('classic')}
                      >
                        Classic PCG Blue
                      </button>
                      <button 
                        type="button"
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: colorTheme === 'vibrant' ? 'white' : 'transparent', color: colorTheme === 'vibrant' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: colorTheme === 'vibrant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: colorTheme === 'vibrant' ? 'bold' : 'normal', cursor: 'pointer' }}
                        onClick={() => setColorTheme('vibrant')}
                      >
                        Vibrant Domain
                      </button>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', background: 'var(--BannerGB)' }}
                      onClick={handleExportPDF}
                    >
                      <Printer size={14} /> Configure & Preview PDF Report 🖨️
                    </button>

                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={handleExportProfile}
                    >
                      Export Dashboard Profile (.json) 📥
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Center Column - Large visual dashboard (spacious canvas, borderless float style) */}
            <div 
              className="dashboard-canvas-panel" 
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                gap: '1rem', 
                minHeight: 0 
              }}
            >
              {/* Canvas Header */}
              <div 
                className="canvas-header"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  borderBottom: '1.5px solid var(--LightGray)', 
                  paddingBottom: '0.75rem',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isLeftPanelCollapsed && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '6px', marginRight: '0.5rem' }}
                      onClick={() => setIsLeftPanelCollapsed(false)}
                      title="Open Control Panel"
                    >
                      <Sliders size={14} /> Control & Data Panel
                    </button>
                  )}

                  {/* Top Level Nav Tab switcher */}
                  <div style={{ display: 'flex', background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.775rem',
                        borderRadius: '6px',
                        background: activeWorkspaceTab === 'dashboard' ? 'var(--LabelBG)' : 'transparent',
                        color: activeWorkspaceTab === 'dashboard' ? 'white' : 'var(--DarkGray)',
                        border: 'none',
                        fontWeight: activeWorkspaceTab === 'dashboard' ? 'bold' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeWorkspaceTab === 'dashboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setActiveWorkspaceTab('dashboard')}
                    >
                      <BarChart2 size={14} /> Executive Dashboard
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.775rem',
                        borderRadius: '6px',
                        background: activeWorkspaceTab === 'spreadsheet' ? 'var(--LabelBG)' : 'transparent',
                        color: activeWorkspaceTab === 'spreadsheet' ? 'white' : 'var(--DarkGray)',
                        border: 'none',
                        fontWeight: activeWorkspaceTab === 'spreadsheet' ? 'bold' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeWorkspaceTab === 'spreadsheet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setActiveWorkspaceTab('spreadsheet')}
                    >
                      <FileSpreadsheet size={14} /> Spreadsheet Data
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.775rem',
                        borderRadius: '6px',
                        background: activeWorkspaceTab === 'methodology' ? 'var(--LabelBG)' : 'transparent',
                        color: activeWorkspaceTab === 'methodology' ? 'white' : 'var(--DarkGray)',
                        border: 'none',
                        fontWeight: activeWorkspaceTab === 'methodology' ? 'bold' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeWorkspaceTab === 'methodology' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setActiveWorkspaceTab('methodology')}
                    >
                      <TrendingUp size={14} /> Methodology & Calculations
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.775rem',
                        borderRadius: '6px',
                        background: activeWorkspaceTab === 'print-preview' ? 'var(--LabelBG)' : 'transparent',
                        color: activeWorkspaceTab === 'print-preview' ? 'white' : 'var(--DarkGray)',
                        border: 'none',
                        fontWeight: activeWorkspaceTab === 'print-preview' ? 'bold' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeWorkspaceTab === 'print-preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setActiveWorkspaceTab('print-preview')}
                    >
                      <Printer size={14} /> PDF Report Builder
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Content Rendering */}
              {activeWorkspaceTab === 'dashboard' && (
                /* Canvas Scrollable Content for Dashboard Visualizations */
                <div 
                  className="dashboard-scrollable-content"
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem', 
                    paddingRight: '0.5rem' 
                  }}
                >
                  {/* Executive Summary Card (Collapsible, Floating Card) */}
                  {latestInsights.length > 0 && (
                    <div className="analysis-insights-card" style={{ background: 'var(--WidgetBG)', border: '1.5px solid rgba(0,82,189,0.12)', borderLeft: '4px solid var(--BannerGB)', padding: '1.25rem', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
                      <div 
                        onClick={() => setIsInsightsCollapsed(!isInsightsCollapsed)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TrendingUp size={16} style={{ color: 'var(--BannerGB)' }} />
                          <strong style={{ fontSize: '0.9rem', color: 'var(--LabelBG)' }}>Analysis Insights Summary</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--BannerGB)', fontWeight: 'bold', fontSize: '0.75rem' }}>
                          <span>{isInsightsCollapsed ? 'Expand' : 'Collapse'}</span>
                          {isInsightsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </div>
                      </div>
                      {!isInsightsCollapsed && (
                        <ul className="screen-only-insights" style={{ margin: '0.75rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--HeaderText)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {latestInsights.map((insight, idx) => (
                            <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(insight) }} />
                          ))}
                        </ul>
                      )}

                      <ul className="print-only-insights" style={{ display: 'none', margin: '0.75rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'black', flexDirection: 'column', gap: '0.4rem' }}>
                        {latestInsights.map((insight, idx) => (
                          <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(insight) }} />
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* KPI Statistics Row (Floating white cards with left border accents) */}
                  <div className="kpi-print-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div 
                      style={{ 
                        border: '1px solid var(--border-light)', 
                        borderLeft: colorTheme === 'classic' ? '1px solid var(--border-light)' : '4px solid #0052BD',
                        background: colorTheme === 'classic' ? 'white' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
                        borderRadius: '10px', 
                        padding: '1rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.25rem',
                        boxShadow: 'var(--shadow-sm)' 
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Records</span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                        {filteredRows.length.toLocaleString()} {filteredRows.length === processedActiveSheet?.rows.length ? 'rows' : 'filtered'}
                      </span>
                    </div>
                    {processedActiveSheet?.columns.filter(c => c.type === 'number').slice(0, 3).map((col, idx) => {
                      const avg = getFilteredAverage(col.name);
                      // Dynamic harmonic palettes: Emerald Green, Indigo Purple, Amber Gold
                      const isClassic = colorTheme === 'classic';
                      const cardThemes = isClassic 
                        ? Array(3).fill({ bg: 'white', border: '1px solid var(--border-light)' })
                        : [
                            { bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '4px solid #10b981' },
                            { bg: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)', border: '4px solid #6366f1' },
                            { bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '4px solid #f59e0b' }
                          ];
                      const theme = cardThemes[idx % cardThemes.length];
                      
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            border: '1px solid var(--border-light)', 
                            borderLeft: theme.border,
                            background: theme.bg, 
                            borderRadius: '10px', 
                            padding: '1rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.25rem',
                            boxShadow: 'var(--shadow-sm)' 
                          }}
                        >
                          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg {col.name}</span>
                          <span style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                            {avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {chartsToRender.length === 0 ? (
                    <div style={{ background: 'white', border: '1.5px dashed var(--LightGray)', borderRadius: '10px', padding: '4rem 1rem', textAlign: 'center', color: 'var(--DarkGray)', fontSize: '0.85rem' }}>
                      {availableCharts.length === 0 
                        ? (isLoading ? 'AI Copilot is auditing spreadsheet and designing dashboard charts...' : 'Upload data to begin.') 
                        : 'No charts active. Select configurations in the Dashboard Control Panel to populate this section.'}
                    </div>
                  ) : (
                    <div style={{ width: '100%' }}>
                      {/* ==========================================
                         SCREEN ONLY VIEWS
                         ========================================== */}
                      <div className="screen-only-dashboard" style={{ width: '100%' }}>
                        {/* Grid Mode */}
                        {layoutMode === 'grid' && renderGroupedGrid(chartsToRender)}

                        {/* Carousel Mode */}
                        {layoutMode === 'carousel' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                            <div className="carousel-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                              <button 
                                type="button"
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                                onClick={() => setCarouselIndex(prev => (prev > 0 ? prev - 1 : chartsToRender.length - 1))}
                              >
                                <ChevronLeft size={14} /> Prev
                              </button>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                                Chart {carouselIndex + 1} of {chartsToRender.length} • {chartsToRender[carouselIndex]?.title}
                              </span>
                              <button 
                                type="button"
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                                onClick={() => setCarouselIndex(prev => (prev < chartsToRender.length - 1 ? prev + 1 : 0))}
                              >
                                Next <ChevronRight size={14} />
                              </button>
                            </div>
                            {chartsToRender[carouselIndex] && (
                              <div className="dashboard-section-card" style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', boxShadow: 'var(--shadow-md)' }}>
                                <InsightChart
                                  chartSpec={chartsToRender[carouselIndex]}
                                  rows={filteredRows}
                                  borderless={true}
                                  height="400px"
                                  colorTheme={colorTheme}
                                  onRemove={() => handleRemoveChart(chartsToRender[carouselIndex].title)}
                                  onExpand={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setExpandedChartOrigin({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top + rect.height / 2
                                    });
                                    setExpandedChart(chartsToRender[carouselIndex]);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tabbed Mode */}
                        {layoutMode === 'tabbed' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                            <div className="tabs-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', borderBottom: '1.5px solid var(--LightGray)', paddingBottom: '0.5rem' }}>
                              {chartsToRender.map((chart, idx) => (
                                <button
                                  type="button"
                                  key={idx}
                                  className="btn"
                                  style={{
                                    padding: '0.3rem 0.6rem',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    background: activeChartTab === chart.title ? 'var(--LabelBG)' : 'white',
                                    color: activeChartTab === chart.title ? 'white' : 'var(--DarkGray)',
                                    border: activeChartTab === chart.title ? 'none' : '1px solid var(--LightGray)',
                                    fontWeight: activeChartTab === chart.title ? 'bold' : 'normal',
                                    boxShadow: activeChartTab === chart.title ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setActiveChartTab(chart.title)}
                                >
                                  {chart.title}
                                </button>
                              ))}
                            </div>
                            {chartsToRender.find(c => c.title === activeChartTab) && (
                              <div className="dashboard-section-card" style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', boxShadow: 'var(--shadow-md)' }}>
                                <InsightChart
                                  chartSpec={chartsToRender.find(c => c.title === activeChartTab)!}
                                  rows={filteredRows}
                                  borderless={true}
                                  height="400px"
                                  colorTheme={colorTheme}
                                  onRemove={() => handleRemoveChart(activeChartTab)}
                                  onExpand={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setExpandedChartOrigin({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top + rect.height / 2
                                    });
                                    setExpandedChart(chartsToRender.find(c => c.title === activeChartTab)!);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ==========================================
                         PRINT ONLY FALLBACK (Always renders all charts)
                         ========================================== */}
                      <div className="print-fallback-only" style={{ width: '100%' }}>
                        {renderGroupedGrid(chartsToRender)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeWorkspaceTab === 'spreadsheet' && (
                /* Spreadsheet Data Tab (Full screen data explorer, not scrunched) */
                <div 
                  style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: 0, 
                    background: 'white', 
                    borderRadius: '12px', 
                    padding: '1.25rem', 
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <DataPreview
                    workbookData={workbookData}
                    activeSheetName={activeSheetName}
                    onSheetChange={handleSheetChange}
                    processedActiveSheet={processedActiveSheet}
                    onExportCSV={handleExportCSV}
                  />
                </div>
              )}

              {activeWorkspaceTab === 'methodology' && (
                /* Methodology & Calculation Framework Tab */
                <div 
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem', 
                    paddingRight: '0.5rem' 
                  }}
                >
                  {/* Methodology Intro Card */}
                  <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🧠 Methodology and Analytical Framework
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                      This page details the underlying formulas, data models, and rollup aggregations used to generate the charts, metrics, and insights on the Executive Dashboard.
                    </p>
                  </div>

                  {/* Collapsible Column Mapper Card */}
                  <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
                    <div 
                      onClick={() => setIsMapperCollapsed(!isMapperCollapsed)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sliders size={16} style={{ color: 'var(--BannerGB)' }} />
                        <strong style={{ fontSize: '0.9rem', color: 'var(--LabelBG)' }}>⚙️ Custom Sheet Variable Mapper</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--DarkGray)', background: 'var(--ExtraLightGray)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {isMapperCollapsed ? 'Configure' : 'Active'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--BannerGB)', fontWeight: 'bold', fontSize: '0.75rem' }}>
                        <span>{isMapperCollapsed ? 'Configure Columns' : 'Collapse'}</span>
                        {isMapperCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </div>
                    </div>
                    
                    {!isMapperCollapsed && (
                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--LightGray)', paddingTop: '1rem' }}>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.775rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                          Map the columns from worksheet <strong>{activeSheetName}</strong> to the analytical model variables below. The system automatically searches for matching keywords, but you can override them manually.
                        </p>
                        
                        {processedActiveSheet ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                            {activeMethodologySubTab === 'pemt' && (
                              <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Run Volume Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.pemtVolume}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, pemtVolume: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('pemtVolume')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Avg Cost Per Transport Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.pemtAvgCost}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, pemtAvgCost: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('pemtAvgCost')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Baseline Revenues Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.pemtRevenues}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, pemtRevenues: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('pemtRevenues')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            {activeMethodologySubTab === 'fte' && (
                              <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Regular Hours Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.fteRegHours}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, fteRegHours: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('fteRegHours')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Overtime Hours Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.fteOtHours}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, fteOtHours: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('fteOtHours')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Total Regular/Overtime Pay Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.fteTotalPay}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, fteTotalPay: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('fteTotalPay')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}

                            {activeMethodologySubTab === 'cad' && (
                              <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Dispatch Delay Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.cadDispatch}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, cadDispatch: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('cadDispatch')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Response Time Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.cadResponse}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, cadResponse: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('cadResponse')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Scene Time Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.cadScene}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, cadScene: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('cadScene')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Transport Time Column</span>
                                  <select
                                    className="filter-select"
                                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                    value={columnMappings.cadTransport}
                                    onChange={(e) => setColumnMappings(prev => ({ ...prev, cadTransport: e.target.value }))}
                                  >
                                    <option value="auto">{getAutoDetectedName('cadTransport')}</option>
                                    {processedActiveSheet.columns.map(c => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: 'var(--DarkGray)', fontStyle: 'italic' }}>
                            No active sheet loaded. Upload a sheet to map custom fields.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Methodology Sub-Tabs Navigation */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.75rem', flexShrink: 0 }}>
                    {isPemtRelevant && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.8rem',
                          borderRadius: '20px',
                          background: activeMethodologySubTab === 'pemt' ? 'var(--LabelBG)' : 'white',
                          color: activeMethodologySubTab === 'pemt' ? 'white' : 'var(--DarkGray)',
                          border: activeMethodologySubTab === 'pemt' ? 'none' : '1px solid var(--LightGray)',
                          fontWeight: activeMethodologySubTab === 'pemt' ? 'bold' : 'normal',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: activeMethodologySubTab === 'pemt' ? 'var(--shadow-sm)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => setActiveMethodologySubTab('pemt')}
                      >
                        <DollarSign size={14} /> PEMT Supplemental Reimbursement
                      </button>
                    )}
                    {isFteRelevant && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.8rem',
                          borderRadius: '20px',
                          background: activeMethodologySubTab === 'fte' ? 'var(--LabelBG)' : 'white',
                          color: activeMethodologySubTab === 'fte' ? 'white' : 'var(--DarkGray)',
                          border: activeMethodologySubTab === 'fte' ? 'none' : '1px solid var(--LightGray)',
                          fontWeight: activeMethodologySubTab === 'fte' ? 'bold' : 'normal',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: activeMethodologySubTab === 'fte' ? 'var(--shadow-sm)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => setActiveMethodologySubTab('fte')}
                      >
                        <Users size={14} /> Personnel Hours & FTEs
                      </button>
                    )}
                    {isCadRelevant && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.8rem',
                          borderRadius: '20px',
                          background: activeMethodologySubTab === 'cad' ? 'var(--LabelBG)' : 'white',
                          color: activeMethodologySubTab === 'cad' ? 'white' : 'var(--DarkGray)',
                          border: activeMethodologySubTab === 'cad' ? 'none' : '1px solid var(--LightGray)',
                          fontWeight: activeMethodologySubTab === 'cad' ? 'bold' : 'normal',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: activeMethodologySubTab === 'cad' ? 'var(--shadow-sm)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => setActiveMethodologySubTab('cad')}
                      >
                        <Clock size={14} /> CAD Dispatch Time Benchmarks
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        borderRadius: '20px',
                        background: activeMethodologySubTab === 'general' ? 'var(--LabelBG)' : 'white',
                        color: activeMethodologySubTab === 'general' ? 'white' : 'var(--DarkGray)',
                        border: activeMethodologySubTab === 'general' ? 'none' : '1px solid var(--LightGray)',
                        fontWeight: activeMethodologySubTab === 'general' ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeMethodologySubTab === 'general' ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveMethodologySubTab('general')}
                    >
                      <BarChart2 size={14} /> Dataset Summary & Averages
                    </button>
                  </div>

                  {/* Active Sub-Tab content */}
                  {activeMethodologySubTab === 'pemt' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          💰 PEMT Supplemental Reimbursement Calculations
                        </h4>
                        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.825rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                          The Public Emergency Medical Transportation (PEMT) program provides supplemental funding to eligible providers for emergency ground transport services. The calculation models the deficit between allowable costs and baseline revenues.
                        </p>

                        {/* Equation layout */}
                        <div className="math-container">
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Operational Equation</div>
                          <div className="math-equation">
                            <span className="math-variable">Reimbursement</span>
                            <span className="math-operator">=</span>
                            <span className="math-operator">(</span>
                            <span className="math-variable">Total Run Volume</span>
                            <span className="math-operator">×</span>
                            <span className="math-variable">Avg Cost Per Transport</span>
                            <span className="math-operator">)</span>
                            <span className="math-operator">−</span>
                            <span className="math-variable">Net Baseline Revenues</span>
                          </div>
                        </div>

                        {/* Interactive Example walkthrough */}
                        <div style={{ border: '1px solid rgba(0, 82, 189, 0.15)', background: 'rgba(0, 82, 189, 0.02)', borderRadius: '10px', padding: '1.25rem', margin: '1.25rem 0' }}>
                          <h5 style={{ margin: '0 0 0.6rem 0', color: 'var(--LabelBG)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                            <ShieldCheck size={15} style={{ color: 'var(--BannerGB)' }} /> Real-Time Supplemental Claim Calculations
                          </h5>
                          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--DarkGray)' }}>
                            Calculations updated in real time based on active filters for sheet <strong>{activeSheetName}</strong>:
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>RUN VOLUME</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>{dynamicMethodologyData.pemtVolume.toLocaleString()} transports</strong>
                              {dynamicMethodologyData.pemtVolumeFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>AVG COST PER RUN</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>${dynamicMethodologyData.pemtAvgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                              {dynamicMethodologyData.pemtAvgCostFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>NET BASELINE REVENUES</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>${dynamicMethodologyData.pemtRevenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                              {dynamicMethodologyData.pemtRevenuesFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(0, 82, 189, 0.12)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div>1. <strong>Total Allowable Cost</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{dynamicMethodologyData.pemtVolume.toLocaleString()} runs × ${dynamicMethodologyData.pemtAvgCost.toLocaleString()} = ${(dynamicMethodologyData.pemtVolume * dynamicMethodologyData.pemtAvgCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code></div>
                            <div>2. <strong>Supplemental Funding</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>${(dynamicMethodologyData.pemtVolume * dynamicMethodologyData.pemtAvgCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} − ${dynamicMethodologyData.pemtRevenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} = ${(dynamicMethodologyData.pemtVolume * dynamicMethodologyData.pemtAvgCost - dynamicMethodologyData.pemtRevenues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code></div>
                            <div style={{ color: 'var(--BannerGB)', fontWeight: 'bold', borderTop: '1px dashed var(--LightGray)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                              Net supplemental claim value: ${(dynamicMethodologyData.pemtVolume * dynamicMethodologyData.pemtAvgCost - dynamicMethodologyData.pemtRevenues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {/* Parameter Mapping Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid var(--LightGray)', marginTop: '1.25rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--ExtraLightGray)', borderBottom: '1.5px solid var(--LightGray)' }}>
                              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>Parameter</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>Source Column</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>Analytical Meaning</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid var(--LightGray)' }}>
                              <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>Run Volume</td>
                              <td style={{ padding: '0.5rem', color: 'var(--DarkGray)' }}>Month / Count / Transports</td>
                              <td style={{ padding: '0.5rem' }}>Total emergency ground medical transports.</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--LightGray)' }}>
                              <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>Avg Cost</td>
                              <td style={{ padding: '0.5rem', color: 'var(--DarkGray)' }}>Avg Cost Per Transport</td>
                              <td style={{ padding: '0.5rem' }}>Sum of allowable expenses divided by total runs.</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>Net Revenues</td>
                              <td style={{ padding: '0.5rem', color: 'var(--DarkGray)' }}>Total Revenue / Net Receipts</td>
                              <td style={{ padding: '0.5rem' }}>Total payments received for emergency runs.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeMethodologySubTab === 'fte' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          👥 Personnel Hours & Full-Time Equivalent (FTE) Calculations
                        </h4>
                        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.825rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                          Labor analytics convert actual paid personnel hours into standardized FTEs to review resource distributions, analyze shift coverages, and calculate weighted average pay rates.
                        </p>

                        <div className="math-container" style={{ gap: '1.25rem' }}>
                          {/* FTE Equation */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', width: '100%' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em' }}>FTE Allocation</div>
                            <div className="math-equation">
                              <span className="math-variable">Allocated FTE</span>
                              <span className="math-operator">=</span>
                              <div className="math-fraction">
                                <span className="math-numerator">Total Hours Worked</span>
                                <span className="math-denominator">2,080 Hours (Annual Standard)</span>
                              </div>
                              <span className="math-operator">×</span>
                              <div className="math-fraction">
                                <span className="math-numerator">Active Months</span>
                                <span className="math-denominator">12 Months</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ width: '80%', height: '1px', background: 'var(--LightGray)' }}></div>

                          {/* Regular Hourly Rate Equation */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', width: '100%' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em' }}>Weighted Regular Pay Rate</div>
                            <div className="math-equation">
                              <span className="math-variable">Regular Hourly Rate</span>
                              <span className="math-operator">=</span>
                              <div className="math-fraction">
                                <span className="math-numerator">Base Regular Pay ($)</span>
                                <span className="math-denominator">Regular Hours Worked</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Example walkthrough */}
                        <div style={{ border: '1px solid rgba(0, 82, 189, 0.15)', background: 'rgba(0, 82, 189, 0.02)', borderRadius: '10px', padding: '1.25rem', margin: '1.25rem 0' }}>
                          <h5 style={{ margin: '0 0 0.6rem 0', color: 'var(--LabelBG)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                            <ShieldCheck size={15} style={{ color: 'var(--BannerGB)' }} /> Real-Time Personnel hours & FTE Calculations
                          </h5>
                          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--DarkGray)' }}>
                            Calculations updated in real time based on active filters for sheet <strong>{activeSheetName}</strong>:
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>REGULAR HOURS</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>{dynamicMethodologyData.fteRegHours.toLocaleString()} hours</strong>
                              {dynamicMethodologyData.fteRegHoursFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>OVERTIME HOURS</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>{dynamicMethodologyData.fteOtHours.toLocaleString()} hours</strong>
                              {dynamicMethodologyData.fteOtHoursFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>TOTAL PAY (REG + OT)</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>${dynamicMethodologyData.fteTotalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                              {dynamicMethodologyData.fteTotalPayFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(0, 82, 189, 0.12)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div>1. <strong>FTE Count</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>({dynamicMethodologyData.fteRegHours.toLocaleString()} + {dynamicMethodologyData.fteOtHours.toLocaleString()}) / 2,080 = {((dynamicMethodologyData.fteRegHours + dynamicMethodologyData.fteOtHours) / 2080).toFixed(2)} FTEs</code></div>
                            <div>2. <strong>Weighted Average Hourly Rate</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>${dynamicMethodologyData.fteTotalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total pay / {(dynamicMethodologyData.fteRegHours + dynamicMethodologyData.fteOtHours).toLocaleString()} total hours = ${((dynamicMethodologyData.fteTotalPay) / (dynamicMethodologyData.fteRegHours + dynamicMethodologyData.fteOtHours || 1)).toFixed(2)}/hour</code></div>
                            <div style={{ color: 'var(--BannerGB)', fontWeight: 'bold', borderTop: '1px dashed var(--LightGray)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                              Net employee resource value: {((dynamicMethodologyData.fteRegHours + dynamicMethodologyData.fteOtHours) / 2080).toFixed(2)} FTEs @ ${((dynamicMethodologyData.fteTotalPay) / (dynamicMethodologyData.fteRegHours + dynamicMethodologyData.fteOtHours || 1)).toFixed(2)}/hr
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMethodologySubTab === 'cad' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          🚑 Dispatch CAD Response Time Benchmarks
                        </h4>
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.825rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                          Computer Aided Dispatch (CAD) log systems record timestamps for key response phase transitions. Averages help verify contract compliance and triage service-level bottlenecks.
                        </p>

                        {/* Horizontal Flowchart */}
                        <div style={{ background: 'white', border: '1px solid var(--LightGray)', borderRadius: '10px', padding: '1rem', margin: '1.5rem 0' }}>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '0.5rem' }}>
                            Dispatch Lifecycle & Interval Mapping
                          </div>
                          
                          <div className="dispatch-timeline">
                            <div className="dispatch-milestone">
                              <div className="dispatch-dot" style={{ background: '#64748b' }}></div>
                              <span className="dispatch-label">Call Created</span>
                            </div>

                            <div className="dispatch-milestone">
                              <div className="dispatch-dot"></div>
                              <span className="dispatch-label">Dispatched</span>
                              <div className="dispatch-interval" style={{ left: '50%', transform: 'translateX(-50%)' }}>Dispatch Delay</div>
                            </div>

                            <div className="dispatch-milestone">
                              <div className="dispatch-dot"></div>
                              <span className="dispatch-label">En Route</span>
                              <div className="dispatch-interval" style={{ left: '50%', transform: 'translateX(-50%)' }}>Turnout/Chute</div>
                            </div>

                            <div className="dispatch-milestone">
                              <div className="dispatch-dot"></div>
                              <span className="dispatch-label">Arrived Scene</span>
                              <div className="dispatch-interval" style={{ left: '50%', transform: 'translateX(-50%)' }}>Transit Time</div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'center', fontSize: '0.725rem', color: 'var(--BannerGB)', fontWeight: 'bold', marginTop: '1.25rem', background: 'rgba(0, 82, 189, 0.04)', padding: '0.45rem', borderRadius: '6px', border: '1px dashed rgba(0, 82, 189, 0.15)' }}>
                            Total CAD Response Time = Scene Arrival Time − Call Created Time
                          </div>
                        </div>

                        {/* Interactive Example walkthrough */}
                        <div style={{ border: '1px solid rgba(0, 82, 189, 0.15)', background: 'rgba(0, 82, 189, 0.02)', borderRadius: '10px', padding: '1.25rem', margin: '1.25rem 0' }}>
                          <h5 style={{ margin: '0 0 0.6rem 0', color: 'var(--LabelBG)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                            <ShieldCheck size={15} style={{ color: 'var(--BannerGB)' }} /> Real-Time CAD Dataset Summary
                          </h5>
                          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--DarkGray)' }}>
                            The active filtered dataset contains <strong>{dynamicMethodologyData.cadCount} dispatch records</strong>. Averaging the logged timestamps reveals these performance intervals:
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>AVG DISPATCH DELAY</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>{dynamicMethodologyData.cadAvgDispatch} seconds</strong>
                              {dynamicMethodologyData.cadDispatchFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>AVG TURNOUT / CHUTE TIME</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>{dynamicMethodologyData.cadAvgTransport} minutes</strong>
                              {dynamicMethodologyData.cadTransportFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>AVG SCENE ARRIVAL TIME</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>{dynamicMethodologyData.cadAvgResponse} minutes</strong>
                              {dynamicMethodologyData.cadResponseFallback && (
                                <div style={{ fontSize: '0.55rem', color: '#b45309', background: '#fef3c7', padding: '2px 4px', borderRadius: '4px', marginTop: '0.25rem', width: 'fit-content', fontWeight: 'bold' }}>
                                  ⚠️ Fallback Value (Unmapped)
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Operational calculation card list */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                          <div style={{ background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong style={{ fontSize: '0.75rem', color: 'var(--LabelBG)' }}>Chute / Turnout Duration</strong>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                              Measures how quickly emergency personnel leave the station once dispatched.
                            </p>
                            <code style={{ background: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--LightGray)', marginTop: '0.35rem', display: 'inline-block', width: 'fit-content' }}>
                              En Route − Dispatched
                            </code>
                          </div>
                          
                          <div style={{ background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong style={{ fontSize: '0.75rem', color: 'var(--LabelBG)' }}>Transit Duration</strong>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                              Measures direct driving time to the scene of the emergency.
                            </p>
                            <code style={{ background: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--LightGray)', marginTop: '0.35rem', display: 'inline-block', width: 'fit-content' }}>
                              Arrived Scene − En Route
                            </code>
                          </div>

                          <div style={{ background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong style={{ fontSize: '0.75rem', color: 'var(--LabelBG)' }}>On-Scene Duration</strong>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                              Measures the total care and preparation time spent at the incident site.
                            </p>
                            <code style={{ background: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--LightGray)', marginTop: '0.35rem', display: 'inline-block', width: 'fit-content' }}>
                              Depart Scene − Arrived Scene
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMethodologySubTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          📊 Dataset Summary & Calculations
                        </h4>
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.825rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                          This page displays the real-time aggregations, calculations, and formulas automatically generated for the numerical columns of <strong>{activeSheetName}</strong>.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {dynamicMethodologyData.generalStats && dynamicMethodologyData.generalStats.length > 0 ? (
                            dynamicMethodologyData.generalStats.map((stat, idx) => (
                              <div key={idx} style={{ border: '1px solid var(--LightGray)', borderRadius: '10px', padding: '1rem', background: 'var(--ExtraLightGray)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px dashed var(--LightGray)', paddingBottom: '0.5rem' }}>
                                  <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>Column: {stat.columnName}</strong>
                                  <span style={{ fontSize: '0.65rem', background: 'var(--BannerGB)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
                                    Numeric Metric
                                  </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                                  <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>SUM TOTAL</div>
                                    <strong style={{ fontSize: '1rem', color: 'var(--LabelBG)' }}>{stat.sum.toLocaleString()}</strong>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--DarkGray)', marginTop: '0.25rem' }}>
                                      Formula: <code>Σ ({stat.columnName})</code>
                                    </div>
                                  </div>

                                  <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                                    <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>ARITHMETIC AVERAGE</div>
                                    <strong style={{ fontSize: '1rem', color: 'var(--LabelBG)' }}>{stat.avg.toLocaleString()}</strong>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--DarkGray)', marginTop: '0.25rem' }}>
                                      Formula: <code>Total Sum / Record Count</code>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                                  <strong style={{ color: 'var(--LabelBG)' }}>Real-Time Walkthrough Calculation:</strong>
                                  <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--BannerGB)', marginTop: '0.25rem' }}>
                                    Average = {stat.sum.toLocaleString()} (sum) / {stat.count.toLocaleString()} (records) = {stat.avg.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: 'var(--DarkGray)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
                              No numeric columns detected in worksheet <strong>{activeSheetName}</strong> to perform summary calculations.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeWorkspaceTab === 'print-preview' && (
                /* PDF Report Builder & WYSIWYG Print Preview Tab */
                <div 
                  className="report-builder-tab-container"
                  style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: '1.5rem', 
                    height: '100%', 
                    overflow: 'hidden',
                    width: '100%'
                  }}
                >
                  {/* Left Controls Column (Scrollable controls panel for Report settings) */}
                  <div 
                    className="report-builder-controls"
                    style={{ 
                      width: '400px', 
                      background: 'white', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: '12px', 
                      padding: '1.25rem', 
                      boxShadow: 'var(--shadow-sm)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '1.25rem', 
                      height: '100%', 
                      overflowY: 'auto',
                      flexShrink: 0
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--LabelBG)', fontSize: '1.05rem', fontWeight: 'bold' }}>🖨️ PDF Report Settings</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--DarkGray)' }}>Customize layout orientation, toggles, and chart orders below before saving.</p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--LightGray)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Report Title</label>
                        <input 
                          type="text" 
                          value={reportTitle} 
                          onChange={(e) => setReportTitle(e.target.value)} 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', border: '1px solid var(--LightGray)', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Report Subtitle / Metadata</label>
                        <input 
                          type="text" 
                          value={reportSubtitle} 
                          onChange={(e) => setReportSubtitle(e.target.value)} 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', border: '1px solid var(--LightGray)', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--LightGray)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', margin: 0 }}>Page Orientation (Letter)</label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          className="btn"
                          style={{ 
                            flex: 1, 
                            padding: '0.4rem 0.5rem', 
                            fontSize: '0.75rem', 
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            border: '1px solid var(--LightGray)',
                            background: printOrientation === 'portrait' ? 'var(--LabelBG)' : 'white',
                            color: printOrientation === 'portrait' ? 'white' : 'var(--DarkGray)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPrintOrientation('portrait')}
                        >
                          Portrait (Vertical)
                        </button>
                        <button 
                          type="button"
                          className="btn"
                          style={{ 
                            flex: 1, 
                            padding: '0.4rem 0.5rem', 
                            fontSize: '0.75rem', 
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            border: '1px solid var(--LightGray)',
                            background: printOrientation === 'landscape' ? 'var(--LabelBG)' : 'white',
                            color: printOrientation === 'landscape' ? 'white' : 'var(--DarkGray)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPrintOrientation('landscape')}
                        >
                          Landscape (Horizontal)
                        </button>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--LightGray)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', margin: '0 0 0.25rem 0' }}>Report Sections</label>
                      
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--LabelBG)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={includeGlobalInsights} 
                          onChange={(e) => setIncludeGlobalInsights(e.target.checked)} 
                        />
                        Include Analysis Insights summary
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--LabelBG)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={includeChartInsights} 
                          onChange={(e) => setIncludeChartInsights(e.target.checked)} 
                        />
                        Include AI Chart Explanations
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--LabelBG)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={includeMethodology} 
                          onChange={(e) => setIncludeMethodology(e.target.checked)} 
                        />
                        Include Calculation Methodology
                      </label>
                    </div>

                    {/* Chart Reordering & Notes mapping */}
                    <div style={{ borderTop: '1px solid var(--LightGray)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', margin: 0 }}>Reorder & Annotate Charts</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
                        {printChartOrder.map((chart, idx) => {
                          const customNote = customChartNotes[chart.title] !== undefined 
                            ? customChartNotes[chart.title] 
                            : getAIInsightForChart(chart, filteredRows);

                          return (
                            <div 
                              key={chart.title} 
                              style={{ 
                                background: 'var(--ExtraLightGray)', 
                                border: '1px solid var(--LightGray)', 
                                borderRadius: '8px', 
                                padding: '0.6rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={chart.title}>
                                  {idx + 1}. {chart.title}
                                </span>
                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                  <button 
                                    type="button"
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer' }}
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const nextOrder = [...printChartOrder];
                                      const temp = nextOrder[idx];
                                      nextOrder[idx] = nextOrder[idx - 1];
                                      nextOrder[idx - 1] = temp;
                                      setPrintChartOrder(nextOrder);
                                    }}
                                  >
                                    ▲
                                  </button>
                                  <button 
                                    type="button"
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.1rem 0.3rem', fontSize: '0.65rem', borderRadius: '4px', cursor: 'pointer' }}
                                    disabled={idx === printChartOrder.length - 1}
                                    onClick={() => {
                                      const nextOrder = [...printChartOrder];
                                      const temp = nextOrder[idx];
                                      nextOrder[idx] = nextOrder[idx + 1];
                                      nextOrder[idx + 1] = temp;
                                      setPrintChartOrder(nextOrder);
                                    }}
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>

                              {includeChartInsights && (
                                <textarea 
                                  value={customNote}
                                  onChange={(e) => setCustomChartNotes(prev => ({ ...prev, [chart.title]: e.target.value }))}
                                  placeholder="AI Explanation for stakeholders..."
                                  rows={3}
                                  style={{ 
                                    fontSize: '0.7rem', 
                                    padding: '0.3rem 0.4rem', 
                                    border: '1px solid var(--LightGray)', 
                                    borderRadius: '4px', 
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--LightGray)', paddingTop: '0.85rem' }}>
                      <button 
                        type="button"
                        className="btn btn-primary" 
                        onClick={() => window.print()} 
                        style={{ 
                          width: '100%', 
                          padding: '0.65rem', 
                          fontSize: '0.85rem', 
                          fontWeight: 'bold', 
                          background: 'var(--BannerGB)',
                          borderRadius: '8px', 
                          color: 'white', 
                          border: 'none', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 4px rgba(0,82,189,0.2)'
                        }}
                      >
                        <Printer size={16} /> Print Report to PDF
                      </button>
                    </div>
                  </div>

                  {/* Right WYSIWYG Page Preview Column (Scrollable canvas showing actual pages) */}
                  <div 
                    className="report-preview-canvas"
                    style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      background: 'var(--DashboardBG)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-light)', 
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2rem'
                    }}
                  >
                    {/* WYSIWYG Letter Documents */}
                    {(() => {
                      const totalPages = 1 + printChartOrder.length + (includeMethodology ? 1 : 0);
                      return (
                        <>
                          {/* Inject dynamic @page settings to set orientation automatically in the print dialog */}
                          <style>{`
                            @media print {
                              @page {
                                size: letter ${printOrientation} !important;
                                margin: 0 !important;
                              }
                            }
                          `}</style>

                          {/* Page 1: Executive Summary */}
                          <div 
                            className={`report-preview-document ${printOrientation === 'portrait' ? 'portrait-mode' : 'landscape-mode'}`}
                            style={{ 
                              width: printOrientation === 'portrait' ? '8.5in' : '11in',
                              height: printOrientation === 'portrait' ? '11in' : '8.5in',
                              padding: printOrientation === 'portrait' ? '0.4in' : '0.6in', 
                              background: 'white',
                              boxShadow: '0 4px 20px rgba(15,23,42,0.12), 0 0 10px rgba(0,0,0,0.02)',
                              boxSizing: 'border-box',
                              color: 'black',
                              display: 'flex',
                              flexDirection: 'column',
                              position: 'relative'
                            }}
                          >
                            {/* Document Cover Header */}
                            <div style={{ borderBottom: '2px solid var(--BannerGB)', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>PUBLIC CONSULTING GROUP</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--DarkGray)' }}>Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>
                              <h1 style={{ margin: '0.5rem 0 0.15rem 0', fontSize: '1.65rem', fontWeight: 800, color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                                {reportTitle || 'ASCR AI Data Analyst Report'}
                              </h1>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                                {reportSubtitle || 'Executive Insights Summary'}
                              </p>
                            </div>

                            {/* Global Insights summary section */}
                            {includeGlobalInsights && latestInsights.length > 0 && (
                              <div className="analysis-insights-card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid var(--BannerGB)', padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--LabelBG)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                                  <TrendingUp size={14} style={{ color: 'var(--BannerGB)' }} />
                                  Global Executive Insights
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.725rem', color: '#1e293b', display: 'flex', flexDirection: 'column', gap: '0.4rem', lineHeight: '1.4' }}>
                                  {latestInsights.map((insight, idx) => (
                                    <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(insight) }} />
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* KPI stats metrics row */}
                            <div className="kpi-print-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', background: '#f8fafc' }}>
                                <span style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Records</span>
                                <strong style={{ fontSize: '1rem', color: 'var(--LabelBG)' }}>{filteredRows.length.toLocaleString()} rows</strong>
                              </div>
                              {processedActiveSheet?.columns.filter(c => c.type === 'number').slice(0, 3).map((col, idx) => {
                                const avg = getFilteredAverage(col.name);
                                return (
                                  <div key={idx} style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', background: '#f8fafc' }}>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg {col.name}</span>
                                    <strong style={{ fontSize: '1rem', color: 'var(--LabelBG)' }}>
                                      {avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                    </strong>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Page Footer */}
                            <div style={{ position: 'absolute', bottom: '0.4in', left: printOrientation === 'portrait' ? '0.4in' : '0.6in', right: printOrientation === 'portrait' ? '0.4in' : '0.6in', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--DarkGray)' }}>
                              <span>ASCR AI Executive Reporting System</span>
                              <span>Page 1 of {totalPages}</span>
                            </div>
                          </div>

                          {/* Chart Pages (One Chart Per Page) */}
                          {printChartOrder.map((chart, index) => {
                            const pageNumber = index + 2;
                            const customNote = customChartNotes[chart.title] !== undefined 
                              ? customChartNotes[chart.title] 
                              : getAIInsightForChart(chart, filteredRows);

                            return (
                              <div 
                                key={chart.title}
                                className={`report-preview-document ${printOrientation === 'portrait' ? 'portrait-mode' : 'landscape-mode'}`}
                                style={{ 
                                  width: printOrientation === 'portrait' ? '8.5in' : '11in',
                                  height: printOrientation === 'portrait' ? '11in' : '8.5in',
                                  padding: printOrientation === 'portrait' ? '0.4in' : '0.6in', 
                                  background: 'white',
                                  boxShadow: '0 4px 20px rgba(15,23,42,0.12), 0 0 10px rgba(0,0,0,0.02)',
                                  boxSizing: 'border-box',
                                  color: 'black',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  position: 'relative'
                                }}
                              >
                                {/* Document Mini-Header */}
                                <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>{reportTitle || 'ASCR AI Data Analyst Report'}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--DarkGray)' }}>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>

                                {/* Visual Card Wrapper */}
                                <div 
                                  className="chart-container-widget" 
                                  style={{ 
                                    border: '1px solid #cbd5e1', 
                                    borderRadius: '8px', 
                                    padding: '1rem', 
                                    background: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: 'none',
                                    flex: 1,
                                    minHeight: 0
                                  }}
                                >
                                  {/* Chart Title */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', flexShrink: 0 }}>
                                    <span className="chart-title-widget" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'black' }}>
                                      {chart.title}
                                    </span>
                                  </div>
                                  
                                  {/* Chart graphic - Scaled based on orientation to fit portrait vs landscape vertical budget */}
                                  <div style={{ 
                                    flex: 1, 
                                    position: 'relative', 
                                    overflow: 'hidden', 
                                    minHeight: printOrientation === 'portrait' ? '480px' : '220px', 
                                    maxHeight: printOrientation === 'portrait' ? '600px' : '300px', 
                                    width: '100%', 
                                    marginBottom: '1rem' 
                                  }}>
                                    <InsightChart
                                      chartSpec={chart}
                                      rows={filteredRows}
                                      borderless={true}
                                      hideHeader={true}
                                      height="100%"
                                      colorTheme={colorTheme}
                                    />
                                  </div>

                                  {/* AI insights for this chart */}
                                  {includeChartInsights && (
                                    <div 
                                      className="print-chart-executive-explanation"
                                      style={{ 
                                        padding: '0.6rem 0.8rem', 
                                        background: '#f8fafc', 
                                        borderLeft: '3px solid var(--BannerGB)', 
                                        borderTop: '1px solid #e2e8f0',
                                        borderRadius: '0 4px 4px 0',
                                        fontSize: '0.75rem', 
                                        color: '#334155',
                                        lineHeight: '1.4',
                                        wordBreak: 'break-word',
                                        flexShrink: 0
                                      }}
                                    >
                                      <strong>AI Summary:</strong> {customNote}
                                    </div>
                                  )}
                                </div>

                                {/* Page Footer */}
                                <div style={{ position: 'absolute', bottom: '0.4in', left: printOrientation === 'portrait' ? '0.4in' : '0.6in', right: printOrientation === 'portrait' ? '0.4in' : '0.6in', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--DarkGray)' }}>
                                  <span>ASCR AI Executive Reporting System</span>
                                  <span>Page {pageNumber} of {totalPages}</span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Page N: Methodology */}
                          {includeMethodology && (
                            <div 
                              className={`report-preview-document ${printOrientation === 'portrait' ? 'portrait-mode' : 'landscape-mode'}`}
                              style={{ 
                                width: printOrientation === 'portrait' ? '8.5in' : '11in',
                                height: printOrientation === 'portrait' ? '11in' : '8.5in',
                                padding: printOrientation === 'portrait' ? '0.4in' : '0.6in', 
                                background: 'white',
                                boxShadow: '0 4px 20px rgba(15,23,42,0.12), 0 0 10px rgba(0,0,0,0.02)',
                                boxSizing: 'border-box',
                                color: 'black',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative'
                              }}
                            >
                              {/* Document Mini-Header */}
                              <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>{reportTitle || 'ASCR AI Data Analyst Report'}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--DarkGray)' }}>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--LabelBG)', fontWeight: 'bold' }}>🧠 Analytical Methodology & Calculations</h4>
                                <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                                  This appendix details the dynamic formulas, variable mappings, and calculations used in the analytical reports. All values are calculated in real time.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
                                  {/* PEMT Section */}
                                  {isPemtRelevant && (
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#f8fafc' }}>
                                      <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', color: 'var(--LabelBG)', fontWeight: 'bold' }}>💰 PEMT Supplemental Reimbursement Model</h5>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.675rem' }}>
                                        <div><strong>Formula:</strong> <code>Reimbursement = (Total Run Volume × Avg Cost Per Run) − Net Baseline Revenues</code></div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.2rem' }}>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.525rem', color: 'var(--DarkGray)', display: 'block' }}>VOLUME</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{dynamicMethodologyData.pemtVolume.toLocaleString()} runs</strong>
                                          </div>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.525rem', color: 'var(--DarkGray)', display: 'block' }}>AVG COST / RUN</span>
                                            <strong style={{ fontSize: '0.725rem' }}>${dynamicMethodologyData.pemtAvgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                          </div>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.525rem', color: 'var(--DarkGray)', display: 'block' }}>NET BASELINE REVENUES</span>
                                            <strong style={{ fontSize: '0.725rem' }}>${dynamicMethodologyData.pemtRevenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                          </div>
                                        </div>
                                        <div style={{ marginTop: '0.2rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem', color: 'var(--BannerGB)', fontWeight: 'bold' }}>
                                          Supplemental reimbursement claimed: ${(dynamicMethodologyData.pemtVolume * dynamicMethodologyData.pemtAvgCost - dynamicMethodologyData.pemtRevenues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* FTE Section */}
                                  {isFteRelevant && (
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#f8fafc' }}>
                                      <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', color: 'var(--LabelBG)', fontWeight: 'bold' }}>👥 Personnel Hours & Full-Time Equivalent (FTE) Model</h5>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.675rem' }}>
                                        <div><strong>Formula:</strong> <code>Allocated FTEs = (Regular Hours + Overtime Hours) / 2,080 standard hours</code></div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginTop: '0.2rem' }}>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.525rem', color: 'var(--DarkGray)', display: 'block' }}>REGULAR HOURS</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{dynamicMethodologyData.fteRegHours.toLocaleString()} hrs</strong>
                                          </div>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.525rem', color: 'var(--DarkGray)', display: 'block' }}>OVERTIME HOURS</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{dynamicMethodologyData.fteOtHours.toLocaleString()} hrs</strong>
                                          </div>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.525rem', color: 'var(--DarkGray)', display: 'block' }}>ACTIVE FTE EQUIVALENTS</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{((dynamicMethodologyData.fteRegHours + dynamicMethodologyData.fteOtHours) / 2080).toFixed(2)} FTEs</strong>
                                          </div>
                                        </div>
                                        <div style={{ marginTop: '0.2rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.3rem', color: 'var(--BannerGB)', fontWeight: 'bold' }}>
                                          Regular Wages: ${dynamicMethodologyData.fteTotalPay.toLocaleString()} (Weighted regular rate: ${dynamicMethodologyData.fteRegHours > 0 ? (dynamicMethodologyData.fteTotalPay / dynamicMethodologyData.fteRegHours).toFixed(2) : '0.00'}/hr)
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* CAD Section */}
                                  {isCadRelevant && (
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#f8fafc' }}>
                                      <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', color: 'var(--LabelBG)', fontWeight: 'bold' }}>⏱️ CAD Dispatch Response Time Benchmarks</h5>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.675rem' }}>
                                        <div>Averages calculated across {dynamicMethodologyData.cadCount} dispatcher logs.</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginTop: '0.2rem' }}>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.5rem', color: 'var(--DarkGray)', display: 'block' }}>DISPATCH DELAY</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{dynamicMethodologyData.cadAvgDispatch}s</strong>
                                          </div>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.5rem', color: 'var(--DarkGray)', display: 'block' }}>RESPONSE TIME</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{dynamicMethodologyData.cadAvgResponse}m</strong>
                                          </div>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.5rem', color: 'var(--DarkGray)', display: 'block' }}>SCENE TIME</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{dynamicMethodologyData.cadAvgScene}m</strong>
                                          </div>
                                          <div style={{ background: 'white', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.5rem', color: 'var(--DarkGray)', display: 'block' }}>TRANSPORT</span>
                                            <strong style={{ fontSize: '0.725rem' }}>{dynamicMethodologyData.cadAvgTransport}m</strong>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Fallback Averages Summary Table */}
                                  {dynamicMethodologyData.generalStats && dynamicMethodologyData.generalStats.length > 0 && (
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                      <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '0.775rem', color: 'var(--LabelBG)', fontWeight: 'bold' }}>📊 Dataset Columns Summary Averages</h5>
                                      <div style={{ overflowY: 'auto', flex: 1 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
                                          <thead>
                                            <tr style={{ background: 'var(--ExtraLightGray)', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                                              <th style={{ padding: '0.3rem', fontWeight: 'bold' }}>Column Name</th>
                                              <th style={{ padding: '0.3rem', fontWeight: 'bold', textAlign: 'right' }}>Average</th>
                                              <th style={{ padding: '0.3rem', fontWeight: 'bold', textAlign: 'right' }}>Aggregated Sum</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {dynamicMethodologyData.generalStats.map((stat, idx) => (
                                              <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                                <td style={{ padding: '0.3rem', fontWeight: 500 }}>{stat.columnName}</td>
                                                <td style={{ padding: '0.3rem', textAlign: 'right' }}>{stat.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                <td style={{ padding: '0.3rem', textAlign: 'right' }}>{stat.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Page Footer */}
                              <div style={{ position: 'absolute', bottom: '0.4in', left: printOrientation === 'portrait' ? '0.4in' : '0.6in', right: printOrientation === 'portrait' ? '0.4in' : '0.6in', borderTop: '1px solid #cbd5e1', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--DarkGray)' }}>
                                <span>ASCR AI Executive Reporting System</span>
                                <span>Page {totalPages} of {totalPages}</span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Chat Assistant Drawer (420px fixed) */}
            {!isChatCollapsed && (
              <div 
                className="sidebar-panel" 
                style={{ 
                  width: '420px', 
                  flexShrink: 0, 
                  marginLeft: '1.25rem',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  hasData={!!workbookData}
                  hasApiKey={true}
                  onCollapse={() => setIsChatCollapsed(true)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Expanded Chart Overlay Modal */}
      {expandedChart && (
        <div 
          className="expanded-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setExpandedChart(null)}
        >
          <div 
            className="expanded-modal-container"
            style={{
              background: 'white',
              width: '95vw',
              maxWidth: '1450px',
              height: '92vh',
              maxHeight: '92vh',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative',
              overflow: 'hidden',
              transformOrigin: (() => {
                if (!expandedChartOrigin) return 'center center';
                const modalWidth = Math.min(window.innerWidth * 0.95, 1450);
                const modalHeight = window.innerHeight * 0.92;
                const leftEdge = (window.innerWidth - modalWidth) / 2;
                const topEdge = (window.innerHeight - modalHeight) / 2;
                return `${expandedChartOrigin.x - leftEdge}px ${expandedChartOrigin.y - topEdge}px`;
              })()
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.75rem', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--LabelBG)', margin: 0 }}>
                {expandedChart.title}
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExpandedChart(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Minimize2 size={14} /> Close View
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
              <InsightChart
                chartSpec={expandedChart}
                rows={filteredRows}
                borderless={true}
                height="100%"
                colorTheme={colorTheme}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--DarkGray)', borderTop: '1px solid var(--LightGray)', paddingTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
              <span><strong>X-Axis:</strong> {expandedChart.xAxisColumn}</span>
              <span><strong>Y-Axis:</strong> {expandedChart.yAxisColumn}</span>
              {expandedChart.zAxisColumn && <span><strong>Z-Axis:</strong> {expandedChart.zAxisColumn}</span>}
              <span><strong>Aggregation:</strong> {expandedChart.aggregation}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
