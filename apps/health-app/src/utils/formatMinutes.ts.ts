export function formatMinutes(mins: number): string {
    if (!mins || mins <= 0) return "0분";

    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);

    if (h <= 0) return `${m}분`;

    return `${h}시간 ${m}분`;
}
