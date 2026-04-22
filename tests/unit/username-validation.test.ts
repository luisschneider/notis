import { describe, expect, it } from "vitest";
import {
  USERNAME_REGEX,
  isUsernameValid,
  normalizeUsername,
  usernameSchema,
} from "@/lib/validation/auth";

describe("username validation helpers", () => {
  it("normalizes username by trimming and lowercasing", () => {
    expect(normalizeUsername("  TeSt_User  ")).toBe("test_user");
  });

  it("validates accepted username values", () => {
    expect(isUsernameValid("test_user-1")).toBe(true);
    expect(USERNAME_REGEX.test("abc")).toBe(true);
    expect(USERNAME_REGEX.test("a_b-c123")).toBe(true);
  });

  it("rejects invalid username values", () => {
    expect(isUsernameValid("ab")).toBe(false);
    expect(isUsernameValid("bad space")).toBe(false);
    expect(isUsernameValid("bad space")).toBe(false);
    expect(isUsernameValid("a".repeat(31))).toBe(false);
  });

  it("schema lowercases and validates", () => {
    const result = usernameSchema.safeParse("  Valid_name  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("valid_name");
    }
  });

  it("schema returns errors for invalid usernames", () => {
    const result = usernameSchema.safeParse("Invalid!");
    expect(result.success).toBe(false);
  });
});
