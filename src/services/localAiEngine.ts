type AiContext = {
  roomName?: string;
  roomType?: "direct" | "group";
  participantNames?: string[];
};

export function generateLocalAiReply(message: string, context?: AiContext) {
  const normalized = message.toLowerCase();

  if (normalized.includes("안녕") || normalized.includes("hello")) {
    return "안녕하세요. 오늘 컨디션이 어떤지부터 가볍게 알려주세요.";
  }
  if (normalized.includes("러닝") || normalized.includes("거리") || normalized.includes("페이스")) {
    return "러닝 이야기네요. 최근 거리와 페이스 흐름을 같이 보면 회복 강도 조절에 도움이 됩니다.";
  }
  if (normalized.includes("수면") || normalized.includes("잠")) {
    return "수면은 회복의 핵심입니다. 어제 수면 시간과 오늘 피로도를 같이 기록해 보세요.";
  }
  if (normalized.includes("심박")) {
    return "심박수는 강도 판단에 좋습니다. 평소보다 높다면 강도를 낮추고 회복 상태를 확인해 보세요.";
  }
  if (normalized.includes("영양") || normalized.includes("칼로리")) {
    return "영양 이야기가 나왔네요. 운동 강도에 맞춰 수분과 탄수화물 보충량을 함께 점검해 보세요.";
  }
  if (context?.roomType === "group") {
    return `${context.roomName || "그룹"} 기준으로 보면 각자 기록을 비교하면서 이번 주 목표를 나눠 보는 것이 좋겠습니다.`;
  }
  if (context?.participantNames?.length) {
    return `${context.participantNames[0]}님과 대화 중이군요. 오늘 기록이나 컨디션을 한 줄씩 주고받으면 정리하기 좋습니다.`;
  }
  return "좋아요. 오늘 기록, 컨디션, 목표 중 하나를 먼저 정해서 이야기해 보면 더 구체적으로 정리할 수 있습니다.";
}

export function buildLocalAiBlueprint() {
  return {
    name: "RH Local AI",
    version: 1,
    modules: ["chat-reply", "health-summary", "challenge-recommendation"],
    nextSteps: [
      "provider 공통 지표를 입력으로 받는 피처 스키마 정의",
      "최근 7일/30일 변화량 기반 점수 엔진 구축",
      "AI 코치와 채팅, 챌린지 추천에 공통 규칙 엔진 연결",
    ],
  };
}
