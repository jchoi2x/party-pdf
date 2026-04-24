import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useApiAuth } from '@/contexts/api-auth';
import { type ProfileNameFormValues, profileNameFormSchema } from '@/lib/profile.schema';
import { UserService } from '@/services/user.service';

import type { ProfileFormProps } from './ProfileForm.types';

export function ProfileForm({
  defaultGivenName = '',
  defaultFamilyName = '',
  submitLabel = 'Save profile',
  onSuccess,
}: ProfileFormProps) {
  const { httpClient } = useApiAuth();
  const userService = useMemo(() => new UserService(httpClient), [httpClient]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileNameFormValues>({
    resolver: zodResolver(profileNameFormSchema),
    defaultValues: {
      givenName: defaultGivenName,
      familyName: defaultFamilyName,
    },
  });

  useEffect(() => {
    form.reset({
      givenName: defaultGivenName,
      familyName: defaultFamilyName,
    });
  }, [defaultGivenName, defaultFamilyName, form]);

  async function onSubmit(values: ProfileNameFormValues) {
    setIsSubmitting(true);
    try {
      const res = await userService.updateProfile({
        givenName: values.givenName,
        familyName: values.familyName,
      });
      if (!res.ok) {
        const msg =
          typeof res.data === 'object' && res.data !== null && 'error' in res.data
            ? String((res.data as { error: unknown }).error)
            : 'Could not save profile';
        toast.error(msg);
        return;
      }
      toast.success('Profile saved');
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast.error('Could not save profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='givenName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl>
                <Input autoComplete='given-name' placeholder='First name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='familyName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl>
                <Input autoComplete='family-name' placeholder='Last name' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' className='w-full sm:w-auto' disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
