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
import { aggregateDataset } from '../utils/dataEngine';
import type { ChartSpecification } from '../utils/gemini';

interface InsightChartProps {
  chartSpec: ChartSpecification;
  rows: any[];
}

// Tailormade HSL color scale for pie charts
const PIE_COLORS = [
  'hsl(263, 90%, 64%)',  // Purple
  'hsl(190, 95%, 48%)',  // Cyan
  'hsl(325, 90%, 60%)',  // Pink
  'hsl(142, 70%, 45%)',  // Success Green
  'hsl(37, 90%, 50%)',   // Warning Amber
  'hsl(215, 20%, 65%)',  // Secondary Grey
  'hsl(280, 85%, 65%)',  // Lavender
  'hsl(200, 90%, 60%)'   // Light Blue
];

/**
 * Custom glassmorphism tooltip for Recharts to match the dark futuristic design.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
          fontFamily: 'var(--font-sans)'
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: 'hsl(var(--text-primary))', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
          {label}
        </p>
        {payload.map((item: any, i: number) => (
          <p key={i} style={{ margin: 0, fontSize: '0.825rem', color: item.color || 'hsl(var(--secondary))', fontWeight: 500 }}>
            {item.name}: {item.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const InsightChart: React.FC<InsightChartProps> = ({ chartSpec, rows }) => {
  // Aggregate data using dataEngine memoized for performance
  const data = useMemo(() => {
    try {
      return aggregateDataset(rows, chartSpec);
    } catch (err) {
      console.error('Failed to aggregate dataset for chart:', err);
      return [];
    }
  }, [rows, chartSpec]);

  const renderChart = () => {
    if (data.length === 0) {
      return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}>
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
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(263, 90%, 64%)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(263, 90%, 64%)" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--text-muted))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="hsl(var(--text-muted))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
            <Bar dataKey="value" name={yAxisColumn} fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--text-muted))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="hsl(var(--text-muted))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              name={yAxisColumn}
              stroke="hsl(190, 95%, 48%)"
              strokeWidth={3}
              dot={{ r: 4, fill: '#0f172a', stroke: 'hsl(190, 95%, 48%)', strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 1 }}
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
              labelLine={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 }}
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--text-muted))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              type="number"
              dataKey="value"
              name={yAxisColumn}
              stroke="hsl(var(--text-muted))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={yAxisColumn} data={data} fill="hsl(325, 90%, 60%)" />
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
        <div className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
          {chartSpec.chartType} • {chartSpec.aggregation !== 'none' ? `${chartSpec.aggregation}(${chartSpec.yAxisColumn})` : 'Raw Records'}
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
