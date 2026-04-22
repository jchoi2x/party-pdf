import { House, Moon, PencilSimple, Sun, VideoCamera } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getInitials, setStoredUserName } from '@/lib/username';
import type { Collaborator } from '@/pages/document';

interface DocumentHeaderProps {
  documentName: string;
  userName: string;
  onUserNameChange: (name: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  collaborators: Collaborator[];
  isMobile?: boolean;
  onMobileVideoToggle?: () => void;
}

const MAX_VISIBLE_AVATARS = 4;

export default function DocumentHeader({
  documentName,
  userName,
  onUserNameChange,
  isDark,
  onToggleTheme,
  collaborators,
  isMobile,
  onMobileVideoToggle,
}: DocumentHeaderProps) {
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(userName);

  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = collaborators.length - MAX_VISIBLE_AVATARS;

  function handleSaveName() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }
    setStoredUserName(trimmed);
    onUserNameChange(trimmed);
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setEditValue(userName);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') handleCancelEdit();
  }

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

          <Button
            variant='ghost'
            size='icon'
            onClick={onToggleTheme}
            className='h-9 w-9'
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} weight='bold' /> : <Moon size={18} weight='bold' />}
          </Button>

          {isEditing ? (
            <div className='flex items-center gap-2'>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className='h-8 w-36 text-sm'
                autoFocus
              />
              <Button size='sm' onClick={handleSaveName} className='h-8'>
                Save
              </Button>
              <Button size='sm' variant='ghost' onClick={handleCancelEdit} className='h-8'>
                Cancel
              </Button>
            </div>
          ) : (
            <>
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
              <Button
                variant='ghost'
                size='icon'
                onClick={() => {
                  setEditValue(userName);
                  setIsEditing(true);
                }}
                className='h-9 w-9'
                title='Edit name'
              >
                <PencilSimple size={16} weight='bold' />
              </Button>
            </>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
}
