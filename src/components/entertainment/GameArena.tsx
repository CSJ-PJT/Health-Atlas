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
  return {
    board: [...padding, ...kept],
    cleared,
  };
}

export function GameArena({ gameId, bestScore, onClose, onScore }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const [tapStarted, setTapStarted] = useState(false);
  const [tapTimeLeft, setTapTimeLeft] = useState(10);

  const [breathStarted, setBreathStarted] = useState(false);
  const [breathHits, setBreathHits] = useState(0);
  const [reactionTarget, setReactionTarget] = useState<number | null>(null);
  const [reactionTimeLeft, setReactionTimeLeft] = useState(12);

  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [memoryInput, setMemoryInput] = useState<number[]>([]);
  const [memoryLevel, setMemoryLevel] = useState(3);
  const [memoryShowing, setMemoryShowing] = useState(false);
  const [memoryTimeLeft, setMemoryTimeLeft] = useState(20);

  const [board, setBoard] = useState<TetrisCell[][]>(createBoard());
  const [piece, setPiece] = useState<Piece>(randomPiece());
  const [tetrisScore, setTetrisScore] = useState(0);
  const [tetrisRunning, setTetrisRunning] = useState(true);

  const memoryTimeout = useRef<number | null>(null);

  const displayBoard = useMemo(() => {
    if (gameId !== "tetris") return board;
    return merge(board, piece);
  }, [board, gameId, piece]);

  useEffect(() => {
    if (gameId !== "tap-sprint" || !tapStarted || tapTimeLeft <= 0) return;
    const timer = window.setTimeout(() => setTapTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [gameId, tapStarted, tapTimeLeft]);

  useEffect(() => {
    if (gameId === "tap-sprint" && tapStarted && tapTimeLeft === 0) {
      onScore(tapCount);
    }
  }, [gameId, onScore, tapCount, tapStarted, tapTimeLeft]);

  useEffect(() => {
    if (gameId !== "reaction-grid" || !breathStarted || reactionTimeLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setReactionTimeLeft((value) => value - 1);
      setReactionTarget(Math.floor(Math.random() * 9));
    }, 850);
    return () => window.clearTimeout(timer);
  }, [breathStarted, gameId, reactionTimeLeft]);

  useEffect(() => {
    if (gameId === "reaction-grid" && breathStarted && reactionTimeLeft === 0) {
      setBreathStarted(false);
      onScore(breathHits * 10);
    }
  }, [breathHits, breathStarted, gameId, onScore, reactionTimeLeft]);

  useEffect(() => {
    if (gameId !== "pace-memory" || memoryShowing || memorySequence.length === 0 || memoryTimeLeft <= 0) return;
    const timer = window.setTimeout(() => setMemoryTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [gameId, memorySequence.length, memoryShowing, memoryTimeLeft]);

  useEffect(() => {
    if (gameId === "pace-memory" && memoryTimeLeft === 0) {
      onScore(Math.max(0, (memoryLevel - 3) * 15));
      setMemorySequence([]);
      setMemoryInput([]);
    }
  }, [gameId, memoryLevel, memoryTimeLeft, onScore]);

  useEffect(() => {
    if (gameId !== "tetris" || !tetrisRunning) return;
    const speed = Math.max(160, 650 - Math.floor(tetrisScore / 30) * 40);
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
    setTapTimeLeft(10);
    setTapStarted(true);
  };

  const handleTap = () => {
    if (!tapStarted || tapTimeLeft <= 0) return;
    setTapCount((value) => value + 1);
  };

  const startBreathFocus = () => {
    setBreathStarted(true);
    setBreathHits(0);
    setReactionTimeLeft(12);
    setReactionTarget(Math.floor(Math.random() * 9));
  };

  const handleBreathTap = () => {
    if (!breathStarted) return;
    const nextHits = breathHits + 1;
    setBreathHits(nextHits);
    onScore(nextHits * 10);
  };

  const startMemoryGame = () => {
    const next = Array.from({ length: memoryLevel }, () => Math.floor(Math.random() * 4) + 1);
    setMemorySequence(next);
    setMemoryInput([]);
    setMemoryShowing(true);
    setMemoryTimeLeft(20);
    memoryTimeout.current = window.setTimeout(() => setMemoryShowing(false), 1800);
  };

  const handleMemoryPick = (value: number) => {
    if (memoryShowing || memorySequence.length === 0) return;
    const nextInput = [...memoryInput, value];
    setMemoryInput(nextInput);
    if (memorySequence[nextInput.length - 1] !== value) {
      onScore(Math.max(0, (memoryLevel - 3) * 10));
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

  const gameTitle =
    gameId === "tap-sprint"
      ? "탭 스프린트"
      : gameId === "reaction-grid"
        ? "리액션 그리드"
        : gameId === "pace-memory"
          ? "페이스 메모리"
          : "테트리스";

  return (
    <Card className="border-primary/30 bg-background/95">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{gameTitle}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3 text-sm">
          최고 점수: <span className="font-semibold">{bestScore}</span>
        </div>

        {gameId === "tap-sprint" ? (
          <div className="space-y-4">
            <Progress value={(tapTimeLeft / 10) * 100} />
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
              {tapStarted && tapTimeLeft > 0 ? "탭!" : "게임 시작"}
            </Button>
          </div>
        ) : null}

        {gameId === "reaction-grid" ? (
          <div className="space-y-4">
            <Progress value={(reactionTimeLeft / 12) * 100} />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (!breathStarted || reactionTarget !== index) return;
                    handleBreathTap();
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
                <div className="text-xs text-muted-foreground">적중 수</div>
                <div className="text-2xl font-bold">{breathHits}</div>
              </div>
            </div>
            <Button className="w-full" onClick={startBreathFocus} disabled={breathStarted}>
              {breathStarted ? "게임 진행 중" : "게임 시작"}
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
                {memoryShowing ? memorySequence.join(" - ") : memorySequence.length > 0 ? "순서를 입력하세요" : "시작 버튼을 누르세요"}
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
              시퀀스 시작
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
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => movePiece(0, 1)}>
                <ArrowDown className="mr-2 h-4 w-4" />
                아래로
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  let nextPiece = { ...piece };
                  while (!collides(board, { ...nextPiece, y: nextPiece.y + 1 })) {
                    nextPiece = { ...nextPiece, y: nextPiece.y + 1 };
                  }
                  setPiece(nextPiece);
                }}
              >
                <CornerDownLeft className="mr-2 h-4 w-4" />
                엔터
              </Button>
            </div>
            {!tetrisRunning ? (
              <Button className="w-full" onClick={() => {
                setBoard(createBoard());
                setPiece(randomPiece());
                setTetrisScore(0);
                setTetrisRunning(true);
              }}>
                다시 시작
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">점수: {tetrisScore}</div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
