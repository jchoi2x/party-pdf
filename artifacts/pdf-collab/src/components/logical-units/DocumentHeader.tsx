import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { House, PencilSimple } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setStoredUserName, getInitials } from "@/lib/username";

interface DocumentHeaderProps {
  documentName: string;
  userName: string;
  onUserNameChange: (name: string) => void;
}

export default function DocumentHeader({ documentName, userName, onUserNameChange }: DocumentHeaderProps) {
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(userName);

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
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="flex-shrink-0 h-9 w-9"
          title="Back to home"
        >
          <House size={18} weight="bold" />
        </Button>
        <div className="min-w-0">
          <h1
            className="text-xl sm:text-2xl font-semibold text-foreground truncate"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
            title={documentName}
          >
            {documentName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 w-36 text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveName} className="h-8">Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8">Cancel</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <Badge variant="secondary" className="hidden sm:flex text-xs">
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
              className="h-9 w-9"
              title="Edit name"
            >
              <PencilSimple size={16} weight="bold" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
