import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Heart,
  ImagePlus,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDeviceBackNavigation } from "@/hooks/useDeviceBackNavigation";
import { useToast } from "@/hooks/use-toast";
import {
  addFeedComment,
  createScopedFeedPost,
  deleteFeedPost,
  ensureFeedSeed,
  getFeedComments,
  getFeedPosts,
  hydrateFeedStoreFromServer,
  subscribeFeedStoreChanges,
  toggleFeedCommentLike,
  updateFeedPost,
  type FeedComment,
  type FeedMedia,
  type FeedPost,
} from "@/services/feedStore";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "사용자";
const SAMPLE_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const PAGE_SIZE = 8;

function buildVideoThumb(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#b69cff" offset="0%"/>
          <stop stop-color="#efe6ff" offset="100%"/>
        </linearGradient>
      </defs>
      <rect width="900" height="900" rx="48" fill="url(#g)"/>
      <circle cx="450" cy="450" r="160" fill="rgba(255,255,255,0.82)"/>
      <polygon points="410,360 560,450 410,540" fill="#6f48c9"/>
      <text x="70" y="130" fill="#432770" font-family="Arial" font-size="40" font-weight="700">RH Healthcare Video</text>
      <text x="70" y="760" fill="#4d2f80" font-family="Arial" font-size="34">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resizeImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1400;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("이미지를 처리할 수 없습니다."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

function renderTaggedContent(content: string) {
  return content.split(/(@[A-Za-z0-9_-]+|#[^\s#]+)/g).map((part, index) => {
    if (part.startsWith("@") || part.startsWith("#")) {
      return (
        <span key={`${part}-${index}`} className="font-medium text-primary">
          {part}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function Feed() {
  const location = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [detailMediaIndex, setDetailMediaIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [media, setMedia] = useState<FeedMedia[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<FeedComment | null>(null);
  const [showCommentComposer, setShowCommentComposer] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

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
        setShowCommentComposer(false);
        return true;
      }
      return false;
    },
  });

  useEffect(() => {
    ensureFeedSeed();
    void (async () => {
      const changed = await hydrateFeedStoreFromServer();
      if (changed) {
        setTick((value) => value + 1);
      }
    })();

    const unsubscribe = subscribeFeedStoreChanges(() => {
      setTick((value) => value + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setComposerOpen(false);
    setDetailPostId(null);
    setReplyTarget(null);
    setShowCommentComposer(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isBusy) {
      setShowSpinner(false);
      return;
    }
    const timer = window.setTimeout(() => setShowSpinner(true), 1500);
    return () => window.clearTimeout(timer);
  }, [isBusy]);

  const publicPosts = useMemo(
    () => getFeedPosts().filter((post) => (post.visibility || "public") === "public"),
    [tick],
  );

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return publicPosts;
    return publicPosts.filter((post) => {
      const tagsText = Array.isArray(post.tags) ? post.tags.join(" ") : "";
      return [post.authorName, post.authorId, post.content, tagsText].some((value) =>
        value.toLowerCase().includes(keyword),
      );
    });
  }, [publicPosts, search]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const detailPost = useMemo(
    () => visiblePosts.concat(filteredPosts).find((post) => post.id === detailPostId) || null,
    [detailPostId, filteredPosts, visiblePosts],
  );
  const comments = useMemo(() => (detailPost ? getFeedComments(detailPost.id) : []), [detailPost, tick]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, tick]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + PAGE_SIZE, filteredPosts.length));
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filteredPosts.length]);

  const resetComposer = () => {
    setCaption("");
    setTags("");
    setMedia([]);
    setEditingPostId(null);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setIsBusy(true);
    try {
      const nextMedia = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.type.startsWith("video/")) {
            return {
              id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              type: "video" as const,
              url: SAMPLE_VIDEO_URL,
              thumbnailUrl: buildVideoThumb(file.name),
            };
          }

          const resized = await resizeImageFile(file);
          return {
            id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: "image" as const,
            url: resized,
            thumbnailUrl: resized,
          };
        }),
      );

      setMedia((previous) => [...previous, ...nextMedia]);
    } catch (error) {
      toast({
        title: "미디어 추가에 실패했습니다.",
        description: error instanceof Error ? error.message : "파일을 처리하지 못했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = () => {
    if (!caption.trim() && media.length === 0) {
      toast({ title: "내용이나 미디어를 추가해 주세요.", variant: "destructive" });
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((item) => item.trim().replace(/^#/, ""))
      .filter(Boolean);

    const success = editingPostId
      ? updateFeedPost(editingPostId, caption.trim(), media, parsedTags)
      : createScopedFeedPost(MY_USER_ID, MY_USER_NAME, caption.trim(), media, "public", parsedTags);

    if (!success) {
      toast({ title: "피드 업로드에 실패했습니다.", variant: "destructive" });
      return;
    }

    setTick((value) => value + 1);
    setComposerOpen(false);
    resetComposer();
    toast({ title: editingPostId ? "게시글을 수정했습니다." : "게시글을 올렸습니다." });
  };

  const handleEdit = (post: FeedPost) => {
    setCaption(post.content);
    setTags(Array.isArray(post.tags) ? post.tags.join(", ") : "");
    setMedia(post.media || []);
    setEditingPostId(post.id);
    setComposerOpen(true);
  };

  const handleDelete = (postId: string) => {
    const success = deleteFeedPost(postId);
    if (!success) {
      toast({ title: "게시글 삭제에 실패했습니다.", variant: "destructive" });
      return;
    }
    setTick((value) => value + 1);
    if (detailPostId === postId) {
      setDetailPostId(null);
    }
  };

  const handleAddComment = () => {
    if (!detailPost || !commentDraft.trim()) {
      toast({ title: "댓글 내용을 입력해 주세요.", variant: "destructive" });
      return;
    }

    const success = addFeedComment(
      detailPost.id,
      MY_USER_ID,
      MY_USER_NAME,
      commentDraft.trim(),
      replyTarget?.id || null,
    );
    if (!success) {
      toast({ title: "댓글 등록에 실패했습니다.", variant: "destructive" });
      return;
    }

    setCommentDraft("");
    setReplyTarget(null);
    setShowCommentComposer(false);
    setTick((value) => value + 1);
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    setMedia((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeMedia = (id: string) => {
    setMedia((current) => current.filter((item) => item.id !== id));
  };

  const renderCommentTree = (parentId: string | null, depth = 0): React.ReactNode =>
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
              <div className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleString("ko-KR")}
              </div>
            </div>
            <div className="mt-2 text-sm leading-6">{renderTaggedContent(comment.content)}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                className="flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => {
                  const success = toggleFeedCommentLike(comment.id, MY_USER_ID);
                  if (success) {
                    setTick((value) => value + 1);
                  }
                }}
              >
                <Heart
                  className={`h-3.5 w-3.5 ${comment.likedUserIds.includes(MY_USER_ID) ? "fill-current text-primary" : ""}`}
                />
                좋아요 {comment.likedUserIds.length}
              </button>
              <button
                type="button"
                className="flex items-center gap-1 font-medium text-primary"
                onClick={() => {
                  setReplyTarget(comment);
                  setCommentDraft(`@${comment.authorId} `);
                  setShowCommentComposer(true);
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                답글
              </button>
            </div>
          </div>
          {renderCommentTree(comment.id, depth + 1)}
        </div>
      ));

  return (
    <div className="min-h-screen bg-background">
      <Header showNav />
      <div className="mx-auto max-w-6xl space-y-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-3xl font-bold">피드</h1>

          <div className="flex w-full gap-2 lg:w-auto">
            <div className="relative flex-1 lg:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="작성자, 내용, 태그로 피드를 검색해 보세요."
                className="pl-9"
              />
            </div>

            <Dialog
              open={composerOpen}
              onOpenChange={(open) => {
                setComposerOpen(open);
                if (!open) resetComposer();
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={() => setComposerOpen(true)} size="icon" className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPostId ? "게시글 수정" : "새 게시글"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    placeholder="오늘의 기록, 사진 이야기, 태그할 친구를 자유롭게 적어 주세요."
                    className="min-h-32"
                  />
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={tags}
                      onChange={(event) => setTags(event.target.value)}
                      placeholder="태그를 쉼표로 입력해 주세요. 예: 러닝, 회복, 주말훈련"
                      className="pl-9"
                    />
                  </div>
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
                      사진 또는 동영상 추가
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      여러 장을 올릴 수 있고, 아래 화살표로 순서를 바꿀 수 있습니다.
                    </p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {media.map((item, index) => (
                        <div key={item.id} className="space-y-2 rounded-xl border bg-muted/20 p-2">
                          <div className="overflow-hidden rounded-lg">
                            {item.type === "video" ? (
                              <div className="relative aspect-square">
                                <img src={item.thumbnailUrl} alt="동영상 미리보기" className="h-full w-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                                  <Film className="h-5 w-5" />
                                </div>
                              </div>
                            ) : (
                              <img src={item.url} alt="이미지 미리보기" className="aspect-square w-full object-cover" />
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <Button size="icon" variant="outline" onClick={() => moveMedia(index, -1)} disabled={index === 0}>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => removeMedia(item.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => moveMedia(index, 1)}
                              disabled={index === media.length - 1}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setComposerOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSave}>{editingPostId ? "수정 완료" : "게시글 올리기"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {visiblePosts.map((post) => {
                const cover = post.media?.[0];
                const commentCount = getFeedComments(post.id).length;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      setDetailPostId(post.id);
                      setDetailMediaIndex(0);
                    }}
                    className="group overflow-hidden rounded-2xl border bg-card text-left"
                  >
                    <div className="relative aspect-square bg-muted/40">
                      {cover?.type === "video" ? (
                        <>
                          <img src={cover.thumbnailUrl} alt={post.content || "피드 동영상"} className="h-full w-full object-cover" />
                          <div className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">
                            VIDEO
                          </div>
                        </>
                      ) : cover?.url ? (
                        <img
                          src={cover.url}
                          alt={post.content || "피드 이미지"}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
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
                        <div className="truncate text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString("ko-KR")}
                        </div>
                        <div className="text-xs text-muted-foreground">{post.media.length}개 미디어</div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {commentCount}
                        </span>
                        {post.authorId === MY_USER_ID ? (
                          <span className="flex gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEdit(post);
                              }}
                              className="rounded p-1 hover:bg-muted"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(post.id);
                              }}
                              className="rounded p-1 hover:bg-muted"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredPosts.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                조건에 맞는 피드가 없습니다.
              </div>
            ) : null}
            <div ref={loadMoreRef} className="h-6" />
          </CardContent>
        </Card>

        <Dialog open={!!detailPost} onOpenChange={(open) => !open && setDetailPostId(null)}>
          <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden">
            {detailPost ? (
              <div className="grid h-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="min-h-0 space-y-4">
                  <DialogHeader>
                    <DialogTitle>{detailPost.authorName}님의 피드</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {detailPost.content ? (
                      <div className="rounded-xl border p-4 text-sm leading-6">{renderTaggedContent(detailPost.content)}</div>
                    ) : null}
                    {Array.isArray(detailPost.tags) && detailPost.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {detailPost.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="overflow-x-auto">
                      <div className="flex snap-x snap-mandatory gap-3">
                        {detailPost.media.map((item) => (
                          <div key={item.id} className="min-w-full snap-center overflow-hidden rounded-2xl border">
                            {item.type === "video" ? (
                              <video controls playsInline src={item.url} poster={item.thumbnailUrl} className="aspect-square w-full object-cover" />
                            ) : (
                              <img src={item.url} alt="피드 상세 이미지" className="aspect-square w-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {detailPost.media.length > 1 ? (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDetailMediaIndex((value) => Math.max(0, value - 1))}
                          disabled={detailMediaIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          {detailMediaIndex + 1} / {detailPost.media.length}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDetailMediaIndex((value) => Math.min(detailPost.media.length - 1, value + 1))}
                          disabled={detailMediaIndex === detailPost.media.length - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0">
                  <Card className="flex h-full flex-col">
                    <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-6">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold">댓글</div>
                        <Button
                          variant={showCommentComposer ? "default" : "outline"}
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setShowCommentComposer((current) => !current);
                            if (showCommentComposer) {
                              setReplyTarget(null);
                              setCommentDraft("");
                            }
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          댓글 작성
                        </Button>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                        <div className="space-y-3">
                          {comments.length > 0 ? (
                            renderCommentTree(null)
                          ) : (
                            <div className="text-sm text-muted-foreground">첫 댓글을 남겨 보세요.</div>
                          )}
                        </div>
                      </div>

                      {showCommentComposer ? (
                        <div className="space-y-3 border-t pt-3">
                          {replyTarget ? (
                            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                              <div className="font-medium">{replyTarget.authorName}님에게 답글을 작성하는 중입니다.</div>
                              <button
                                type="button"
                                className="mt-1 text-primary"
                                onClick={() => {
                                  setReplyTarget(null);
                                  setCommentDraft("");
                                }}
                              >
                                답글 취소
                              </button>
                            </div>
                          ) : null}
                          <Textarea
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            placeholder="댓글이나 @id 태그를 입력해 주세요."
                            className="min-h-24"
                          />
                          <Button onClick={handleAddComment} className="w-full">
                            댓글 등록
                          </Button>
                        </div>
                      ) : null}
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
}
