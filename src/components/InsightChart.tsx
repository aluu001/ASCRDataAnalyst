import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { Info, EyeOff, Maximize2 } from 'lucide-react';
import { aggregateDataset } from '../utils/dataEngine';
import type { ChartSpecification } from '../utils/gemini';

interface InsightChartProps {
  chartSpec: ChartSpecification;
  rows: any[];
  borderless?: boolean;
  height?: number | string;
  colorTheme?: 'classic' | 'vibrant';
  onRemove?: () => void;
  onExpand?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  hideHeader?: boolean;
}

const PIE_COLORS = [
  '#002185', // PCG Deep Blue
  '#0052BD', // PCG Accent Blue
  '#1F71DB', // Vibrant Blue
  '#0ea5e9', // Sky Blue
  '#0d9488', // Teal Blue
  '#10b981', // Emerald Green
  '#6366f1', // Indigo Purple
  '#f59e0b'  // Amber Gold
];

function getChartColors(title: string, colorTheme?: 'classic' | 'vibrant') {
  if (colorTheme === 'classic') {
    return {
      stroke: '#0052BD',
      fill: '#0052BD',
      gradient: ['#0052BD', '#1F71DB'],
      glow: 'rgba(0, 82, 189, 0.15)',
      badgeClass: 'badge-blue'
    };
  }
  const t = title.toLowerCase();
  if (t.includes('revenue') || t.includes('supplement') || t.includes('funding')) {
    return {
      stroke: '#10b981',
      fill: '#10b981',
      gradient: ['#10b981', '#059669'],
      glow: 'rgba(16, 185, 129, 0.15)',
      badgeClass: 'badge-emerald'
    };
  }
  if (t.includes('hourly') || t.includes('pay') || t.includes('salary') || t.includes('expenditure') || t.includes('rate') || t.includes('expenses') || t.includes('cost')) {
    return {
      stroke: '#6366f1',
      fill: '#6366f1',
      gradient: ['#6366f1', '#4f46e5'],
      glow: 'rgba(99, 102, 241, 0.15)',
      badgeClass: 'badge-purple'
    };
  }
  if (t.includes('time') || t.includes('dispatch') || t.includes('lag') || t.includes('duration') || t.includes('efficiency') || t.includes('benchmark')) {
    return {
      stroke: '#0d9488',
      fill: '#0d9488',
      gradient: ['#0ea5e9', '#0d9488'],
      glow: 'rgba(13, 148, 136, 0.15)',
      badgeClass: 'badge-cyan'
    };
  }
  if (t.includes('volume') || t.includes('count') || t.includes('distribution') || t.includes('share') || t.includes('records') || t.includes('trips')) {
    return {
      stroke: '#f59e0b',
      fill: '#f59e0b',
      gradient: ['#f59e0b', '#d97706'],
      glow: 'rgba(245, 158, 11, 0.15)',
      badgeClass: 'badge-amber'
    };
  }

  // Fallback hash-based mapping for general charts in vibrant mode
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;
  
  const VIBRANT_PALETTES = [
    {
      stroke: '#8b5cf6', // Violet/Purple
      fill: '#8b5cf6',
      gradient: ['#8b5cf6', '#7c3aed'],
      glow: 'rgba(139, 92, 246, 0.15)',
      badgeClass: 'badge-purple'
    },
    {
      stroke: '#06b6d4', // Cyan
      fill: '#06b6d4',
      gradient: ['#06b6d4', '#0891b2'],
      glow: 'rgba(6, 182, 212, 0.15)',
      badgeClass: 'badge-cyan'
    },
    {
      stroke: '#4f46e5', // Indigo
      fill: '#4f46e5',
      gradient: ['#6366f1', '#4f46e5'],
      glow: 'rgba(79, 70, 229, 0.15)',
      badgeClass: 'badge-indigo'
    },
    {
      stroke: '#10b981', // Emerald
      fill: '#10b981',
      gradient: ['#10b981', '#059669'],
      glow: 'rgba(16, 185, 129, 0.15)',
      badgeClass: 'badge-emerald'
    },
    {
      stroke: '#f59e0b', // Amber
      fill: '#f59e0b',
      gradient: ['#f59e0b', '#d97706'],
      glow: 'rgba(245, 158, 11, 0.15)',
      badgeClass: 'badge-amber'
    }
  ];

  return VIBRANT_PALETTES[index];
}

// Helper to translate chart specs into human-readable descriptions for client hand-off reports
function getChartDescription(spec: ChartSpecification): string {
  const { chartType, xAxisColumn, yAxisColumn, aggregation } = spec;

  const aggText = aggregation === 'sum' ? 'total aggregated sum'
                : aggregation === 'avg' ? 'average value'
                : aggregation === 'count' ? 'frequency volume'
                : 'raw distributions';

  const chartTypeText = chartType === 'bar' ? 'Bar Chart'
                      : chartType === 'horizontalBar' ? 'Horizontal Bar Chart'
                      : chartType === 'line' ? 'Line Graph'
                      : chartType === 'pie' ? 'Pie Distribution'
                      : chartType === 'bubble' ? 'Bubble Size Correlation Plot'
                      : chartType === 'radar' ? 'Radar Comparison Profile'
                      : chartType === 'box' ? 'Box and Whisker Plot'
                      : chartType === 'stackedBar' ? 'Stacked Bar Chart'
                      : chartType === 'percentStackedBar' ? '100% Stacked Percentage Bar Chart'
                      : chartType === 'area' ? 'Area Chart'
                      : 'Scatter Correlation Plot';

  if (chartType === 'stackedBar') {
    return `This Stacked Bar Chart displays the rollup of ${yAxisColumn} across ${xAxisColumn} categories, segmented by ${spec.stackByColumn || 'stack groups'}. It highlights the contribution of each segment to the overall total.`;
  }
  if (chartType === 'percentStackedBar') {
    return `This 100% Stacked Percentage Bar Chart contrasts the relative proportions of ${spec.stackByColumn || 'stack groups'} within each ${xAxisColumn} category. This standardizes categories to identify compositional differences independent of overall volume.`;
  }
  if (chartType === 'area') {
    return `This Area Chart plots the progression or categories of ${yAxisColumn} against ${xAxisColumn}${spec.stackByColumn ? `, stacked by ${spec.stackByColumn} to display volume transitions` : ''}. The filled area highlights cumulative volume and trends.`;
  }
  if (chartType === 'bubble') {
    return `This Bubble Chart plots the correlation between ${xAxisColumn} (X-axis) and ${yAxisColumn} (Y-axis), with bubble size representing ${spec.zAxisColumn || 'magnitude'}. It highlights multi-dimensional patterns and outliers.`;
  }
  if (chartType === 'radar') {
    return `This Radar Chart visualizes the relative values of ${yAxisColumn} mapped along spokes for each ${xAxisColumn} category. It provides visual profile comparisons across multiple dimensions.`;
  }
  if (chartType === 'box') {
    return `This Box and Whisker Plot shows the distribution and spread of ${yAxisColumn} across different ${xAxisColumn} categories. The box outlines the IQR (middle 50% from Q1 to Q3) with a solid median line, the whiskers extend to the non-outlier range, and individual points show anomalous outliers.`;
  }
  if (chartType === 'horizontalBar') {
    return `This Horizontal Bar Chart compares the ${aggText} of ${yAxisColumn} across ${xAxisColumn} categories. The horizontal layout provides structured, readable comparative rankings for longer text categories.`;
  }

  const xLower = xAxisColumn.toLowerCase();
  if (xLower.includes('month')) {
    return `This ${chartTypeText} presents the ${aggText} of ${yAxisColumn} calculated monthly. It reveals seasonal operational peaks and highlights monthly budget pacing.`;
  }
  if (xLower.includes('title') || xLower.includes('job')) {
    return `This ${chartTypeText} visualizes the ${aggText} of ${yAxisColumn} segmented by Job Title. It helps identify cost concentrations, FTE efficiency, and department staffing expenses.`;
  }
  if (xLower.includes('source') || xLower.includes('call')) {
    return `This ${chartTypeText} plots the ${aggText} of ${yAxisColumn} across Dispatch Call Sources. It measures response performance and transport volumes by incident urgency.`;
  }

  return `This ${chartTypeText} visualizes the ${aggText} of ${yAxisColumn} plotted against ${xAxisColumn}. It provides quick analytical comparisons to verify cost distributions.`;
}

interface BoxPlotGroup {
  category: string;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  outliers: number[];
}

function calculateBoxPlotGroups(rows: any[], xAxisColumn: string, yAxisColumn: string): BoxPlotGroup[] {
  const groups: Record<string, number[]> = {};
  
  rows.forEach(row => {
    const cat = String(row[xAxisColumn] ?? 'Unknown');
    const val = Number(row[yAxisColumn]);
    if (!isNaN(val) && val !== null && val !== undefined) {
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(val);
    }
  });

  const boxGroups: BoxPlotGroup[] = [];

  Object.entries(groups).forEach(([cat, vals]) => {
    if (vals.length < 1) return;
    vals.sort((a, b) => a - b);

    const getPercentile = (p: number) => {
      const idx = (vals.length - 1) * p;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (vals[base + 1] !== undefined) {
        return vals[base] + rest * (vals[base + 1] - vals[base]);
      }
      return vals[base];
    };

    const median = getPercentile(0.5);
    const q1 = getPercentile(0.25);
    const q3 = getPercentile(0.75);
    const iqr = q3 - q1;

    const lowerLimit = q1 - 1.5 * iqr;
    const upperLimit = q3 + 1.5 * iqr;

    const nonOutliers = vals.filter(v => v >= lowerLimit && v <= upperLimit);
    const outliers = vals.filter(v => v < lowerLimit || v > upperLimit);

    const min = nonOutliers.length > 0 ? nonOutliers[0] : q1;
    const max = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : q3;

    boxGroups.push({
      category: cat,
      min,
      max,
      median,
      q1,
      q3,
      outliers
    });
  });

  return boxGroups.slice(0, 6);
}

const BoxPlot: React.FC<{
  rows: any[];
  xAxisColumn: string;
  yAxisColumn: string;
  colors: { stroke: string; fill: string; gradient: string[]; glow: string };
  uniqueId: string;
}> = ({ rows, xAxisColumn, yAxisColumn, colors, uniqueId }) => {
  const groups = useMemo(() => {
    return calculateBoxPlotGroups(rows, xAxisColumn, yAxisColumn);
  }, [rows, xAxisColumn, yAxisColumn]);

  if (groups.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        No numeric records available to compute quartile distributions.
      </div>
    );
  }

  const allValues = groups.flatMap(g => [g.min, g.max, g.median, g.q1, g.q3, ...g.outliers]);
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  const yPadding = (globalMax - globalMin) * 0.12 || 1;
  const paddedMin = globalMin - yPadding;
  const paddedMax = globalMax + yPadding;

  const svgWidth = 500;
  const svgHeight = 260;
  const margin = { top: 20, right: 20, bottom: 40, left: 55 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  const scaleY = (yVal: number) => {
    return margin.top + chartHeight - ((yVal - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
  };

  const widthPerCat = chartWidth / groups.length;
  const boxWidth = widthPerCat * 0.38;

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }).map((_, i) => {
    return paddedMin + (i * (paddedMax - paddedMin)) / (tickCount - 1);
  });

  const formatTick = (tick: number) => {
    const abs = Math.abs(tick);
    if (abs >= 1000000) return `${(tick / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${(tick / 1000).toFixed(1)}k`;
    return Number(tick.toFixed(2)).toString();
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ fontFamily: 'var(--font-sans)', overflow: 'visible' }}>
        <g>
          {ticks.map((tick, idx) => {
            const y = scaleY(tick);
            return (
              <g key={idx}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={svgWidth - margin.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth={1.5}
                />
                <text
                  x={margin.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9}
                  fontWeight="600"
                  fill="#94a3b8"
                >
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}
        </g>

        {groups.map((group, idx) => {
          const centerX = margin.left + widthPerCat * (idx + 0.5);

          return (
            <g key={idx}>
              <defs>
                <linearGradient id={`boxGrad-${uniqueId}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={colors.gradient[1]} stopOpacity={0.35} />
                </linearGradient>
              </defs>

              {/* Whisker Line */}
              <line
                x1={centerX}
                y1={scaleY(group.min)}
                x2={centerX}
                y2={scaleY(group.max)}
                stroke={colors.stroke}
                strokeWidth={1.5}
              />

              {/* Min Cap */}
              <line
                x1={centerX - boxWidth / 4}
                y1={scaleY(group.min)}
                x2={centerX + boxWidth / 4}
                y2={scaleY(group.min)}
                stroke={colors.stroke}
                strokeWidth={2}
              />

              {/* Max Cap */}
              <line
                x1={centerX - boxWidth / 4}
                y1={scaleY(group.max)}
                x2={centerX + boxWidth / 4}
                y2={scaleY(group.max)}
                stroke={colors.stroke}
                strokeWidth={2}
              />

              {/* Box Rect */}
              <rect
                x={centerX - boxWidth / 2}
                y={scaleY(group.q3)}
                width={boxWidth}
                height={Math.max(scaleY(group.q1) - scaleY(group.q3), 1)}
                fill={`url(#boxGrad-${uniqueId}-${idx})`}
                stroke={colors.stroke}
                strokeWidth={2}
                rx={2}
              >
                <title>{`Category: ${group.category}
Max (non-outlier): ${group.max.toLocaleString()}
Q3 (Upper Quartile): ${group.q3.toLocaleString()}
Median: ${group.median.toLocaleString()}
Q1 (Lower Quartile): ${group.q1.toLocaleString()}
Min (non-outlier): ${group.min.toLocaleString()}
Outliers: ${group.outliers.length} point(s)`}</title>
              </rect>

              {/* Median Line */}
              <line
                x1={centerX - boxWidth / 2}
                y1={scaleY(group.median)}
                x2={centerX + boxWidth / 2}
                y2={scaleY(group.median)}
                stroke={colors.stroke}
                strokeWidth={3}
              />

              {/* Outliers */}
              {group.outliers.map((val, oIdx) => (
                <circle
                  key={oIdx}
                  cx={centerX}
                  cy={scaleY(val)}
                  r={3.5}
                  fill="#ffffff"
                  stroke="#ef4444"
                  strokeWidth={2}
                >
                  <title>Outlier: {val.toLocaleString()}</title>
                </circle>
              ))}

              <text
                x={centerX}
                y={svgHeight - 12}
                textAnchor="middle"
                fontSize={9}
                fontWeight="700"
                fill="#475569"
              >
                {group.category.length > 11 ? `${group.category.slice(0, 9)}..` : group.category}
                <title>{group.category}</title>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, isPercent }: any) => {
  if (active && payload && payload.length) {
    let total = 0;
    let showTotal = false;
    if (payload.length > 1) {
      payload.forEach((item: any) => {
        if (typeof item.value === 'number') {
          total += item.value;
        }
      });
      showTotal = true;
    }
    const formattedTotal = isPercent 
      ? `${total.toFixed(1)}%` 
      : total.toLocaleString(undefined, { maximumFractionDigits: 2 });

    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          border: '1.5px solid rgba(0, 33, 133, 0.1)',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: '0 6px 20px rgba(0, 33, 133, 0.08)',
          fontFamily: 'var(--font-sans)',
          color: '#0f172a'
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem', color: '#002185' }}>
          {label}
        </p>
        {payload.map((item: any, i: number) => {
          const val = item.value;
          const formattedVal = typeof val === 'number' 
            ? (isPercent 
                ? `${val.toFixed(1)}%` 
                : val.toLocaleString(undefined, { maximumFractionDigits: 2 })) 
            : val;
          const sizeVal = item.payload && item.payload.z !== undefined && item.payload.z !== 10
            ? ` (Size: ${item.payload.z.toLocaleString(undefined, { maximumFractionDigits: 2 })})`
            : '';
          return (
            <p key={i} style={{ margin: 0, fontSize: '0.85rem', color: '#334155', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: item.color || '#0052BD', fontSize: '1rem' }}>●</span>
              {item.name}: <strong>{formattedVal}</strong>{sizeVal}
            </p>
          );
        })}
        {showTotal && (
          <div style={{ borderTop: '1.5px dashed #cbd5e1', marginTop: '0.5rem', paddingTop: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Total:</span>
            <span style={{ color: '#002185' }}>{formattedTotal}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const InsightChart: React.FC<InsightChartProps> = ({ chartSpec, rows, borderless = false, height, colorTheme = 'vibrant', onRemove, onExpand, hideHeader = false }) => {
  const data = useMemo(() => {
    try {
      return aggregateDataset(rows, chartSpec);
    } catch (err) {
      console.error('Failed to aggregate dataset for chart:', err);
      return [];
    }
  }, [rows, chartSpec]);

  const uniqueId = useMemo(() => {
    return chartSpec.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }, [chartSpec.title]);

  const stackKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(k => {
        if (k !== 'name' && k !== 'value' && k !== 'z') {
          keys.add(k);
        }
      });
    });
    return Array.from(keys);
  }, [data]);

  const colors = useMemo(() => {
    return getChartColors(chartSpec.title || chartSpec.yAxisColumn, colorTheme);
  }, [chartSpec.title, chartSpec.yAxisColumn, colorTheme]);

  const xAxisProps = useMemo(() => {
    if (!data || data.length === 0) return { dy: 10 };
    const hasLongLabel = data.some(d => String(d.name || '').length > 8);
    const hasManyLabels = data.length > 5;
    if (hasLongLabel || hasManyLabels) {
      return {
        angle: -35,
        textAnchor: 'end' as const,
        height: 60,
        dx: -5
      };
    }
    return {
      dy: 10
    };
  }, [data]);

  const chartMargin = useMemo(() => {
    if (!data || data.length === 0) return { top: 10, right: 20, left: 10, bottom: 20 };
    const hasLongLabel = data.some(d => String(d.name || '').length > 8);
    const hasManyLabels = data.length > 5;
    const bottom = (hasLongLabel || hasManyLabels) ? 55 : 20;
    return { top: 10, right: 20, left: 10, bottom };
  }, [data]);

  const renderChart = (isPrint: boolean = false, printWidth?: number, printHeight?: number) => {
    if (chartSpec.chartType !== 'box' && data.length === 0) {
      return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No chart data available. Verify your aggregations.
        </div>
      );
    }

    const { chartType, yAxisColumn } = chartSpec;
    const w = isPrint ? (printWidth || 480) : undefined;
    const h = isPrint ? (printHeight || 180) : undefined;

    const suffix = isPrint ? `-print-${h}` : '-screen';
    const barGradientId = `barGradient-${uniqueId}${suffix}`;
    const barHorizGradientId = `barHorizGradient-${uniqueId}${suffix}`;

    const renderLegend = () => {
      if (stackKeys.length === 0) return null;
      const isSlanted = xAxisProps.angle !== undefined;
      if (isSlanted) {
        return (
          <Legend 
            verticalAlign="top" 
            align="center" 
            height={36} 
            wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} 
          />
        );
      } else {
        return (
          <Legend 
            verticalAlign="bottom" 
            align="center" 
            wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} 
          />
        );
      }
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart width={w} height={h} data={data} margin={chartMargin}>
            <defs>
              <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity={0.9} />
                <stop offset="100%" stopColor={colors.gradient[1]} stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              {...xAxisProps}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(31, 113, 219, 0.04)' }} />
            {renderLegend()}
            {stackKeys.length > 0 ? (
              stackKeys.map((key, index) => {
                const color = PIE_COLORS[index % PIE_COLORS.length];
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    fill={color}
                    radius={[4, 4, 0, 0]}
                  />
                );
              })
            ) : (
              <Bar dataKey="value" name={yAxisColumn} fill={`url(#${barGradientId})`} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );

      case 'stackedBar':
      case 'percentStackedBar': {
        const isPercent = chartType === 'percentStackedBar';
        return (
          <BarChart width={w} height={h} data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              {...xAxisProps}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => isPercent ? `${val}%` : (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              domain={isPercent ? [0, 100] : [0, 'auto']}
            />
            <Tooltip content={<CustomTooltip isPercent={isPercent} />} cursor={{ fill: 'rgba(31, 113, 219, 0.04)' }} />
            {renderLegend()}
            {stackKeys.length > 0 ? (
              stackKeys.map((key, index) => {
                const color = PIE_COLORS[index % PIE_COLORS.length];
                return (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    name={key} 
                    stackId="a" 
                    fill={color} 
                  />
                );
              })
            ) : (
              <Bar dataKey="value" name={yAxisColumn} fill={colors.stroke} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );
      }

      case 'area': {
        const isStacked = stackKeys.length > 0;
        return (
          <AreaChart width={w} height={h} data={data} margin={chartMargin}>
            <defs>
              {isStacked ? (
                stackKeys.map((key, index) => {
                  const color = PIE_COLORS[index % PIE_COLORS.length];
                  const gradId = `areaGrad-${uniqueId}-${index}${suffix}`;
                  return (
                    <linearGradient key={key} id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.7} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  );
                })
              ) : (
                <linearGradient id={`areaGradSingle-${uniqueId}${suffix}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.stroke} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={colors.stroke} stopOpacity={0.05} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              {...xAxisProps}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} />
            {renderLegend()}
            {isStacked ? (
              stackKeys.map((key, index) => {
                const color = PIE_COLORS[index % PIE_COLORS.length];
                const gradId = `areaGrad-${uniqueId}-${index}${suffix}`;
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stackId="a"
                    stroke={color}
                    fill={`url(#${gradId})`}
                  />
                );
              })
            ) : (
              <Area
                type="monotone"
                dataKey="value"
                name={yAxisColumn}
                stroke={colors.stroke}
                fill={`url(#areaGradSingle-${uniqueId}${suffix})`}
              />
            )}
          </AreaChart>
        );
      }

      case 'horizontalBar':
        return (
          <BarChart layout="vertical" width={w} height={h} data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id={barHorizGradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={colors.gradient[0]} stopOpacity={0.9} />
                <stop offset="100%" stopColor={colors.gradient[1]} stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} vertical={true} />
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(31, 113, 219, 0.04)' }} />
            {renderLegend()}
            {stackKeys.length > 0 ? (
              stackKeys.map((key, index) => {
                const color = PIE_COLORS[index % PIE_COLORS.length];
                return (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    fill={color}
                    radius={[0, 4, 4, 0]}
                  />
                );
              })
            ) : (
              <Bar dataKey="value" name={yAxisColumn} fill={`url(#${barHorizGradientId})`} radius={[0, 4, 4, 0]} />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart width={w} height={h} data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              {...xAxisProps}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} />
            {renderLegend()}
            {stackKeys.length > 0 ? (
              stackKeys.map((key, index) => {
                const color = PIE_COLORS[index % PIE_COLORS.length];
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    stroke={color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#ffffff', stroke: color, strokeWidth: 2 }}
                    activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#ffffff' }}
                  />
                );
              })
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                name={yAxisColumn}
                stroke={colors.stroke}
                strokeWidth={3}
                dot={{ r: 4, fill: '#ffffff', stroke: colors.stroke, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: colors.gradient[1], strokeWidth: 2, fill: '#ffffff' }}
              />
            )}
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart width={w} height={h} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="72%"
              innerRadius="40%"
              paddingAngle={3}
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart width={w} height={h} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              {...xAxisProps}
            />
            <YAxis
              type="number"
              dataKey="value"
              name={yAxisColumn}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={yAxisColumn} data={data} fill={colors.stroke} />
          </ScatterChart>
        );

      case 'bubble':
        return (
          <ScatterChart width={w} height={h} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              {...xAxisProps}
            />
            <YAxis
              type="number"
              dataKey="value"
              name={yAxisColumn}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <ZAxis
              type="number"
              dataKey="z"
              range={[50, 400]}
              name={chartSpec.zAxisColumn || 'Size'}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={yAxisColumn} data={data} fill={colors.stroke} />
          </ScatterChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data} width={w} height={h} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#cbd5e1" fontSize={8} tickLine={false} />
            <Radar name={yAxisColumn} dataKey="value" stroke={colors.stroke} fill={colors.fill} fillOpacity={0.2} />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        );

      case 'box':
        return (
          <BoxPlot 
            rows={rows} 
            xAxisColumn={chartSpec.xAxisColumn} 
            yAxisColumn={chartSpec.yAxisColumn} 
            colors={colors} 
            uniqueId={`${uniqueId}${suffix}`} 
          />
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className={`chart-container-widget ${borderless ? 'borderless' : ''}`}
      style={height ? { height } : undefined}
    >
      {!hideHeader && (
        <div className="chart-header-widget">
          <div className="chart-title-widget">{chartSpec.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            
            {/* Detailed analysis hover tooltip */}
            <div className="chart-info-tooltip-container">
              <Info size={14} style={{ color: 'var(--BannerGB)', cursor: 'pointer', display: 'block' }} />
              <div className="chart-info-tooltip-content">
                <strong style={{ display: 'block', color: 'var(--LabelBG)', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  Analysis Insights
                </strong>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#475569', lineHeight: 1.4 }}>
                  {getChartDescription(chartSpec)}
                </p>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem', fontSize: '0.7rem', color: '#64748b' }}>
                  X-Axis: <code>{chartSpec.xAxisColumn}</code> • Y-Axis: <code>{chartSpec.yAxisColumn}</code>
                  <br />
                  Rollup: <strong style={{ textTransform: 'capitalize' }}>{chartSpec.aggregation}</strong>
                </div>
              </div>
            </div>

            <div className={`badge ${colors.badgeClass}`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
              {chartSpec.chartType}
            </div>

            {onExpand && (
              <button
                type="button"
                className="chart-expand-btn"
                onClick={onExpand}
                title="Expand Visual"
                style={{
                  background: 'rgba(0, 82, 189, 0.06)',
                  border: '1px solid rgba(0, 82, 189, 0.12)',
                  cursor: 'pointer',
                  color: 'var(--BannerGB)',
                  padding: '3px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  transition: 'all 0.15s ease',
                  marginLeft: '0.25rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 82, 189, 0.12)';
                  e.currentTarget.style.color = 'var(--LabelBG)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 82, 189, 0.06)';
                  e.currentTarget.style.color = 'var(--BannerGB)';
                }}
              >
                <Maximize2 size={11} />
                <span>Expand</span>
              </button>
            )}

            {onRemove && (
              <button
                type="button"
                className="chart-remove-btn"
                onClick={onRemove}
                title="Hide Visual"
                style={{
                  background: 'rgba(148, 163, 184, 0.08)',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '3px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  transition: 'all 0.15s ease',
                  marginLeft: '0.25rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)';
                  e.currentTarget.style.color = 'var(--LabelBG)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.08)';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <EyeOff size={11} />
                <span>Hide</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Screen Mode Wrapper */}
      <div className="chart-wrapper screen-only-chart">
        {chartSpec.chartType === 'box' ? (
          renderChart(false)
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(false) || <div></div>}
          </ResponsiveContainer>
        )}
      </div>

      {/* Print Mode Wrapper (Portrait vs Landscape optimized, toggled via CSS orientation) */}
      <div className="chart-wrapper print-only-chart print-only-portrait-chart">
        {renderChart(true, 700, 520)}
      </div>
      <div className="chart-wrapper print-only-chart print-only-landscape-chart">
        {renderChart(true, 920, 280)}
      </div>
    </div>
  );
};
