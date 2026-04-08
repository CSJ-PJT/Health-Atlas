interface MetricGridProps {
  items: Array<{
    label: string;
    value: string | number;
  }>;
  columnsClassName?: string;
}

export const MetricGrid = ({ items, columnsClassName = "grid-cols-2 md:grid-cols-4" }: MetricGridProps) => {
  return (
    <div className={`grid gap-2 md:gap-3 ${columnsClassName}`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-2 md:p-3">
          <div className="text-[10px] leading-tight text-muted-foreground md:text-xs">{item.label}</div>
          <div className="mt-1 text-sm font-semibold leading-tight md:text-base">{item.value}</div>
        </div>
      ))}
    </div>
  );
};
