import { z } from 'zod';

export const paginationSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(50)
});

export const idParamSchema = z.object({ id: z.string().min(1) });
