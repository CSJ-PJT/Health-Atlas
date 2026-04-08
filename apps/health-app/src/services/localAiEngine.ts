type AiContext = {
  roomName?: string;
  roomType?: "direct" | "group";
  participantNames?: string[];
};

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function generateLocalAiReply(message: string, context?: AiContext) {
  const normalized = message.toLowerCase();

  if (hasAny(normalized, ["안녕", "hello", "hi"])) {
    return "안녕하세요. 오늘 컨디션이 어떤지부터 가볍게 알려 주세요.";
  }
  if (hasAny(normalized, ["러닝", "거리", "페이스", "달리기"])) {
    return "러닝 이야기라면 최근 거리, 페이스, 회복 상태를 같이 보면 더 정확하게 정리할 수 있습니다.";
  }
  if (hasAny(normalized, ["수면", "잠", "휴식"])) {
    return "수면과 회복은 훈련 적응에 크게 영향을 줍니다. 최근 수면 시간과 피로감도 함께 확인해 보세요.";
  }
  if (hasAny(normalized, ["심박", "heart"])) {
    return "심박은 강도 판단에 좋습니다. 평소보다 높다면 강도를 조금 낮추고 회복 상태를 먼저 점검해 보세요.";
  }
  if (hasAny(normalized, ["영양", "칼로리", "단백질", "식단"])) {
    return "영양은 회복과 체력 유지에 직접 연결됩니다. 운동 강도에 맞춰 수분과 단백질 보충도 챙겨 보세요.";
  }
  if (hasAny(normalized, ["챌린지", "배지", "게임"])) {
    return "챌린지와 게임 기록은 꾸준함을 만드는 데 좋습니다. 이번 주 목표를 짧고 선명하게 잡아 보세요.";
  }
  if (context?.roomType === "group") {
    return `${context.roomName || "그룹"} 기준으로 보면 각자 기록과 회복 상태를 같이 비교해 보는 게 좋겠습니다.`;
  }
  if (context?.participantNames?.length) {
    return `${context.participantNames[0]}님과 대화 중이라면 오늘 기록이나 컨디션을 짧게 주고받는 것부터 시작해 보세요.`;
  }

  return "좋습니다. 오늘 기록, 컨디션, 목표 중 하나를 먼저 정해서 이야기하면 더 구체적으로 도와드릴 수 있습니다.";
}

export function buildLocalAiBlueprint() {
  return {
    name: "RH Local AI",
    version: 2,
    modules: ["chat-reply", "health-summary", "challenge-recommendation", "recovery-hints"],
    nextSteps: [
      "provider 공통 지표를 입력으로 받는 통합 AI context 스키마 정의",
      "수면, 영양, 체성분, 심박, 러닝 지표를 함께 보는 다차원 점수화",
      "로컬 추론과 OpenAI 응답을 선택적으로 결합하는 하이브리드 전략 추가",
    ],
  };
}
