import { z } from "zod";

const sanitizeString = (str: string) => str.replace(/[<>]/g, "").trim();

export const userIdSchema = z
  .string()
  .min(4, { message: "ID는 최소 4자 이상이어야 합니다." })
  .max(20, { message: "ID는 최대 20자까지 가능합니다." })
  .regex(/^[a-zA-Z0-9_]+$/, { message: "ID는 영문, 숫자, 밑줄(_)만 사용할 수 있습니다." })
  .transform(sanitizeString);

export const passwordSchema = z
  .string()
  .min(9, { message: "비밀번호는 최소 9자 이상이어야 합니다." })
  .regex(/[a-zA-Z]/, { message: "비밀번호에는 영문이 포함되어야 합니다." })
  .regex(/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`]/, { message: "비밀번호에는 특수문자가 포함되어야 합니다." })
  .regex(/^[a-zA-Z0-9!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`]+$/, {
    message: "비밀번호는 영문, 숫자, 특수문자만 사용할 수 있습니다.",
  });

export const nicknameSchema = z
  .string()
  .min(2, { message: "닉네임은 최소 2자 이상이어야 합니다." })
  .max(20, { message: "닉네임은 최대 20자까지 가능합니다." })
  .transform(sanitizeString);

export const apiKeySchema = z
  .string()
  .min(1, { message: "API Key를 입력해 주세요." })
  .startsWith("sk-", { message: "올바른 OpenAI API Key 형식이 아닙니다." })
  .transform(sanitizeString);

export const projectIdSchema = z
  .string()
  .min(1, { message: "Project ID를 입력해 주세요." })
  .startsWith("proj_", { message: "올바른 Project ID 형식이 아닙니다." })
  .transform(sanitizeString);
