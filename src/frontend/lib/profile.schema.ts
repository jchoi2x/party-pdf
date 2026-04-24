import { z } from 'zod';

export const profileNameFormSchema = z.object({
  givenName: z.string().min(1, 'First name is required').max(150),
  familyName: z.string().min(1, 'Last name is required').max(150),
});

export type ProfileNameFormValues = z.infer<typeof profileNameFormSchema>;
