import { TETROMINO_SEQUENCE } from "./constants";
import type { QueueGenerator, RandomSource, TetrominoType } from "./types";

export function shuffleBag(
  random: RandomSource = Math.random
): TetrominoType[] {
  const bag = [...TETROMINO_SEQUENCE];

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }

  return bag;
}

export class SevenBagGenerator implements QueueGenerator {
  private readonly random: RandomSource;
  private queue: TetrominoType[] = [];

  constructor(random: RandomSource = Math.random) {
    this.random = random;
  }

  next(): TetrominoType {
    this.fillQueue(1);
    return this.queue.shift() as TetrominoType;
  }

  peek(size: number): TetrominoType[] {
    this.fillQueue(size);
    return this.queue.slice(0, size);
  }

  private fillQueue(size: number) {
    while (this.queue.length < size) {
      this.queue.push(...shuffleBag(this.random));
    }
  }
}
