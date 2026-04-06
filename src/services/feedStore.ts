import {
  deleteStoredFeedComment,
  deleteStoredFeedPost,
  getStoredFeedComments,
  getStoredFeedPosts,
  hydrateFeedRepositoryFromServer,
  saveStoredFeedComments,
  saveStoredFeedPosts,
  subscribeFeedRepositoryChanges,
  upsertStoredFeedComment,
  upsertStoredFeedPost,
} from "@/services/repositories/feedRepository";

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
  likedUserIds: string[];
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  media: FeedMedia[];
  tags?: string[];
  visibility?: "public" | "profile";
}

const SAMPLE_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function savePosts(posts: FeedPost[]) {
  try {
    saveStoredFeedPosts(posts);
    return true;
  } catch {
    return false;
  }
}

function saveComments(comments: FeedComment[]) {
  try {
    saveStoredFeedComments(comments);
    return true;
  } catch {
    return false;
  }
}

function sanitizeMediaForStorage(media: FeedMedia[]) {
  return media.map((item) =>
    item.type === "video"
      ? {
          ...item,
          url: SAMPLE_VIDEO_URL,
          thumbnailUrl: item.thumbnailUrl,
        }
      : {
          ...item,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl || item.url,
        },
  );
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

  if (index % 4 === 0) {
    return [
      {
        id: `media-video-${index}`,
        type: "video",
        url: SAMPLE_VIDEO_URL,
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

function normalizeComment(comment: Omit<FeedComment, "likedUserIds"> & { likedUserIds?: string[] }): FeedComment {
  return {
    ...comment,
    likedUserIds: Array.isArray(comment.likedUserIds) ? comment.likedUserIds : [],
  };
}

export function getFeedPosts() {
  return getStoredFeedPosts().sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function getFeedComments(postId?: string) {
  const comments = getStoredFeedComments()
    .map(normalizeComment)
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
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

  const authorNames = ["민서", "서연", "지우", "하나", "시온"];
  const captions = [
    "오늘 러닝 후 회복 스트레칭까지 마무리했습니다.",
    "인터벌 훈련 덕분에 페이스가 안정적이었어요.",
    "주말 장거리 러닝을 앞두고 수면과 수분을 먼저 챙겼습니다.",
    "비 오는 날이라 실내 러닝으로 루틴을 유지했어요.",
    "회복 주간이라 강도보다 자세를 더 신경 썼습니다.",
    "아침 러닝 때 체감 회복이 꽤 만족스러웠습니다.",
    "HRV 흐름이 좋아서 오늘은 페이스를 조금 올렸어요.",
    "실내 운동으로 대체했지만 루틴은 그대로 가져갑니다.",
    "조깅 전에 15분 종아리 컨디셔닝도 챙겼습니다.",
    "장거리 전 다음 주를 위해 가볍게 정리했습니다.",
  ];

  const seeded: FeedPost[] = captions.map((content, index) => ({
    id: `feed-seed-${index + 1}`,
    authorId: `seed-${(index % authorNames.length) + 1}`,
    authorName: authorNames[index % authorNames.length],
    content,
    createdAt: new Date(Date.now() - index * 1000 * 60 * 43).toISOString(),
    media: buildSeedMedia(index + 1),
    tags: ["러닝", "회복", "기록"].slice(0, (index % 3) + 1),
  }));

  savePosts(seeded);
  seedComments(seeded);
}

function seedComments(posts: FeedPost[]) {
  const seededComments: FeedComment[] = posts.slice(0, 4).flatMap((post, index) => {
    const parentId = `comment-seed-${index + 1}`;
    return [
      {
        id: parentId,
        postId: post.id,
        authorId: "seed-coach",
        authorName: "코치봇",
        parentId: null,
        content: "오늘 흐름이 안정적입니다. 회복 상태를 계속 기록해 보세요.",
        likedUserIds: [],
        createdAt: new Date(Date.now() - index * 1000 * 60 * 19).toISOString(),
      },
      {
        id: `reply-seed-${index + 1}`,
        postId: post.id,
        authorId: post.authorId,
        authorName: post.authorName,
        parentId,
        content: "@seed-coach 감사합니다. 내일도 기록 이어갈게요.",
        likedUserIds: [],
        createdAt: new Date(Date.now() - index * 1000 * 60 * 11).toISOString(),
      },
    ];
  });

  saveComments(seededComments);
}

export function createFeedPost(authorId: string, authorName: string, content: string, media: FeedMedia[], tags: string[] = []) {
  const post: FeedPost = {
    id: `feed-${Date.now()}`,
    authorId,
    authorName,
    content,
    createdAt: new Date().toISOString(),
    media: sanitizeMediaForStorage(media),
    tags,
    visibility: "public",
  };

  if (upsertStoredFeedPost(post)) {
    return true;
  }

  const fallback = { ...post, media: post.media.slice(0, 1).map((item) => ({ ...item, url: item.thumbnailUrl || item.url })) };
  return Boolean(upsertStoredFeedPost(fallback));
}

export function createScopedFeedPost(
  authorId: string,
  authorName: string,
  content: string,
  media: FeedMedia[],
  visibility: "public" | "profile",
  tags: string[] = [],
) {
  const post: FeedPost = {
    id: `feed-${Date.now()}`,
    authorId,
    authorName,
    content,
    createdAt: new Date().toISOString(),
    media: sanitizeMediaForStorage(media),
    tags,
    visibility,
  };

  return Boolean(upsertStoredFeedPost(post));
}

export function updateFeedPost(id: string, content: string, media?: FeedMedia[], tags?: string[]) {
  const target = getFeedPosts().find((post) => post.id === id);
  if (!target) {
    return false;
  }

  const nextPost: FeedPost = {
    ...target,
    content,
    media: sanitizeMediaForStorage(media ?? target.media),
    tags: tags ?? target.tags ?? [],
  };

  if (upsertStoredFeedPost(nextPost)) {
    return true;
  }

  const fallback = {
    ...nextPost,
    media: nextPost.media.slice(0, 1).map((item) => ({
      ...item,
      url: item.thumbnailUrl || item.url,
    })),
  };

  return Boolean(upsertStoredFeedPost(fallback));
}

export function deleteFeedPost(id: string) {
  const result = deleteStoredFeedPost(id);
  return result.posts.length >= 0 && result.comments.length >= 0;
}

export function addFeedComment(
  postId: string,
  authorId: string,
  authorName: string,
  content: string,
  parentId: string | null = null,
) {
  const comment: FeedComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postId,
    authorId,
    authorName,
    parentId,
    content,
    likedUserIds: [],
    createdAt: new Date().toISOString(),
  };
  return Boolean(upsertStoredFeedComment(comment));
}

export function toggleFeedCommentLike(commentId: string, userId: string) {
  const target = getFeedComments().find((comment) => comment.id === commentId);
  if (!target) {
    return false;
  }
  const likedUserIds = target.likedUserIds.includes(userId)
    ? target.likedUserIds.filter((item) => item !== userId)
    : [...target.likedUserIds, userId];

  return Boolean(
    upsertStoredFeedComment({
      ...target,
      likedUserIds,
    }),
  );
}

export function deleteFeedComment(commentId: string) {
  return deleteStoredFeedComment(commentId).length >= 0;
}

export async function hydrateFeedStoreFromServer() {
  return hydrateFeedRepositoryFromServer();
}

export function subscribeFeedStoreChanges(onChange: () => void) {
  return subscribeFeedRepositoryChanges(onChange);
}
