import { useEffect, useMemo, useRef, useState } from "react";
import { Film, ImagePlus, MessageCircle, Pencil, Plus, Search, SendHorizonal, Trash2, Upload } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  addFeedComment,
  createFeedPost,
  deleteFeedPost,
  ensureFeedSeed,
  getFeedComments,
  getFeedPosts,
  updateFeedPost,
  type FeedComment,
  type FeedMedia,
  type FeedPost,
} from "@/services/feedStore";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "나";

const Feed = () => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);
  const [caption, setCaption] = useState("");
  const [search, setSearch] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<FeedComment | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [media, setMedia] = useState<FeedMedia[]>([]);
  const [tick, setTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ensureFeedSeed();
    setTick((value) => value + 1);
  }, []);

  const posts = useMemo(() => getFeedPosts(), [tick]);
  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return posts;
    }
    return posts.filter(
      (post) =>
        post.authorName.toLowerCase().includes(keyword) ||
        post.content.toLowerCase().includes(keyword),
    );
  }, [posts, search]);

  const comments = useMemo(() => (detailPost ? getFeedComments(detailPost.id) : []), [detailPost, tick]);
  const rootComments = comments.filter((comment) => comment.parentId === null);

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
    if (!files) {
      return;
    }

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
  };

  const handleSave = () => {
    if (!caption.trim() && media.length === 0) {
      return;
    }

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
    if (!post) {
      return;
    }

    setCaption(post.content);
    setMedia(post.media || []);
    setEditingPostId(post.id);
    setComposerOpen(true);
  };

  const handleAddComment = () => {
    if (!detailPost || !commentDraft.trim()) {
      return;
    }

    addFeedComment(detailPost.id, MY_USER_ID, MY_USER_NAME, commentDraft.trim(), replyTarget?.id || null);
    setCommentDraft("");
    setReplyTarget(null);
    setTick((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">피드</h1>
            <p className="text-sm text-muted-foreground">사진과 동영상을 올리고, 검색과 댓글로 커뮤니티 흐름을 이어갑니다.</p>
          </div>

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
                  <DialogTitle>{editingPostId ? "게시물 수정" : "새 게시물"}</DialogTitle>
                  <DialogDescription>사진과 동영상을 함께 올릴 수 있습니다.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="오늘의 운동이나 건강 상태를 공유해 보세요." className="min-h-32" />
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
                  <Button onClick={handleSave}>{editingPostId ? "수정 저장" : "업로드"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>미디어 그리드</CardTitle>
            <CardDescription>게시물은 최신순으로 정렬되며, 탭하면 상세와 댓글을 확인할 수 있습니다.</CardDescription>
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
                    onClick={() => setDetailPost(post)}
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

        <Dialog open={!!detailPost} onOpenChange={(open) => !open && setDetailPost(null)}>
          <DialogContent className="max-w-4xl">
            {detailPost ? (
              <>
                <DialogHeader>
                  <DialogTitle>{detailPost.authorName}</DialogTitle>
                  <DialogDescription>{new Date(detailPost.createdAt).toLocaleString("ko-KR")}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border bg-muted/30">
                      {detailPost.media[0]?.type === "video" ? (
                        <video controls poster={detailPost.media[0]?.thumbnailUrl} src={detailPost.media[0]?.url} className="max-h-[520px] w-full object-contain" />
                      ) : detailPost.media[0]?.url ? (
                        <img src={detailPost.media[0].url} alt={detailPost.content || "피드"} className="max-h-[520px] w-full object-contain" />
                      ) : null}
                    </div>
                    <div className="rounded-xl border p-4 text-sm">{detailPost.content}</div>
                  </div>

                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">댓글</CardTitle>
                        <CardDescription>대댓글까지 이어서 달 수 있습니다.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ScrollArea className="h-[360px] rounded-xl border p-3">
                          <div className="space-y-4">
                            {rootComments.map((comment) => {
                              const replies = comments.filter((item) => item.parentId === comment.id);
                              return (
                                <div key={comment.id} className="space-y-3">
                                  <div className="rounded-xl border p-3">
                                    <div className="text-sm font-semibold">{comment.authorName}</div>
                                    <div className="mt-1 text-sm">{comment.content}</div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                      <span>{new Date(comment.createdAt).toLocaleString("ko-KR")}</span>
                                      <button type="button" onClick={() => setReplyTarget(comment)} className="text-primary">
                                        답글
                                      </button>
                                    </div>
                                  </div>
                                  {replies.map((reply) => (
                                    <div key={reply.id} className="ml-5 rounded-xl border bg-muted/30 p-3">
                                      <div className="text-sm font-semibold">{reply.authorName}</div>
                                      <div className="mt-1 text-sm">{reply.content}</div>
                                      <div className="mt-2 text-xs text-muted-foreground">{new Date(reply.createdAt).toLocaleString("ko-KR")}</div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>

                        {replyTarget ? (
                          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
                            @{replyTarget.authorName}님에게 답글 작성 중
                            <button type="button" className="ml-2 text-primary" onClick={() => setReplyTarget(null)}>
                              취소
                            </button>
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          <Input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="댓글을 입력하세요" />
                          <Button onClick={handleAddComment} size="icon">
                            <SendHorizonal className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Feed;
