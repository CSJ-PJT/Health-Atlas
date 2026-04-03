import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Heart, ImagePlus, MessageCircle, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import {
  addFeedComment,
  createFeedPost,
  deleteFeedPost,
  ensureFeedSeed,
  getFeedComments,
  getFeedPosts,
  toggleFeedCommentLike,
  updateFeedPost,
  type FeedComment,
  type FeedMedia,
  type FeedPost,
} from "@/services/feedStore";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "사용자";

const Feed = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [search, setSearch] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<FeedComment | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [media, setMedia] = useState<FeedMedia[]>([]);
  const [tick, setTick] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useDeviceBackNavigation({
    fallback: "/",
    isRootPage: true,
    onBackWithinPage: () => {
      if (composerOpen) {
        setComposerOpen(false);
        return true;
      }
      if (detailPostId) {
        setDetailPostId(null);
        setReplyTarget(null);
        return true;
      }
      return false;
    },
  });

  useEffect(() => {
    ensureFeedSeed();
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!isBusy) {
      setShowSpinner(false);
      return;
    }
    const timer = window.setTimeout(() => setShowSpinner(true), 1500);
    return () => window.clearTimeout(timer);
  }, [isBusy]);

  const posts = useMemo(() => getFeedPosts(), [tick]);
  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter(
      (post) =>
        post.authorName.toLowerCase().includes(keyword) ||
        post.content.toLowerCase().includes(keyword) ||
        post.authorId.toLowerCase().includes(keyword),
    );
  }, [posts, search]);

  const detailPost = useMemo(
    () => posts.find((post) => post.id === detailPostId) ?? null,
    [detailPostId, posts],
  );
  const comments = useMemo(() => (detailPost ? getFeedComments(detailPost.id) : []), [detailPost, tick]);

  const resetComposer = () => {
    setCaption("");
    setMedia([]);
    setEditingPostId(null);
  };

  const handleOpenCreate = () => {
    resetComposer();
    setComposerOpen(true);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    setIsBusy(true);
    try {
      const nextMedia = await Promise.all(
        Array.from(files).map(
          (file) =>
            new Promise<FeedMedia>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = String(reader.result || "");
                resolve({
                  id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: file.type.startsWith("video/") ? "video" : "image",
                  url: result,
                  thumbnailUrl: file.type.startsWith("video/") ? undefined : result,
                });
              };
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            }),
        ),
      );

      setMedia((previous) => [...previous, ...nextMedia]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = () => {
    if (!caption.trim() && media.length === 0) return;

    if (editingPostId) {
      updateFeedPost(editingPostId, caption.trim(), media);
    } else {
      createFeedPost(MY_USER_ID, MY_USER_NAME, caption.trim(), media);
    }

    setTick((value) => value + 1);
    setComposerOpen(false);
    resetComposer();
  };

  const handleEdit = (postId: string) => {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    setCaption(post.content);
    setMedia(post.media || []);
    setEditingPostId(post.id);
    setComposerOpen(true);
  };

  const handleAddComment = () => {
    if (!detailPost || !commentDraft.trim()) return;
    addFeedComment(detailPost.id, MY_USER_ID, MY_USER_NAME, commentDraft.trim(), replyTarget?.id || null);
    setCommentDraft("");
    setReplyTarget(null);
    setTick((value) => value + 1);
  };

  const handleReply = (comment: FeedComment) => {
    setReplyTarget(comment);
    setCommentDraft((previous) => {
      const prefix = `@${comment.authorId} `;
      return previous.startsWith(prefix) ? previous : `${prefix}${previous}`.trim();
    });
  };

  const renderTaggedContent = (content: string) =>
    content.split(/(@[A-Za-z0-9_-]+)/g).map((part, index) =>
      part.startsWith("@") ? (
        <span key={`${part}-${index}`} className="font-medium text-primary">
          {part}
        </span>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      ),
    );

  const renderCommentTree = (parentId: string | null, depth = 0) =>
    comments
      .filter((comment) => comment.parentId === parentId)
      .map((comment) => (
        <div key={comment.id} className={`space-y-2 ${depth > 0 ? "ml-4 border-l pl-4" : ""}`}>
          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{comment.authorName}</div>
                <div className="text-xs text-muted-foreground">@{comment.authorId}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString("ko-KR")}</div>
            </div>
            <div className="mt-2 text-sm leading-6">{renderTaggedContent(comment.content)}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                className="flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => {
                  toggleFeedCommentLike(comment.id, MY_USER_ID);
                  setTick((value) => value + 1);
                }}
              >
                <Heart className={`h-3.5 w-3.5 ${comment.likedUserIds.includes(MY_USER_ID) ? "fill-current text-primary" : ""}`} />
                좋아요 {comment.likedUserIds.length}
              </button>
              <button
                type="button"
                className="font-medium text-primary"
                onClick={() => handleReply(comment)}
              >
                답글 달기
              </button>
            </div>
          </div>
          {renderCommentTree(comment.id, depth + 1)}
        </div>
      ));

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-3xl font-bold">피드</h1>

          <div className="flex w-full gap-2 lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="피드 검색" className="pl-9" />
            </div>

            <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate} size="icon" className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingPostId ? "게시글 수정" : "새 게시글"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="내용을 입력하세요" className="min-h-32" />
                  <div className="space-y-3 rounded-2xl border border-dashed p-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(event) => void handleFiles(event.target.files)}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                      <Upload className="h-4 w-4" />
                      사진 / 동영상 추가
                    </Button>
                    <div className="grid grid-cols-3 gap-3">
                      {media.map((item) => (
                        <div key={item.id} className="overflow-hidden rounded-xl border bg-muted/20">
                          {item.type === "video" ? (
                            <div className="relative aspect-square">
                              <video src={item.url} className="h-full w-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                <Film className="h-5 w-5" />
                              </div>
                            </div>
                          ) : (
                            <img src={item.url} alt="preview" className="aspect-square w-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setComposerOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSave}>{editingPostId ? "저장" : "업로드"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>미디어 그리드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filteredPosts.map((post) => {
                const cover = post.media?.[0];
                const commentCount = getFeedComments(post.id).length;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setDetailPostId(post.id)}
                    className="group overflow-hidden rounded-2xl border bg-card text-left"
                  >
                    <div className="relative aspect-square bg-muted/40">
                      {cover?.type === "video" ? (
                        <>
                          <video poster={cover.thumbnailUrl} src={cover.url} className="h-full w-full object-cover" />
                          <div className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">VIDEO</div>
                        </>
                      ) : cover?.url ? (
                        <img src={cover.url} alt={post.content || "피드 이미지"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImagePlus className="h-8 w-8" />
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                        <div className="truncate text-sm font-semibold">{post.authorName}</div>
                        <div className="line-clamp-2 text-xs text-white/80">{post.content || "미디어 게시물"}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleString("ko-KR")}</div>
                        <div className="text-xs text-muted-foreground">{post.media.length}개 미디어</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {commentCount}
                        </span>
                        {post.authorId === MY_USER_ID ? (
                          <span className="flex gap-1">
                            <span
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEdit(post.id);
                              }}
                              className="rounded p-1 hover:bg-muted"
                            >
                              <Pencil className="h-4 w-4" />
                            </span>
                            <span
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteFeedPost(post.id);
                                setTick((value) => value + 1);
                              }}
                              className="rounded p-1 hover:bg-muted"
                            >
                              <Trash2 className="h-4 w-4" />
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!detailPost} onOpenChange={(open) => !open && setDetailPostId(null)}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
            {detailPost ? (
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="min-h-0 space-y-4">
                  <DialogHeader>
                    <DialogTitle>{detailPost.authorName}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-3 pr-2">
                      <div className="rounded-xl border p-4 text-sm leading-6">{renderTaggedContent(detailPost.content)}</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {detailPost.media.map((item) => (
                          <div key={item.id} className="overflow-hidden rounded-2xl border bg-muted/20">
                            {item.type === "video" ? (
                              <video controls src={item.url} className="aspect-square w-full object-cover" />
                            ) : (
                              <img src={item.url} alt="detail" className="aspect-square w-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>댓글</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-[44vh] pr-3">
                        <div className="space-y-3">
                          {comments.length > 0 ? (
                            renderCommentTree(null)
                          ) : (
                            <div className="text-sm text-muted-foreground">첫 댓글을 남겨보세요.</div>
                          )}
                        </div>
                      </ScrollArea>

                      {replyTarget ? (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                          <div className="font-medium">{replyTarget.authorName}에게 답글 작성 중</div>
                          <button type="button" className="mt-1 text-primary" onClick={() => setReplyTarget(null)}>
                            답글 취소
                          </button>
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        <Textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="댓글이나 @id 태그를 입력하세요" className="min-h-24" />
                        <Button onClick={handleAddComment} className="w-full">
                          댓글 등록
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      {showSpinner ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="rounded-2xl border bg-background px-6 py-4 text-sm font-medium text-muted-foreground">
            불러오는 중...
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Feed;
