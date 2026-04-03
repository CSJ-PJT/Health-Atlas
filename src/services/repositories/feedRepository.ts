import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import type { FeedComment, FeedPost } from "@/services/feedStore";

const POSTS_KEY = "social_feed_posts_v5";
const COMMENTS_KEY = "social_feed_comments_v3";

export function getStoredFeedPosts() {
  return readScopedJson<FeedPost[]>(POSTS_KEY, []);
}

export function saveStoredFeedPosts(posts: FeedPost[]) {
  writeScopedJson(POSTS_KEY, posts);
}

export function getStoredFeedComments() {
  return readScopedJson<FeedComment[]>(COMMENTS_KEY, []);
}

export function saveStoredFeedComments(comments: FeedComment[]) {
  writeScopedJson(COMMENTS_KEY, comments);
}
