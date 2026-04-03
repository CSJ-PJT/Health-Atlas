import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";
import type { FeedComment, FeedPost } from "@/services/feedStore";

const POSTS_KEY = "social_feed_posts_v5";
const COMMENTS_KEY = "social_feed_comments_v3";

export function getStoredFeedPosts() {
  return readScopedJson<FeedPost[]>(POSTS_KEY, []);
}

export function saveStoredFeedPosts(posts: FeedPost[]) {
  writeScopedJson(POSTS_KEY, posts);
  void saveServerSnapshot("feed_posts", posts);
}

export function getStoredFeedComments() {
  return readScopedJson<FeedComment[]>(COMMENTS_KEY, []);
}

export function saveStoredFeedComments(comments: FeedComment[]) {
  writeScopedJson(COMMENTS_KEY, comments);
  void saveServerSnapshot("feed_comments", comments);
}

export async function hydrateFeedRepositoryFromServer() {
  const [posts, comments] = await Promise.all([
    loadServerSnapshot<FeedPost[]>("feed_posts"),
    loadServerSnapshot<FeedComment[]>("feed_comments"),
  ]);

  let changed = false;

  if (Array.isArray(posts) && posts.length > 0) {
    writeScopedJson(POSTS_KEY, posts);
    changed = true;
  }

  if (Array.isArray(comments)) {
    writeScopedJson(COMMENTS_KEY, comments);
    changed = true;
  }

  return changed;
}
