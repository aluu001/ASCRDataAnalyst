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
  Scatter
} from 'recharts';
import { Info } from 'lucide-react';
import { aggregateDataset } from '../utils/dataEngine';
import type { ChartSpecification } from '../utils/gemini';

interface InsightChartProps {
  chartSpec: ChartSpecification;
  rows: any[];
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

// Helper to translate chart specs into human-readable descriptions for client hand-off reports
function getChartDescription(spec: ChartSpecification): string {
  const { chartType, xAxisColumn, yAxisColumn, aggregation } = spec;

  const aggText = aggregation === 'sum' ? 'total aggregated sum'
                : aggregation === 'avg' ? 'average value'
                : aggregation === 'count' ? 'frequency volume'
                : 'raw distributions';

  const chartTypeText = chartType === 'bar' ? 'Bar Chart'
                      : chartType === 'line' ? 'Line Graph'
                      : chartType === 'pie' ? 'Pie Distribution'
                      : 'Scatter Correlation Plot';

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
          const formattedVal = typeof item.value === 'number' 
            ? item.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
            : item.value;
          return (
            <p key={i} style={{ margin: 0, fontSize: '0.85rem', color: '#334155', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: item.color || '#0052BD', fontSize: '1rem' }}>●</span>
              {item.name}: <strong>{formattedVal}</strong>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export const InsightChart: React.FC<InsightChartProps> = ({ chartSpec, rows }) => {
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

  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No chart data available. Verify your aggregations.
        </div>
      );
    }

    const { chartType, yAxisColumn } = chartSpec;

    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id={`barGradient-${uniqueId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0052BD" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#1F71DB" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(31, 113, 219, 0.04)' }} />
            <Bar dataKey="value" name={yAxisColumn} fill={`url(#barGradient-${uniqueId})`} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              name={yAxisColumn}
              stroke="#002185"
              strokeWidth={3}
              dot={{ r: 4, fill: '#ffffff', stroke: '#002185', strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: '#1F71DB', strokeWidth: 2, fill: '#ffffff' }}
            />
          </LineChart>
        );

      case 'pie':
        return (
          <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={95}
              innerRadius={50}
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
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
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
            <Scatter name={yAxisColumn} data={data} fill="#1F71DB" />
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="chart-container-widget">
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

          <div className="badge badge-cyan" style={{ fontSize: '0.65rem', border: '1px solid rgba(0, 82, 189, 0.15)', textTransform: 'capitalize' }}>
            {chartSpec.chartType}
          </div>
        </div>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() || <div></div>}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
