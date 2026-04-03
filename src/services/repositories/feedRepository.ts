import { supabase } from "@/integrations/supabase/client";
import { readScopedJson, writeScopedJson } from "@/services/persistence/scopedStorage";
import { loadServerSnapshot, saveServerSnapshot } from "@/services/repositories/serverSnapshotRepository";
import type { FeedComment, FeedPost } from "@/services/feedStore";

const POSTS_KEY = "social_feed_posts_v5";
const COMMENTS_KEY = "social_feed_comments_v3";

function getProfileId() {
  return localStorage.getItem("profile_id");
}

export function getStoredFeedPosts() {
  return readScopedJson<FeedPost[]>(POSTS_KEY, []);
}

export function saveStoredFeedPosts(posts: FeedPost[]) {
  writeScopedJson(POSTS_KEY, posts);
  void replaceServerFeedPosts(posts);
}

export function getStoredFeedComments() {
  return readScopedJson<FeedComment[]>(COMMENTS_KEY, []);
}

export function saveStoredFeedComments(comments: FeedComment[]) {
  writeScopedJson(COMMENTS_KEY, comments);
  void replaceServerFeedComments(comments);
}

export function upsertStoredFeedPost(post: FeedPost) {
  const current = getStoredFeedPosts();
  const next = [post, ...current.filter((item) => item.id !== post.id)].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  writeScopedJson(POSTS_KEY, next);
  void upsertServerFeedPost(post);
  return next;
}

export function deleteStoredFeedPost(postId: string) {
  const nextPosts = getStoredFeedPosts().filter((post) => post.id !== postId);
  const nextComments = getStoredFeedComments().filter((comment) => comment.postId !== postId);
  writeScopedJson(POSTS_KEY, nextPosts);
  writeScopedJson(COMMENTS_KEY, nextComments);
  void deleteServerFeedPost(postId);
  void deleteServerFeedCommentsByPost(postId);
  return { posts: nextPosts, comments: nextComments };
}

export function upsertStoredFeedComment(comment: FeedComment) {
  const current = getStoredFeedComments();
  const next = [...current.filter((item) => item.id !== comment.id), comment].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
  writeScopedJson(COMMENTS_KEY, next);
  void upsertServerFeedComment(comment);
  return next;
}

export function deleteStoredFeedComment(commentId: string) {
  const current = getStoredFeedComments();
  const allIds = new Set([commentId]);
  let changed = true;
  while (changed) {
    changed = false;
    current.forEach((comment) => {
      if (comment.parentId && allIds.has(comment.parentId) && !allIds.has(comment.id)) {
        allIds.add(comment.id);
        changed = true;
      }
    });
  }
  const next = current.filter((comment) => !allIds.has(comment.id));
  writeScopedJson(COMMENTS_KEY, next);
  void Promise.all(Array.from(allIds).map((id) => deleteServerFeedComment(id)));
  return next;
}

export async function hydrateFeedRepositoryFromServer() {
  const [posts, comments] = await Promise.all([loadServerFeedPosts(), loadServerFeedComments()]);

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

async function replaceServerFeedPosts(posts: FeedPost[]) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error: deleteError } = await supabase.from("social_feed_posts").delete().eq("profile_id", profileId);
  if (deleteError) {
    void saveServerSnapshot("feed_posts", posts);
    return false;
  }

  if (posts.length > 0) {
    const { error: insertError } = await supabase.from("social_feed_posts").insert(
      posts.map((post) => ({
        id: post.id,
        profile_id: profileId,
        author_id: post.authorId,
        author_name: post.authorName,
        content: post.content,
        media: post.media,
        tags: post.tags || [],
        visibility: post.visibility || "public",
        created_at: post.createdAt,
        updated_at: new Date().toISOString(),
      })),
    );

    if (insertError) {
      void saveServerSnapshot("feed_posts", posts);
      return false;
    }
  }

  return true;
}

async function upsertServerFeedPost(post: FeedPost) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error } = await supabase.from("social_feed_posts").upsert({
    id: post.id,
    profile_id: profileId,
    author_id: post.authorId,
    author_name: post.authorName,
    content: post.content,
    media: post.media,
    tags: post.tags || [],
    visibility: post.visibility || "public",
    created_at: post.createdAt,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

async function deleteServerFeedPost(postId: string) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_feed_posts").delete().eq("id", postId).eq("profile_id", profileId);
  return !error;
}

async function replaceServerFeedComments(comments: FeedComment[]) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error: deleteError } = await supabase.from("social_feed_comments").delete().eq("profile_id", profileId);
  if (deleteError) {
    void saveServerSnapshot("feed_comments", comments);
    return false;
  }

  if (comments.length > 0) {
    const { error: insertError } = await supabase.from("social_feed_comments").insert(
      comments.map((comment) => ({
        id: comment.id,
        profile_id: profileId,
        post_id: comment.postId,
        author_id: comment.authorId,
        author_name: comment.authorName,
        parent_id: comment.parentId,
        content: comment.content,
        liked_user_ids: comment.likedUserIds,
        created_at: comment.createdAt,
        updated_at: new Date().toISOString(),
      })),
    );

    if (insertError) {
      void saveServerSnapshot("feed_comments", comments);
      return false;
    }
  }

  return true;
}

async function upsertServerFeedComment(comment: FeedComment) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }

  const { error } = await supabase.from("social_feed_comments").upsert({
    id: comment.id,
    profile_id: profileId,
    post_id: comment.postId,
    author_id: comment.authorId,
    author_name: comment.authorName,
    parent_id: comment.parentId,
    content: comment.content,
    liked_user_ids: comment.likedUserIds,
    created_at: comment.createdAt,
    updated_at: new Date().toISOString(),
  });

  return !error;
}

async function deleteServerFeedComment(commentId: string) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_feed_comments").delete().eq("id", commentId).eq("profile_id", profileId);
  return !error;
}

async function deleteServerFeedCommentsByPost(postId: string) {
  const profileId = getProfileId();
  if (!profileId) {
    return false;
  }
  const { error } = await supabase.from("social_feed_comments").delete().eq("post_id", postId).eq("profile_id", profileId);
  return !error;
}

async function loadServerFeedPosts() {
  const { data, error } = await supabase
    .from("social_feed_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return loadServerSnapshot<FeedPost[]>("feed_posts");
  }

  return (data || []).map(
    (row): FeedPost => ({
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      content: row.content,
      createdAt: row.created_at,
      media: Array.isArray(row.media) ? (row.media as FeedPost["media"]) : [],
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      visibility: (row.visibility as "public" | "profile" | null) || "public",
    }),
  );
}

async function loadServerFeedComments() {
  const { data, error } = await supabase
    .from("social_feed_comments")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return loadServerSnapshot<FeedComment[]>("feed_comments");
  }

  return (data || []).map(
    (row): FeedComment => ({
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      authorName: row.author_name,
      parentId: row.parent_id,
      content: row.content,
      likedUserIds: Array.isArray(row.liked_user_ids) ? (row.liked_user_ids as string[]) : [],
      createdAt: row.created_at,
    }),
  );
}
