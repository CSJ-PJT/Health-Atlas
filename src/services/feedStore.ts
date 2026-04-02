export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

const KEY = "social_feed_posts";

export function getFeedPosts() {
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

export function ensureFeedSeed() {
  const current = getFeedPosts();
  if (current.length > 0) {
    return;
  }

  localStorage.setItem(
    KEY,
    JSON.stringify([
      {
        id: "feed-seed-1",
        authorId: "seed-1",
        authorName: "민준",
        content: "오늘 회복 러닝 5km 완료. 스트레칭까지 하고 마무리했습니다.",
        createdAt: new Date().toISOString(),
      },
    ]),
  );
}

export function createFeedPost(authorId: string, authorName: string, content: string) {
  const next = [
    {
      id: `feed-${Date.now()}`,
      authorId,
      authorName,
      content,
      createdAt: new Date().toISOString(),
    },
    ...getFeedPosts(),
  ];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function updateFeedPost(id: string, content: string) {
  const next = getFeedPosts().map((post) => (post.id === id ? { ...post, content } : post));
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteFeedPost(id: string) {
  const next = getFeedPosts().filter((post) => post.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}
