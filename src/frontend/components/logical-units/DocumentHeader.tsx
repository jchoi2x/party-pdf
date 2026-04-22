import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { House, PencilSimple, Sun, Moon, VideoCamera } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { setStoredUserName, getInitials } from "@/lib/username";
import type { Collaborator } from "@/pages/document";
import "./DocumentHeader.styles.scss";

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

export const DocumentHeader = ({
  documentName,
  userName,
  onUserNameChange,
  isDark,
  onToggleTheme,
  collaborators,
  isMobile,
  onMobileVideoToggle,
}: DocumentHeaderProps) => {
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(userName);

  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = collaborators.length - MAX_VISIBLE_AVATARS;

  function handleSaveName() {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
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
    if (e.key === "Enter") handleSaveName();
    if (e.key === "Escape") handleCancelEdit();
  }

  return (
    <TooltipProvider delayDuration={200}>
      <header className="document-header">
        <div className="document-header__left">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="document-header__icon-button document-header__icon-button--no-shrink"
            title="Back to home"
          >
            <House size={18} weight="bold" />
          </Button>
          <div className="document-header__title-wrap">
            <h1 className="document-header__title" title={documentName}>
              {documentName}
            </h1>
          </div>
        </div>

        <div className="document-header__right">
          {visibleCollaborators.length > 0 && (
            <div className="document-header__collaborators">
              {visibleCollaborators.map((collab, i) => (
                <Tooltip key={`${collab.name}-${i}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="document-header__collaborator-avatar"
                      style={{ backgroundColor: collab.color }}
                    >
                      {getInitials(collab.name)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{collab.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {overflowCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="document-header__collaborator-avatar document-header__collaborator-avatar--overflow">
                      +{overflowCount}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{collaborators.slice(MAX_VISIBLE_AVATARS).map(c => c.name).join(", ")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {isMobile && onMobileVideoToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileVideoToggle}
              className="document-header__icon-button"
              title="Open video panel"
            >
              <VideoCamera size={18} weight="bold" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className="document-header__icon-button"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
          </Button>

          {isEditing ? (
            <div className="document-header__editing">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="document-header__editing-input"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName} className="document-header__editing-action">Save</Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="document-header__editing-action">Cancel</Button>
            </div>
          ) : (
            <>
              <div className="document-header__current-user">
                <Avatar className="document-header__current-user-avatar">
                  <AvatarFallback className="document-header__current-user-avatar-fallback">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="document-header__current-user-badge">
                  {userName}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditValue(userName);
                  setIsEditing(true);
                }}
                className="document-header__icon-button"
                title="Edit name"
              >
                <PencilSimple size={16} weight="bold" />
              </Button>
            </>
          )}
        </div>
      </header>
    </TooltipProvider>
  );
};
