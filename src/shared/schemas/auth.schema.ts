import { z } from 'zod';

const USERNAME_REGEX = /^[a-z0-9._-]{3,40}$/;
const PASSWORD_MAX_LENGTH = 200;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_REGEX, 'Usuario inválido');

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
