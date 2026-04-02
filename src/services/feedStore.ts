export type FeedMediaType = "image" | "video";

export interface FeedMedia {
  id: string;
  type: FeedMediaType;
  url: string;
  thumbnailUrl?: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  media: FeedMedia[];
}

const KEY = "social_feed_posts_v2";

function readFeedPosts() {
  const stored = localStorage.getItem(KEY);
  if (!stored) {
    return [] as FeedPost[];
  }

  try {
    return JSON.parse(stored) as FeedPost[];
  } catch {
    return [];
  }
}

function writeFeedPosts(posts: FeedPost[]) {
  localStorage.setItem(KEY, JSON.stringify(posts));
}

export function getFeedPosts() {
  return readFeedPosts().sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function buildSeedMedia(index: number): FeedMedia[] {
  const imageBase = `https://images.unsplash.com/photo-15${54000000 + index * 7911}?auto=format&fit=crop&w=900&q=80`;
  const altImageBase = `https://images.unsplash.com/photo-15${54100000 + index * 6123}?auto=format&fit=crop&w=900&q=80`;
  const demoVideo =
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

  if (index % 4 === 0) {
    return [
      {
        id: `media-video-${index}`,
        type: "video",
        url: demoVideo,
        thumbnailUrl: imageBase,
      },
    ];
  }

  if (index % 3 === 0) {
    return [
      { id: `media-image-a-${index}`, type: "image", url: imageBase },
      { id: `media-image-b-${index}`, type: "image", url: altImageBase },
    ];
  }

  return [{ id: `media-image-${index}`, type: "image", url: imageBase }];
}

export function ensureFeedSeed() {
  const current = readFeedPosts();
  if (current.length > 0) {
    return;
  }

  const authorNames = ["민지", "서연", "지훈", "유나", "태오"];
  const captions = [
    "아침 러닝 후 회복 스트레칭까지 마무리했습니다.",
    "오늘은 인터벌 대신 가볍게 템포런으로 조절했어요.",
    "주말 장거리 러닝 전에 수면과 수분을 먼저 챙겼습니다.",
    "오르막 구간이 많았지만 케이던스를 유지해봤습니다.",
    "회복 주간이라 심박을 낮게 유지하면서 달렸습니다.",
    "저녁 러닝 후 단백질과 탄수화물 보충 완료.",
    "HRV 흐름이 좋아서 오늘은 페이스를 조금 끌어올렸어요.",
    "비 오는 날 러닝이라 실내 트레드밀로 대체했습니다.",
    "러닝 후 폼롤러 15분, 종아리 컨디션 괜찮습니다.",
    "장거리 이후 다음날이라 아주 가볍게 조깅만 했습니다.",
  ];

  const seeded: FeedPost[] = captions.map((content, index) => ({
    id: `feed-seed-${index + 1}`,
    authorId: `seed-${(index % authorNames.length) + 1}`,
    authorName: authorNames[index % authorNames.length],
    content,
    createdAt: new Date(Date.now() - index * 1000 * 60 * 43).toISOString(),
    media: buildSeedMedia(index + 1),
  }));

  writeFeedPosts(seeded);
}

export function createFeedPost(authorId: string, authorName: string, content: string, media: FeedMedia[]) {
  const next = [
    {
      id: `feed-${Date.now()}`,
      authorId,
      authorName,
      content,
      createdAt: new Date().toISOString(),
      media,
    },
    ...readFeedPosts(),
  ];
  writeFeedPosts(next);
}

export function updateFeedPost(id: string, content: string, media?: FeedMedia[]) {
  const next = readFeedPosts().map((post) =>
    post.id === id
      ? {
          ...post,
          content,
          media: media ?? post.media,
        }
      : post,
  );
  writeFeedPosts(next);
}

export function deleteFeedPost(id: string) {
  writeFeedPosts(readFeedPosts().filter((post) => post.id !== id));
}
