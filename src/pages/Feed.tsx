import { useEffect, useMemo, useRef, useState } from "react";
import { Film, ImagePlus, Pencil, Plus, Trash2, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createFeedPost,
  deleteFeedPost,
  ensureFeedSeed,
  getFeedPosts,
  updateFeedPost,
  type FeedMedia,
} from "@/services/feedStore";

const MY_USER_ID = localStorage.getItem("user_id") || "me";
const MY_USER_NAME = localStorage.getItem("user_nickname") || "나";

const Feed = () => {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [media, setMedia] = useState<FeedMedia[]>([]);
  const [tick, setTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ensureFeedSeed();
    setTick((value) => value + 1);
  }, []);

  const posts = useMemo(() => getFeedPosts(), [tick]);

  const resetComposer = () => {
    setCaption("");
    setMedia([]);
    setEditingPostId(null);
  };

  const handleOpenCreate = () => {
    resetComposer();
    setOpen(true);
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
              resolve({
                id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: file.type.startsWith("video/") ? "video" : "image",
                url: String(reader.result || ""),
                thumbnailUrl: file.type.startsWith("video/") ? undefined : String(reader.result || ""),
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
    setOpen(false);
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
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showNav={true} />
      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">피드</h1>
            <p className="text-sm text-muted-foreground">사진과 동영상을 올리고, 인스타그램처럼 격자형으로 빠르게 둘러볼 수 있습니다.</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="gap-2 bg-cyan-500 hover:bg-cyan-600">
                <Plus className="h-4 w-4" />
                게시물 올리기
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
                <Button variant="outline" onClick={() => setOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSave}>{editingPostId ? "수정 저장" : "업로드"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>미디어 그리드</CardTitle>
            <CardDescription>게시물은 최신순으로 정렬되며, 사진과 동영상이 같은 방식으로 보입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {posts.map((post) => {
                const cover = post.media?.[0];
                return (
                  <div key={post.id} className="group overflow-hidden rounded-2xl border bg-card">
                    <div className="relative aspect-square bg-muted/40">
                      {cover?.type === "video" ? (
                        <>
                          <video src={cover.url} className="h-full w-full object-cover" />
                          <div className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">VIDEO</div>
                        </>
                      ) : cover?.url ? (
                        <img src={cover.url} alt={post.content} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
                      {post.authorId === MY_USER_ID ? (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(post.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              deleteFeedPost(post.id);
                              setTick((value) => value + 1);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feed;
