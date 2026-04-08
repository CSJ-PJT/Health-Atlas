import type { PlayableGameId } from "@/components/entertainment/GameArena";
import type { RankingRange, RankingRow } from "@/services/entertainmentTypes";

export const miniGames: Array<{ id: PlayableGameId; title: string; summary: string }> = [
  {
    id: "tap-sprint",
    title: "탭 스프린트",
    summary: "제한 시간 동안 최대한 많이 탭해서 반응 속도를 겨루는 게임입니다.",
  },
  {
    id: "reaction-grid",
    title: "리액션 그리드",
    summary: "빛나는 칸을 빠르게 눌러 반응 정확도와 속도를 겨룹니다.",
  },
  {
    id: "pace-memory",
    title: "페이스 메모리",
    summary: "순서를 기억하고 재현하면서 집중력과 기억력을 겨루는 게임입니다.",
  },
  {
    id: "tetris",
    title: "테트리스",
    summary: "시간이 지날수록 빨라지는 블록 게임입니다.",
  },
];

export const featuredBadges = [
  {
    id: "lavender",
    icon: "🪻",
    name: "라벤더 러너",
    detail: "균형 잡힌 회복 루틴과 꾸준한 러닝 흐름을 유지한 러너에게 주어지는 대표 배지입니다.",
  },
  {
    id: "sub4",
    icon: "🏃",
    name: "Sub4 체이서",
    detail: "공인 풀코스 기록 목표를 향해 안정적으로 전진하는 러너를 위한 배지입니다.",
  },
  {
    id: "mountain",
    icon: "⛰️",
    name: "마운틴 헌터",
    detail: "누적 상승 고도를 꾸준히 채우며 강한 하체 지구력을 만든 러너에게 주어집니다.",
  },
  {
    id: "ultra",
    icon: "🔥",
    name: "울트라 스피릿",
    detail: "장거리 훈련과 회복 루틴을 오래 이어 간 러너에게 주어지는 배지입니다.",
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
    tetris: [
      { name: "윤호", score: 2310, badge: "Block Master" },
      { name: "민서", score: 2250, badge: "Stack Queen" },
      { name: "가온", score: 2188, badge: "Line Breaker" },
      { name: myUserName, score: 2112, badge: "Drop Expert" },
      { name: "서연", score: 2085, badge: "Tower Mind" },
    ],
  };
}
