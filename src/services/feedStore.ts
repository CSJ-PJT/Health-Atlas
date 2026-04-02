export type FeedMediaType = "image" | "video";

export interface FeedMedia {
  id: string;
  type: FeedMediaType;
  url: string;
  thumbnailUrl?: string;
}

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  media: FeedMedia[];
}

const POSTS_KEY = "social_feed_posts_v3";
const COMMENTS_KEY = "social_feed_comments_v1";

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function buildSvgPlaceholder(title: string, accent: string, detail: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${accent}" offset="0%"/>
          <stop stop-color="#f4edff" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="900" height="900" rx="48" fill="url(#g)"/>
      <circle cx="710" cy="180" r="120" fill="rgba(255,255,255,0.55)"/>
      <circle cx="180" cy="760" r="150" fill="rgba(255,255,255,0.4)"/>
      <text x="70" y="130" fill="#37215a" font-family="Arial" font-size="40" font-weight="700">RH Healthcare Feed</text>
      <text x="70" y="420" fill="#2d1951" font-family="Arial" font-size="74" font-weight="700">${title}</text>
      <text x="70" y="500" fill="#4b2d7a" font-family="Arial" font-size="34">${detail}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildSeedMedia(index: number): FeedMedia[] {
  const colors = ["#e9d5ff", "#ddd6fe", "#f5d0fe", "#ede9fe", "#fae8ff"];
  const accent = colors[index % colors.length];
  const imageA = buildSvgPlaceholder(`Run #${index}`, accent, "Recovery / Tempo / Long run");
  const imageB = buildSvgPlaceholder(`Lift #${index}`, "#f3e8ff", "Strength / Mobility / Sleep");
  const videoThumb = buildSvgPlaceholder(`Video #${index}`, "#ede9fe", "Preview");
  const demoVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

  if (index % 4 === 0) {
    return [
      {
        id: `media-video-${index}`,
        type: "video",
        url: demoVideo,
        thumbnailUrl: videoThumb,
      },
    ];
  }

  if (index % 3 === 0) {
    return [
      { id: `media-image-a-${index}`, type: "image", url: imageA },
      { id: `media-image-b-${index}`, type: "image", url: imageB },
    ];
  }

  return [{ id: `media-image-${index}`, type: "image", url: imageA }];
}

export function getFeedPosts() {
  return readJson<FeedPost[]>(POSTS_KEY, []).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function getFeedComments(postId?: string) {
  const comments = readJson<FeedComment[]>(COMMENTS_KEY, []).sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  return postId ? comments.filter((comment) => comment.postId === postId) : comments;
}

export function ensureFeedSeed() {
  const currentPosts = getFeedPosts();
  const currentComments = getFeedComments();
  if (currentPosts.length > 0) {
    if (currentComments.length === 0) {
      seedComments(currentPosts);
    }
    return;
  }

  const authorNames = ["민지", "서연", "지훈", "유나", "태오"];
  const captions = [
    "아침 러닝 후 회복 스트레칭까지 마무리했습니다.",
    "오늘은 인터벌 대신 가볍게 템포런으로 조절했어요.",
    "주말 장거리 러닝 전에 수면과 수분을 먼저 챙겼습니다.",
    "오르막 구간이 많았지만 케이던스를 유지해봤습니다.",
    "회복 주간이라 심박을 낮게 유지하면서 달렸습니다.",
    "저녁 러닝 후 단백질과 필수 아미노산 보충 완료.",
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

  writeJson(POSTS_KEY, seeded);
  seedComments(seeded);
}

function seedComments(posts: FeedPost[]) {
  const seededComments: FeedComment[] = posts.slice(0, 4).flatMap((post, index) => {
    const parentId = `comment-seed-${index + 1}`;
    return [
      {
        id: parentId,
        postId: post.id,
        authorId: "seed-commenter",
        authorName: "코치봇",
        parentId: null,
        content: "회복 상태가 좋아 보여요. 다음 세션도 기대됩니다.",
        createdAt: new Date(Date.now() - index * 1000 * 60 * 19).toISOString(),
      },
      {
        id: `reply-seed-${index + 1}`,
        postId: post.id,
        authorId: post.authorId,
        authorName: post.authorName,
        parentId,
        content: "고마워요. 내일은 조금 더 가볍게 가보려고요.",
        createdAt: new Date(Date.now() - index * 1000 * 60 * 11).toISOString(),
      },
    ];
  });

  writeJson(COMMENTS_KEY, seededComments);
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
    ...getFeedPosts(),
  ];
  writeJson(POSTS_KEY, next);
}

export function updateFeedPost(id: string, content: string, media?: FeedMedia[]) {
  const next = getFeedPosts().map((post) =>
    post.id === id
      ? {
          ...post,
          content,
          media: media ?? post.media,
        }
      : post,
  );
  writeJson(POSTS_KEY, next);
}

export function deleteFeedPost(id: string) {
  writeJson(
    POSTS_KEY,
    getFeedPosts().filter((post) => post.id !== id),
  );
  writeJson(
    COMMENTS_KEY,
    getFeedComments().filter((comment) => comment.postId !== id),
  );
}

export function addFeedComment(
  postId: string,
  authorId: string,
  authorName: string,
  content: string,
  parentId: string | null = null,
) {
  const next = [
    ...getFeedComments(),
    {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      postId,
      authorId,
      authorName,
      parentId,
      content,
      createdAt: new Date().toISOString(),
    },
  ];
  writeJson(COMMENTS_KEY, next);
}
