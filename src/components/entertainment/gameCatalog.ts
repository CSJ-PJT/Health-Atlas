import type { PlayableGameId } from "@/components/entertainment/playableGames";
import type { RankingRange, RankingRow } from "@/services/entertainmentTypes";

export const miniGames: Array<{ id: PlayableGameId; title: string; summary: string }> = [
  {
    id: "tap-sprint",
    title: "탭 스프린트",
    summary: "짧은 시간 안에 최대한 많이 탭해서 반응 속도와 몰입도를 겨루는 게임입니다.",
  },
  {
    id: "reaction-grid",
    title: "리액션 그리드",
    summary: "번쩍이는 칸을 빠르게 눌러 정확도와 순발력을 겨루는 경쟁형 게임입니다.",
  },
  {
    id: "pace-memory",
    title: "페이스 메모리",
    summary: "숫자 순서를 기억하고 재현해 집중력과 기억력을 겨루는 게임입니다.",
  },
  {
    id: "resource-rush",
    title: "리소스 러시",
    summary: "한정된 턴 안에 자원을 전략적으로 확보해 최고 점수를 노리는 전략형 아케이드 게임입니다.",
  },
  {
    id: "fitcraft-island",
    title: "FitCraft Island",
    summary: "건강 활동으로 해금한 재료로 친구와 함께 2D 섬을 꾸미는 협동 창조형 게임입니다.",
  },
  {
    id: "pulse-frontier",
    title: "Pulse Frontier",
    summary: "턴마다 자원을 모아 유닛을 배치하고 상대 본진을 점령하는 경량 전략 게임입니다.",
  },
  {
    id: "tetris",
    title: "테트리스",
    summary: "시간이 지날수록 빨라지는 블록 낙하를 버티며 라인을 지우는 게임입니다.",
  },
];

export const featuredBadges = [
  {
    id: "lavender",
    icon: "🏃",
    name: "라벤더 러너",
    detail: "꾸준한 회복 러닝과 안정적인 루틴을 이어 가는 러너에게 주어지는 대표 배지입니다.",
  },
  {
    id: "sub4",
    icon: "⏱️",
    name: "Sub4 체이서",
    detail: "공인 풀코스 기록을 향해 안정적으로 전진하는 러너를 위한 도전형 배지입니다.",
  },
  {
    id: "mountain",
    icon: "⛰️",
    name: "마운틴 헌터",
    detail: "누적 고도와 트레일 훈련을 꾸준히 채우며 강한 지구력을 만든 사용자에게 주어집니다.",
  },
  {
    id: "ultra",
    icon: "🔥",
    name: "울트라 스피릿",
    detail: "장거리 훈련과 회복 루틴을 오래 이어 가는 사용자에게 주어지는 희귀 배지입니다.",
  },
];

export function buildSeedRankingData(
  myUserId: string,
  myUserName: string,
): Record<PlayableGameId, Record<RankingRange, RankingRow[]>> {
  return {
    "tap-sprint": {
      weekly: [
        { name: "민서", userId: "minseo", score: 83, rank: 1 },
        { name: myUserName, userId: myUserId, score: 62, rank: 2 },
      ],
      monthly: [
        { name: "민서", userId: "minseo", score: 322, rank: 1 },
        { name: myUserName, userId: myUserId, score: 275, rank: 2 },
      ],
    },
    "reaction-grid": {
      weekly: [
        { name: "지우", userId: "jiwoo", score: 210, rank: 1 },
        { name: myUserName, userId: myUserId, score: 180, rank: 2 },
      ],
      monthly: [
        { name: "지우", userId: "jiwoo", score: 774, rank: 1 },
        { name: myUserName, userId: myUserId, score: 708, rank: 2 },
      ],
    },
    "pace-memory": {
      weekly: [
        { name: "하나", userId: "hana", score: 168, rank: 1 },
        { name: myUserName, userId: myUserId, score: 156, rank: 2 },
      ],
      monthly: [
        { name: "하나", userId: "hana", score: 598, rank: 1 },
        { name: myUserName, userId: myUserId, score: 562, rank: 2 },
      ],
    },
    "resource-rush": {
      weekly: [
        { name: "서연", userId: "seoyeon", score: 245, rank: 1 },
        { name: myUserName, userId: myUserId, score: 216, rank: 2 },
      ],
      monthly: [
        { name: "서연", userId: "seoyeon", score: 1080, rank: 1 },
        { name: myUserName, userId: myUserId, score: 1012, rank: 2 },
      ],
    },
    "fitcraft-island": {
      weekly: [
        { name: "가온", userId: "gaon", score: 188, rank: 1 },
        { name: myUserName, userId: myUserId, score: 176, rank: 2 },
      ],
      monthly: [
        { name: "가온", userId: "gaon", score: 920, rank: 1 },
        { name: myUserName, userId: myUserId, score: 888, rank: 2 },
      ],
    },
    "pulse-frontier": {
      weekly: [
        { name: "서연", userId: "seoyeon", score: 312, rank: 1 },
        { name: myUserName, userId: myUserId, score: 278, rank: 2 },
      ],
      monthly: [
        { name: "서연", userId: "seoyeon", score: 1240, rank: 1 },
        { name: myUserName, userId: myUserId, score: 1170, rank: 2 },
      ],
    },
    tetris: {
      weekly: [
        { name: "윤호", userId: "yunho", score: 230, rank: 1 },
        { name: myUserName, userId: myUserId, score: 190, rank: 2 },
      ],
      monthly: [
        { name: "윤호", userId: "yunho", score: 960, rank: 1 },
        { name: myUserName, userId: myUserId, score: 821, rank: 2 },
      ],
    },
  };
}

export function buildSeedTopFiveData(myUserName: string): Record<PlayableGameId, Array<{ name: string; score: number; badge: string }>> {
  return {
    "tap-sprint": [
      { name: "민서", score: 1210, badge: "Lightning" },
      { name: "서연", score: 1174, badge: "Fast Hands" },
      { name: "윤호", score: 1150, badge: "Pulse Ace" },
      { name: "지우", score: 1128, badge: "Sharp Tapper" },
      { name: "가온", score: 1110, badge: "Quick Burst" },
    ],
    "reaction-grid": [
      { name: "지우", score: 1850, badge: "Vision Master" },
      { name: "민서", score: 1798, badge: "Flash Queen" },
      { name: "하나", score: 1722, badge: "Target Hunter" },
      { name: "서연", score: 1671, badge: "Reflex Star" },
      { name: "가온", score: 1604, badge: "Grid Hero" },
    ],
    "pace-memory": [
      { name: "하나", score: 1480, badge: "Memory Ace" },
      { name: myUserName, score: 1420, badge: "Pattern Pro" },
      { name: "민서", score: 1390, badge: "Focus Mind" },
      { name: "지우", score: 1335, badge: "Recall Master" },
      { name: "서연", score: 1310, badge: "Rhythm Brain" },
    ],
    "resource-rush": [
      { name: "서연", score: 2280, badge: "Rush King" },
      { name: "민서", score: 2210, badge: "Resource Hawk" },
      { name: myUserName, score: 2145, badge: "Strategist" },
      { name: "지우", score: 2088, badge: "Crystal Raider" },
      { name: "가온", score: 2012, badge: "Trade Master" },
    ],
    "fitcraft-island": [
      { name: "가온", score: 1920, badge: "Creative Architect" },
      { name: "서연", score: 1884, badge: "World Maker" },
      { name: myUserName, score: 1810, badge: "Pixel Artist" },
      { name: "민서", score: 1766, badge: "Builder Pro" },
      { name: "하나", score: 1705, badge: "Color Crafter" },
    ],
    "pulse-frontier": [
      { name: "서연", score: 2610, badge: "Frontier Conqueror" },
      { name: "민서", score: 2520, badge: "Base Breaker" },
      { name: myUserName, score: 2450, badge: "Pulse General" },
      { name: "지우", score: 2388, badge: "Outpost Hunter" },
      { name: "가온", score: 2320, badge: "Tactical Mind" },
    ],
    tetris: [
      { name: "윤호", score: 2310, badge: "Block Master" },
      { name: "민서", score: 2250, badge: "Stack Queen" },
      { name: "가온", score: 2188, badge: "Line Breaker" },
      { name: myUserName, score: 2112, badge: "Drop Expert" },
      { name: "서연", score: 2085, badge: "Tower Mind" },
    ],
  };
}
