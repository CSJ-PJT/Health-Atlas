export function formatMinutesToKorean(mins: number): string {
  if (!mins || mins <= 0) return "0분";

  const hours = Math.floor(mins / 60);
  const rest = mins % 60;

  if (hours === 0) return `${mins}분`;
  if (rest === 0) return `${hours}시간`;

  return `${hours}시간 ${rest}분`;
}
