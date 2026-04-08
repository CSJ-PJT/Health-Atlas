interface RoutePoint {
  lat: number;
  lng: number;
}

interface RouteMapCardProps {
  points?: RoutePoint[];
  title?: string;
}

export const RouteMapCard = ({ points = [], title = "운동 경로" }: RouteMapCardProps) => {
  const normalized = points.length
    ? (() => {
        const latitudes = points.map((point) => point.lat);
        const longitudes = points.map((point) => point.lng);
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);
        const latRange = maxLat - minLat || 0.001;
        const lngRange = maxLng - minLng || 0.001;

        return points.map((point) => ({
          x: 20 + ((point.lng - minLng) / lngRange) * 260,
          y: 20 + ((maxLat - point.lat) / latRange) * 140,
        }));
      })()
    : [];

  const pathData = normalized.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <div className="overflow-hidden rounded-lg border bg-muted/30">
        <svg viewBox="0 0 300 180" className="h-48 w-full">
          <rect x="0" y="0" width="300" height="180" fill="transparent" />
          {Array.from({ length: 5 }, (_, index) => (
            <line
              key={`v-${index}`}
              x1={30 + index * 60}
              y1="0"
              x2={30 + index * 60}
              y2="180"
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          ))}
          {Array.from({ length: 4 }, (_, index) => (
            <line
              key={`h-${index}`}
              x1="0"
              y1={30 + index * 40}
              x2="300"
              y2={30 + index * 40}
              stroke="currentColor"
              strokeOpacity="0.08"
            />
          ))}
          {pathData ? (
            <path d={pathData} fill="none" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {normalized.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === 0 || index === normalized.length - 1 ? 5 : 3}
              fill={index === 0 ? "#06b6d4" : index === normalized.length - 1 ? "#ef4444" : "#8b5cf6"}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
