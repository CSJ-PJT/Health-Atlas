import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface MetricDonutChartProps {
  value: number;
  total: number;
  color: string;
  remainderColor?: string;
  centerLabel: string;
  centerValue: string;
  subLabel?: string;
  height?: number;
}

export const MetricDonutChart = ({
  value,
  total,
  color,
  remainderColor = "hsl(var(--muted))",
  centerLabel,
  centerValue,
  subLabel,
  height = 220,
}: MetricDonutChartProps) => {
  const safeTotal = Math.max(total, 1);
  const safeValue = Math.max(0, Math.min(value, safeTotal));
  const data = [
    { name: "value", value: safeValue },
    { name: "rest", value: Math.max(safeTotal - safeValue, 0) },
  ];

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={65} outerRadius={92} paddingAngle={2} stroke="none">
            <Cell fill={color} />
            <Cell fill={remainderColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-xs text-muted-foreground">{centerLabel}</div>
        <div className="text-2xl font-bold">{centerValue}</div>
        {subLabel ? <div className="mt-1 text-xs text-muted-foreground">{subLabel}</div> : null}
      </div>
    </div>
  );
};
