'use client';

import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterChart,
  ComposedChart,
  Bar,
  Line,
  Area,
  Pie,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ChartConfig {
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'composed';
  data: Array<Record<string, string | number>>;
  dataKeys?: {
    x?: string;
    y?: string | string[];
    name?: string;
    value?: string;
  };
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  axisLabels?: {
    x?: string;
    y?: string;
  };
}

interface ChartHydratorProps {
  slideId?: string;
}

export function ChartHydrator({ slideId }: ChartHydratorProps) {
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      console.log('🔄 ChartHydrator running for slide:', slideId);
      const chartElements = document.querySelectorAll('[data-chart-config]');
      console.log('📊 Found', chartElements.length, 'chart elements to hydrate');

      chartElements.forEach((el) => {
        const container = el as HTMLElement;
        const configJson = container.dataset.chartConfig;
      if (!configJson) return;

      try {
        const config: ChartConfig = JSON.parse(configJson);
        const defaultColors = ['#16C2C7', '#C84BD2', '#0BFFF5', '#9945FF', '#14F195', '#FF6B9D'];
        const colors = config.colors ?? defaultColors;
        const showLegend = config.showLegend ?? true;
        const showGrid = config.showGrid ?? true;
        const showTooltip = config.showTooltip ?? true;

        const dataKeys = config.dataKeys ?? {};
        const xKey = dataKeys.x ?? 'name';
        const yKeys = Array.isArray(dataKeys.y) ? dataKeys.y : dataKeys.y ? [dataKeys.y] : ['value'];

        let chart: React.ReactNode = null;

        switch (config.chartType) {
          case 'bar':
            chart = (
              <BarChart data={config.data}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 236, 236, 0.1)" />}
                <XAxis dataKey={xKey} stroke="#8b949e" style={{ fontSize: 12 }} />
                <YAxis stroke="#8b949e" style={{ fontSize: 12 }} />
                {showTooltip && <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} />}
                {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {yKeys.map((key, index) => (
                  <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
                ))}
              </BarChart>
            );
            break;

          case 'line':
            chart = (
              <LineChart data={config.data}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 236, 236, 0.1)" />}
                <XAxis dataKey={xKey} stroke="#8b949e" style={{ fontSize: 12 }} />
                <YAxis stroke="#8b949e" style={{ fontSize: 12 }} />
                {showTooltip && <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} />}
                {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {yKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            );
            break;

          case 'area':
            chart = (
              <AreaChart data={config.data}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 236, 236, 0.1)" />}
                <XAxis dataKey={xKey} stroke="#8b949e" style={{ fontSize: 12 }} />
                <YAxis stroke="#8b949e" style={{ fontSize: 12 }} />
                {showTooltip && <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} />}
                {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {yKeys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    fill={colors[index % colors.length]}
                    stroke={colors[index % colors.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            );
            break;

          case 'pie':
            const pieDataKey = dataKeys.value ?? 'value';
            const pieNameKey = dataKeys.name ?? 'name';
            chart = (
              <PieChart>
                <Pie
                  data={config.data}
                  dataKey={pieDataKey}
                  nameKey={pieNameKey}
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  label
                >
                  {config.data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                {showTooltip && <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} />}
                {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
              </PieChart>
            );
            break;

          case 'scatter':
            chart = (
              <ScatterChart>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 236, 236, 0.1)" />}
                <XAxis dataKey={xKey} stroke="#8b949e" style={{ fontSize: 12 }} />
                <YAxis dataKey={yKeys[0]} stroke="#8b949e" style={{ fontSize: 12 }} />
                {showTooltip && <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} />}
                {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
                <Scatter name="Data" data={config.data} fill={colors[0]} />
              </ScatterChart>
            );
            break;

          case 'composed':
            chart = (
              <ComposedChart data={config.data}>
                {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(236, 236, 236, 0.1)" />}
                <XAxis dataKey={xKey} stroke="#8b949e" style={{ fontSize: 12 }} />
                <YAxis stroke="#8b949e" style={{ fontSize: 12 }} />
                {showTooltip && <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8 }} />}
                {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
                {yKeys.map((key, index) => {
                  const color = colors[index % colors.length];
                  if (index === 0) {
                    return <Bar key={key} dataKey={key} fill={color} />;
                  }
                  return <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} />;
                })}
              </ComposedChart>
            );
            break;
        }

        // Check if already hydrated
        if (container.dataset.hydrated === 'true') {
          return;
        }

        // Mark as hydrated
        container.dataset.hydrated = 'true';

        // Clear placeholder and render chart
        container.innerHTML = '';
        const root = createRoot(container);
        root.render(
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        );
        } catch (error) {
          console.error('Failed to hydrate chart:', error);
        }
      });
    }, 100); // Small delay for DOM readiness

    return () => clearTimeout(timeoutId);
  }, [slideId]);

  return null;
}
