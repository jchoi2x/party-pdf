import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setStoredUserName } from "@/lib/username";
import "./NameDialog.styles.scss";

interface NameDialogProps {
  open: boolean;
  onSave: (name: string) => void;
}

export default function NameDialog({ open, onSave }: NameDialogProps) {
  const [name, setName] = useState("");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter your name");
      return;
    }
    setStoredUserName(trimmed);
    onSave(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={() => {}}
    >
      <DialogContent
        className="name-dialog"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="name-dialog__title">
            What's your name?
          </DialogTitle>
          <DialogDescription>
            Your name will be shown to collaborators when you annotate the document.
          </DialogDescription>
        </DialogHeader>
        <div className="name-dialog__content">
          <div className="name-dialog__field">
            <Label htmlFor="user-name">Display name</Label>
            <Input
              id="user-name"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <Button
            onClick={handleSave}
            className="name-dialog__submit"
            disabled={!name.trim()}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
