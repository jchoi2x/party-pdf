import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '@/components/ui/button/button';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

const meta = {
  title: 'Components/UI/AlertDialog',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Alert Dialog is a modal confirmation pattern for destructive or high-impact actions. ' +
          'Use it when users must explicitly confirm before data loss, irreversible changes, or permission-sensitive operations.\n\n' +
          '### Accessibility notes\n' +
          '- Uses semantic alert dialog roles and focus trapping through Radix.\n' +
          '- Supports keyboard dismissal and action focus management.\n' +
          '- Keep title and description concise and action-oriented.\n\n' +
          '### Composition\n' +
          '- `AlertDialogTrigger`: Opens the dialog (supports `asChild`).\n' +
          '- `AlertDialogContent`: Modal body.\n' +
          '- `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`: Content semantics.\n' +
          '- `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`: Decision controls.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className='flex min-h-[280px] w-[640px] max-w-[92vw] items-center justify-center p-8'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicConfirmation: Story = {
  name: 'Basic Confirmation',
  parameters: {
    docs: {
      description: {
        story: 'Default two-action confirmation with clear cancel/confirm paths.',
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline'>Open dialog</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have edits that are not saved yet. Discarding now will remove your latest updates.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction>Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const DestructiveAction: Story = {
  name: 'Destructive Action',
  parameters: {
    docs: {
      description: {
        story: 'Highlights an irreversible action by styling the confirm button as destructive.',
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='destructive'>Delete project</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this project permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes files, comments, and version history for everyone. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className='bg-destructive text-destructive-foreground border-destructive-border'>
            Yes, delete project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const LongFormDescription: Story = {
  name: 'Long Form Description',
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates extended explanatory text and structured detail for compliance-heavy operations.',
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='secondary'>Archive workspace</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive workspace and revoke active sessions?</AlertDialogTitle>
          <AlertDialogDescription className='space-y-3'>
            <p>
              Archiving will make this workspace read-only and immediately sign out all active users across devices.
            </p>
            <p>
              Existing documents remain available for export for 30 days. After that window, retention policies apply
              and restoration requires admin intervention.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction>Archive workspace</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const ChecklistStyleContent: Story = {
  name: 'Checklist Content',
  parameters: {
    docs: {
      description: {
        story: 'Uses a list-style description to summarize consequences before confirmation.',
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline'>Reset organization settings</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset all organization settings?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='text-sm text-muted-foreground'>
              <p className='mb-2'>The reset will apply immediately and includes:</p>
              <ul className='list-disc space-y-1 pl-5'>
                <li>Theme and branding removal</li>
                <li>SSO provider disconnection</li>
                <li>Notification defaults reverting to system values</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction>Reset settings</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const ConfirmOnly: Story = {
  name: 'Confirm Only',
  parameters: {
    docs: {
      description: {
        story: 'Single-action variant useful for informational acknowledgement flows.',
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Show migration notice</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Migration completed</AlertDialogTitle>
          <AlertDialogDescription>
            Your project has been migrated to the new storage engine. Performance improvements are now active.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Understood</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const ActionDisabled: Story = {
  name: 'Action Disabled',
  parameters: {
    docs: {
      description: {
        story: 'Shows a pending/system-guarded action where confirmation is temporarily unavailable.',
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline'>Rotate encryption key</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rotate encryption key now?</AlertDialogTitle>
          <AlertDialogDescription>
            A backup verification is still running. You can continue after integrity checks finish.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction disabled>Rotate key (pending checks)</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const CustomTriggerLinkStyle: Story = {
  name: 'Custom Trigger (Link Style)',
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates `asChild` trigger composition, allowing AlertDialog to open from non-default trigger presentation.',
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='link'>Deactivate account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
          <AlertDialogDescription>
            Your profile and data are hidden until reactivation. Billing and permissions are paused immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep account active</AlertDialogCancel>
          <AlertDialogAction>Deactivate</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const NarrowViewportFriendly: Story = {
  name: 'Narrow Viewport Friendly',
  parameters: {
    docs: {
      description: {
        story: 'Validates footer stacking behavior and readability on smaller viewport sizes.',
      },
    },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size='sm' variant='outline'>
          Remove member
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='max-w-[92vw] sm:max-w-lg'>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove member from workspace?</AlertDialogTitle>
          <AlertDialogDescription>
            The member will lose document access immediately. Shared comments remain in history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Remove member</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
