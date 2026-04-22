import { z } from "zod";

export const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    USERNAME_REGEX,
    "Username must be 3-30 chars and use lowercase letters, numbers, _ or -.",
  );

export const signUpInputSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    username: usernameSchema,
    display_name: z
      .string()
      .trim()
      .max(80, "Display name must be 80 characters or fewer.")
      .optional()
      .default(""),
  })
  .strict();

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const loginInputSchema = z
  .object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(1, "Password is required."),
  })
  .strict();

export type LoginInput = z.infer<typeof loginInputSchema>;

export const profileUpdateSchema = z
  .object({
    username: usernameSchema,
    display_name: z
      .string()
      .trim()
      .max(80, "Display name must be 80 characters or fewer."),
    bio: z.string().trim().max(280, "Bio must be 280 characters or fewer."),
    avatar_url: z.union([z.string().url("Avatar URL must be valid."), z.literal(""), z.null()]),
  })
  .strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isUsernameValid(username: string): boolean {
  return USERNAME_REGEX.test(normalizeUsername(username));
}

