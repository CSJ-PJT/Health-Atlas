import { z } from "zod";

// XSS 방어를 위한 기본 문자열 스키마
const sanitizeString = (str: string) => {
  return str
    .replace(/[<>]/g, '') // HTML 태그 제거
    .trim();
};

// 사용자 ID 스키마 (영문, 숫자, 언더스코어만 허용, 4-20자)
export const userIdSchema = z.string()
  .min(4, { message: "ID는 최소 4자 이상이어야 합니다." })
  .max(20, { message: "ID는 최대 20자까지 가능합니다." })
  .regex(/^[a-zA-Z0-9_]+$/, { message: "ID는 영문, 숫자, 언더스코어(_)만 사용 가능합니다." })
  .transform(sanitizeString);

// 비밀번호 스키마 (소문자, 숫자, 특수문자 포함, 10자 이상)
export const passwordSchema = z.string()
  .min(10, { message: "비밀번호는 최소 10자 이상이어야 합니다." })
  .regex(/[a-z]/, { message: "비밀번호에 소문자가 포함되어야 합니다." })
  .regex(/[0-9]/, { message: "비밀번호에 숫자가 포함되어야 합니다." })
  .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "비밀번호에 특수문자가 포함되어야 합니다." })
  .regex(/^[a-z0-9!@#$%^&*(),.?":{}|<>]+$/, { message: "비밀번호는 소문자, 숫자, 특수문자만 사용 가능합니다." });

// 닉네임 스키마
export const nicknameSchema = z.string()
  .min(2, { message: "닉네임은 최소 2자 이상이어야 합니다." })
  .max(20, { message: "닉네임은 최대 20자까지 가능합니다." })
  .transform(sanitizeString);

// OpenAI API Key 스키마
export const apiKeySchema = z.string()
  .min(1, { message: "API Key를 입력해주세요." })
  .startsWith("sk-", { message: "올바른 OpenAI API Key 형식이 아닙니다." })
  .transform(sanitizeString);

// OpenAI Project ID 스키마
export const projectIdSchema = z.string()
  .min(1, { message: "Project ID를 입력해주세요." })
  .startsWith("proj_", { message: "올바른 Project ID 형식이 아닙니다." })
  .transform(sanitizeString);
