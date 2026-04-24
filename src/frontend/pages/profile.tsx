import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { Link } from 'wouter';
import { ProfileForm } from '@/components/logical-units/ProfileForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const { user } = useAuth0();

  const handleSuccess = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className='flex-1 bg-background p-4 sm:p-8'>
      <div className='mx-auto max-w-lg space-y-6'>
        <div className='flex items-center justify-between gap-4'>
          <h1 className='text-xl font-semibold text-foreground'>Profile</h1>
          <Button asChild variant='outline' size='sm'>
            <Link href='/'>Home</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your name</CardTitle>
            <CardDescription>
              This updates your Auth0 user profile (first and last name). It is used across Party-PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultGivenName={user?.given_name ?? ''}
              defaultFamilyName={user?.family_name ?? ''}
              submitLabel='Save changes'
              onSuccess={handleSuccess}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
