import { FilePdf, Upload, X } from '@phosphor-icons/react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApiAuth } from '@/contexts/api-auth';
import { formatFileSize } from '@/lib/utils';
import { DocumentUploadService } from '@/services/document-upload.service';

type WizardStep = 'upload' | 'invite';

function parseEmailsFromInput(text: string): string[] {
  const parts = text.split(/[\s,;]+/).map((s) => s.trim());
  return [...new Set(parts.filter((s) => s.includes('@')))];
}

type SessionInviteResponse = {
  sent: Array<{ email: string; kind: 'existing_user' | 'pending_registration' }>;
  skipped: Array<{ email: string; reason: string }>;
};

type SessionInviteErrorBody = { error?: string };

export default function Home() {
  const [, navigate] = useLocation();
  const [wizardStep, setWizardStep] = useState<WizardStep>('upload');
  const [collabSessionId, setCollabSessionId] = useState<string | null>(null);
  const [inviteEmailsText, setInviteEmailsText] = useState('');
  const [inviteConfirmOpen, setInviteConfirmOpen] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<
    Array<{
      id: string;
      file: File;
      progress: number;
      status: 'queued' | 'uploading' | 'uploaded' | 'failed';
      error?: string;
    }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { httpClient } = useApiAuth();
  const uploadService = useMemo(() => new DocumentUploadService(httpClient), [httpClient]);

  const parsedInviteEmails = useMemo(() => parseEmailsFromInput(inviteEmailsText), [inviteEmailsText]);

  function buildFileId(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return;

    const pdfFiles: File[] = [];
    let skippedFiles = 0;
    for (const file of files) {
      if (file.type === 'application/pdf') {
        pdfFiles.push(file);
      } else {
        skippedFiles += 1;
      }
    }

    if (skippedFiles > 0) {
      toast.error('Only PDF files can be added');
    }

    if (pdfFiles.length === 0) return;

    setSelectedFiles((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const newRows = pdfFiles
        .filter((file) => !existingIds.has(buildFileId(file)))
        .map((file) => ({
          id: buildFileId(file),
          file,
          progress: 0,
          status: 'queued' as const,
          error: undefined,
        }));
      return [...prev, ...newRows];
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    addFiles(files);
    e.target.value = '';
  }

  function removeFile(id: string) {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isUploading) return;
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isUploading) return;
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (isUploading) return;
    addFiles(Array.from(e.dataTransfer.files ?? []));
  };

  function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    void startUpload();
  }

  async function startUpload() {
    if (selectedFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setSelectedFiles((prev) =>
      prev.map((item) => ({
        ...item,
        progress: 0,
        status: 'queued',
        error: undefined,
      })),
    );

    try {
      const fileIdByIndex = selectedFiles.map((item) => item.id);
      const { sessionId } = await uploadService.executeBatchUploadFlow({
        files: selectedFiles.map((item) => ({
          file: item.file,
          filename: item.file.name,
        })),
        contentType: 'application/pdf',
        concurrency: 4,
        onFileProgress: ({ fileIndex, progress }) => {
          const fileId = fileIdByIndex[fileIndex];
          setSelectedFiles((prev) =>
            prev.map((item) => (item.id === fileId ? { ...item, progress, status: 'uploading' } : item)),
          );
        },
        onFileStatusChange: ({ fileIndex, status, error }) => {
          const fileId = fileIdByIndex[fileIndex];
          setSelectedFiles((prev) =>
            prev.map((item) =>
              item.id === fileId
                ? {
                    ...item,
                    status,
                    error,
                    progress: status === 'uploaded' ? 100 : item.progress,
                  }
                : item,
            ),
          );
        },
      });

      setIsUploading(false);
      toast.success('Upload complete');
      setCollabSessionId(sessionId);
      setWizardStep('invite');
      setSelectedFiles([]);
    } catch (err) {
      console.error('Cloud upload failed:', err);
      toast.error('One or more uploads failed. Please try again.');
      setIsUploading(false);
    }
  }

  function handleInviteFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emails = parseEmailsFromInput(inviteEmailsText);
    if (emails.length === 0) {
      toast.error('Enter at least one email, or skip to open the session without inviting anyone.');
      return;
    }
    setInviteConfirmOpen(true);
  }

  function goToSession() {
    if (!collabSessionId) return;
    navigate(`/document/${collabSessionId}`);
  }

  const handleConfirmSendInvites = () => {
    void submitInvitesAfterConfirm();
  };

  async function submitInvitesAfterConfirm() {
    if (!collabSessionId) return;
    const emails = parseEmailsFromInput(inviteEmailsText);
    if (emails.length === 0) {
      toast.error('Enter at least one email address.');
      return;
    }

    setIsSendingInvites(true);
    try {
      const res = await httpClient.post<SessionInviteResponse, SessionInviteErrorBody>(
        `/api/sessions/${collabSessionId}/invites`,
        {
          body: JSON.stringify({ emails }),
        },
      );

      if (!res.ok) {
        const errBody = res.data;
        const message =
          typeof errBody === 'object' && errBody !== null && 'error' in errBody && typeof errBody.error === 'string'
            ? errBody.error
            : 'Invites could not be sent.';
        toast.error(message);
        return;
      }

      if (typeof res.data === 'string') {
        toast.error('Invites could not be sent.');
        return;
      }

      const skipped = res.data.skipped?.length ?? 0;
      const sent = res.data.sent?.length ?? 0;
      if (skipped > 0) {
        toast.success(`Sent ${sent} invitation(s). ${skipped} address(es) were skipped (invalid or your own email).`);
      } else {
        toast.success(`Invitation emails sent to ${sent} recipient(s).`);
      }
      setInviteConfirmOpen(false);
      navigate(`/document/${collabSessionId}`);
    } catch {
      toast.error('Invites could not be sent.');
    } finally {
      setIsSendingInvites(false);
    }
  }

  return (
    <div className='flex flex-col items-center justify-center flex-1 p-4 sm:p-8'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4'>
            <FilePdf size={32} weight='fill' className='text-primary-foreground' />
          </div>
          <h1
            className='text-3xl font-bold text-foreground tracking-tight'
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Party-PDF
          </h1>
          <p className='mt-2 text-muted-foreground text-sm'>Upload a PDF to start a real-time collaboration session</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {wizardStep === 'upload' ? 'Step 1 of 2 · Upload' : 'Step 2 of 2 · Invite'}
          </p>
        </div>

        {wizardStep === 'upload' ? (
          <Card className='shadow-lg border-2'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-lg' style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Upload Document
              </CardTitle>
              <CardDescription>Select PDF files to generate a shareable collaboration link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadSubmit} className='space-y-6'>
                <div className='space-y-2'>
                  <Label htmlFor='pdf-upload'>PDF File</Label>
                  <div
                    role='button'
                    onClick={() => {
                      if (isUploading) return;
                      fileInputRef.current?.click();
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                    relative cursor-pointer rounded-lg border-2 border-dashed transition-colors
                    ${
                      isDragActive
                        ? 'border-primary bg-primary/10'
                        : selectedFiles.length > 0
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }
                    p-6 text-center
                  `}
                  >
                    <input
                      ref={fileInputRef}
                      id='pdf-upload'
                      type='file'
                      accept='application/pdf'
                      multiple
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className='sr-only'
                    />
                    {selectedFiles.length > 0 ? (
                      <div className='flex flex-col items-center gap-2'>
                        <FilePdf size={24} className='text-primary' />
                        <div>
                          <p className='text-sm font-medium text-foreground'>
                            {selectedFiles.length} PDF file{selectedFiles.length > 1 ? 's' : ''} selected
                          </p>
                          <p className='text-xs text-muted-foreground mt-1'>Click or drop more files to add them</p>
                        </div>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center gap-2'>
                        <Upload size={24} className='text-muted-foreground' />
                        <div>
                          <p className='text-sm font-medium text-foreground'>Click or drop PDFs to add files</p>
                          <p className='text-xs text-muted-foreground mt-1'>PDF files only, multiple supported</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className='rounded-md border overflow-hidden'>
                    <table className='w-full text-sm'>
                      <thead className='bg-muted/50'>
                        <tr className='text-left'>
                          <th className='px-3 py-2 font-medium text-muted-foreground'>File</th>
                          <th className='px-3 py-2 font-medium text-muted-foreground'>Size</th>
                          <th className='px-3 py-2 font-medium text-muted-foreground'>Status</th>
                          {!isUploading && <th className='px-3 py-2 w-10' />}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFiles.map((item) => (
                          <tr key={item.id} className='border-t'>
                            <td className='px-3 py-2 max-w-40 truncate' title={item.file.name}>
                              {item.file.name}
                            </td>
                            <td className='px-3 py-2 text-muted-foreground'>{formatFileSize(item.file.size)}</td>
                            <td className='px-3 py-2'>
                              <div className='space-y-1'>
                                <div className='text-xs text-muted-foreground'>
                                  {item.status === 'queued' && 'Queued'}
                                  {item.status === 'uploading' && `Uploading ${item.progress}%`}
                                  {item.status === 'uploaded' && 'Uploaded'}
                                  {item.status === 'failed' && (item.error ?? 'Failed')}
                                </div>
                                {isUploading && (
                                  <div className='w-full h-1.5 bg-muted rounded-full overflow-hidden'>
                                    <div
                                      className={`h-full transition-all duration-300 ease-out ${
                                        item.status === 'failed' ? 'bg-destructive' : 'bg-primary'
                                      }`}
                                      style={{
                                        width: `${item.status === 'uploaded' ? 100 : item.progress}%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                            {!isUploading && (
                              <td className='px-3 py-2'>
                                <button
                                  type='button'
                                  onClick={() => removeFile(item.id)}
                                  className='inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                                  aria-label={`Remove ${item.file.name}`}
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button
                  type='submit'
                  className='w-full h-12 text-base font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]'
                  disabled={selectedFiles.length === 0 || isUploading}
                >
                  {isUploading ? (
                    <div className='flex items-center gap-2'>
                      <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent' />
                      <span>Uploading files...</span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <Upload size={18} />
                      <span>Upload & continue</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className='shadow-lg border-2'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-lg' style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Invite participants
              </CardTitle>
              <CardDescription>
                Add email addresses for people who should join this session. They will receive an email with next steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteFormSubmit} className='space-y-6'>
                <div className='space-y-2'>
                  <Label htmlFor='invite-emails'>Email addresses</Label>
                  <Textarea
                    id='invite-emails'
                    placeholder={'colleague@company.com, friend@example.com'}
                    value={inviteEmailsText}
                    onChange={(e) => setInviteEmailsText(e.target.value)}
                    rows={5}
                    disabled={isSendingInvites}
                    className='resize-y min-h-[120px]'
                  />
                  <p className='text-xs text-muted-foreground'>
                    Separate multiple addresses with commas, spaces, or new lines.
                    {parsedInviteEmails.length > 0 ? ` ${parsedInviteEmails.length} valid address(es) detected.` : ''}
                  </p>
                </div>
                <div className='flex flex-col gap-2'>
                  <Button
                    type='submit'
                    className='w-full h-12 text-base font-semibold'
                    disabled={isSendingInvites || parsedInviteEmails.length === 0}
                  >
                    Send invitations
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    onClick={goToSession}
                    disabled={isSendingInvites}
                  >
                    Skip · open session only
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <p className='text-center text-xs text-muted-foreground mt-6'>
          Documents are uploaded to the cloud. Share the URL to collaborate.
        </p>
      </div>

      <Dialog open={inviteConfirmOpen} onOpenChange={setInviteConfirmOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Send invitation emails?</DialogTitle>
            <DialogDescription>
              {parsedInviteEmails.length} participant
              {parsedInviteEmails.length === 1 ? '' : 's'} will receive an email. People who already have an account
              will get a link straight to this session. Others will get a sign-up link so they can register and then
              open the document room.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setInviteConfirmOpen(false)}
              disabled={isSendingInvites}
            >
              Cancel
            </Button>
            <Button type='button' onClick={handleConfirmSendInvites} disabled={isSendingInvites}>
              {isSendingInvites ? 'Sending…' : 'Confirm and send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
