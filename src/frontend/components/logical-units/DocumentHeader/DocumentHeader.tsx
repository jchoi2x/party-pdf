import { House, VideoCamera } from '@phosphor-icons/react';
import { useLocation } from 'wouter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getInitials } from '@/lib/username';
import type { Collaborator } from '@/pages/document';

interface DocumentHeaderProps {
  documentName: string;
  userName: string;
  collaborators: Collaborator[];
  isMobile?: boolean;
  onMobileVideoToggle?: () => void;
}

const MAX_VISIBLE_AVATARS = 4;

export default function DocumentHeader({
  documentName,
  userName,
  collaborators,
  isMobile,
  onMobileVideoToggle,
}: DocumentHeaderProps) {
  const [, navigate] = useLocation();

  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = collaborators.length - MAX_VISIBLE_AVATARS;

  return (
    <TooltipProvider delayDuration={200}>
      <header className='flex items-center justify-between px-4 sm:px-6 py-2 border-b bg-card shadow-sm'>
        <div className='flex items-center gap-3 min-w-0'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate('/')}
            className='flex-shrink-0 h-9 w-9'
            title='Back to home'
          >
            <House size={18} weight='bold' />
          </Button>
          <div className='flex items-center gap-2 min-w-0'>
            <h1
              className='text-base sm:text-lg font-semibold text-foreground truncate'
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              title={documentName}
            >
              {documentName}
            </h1>
          </div>
        </div>

        <div className='flex items-center gap-3 flex-shrink-0'>
          {visibleCollaborators.length > 0 && (
            <div className='flex items-center -space-x-2'>
              {visibleCollaborators.map((collab, i) => (
                <Tooltip key={`${collab.name}-${i}`}>
                  <TooltipTrigger asChild>
                    <div
                      className='h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-card cursor-default'
                      style={{ backgroundColor: collab.color }}
                    >
                      {getInitials(collab.name)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='bottom'>
                    <p>{collab.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {overflowCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='h-8 w-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-xs font-semibold ring-2 ring-card cursor-default'>
                      +{overflowCount}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='bottom'>
                    <p>
                      {collaborators
                        .slice(MAX_VISIBLE_AVATARS)
                        .map((c) => c.name)
                        .join(', ')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {isMobile && onMobileVideoToggle && (
            <Button
              variant='ghost'
              size='icon'
              onClick={onMobileVideoToggle}
              className='h-9 w-9'
              title='Open video panel'
            >
              <VideoCamera size={18} weight='bold' />
            </Button>
          )}

          <div className='flex items-center gap-2'>
            <Avatar className='h-9 w-9'>
              <AvatarFallback className='bg-primary text-primary-foreground text-xs font-semibold'>
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <Badge variant='secondary' className='hidden sm:flex text-xs'>
              {userName}
            </Badge>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
