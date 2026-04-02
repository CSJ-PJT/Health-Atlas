interface MetricGridProps {
  items: Array<{
    label: string;
    value: string | number;
  }>;
}

export const MetricGrid = ({ items }: MetricGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-base font-semibold md:text-lg">{item.value}</div>
        </div>
      ))}
    </div>
  );
};
