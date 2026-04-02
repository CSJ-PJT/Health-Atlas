interface MetricGridProps {
  items: Array<{
    label: string;
    value: string | number;
  }>;
}

export const MetricGrid = ({ items }: MetricGridProps) => {
  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-2 md:p-3">
          <div className="text-[10px] leading-tight text-muted-foreground md:text-xs">{item.label}</div>
          <div className="mt-1 text-sm font-semibold leading-tight md:text-base">{item.value}</div>
        </div>
      ))}
    </div>
  );
};
