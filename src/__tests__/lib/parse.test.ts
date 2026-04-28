import { describe, it, expect } from "vitest";
import { toArray, cleanLlmJson } from "@/lib/parse";

describe("toArray", () => {
  it("returns the array as-is if already an array", () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("parses a JSON string into an array", () => {
    expect(toArray('[{"given":"a","when":"b","then":"c"}]')).toEqual([
      { given: "a", when: "b", then: "c" },
    ]);
  });

  it("returns empty array for non-array JSON string", () => {
    expect(toArray('{"not":"an array"}')).toEqual([]);
  });

  it("returns empty array for invalid JSON string", () => {
    expect(toArray("not json")).toEqual([]);
  });

  it("returns empty array for null", () => {
    expect(toArray(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(toArray(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(toArray("")).toEqual([]);
  });

  it("handles Postgres array format as invalid JSON gracefully", () => {
    expect(toArray("{auth,backend}")).toEqual([]);
  });
});

describe("cleanLlmJson", () => {
  it("strips markdown json fences", () => {
    const input = '```json\n{"stories":[]}\n```';
    expect(cleanLlmJson(input)).toBe('{"stories":[]}');
  });

  it("strips plain markdown fences", () => {
    const input = '```\n{"stories":[]}\n```';
    expect(cleanLlmJson(input)).toBe('{"stories":[]}');
  });

  it("returns clean JSON unchanged", () => {
    const input = '{"stories":[]}';
    expect(cleanLlmJson(input)).toBe('{"stories":[]}');
  });

  it("trims whitespace", () => {
    const input = '  \n{"stories":[]}\n  ';
    expect(cleanLlmJson(input)).toBe('{"stories":[]}');
  });

  it("handles multiple fence blocks", () => {
    const input = '```json\n{"a":1}\n```\n```json\n{"b":2}\n```';
    const result = cleanLlmJson(input);
    expect(result).not.toContain("```");
  });
});
