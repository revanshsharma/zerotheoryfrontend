
import { z } from 'zod';
import { insertUserSchema, insertLeaderboardSchema, insertContactSchema, leaderboard, users, contactSubmissions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  leaderboard: {
    list: {
      method: 'GET' as const,
      path: '/api/leaderboard' as const,
      responses: {
        200: z.array(z.custom<typeof leaderboard.$inferSelect>()),
      },
    },
    // Optional: Admin endpoint to seed or update leaderboard
    create: {
      method: 'POST' as const,
      path: '/api/leaderboard' as const,
      input: insertLeaderboardSchema,
      responses: {
        201: z.custom<typeof leaderboard.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  users: {
    create: {
      method: 'POST' as const,
      path: '/api/users' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        409: z.object({ message: z.string() }), // Email conflict
      },
    },
  },
  contact: {
    submit: {
      method: 'POST' as const,
      path: '/api/contact' as const,
      input: insertContactSchema,
      responses: {
        201: z.custom<typeof contactSubmissions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type LeaderboardListResponse = z.infer<typeof api.leaderboard.list.responses[200]>;
export type CreateUserResponse = z.infer<typeof api.users.create.responses[201]>;
