import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type PlayableGameId = "tap-sprint" | "reaction-grid" | "pace-memory" | "tetris";

type Props = {
  gameId: PlayableGameId;
  bestScore: number;
  onClose: () => void;
  onScore: (score: number) => void;
  durationSeconds?: number;
};

type TetrisCell = string | null;
type Piece = {
  shape: number[][];
  color: string;
  x: number;
  y: number;
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 16;

const PIECES = [
  { color: "#8b5cf6", shape: [[1, 1, 1], [0, 1, 0]] },
  { color: "#06b6d4", shape: [[1, 1], [1, 1]] },
  { color: "#f97316", shape: [[1, 1, 1, 1]] },
  { color: "#22c55e", shape: [[0, 1, 1], [1, 1, 0]] },
];

function createBoard() {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<TetrisCell>(BOARD_WIDTH).fill(null));
}

function randomPiece(): Piece {
  const source = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    color: source.color,
    shape: source.shape.map((row) => [...row]),
    x: Math.floor(BOARD_WIDTH / 2) - 1,
    y: 0,
  };
}

function rotateShape(shape: number[][]) {
  return shape[0].map((_, index) => shape.map((row) => row[index]).reverse());
}

function collides(board: TetrisCell[][], piece: Piece) {
  return piece.shape.some((row, dy) =>
    row.some((value, dx) => {
      if (!value) return false;
      const x = piece.x + dx;
      const y = piece.y + dy;
      return x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT || (y >= 0 && board[y][x]);
    }),
  );
}

function merge(board: TetrisCell[][], piece: Piece) {
  const next = board.map((row) => [...row]);
  piece.shape.forEach((row, dy) => {
    row.forEach((value, dx) => {
      if (!value) return;
      const x = piece.x + dx;
      const y = piece.y + dy;
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        next[y][x] = piece.color;
      }
    });
  });
  return next;
}

function clearLines(board: TetrisCell[][]) {
  const kept = board.filter((row) => row.some((cell) => !cell));
  const cleared = BOARD_HEIGHT - kept.length;
  const padding = Array.from({ length: cleared }, () => Array<TetrisCell>(BOARD_WIDTH).fill(null));
  return { board: [...padding, ...kept], cleared };
}

function getGameTitle(gameId: PlayableGameId) {
  switch (gameId) {
    case "tap-sprint":
      return "탭 스프린트";
    case "reaction-grid":
      return "리액션 그리드";
    case "pace-memory":
      return "페이스 메모리";
    case "tetris":
      return "테트리스";
  }
}

export function GameArena({ gameId, bestScore, onClose, onScore, durationSeconds }: Props) {
  const tapDuration = durationSeconds || 10;
  const reactionDuration = durationSeconds || 30;
  const memoryDuration = durationSeconds || 20;

  const [tapCount, setTapCount] = useState(0);
  const [tapStarted, setTapStarted] = useState(false);
  const [tapTimeLeft, setTapTimeLeft] = useState(tapDuration);

  const [reactionStarted, setReactionStarted] = useState(false);
  const [reactionHits, setReactionHits] = useState(0);
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const [reactionTimeLeft, setReactionTimeLeft] = useState(reactionDuration);

  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [memoryInput, setMemoryInput] = useState<number[]>([]);
  const [memoryLevel, setMemoryLevel] = useState(3);
  const [memoryShowing, setMemoryShowing] = useState(false);
  const [memoryTimeLeft, setMemoryTimeLeft] = useState(memoryDuration);
  const [memoryFinished, setMemoryFinished] = useState(false);

  const [board, setBoard] = useState<TetrisCell[][]>(createBoard());
  const [piece, setPiece] = useState<Piece>(randomPiece());
  const [tetrisScore, setTetrisScore] = useState(0);
  const [tetrisRunning, setTetrisRunning] = useState(true);

  const memoryTimeout = useRef<number | null>(null);

  useEffect(() => {
    setTapTimeLeft(tapDuration);
  }, [tapDuration]);

  useEffect(() => {
    setReactionTimeLeft(reactionDuration);
  }, [reactionDuration]);

  useEffect(() => {
    setMemoryTimeLeft(memoryDuration);
  }, [memoryDuration]);

  const displayBoard = useMemo(() => (gameId === "tetris" ? merge(board, piece) : board), [board, gameId, piece]);

  useEffect(() => {
    if (gameId !== "tap-sprint" || !tapStarted || tapTimeLeft <= 0) return;
    const timer = window.setTimeout(() => setTapTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [gameId, tapStarted, tapTimeLeft]);

  useEffect(() => {
    if (gameId === "tap-sprint" && tapStarted && tapTimeLeft === 0) {
      setTapStarted(false);
      onScore(tapCount);
    }
  }, [gameId, onScore, tapCount, tapStarted, tapTimeLeft]);

  useEffect(() => {
    if (gameId !== "reaction-grid" || !reactionStarted || reactionTimeLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setReactionTimeLeft((value) => value - 1);
      setReactionTarget(Math.floor(Math.random() * 9));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [gameId, reactionStarted, reactionTimeLeft]);

  useEffect(() => {
    if (gameId === "reaction-grid" && reactionStarted && reactionTimeLeft === 0) {
      setReactionStarted(false);
      onScore(reactionHits * 10);
    }
  }, [gameId, onScore, reactionHits, reactionStarted, reactionTimeLeft]);

  useEffect(() => {
    if (gameId !== "pace-memory" || memoryShowing || memorySequence.length === 0 || memoryTimeLeft <= 0 || memoryFinished) return;
    const timer = window.setTimeout(() => setMemoryTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [gameId, memoryFinished, memorySequence.length, memoryShowing, memoryTimeLeft]);

  useEffect(() => {
    if (gameId === "pace-memory" && memoryTimeLeft === 0 && !memoryFinished) {
      onScore(Math.max(0, (memoryLevel - 3) * 15));
      setMemoryFinished(true);
      setMemorySequence([]);
      setMemoryInput([]);
    }
  }, [gameId, memoryFinished, memoryLevel, memoryTimeLeft, onScore]);

  useEffect(() => {
    if (gameId !== "tetris" || !tetrisRunning) return;
    const speed = Math.max(280, 920 - Math.floor(tetrisScore / 80) * 45);
    const timer = window.setInterval(() => {
      setPiece((current) => {
        const moved = { ...current, y: current.y + 1 };
        if (!collides(board, moved)) {
          return moved;
        }

        const merged = merge(board, current);
        const { board: clearedBoard, cleared } = clearLines(merged);
        setBoard(clearedBoard);
        setTetrisScore((score) => {
          const next = score + 10 + cleared * 30;
          onScore(next);
          return next;
        });
        const nextPiece = randomPiece();
        if (collides(clearedBoard, nextPiece)) {
          setTetrisRunning(false);
          return current;
        }
        return nextPiece;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [board, gameId, onScore, tetrisRunning, tetrisScore]);

  useEffect(() => {
    return () => {
      if (memoryTimeout.current) {
        window.clearTimeout(memoryTimeout.current);
      }
    };
  }, []);

  const startTapSprint = () => {
    setTapCount(0);
    setTapTimeLeft(tapDuration);
    setTapStarted(true);
  };

  const handleTap = () => {
    if (!tapStarted || tapTimeLeft <= 0) return;
    setTapCount((value) => value + 1);
  };

  const startReactionGrid = () => {
    setReactionStarted(true);
    setReactionHits(0);
    setReactionTimeLeft(reactionDuration);
    setReactionTarget(Math.floor(Math.random() * 9));
  };

  const handleReactionTap = () => {
    if (!reactionStarted) return;
    const nextHits = reactionHits + 1;
    setReactionHits(nextHits);
    onScore(nextHits * 10);
  };

  const startMemoryGame = () => {
    const next = Array.from({ length: memoryLevel }, () => Math.floor(Math.random() * 4) + 1);
    setMemorySequence(next);
    setMemoryInput([]);
    setMemoryShowing(true);
    setMemoryTimeLeft(memoryDuration);
    setMemoryFinished(false);
    memoryTimeout.current = window.setTimeout(() => setMemoryShowing(false), 1800);
  };

  const handleMemoryPick = (value: number) => {
    if (memoryShowing || memorySequence.length === 0 || memoryFinished) return;
    const nextInput = [...memoryInput, value];
    setMemoryInput(nextInput);
    if (memorySequence[nextInput.length - 1] !== value) {
      onScore(Math.max(0, (memoryLevel - 3) * 10));
      setMemoryFinished(true);
      setMemorySequence([]);
      setMemoryInput([]);
      return;
    }
    if (nextInput.length === memorySequence.length) {
      const score = memoryLevel * 15;
      onScore(score);
      setMemoryLevel((level) => level + 1);
      setMemorySequence([]);
      setMemoryInput([]);
      setMemoryFinished(true);
    }
  };

  const movePiece = (dx: number, dy: number) => {
    if (gameId !== "tetris" || !tetrisRunning) return;
    const moved = { ...piece, x: piece.x + dx, y: piece.y + dy };
    if (!collides(board, moved)) {
      setPiece(moved);
    }
  };

  const rotatePiece = () => {
    if (gameId !== "tetris" || !tetrisRunning) return;
    const rotated = { ...piece, shape: rotateShape(piece.shape) };
    if (!collides(board, rotated)) {
      setPiece(rotated);
    }
  };

  const hardDrop = () => {
    if (gameId !== "tetris" || !tetrisRunning) return;
    let nextPiece = { ...piece };
    while (!collides(board, { ...nextPiece, y: nextPiece.y + 1 })) {
      nextPiece = { ...nextPiece, y: nextPiece.y + 1 };
    }
    setPiece(nextPiece);
  };

  return (
    <Card className="border-primary/30 bg-background/95">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{getGameTitle(gameId)}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="게임 닫기">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3 text-sm">
          최고 점수: <span className="font-semibold">{bestScore}</span>
        </div>

        {gameId === "tap-sprint" ? (
          <div className="space-y-4">
            <Progress value={(tapTimeLeft / tapDuration) * 100} />
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground">남은 시간</div>
                <div className="text-2xl font-bold">{tapTimeLeft}s</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground">탭 수</div>
                <div className="text-2xl font-bold">{tapCount}</div>
              </div>
            </div>
            <Button className="w-full" onClick={tapStarted && tapTimeLeft > 0 ? handleTap : startTapSprint}>
              {tapStarted && tapTimeLeft > 0 ? "탭하기" : "게임 시작"}
            </Button>
          </div>
        ) : null}

        {gameId === "reaction-grid" ? (
          <div className="space-y-4">
            <Progress value={(reactionTimeLeft / reactionDuration) * 100} />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (!reactionStarted || reactionTarget !== index) return;
                    handleReactionTap();
                    setReactionTarget(Math.floor(Math.random() * 9));
                  }}
                  className={`aspect-square rounded-2xl border transition-colors ${
                    reactionTarget === index ? "bg-primary text-primary-foreground" : "bg-muted/30"
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground">남은 시간</div>
                <div className="text-2xl font-bold">{reactionTimeLeft}s</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-muted-foreground">정확도</div>
                <div className="text-2xl font-bold">{reactionHits}</div>
              </div>
            </div>
            <Button className="w-full" onClick={startReactionGrid} disabled={reactionStarted}>
              {reactionStarted ? "게임 진행 중" : "게임 시작"}
            </Button>
          </div>
        ) : null}

        {gameId === "pace-memory" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border p-5 text-center">
              <div className="text-sm text-muted-foreground">레벨</div>
              <div className="text-2xl font-bold">{memoryLevel}</div>
              <div className="mt-2 text-sm text-muted-foreground">남은 시간 {memoryTimeLeft}s</div>
              <div className="mt-3 text-lg font-semibold">
                {memoryShowing
                  ? memorySequence.join(" - ")
                  : memorySequence.length > 0
                    ? "순서를 입력해 주세요."
                    : "시작 버튼을 눌러 주세요."}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((value) => (
                <Button key={value} variant="outline" onClick={() => handleMemoryPick(value)}>
                  {value}
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={startMemoryGame}>
              게임 시작
            </Button>
          </div>
        ) : null}

        {gameId === "tetris" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-10 gap-1 rounded-2xl border bg-black/80 p-3">
              {displayBoard.flatMap((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="aspect-square rounded-sm border border-white/5"
                    style={{ backgroundColor: cell || "rgba(255,255,255,0.06)" }}
                  />
                )),
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button variant="outline" onClick={() => movePiece(-1, 0)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={rotatePiece}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => movePiece(1, 0)}>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={hardDrop}>
                <CornerDownLeft className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => movePiece(0, 1)} className="w-full">
              <ArrowDown className="mr-2 h-4 w-4" />
              아래로
            </Button>
            {!tetrisRunning ? (
              <Button
                className="w-full"
                onClick={() => {
                  setBoard(createBoard());
                  setPiece(randomPiece());
                  setTetrisScore(0);
                  setTetrisRunning(true);
                }}
              >
                다시 시작
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
