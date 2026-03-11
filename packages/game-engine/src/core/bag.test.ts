import { describe, expect, it } from "vitest";
import { SevenBagGenerator, shuffleBag } from "./bag";
import { TETROMINO_SEQUENCE } from "./constants";

function createDeterministicRandom(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

describe("shuffleBag", () => {
  it("returns a seven-piece bag with unique tetrominoes", () => {
    const bag = shuffleBag(createDeterministicRandom([0.1, 0.2, 0.3, 0.4]));

    expect(new Set(bag)).toEqual(new Set(TETROMINO_SEQUENCE));
    expect(bag).toHaveLength(7);
  });
});

describe("SevenBagGenerator", () => {
  it("keeps at least the requested preview size", () => {
    const generator = new SevenBagGenerator(
      createDeterministicRandom([0.05, 0.25, 0.45, 0.65, 0.85])
    );

    expect(generator.peek(5)).toHaveLength(5);
    expect(generator.next()).toBeDefined();
    expect(generator.peek(6)).toHaveLength(6);
  });
});
