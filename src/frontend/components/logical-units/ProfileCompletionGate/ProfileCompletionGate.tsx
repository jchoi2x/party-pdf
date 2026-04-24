import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import { ProfileForm } from '@/components/logical-units/ProfileForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { profileRequiresLegalName } from '@/lib/user-profile';

import type { ProfileCompletionGateProps } from './ProfileCompletionGate.types';

export function ProfileCompletionGate({ children }: ProfileCompletionGateProps) {
  const { user } = useAuth0();
  const needsProfile = profileRequiresLegalName(user);

  const handleProfileSaved = useCallback(() => {
    // Auth0 session user is derived from the ID token; reload to pick up new given_name / family_name.
    window.location.reload();
  }, []);

  if (needsProfile) {
    return (
      <Dialog open modal>
        <DialogContent
          className='sm:max-w-md'
          hideCloseButton
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Set your name</DialogTitle>
            <DialogDescription>
              Add your first and last name to continue. This is required once for your account.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm
            defaultGivenName={user?.given_name ?? ''}
            defaultFamilyName={user?.family_name ?? ''}
            submitLabel='Save and continue'
            onSuccess={handleProfileSaved}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
