import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ulid } from "ulid";
import { toast } from "sonner";
import { FilePdf, Upload } from "@phosphor-icons/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveDocument } from "@/lib/indexeddb";
import { formatFileSize } from "@/lib/utils";

const API_BASE = "https://oblockparty.xvzf.workers.dev/api";

function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Upload network error")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.send(file);
  });
}

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a PDF file");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadUrlRes = await fetch(
        `${API_BASE}/upload-url?filename=${encodeURIComponent(selectedFile.name)}&contentType=application/pdf`,
      );
      if (!uploadUrlRes.ok) {
        throw new Error("Failed to get upload URL");
      }
      const { url: uploadUrl, id } = await uploadUrlRes.json();

      await uploadFileWithProgress(uploadUrl, selectedFile, setUploadProgress);

      const downloadUrlRes = await fetch(`${API_BASE}/download-url/${id}`);
      if (!downloadUrlRes.ok) {
        throw new Error("Failed to get download URL");
      }
      const { url: downloadUrl } = await downloadUrlRes.json();

      sessionStorage.setItem(
        id,
        JSON.stringify({ name: selectedFile.name, downloadUrl }),
      );

      setIsUploading(false);
      setUploadProgress(0);
      navigate(`/document/${id}`);
    } catch (err) {
      console.error("Cloud upload failed, falling back to local storage:", err);
      try {
        const id = ulid();
        await saveDocument({
          id,
          name: selectedFile.name,
          blob: selectedFile,
          createdAt: Date.now(),
        });
        toast.info("Cloud upload failed. Loading document locally instead.");
        setIsUploading(false);
        setUploadProgress(0);
        navigate(`/document/${id}`);
      } catch (localErr) {
        console.error("Local fallback also failed:", localErr);
        toast.error("Failed to store document. Please try again.");
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <FilePdf
              size={32}
              weight="fill"
              className="text-primary-foreground"
            />
          </div>
          <h1
            className="text-3xl font-bold text-foreground tracking-tight"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            DocCollab
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Upload a PDF to start a real-time collaboration session
          </p>
        </div>

        <Card className="shadow-lg border-2">
          <CardHeader className="pb-4">
            <CardTitle
              className="text-lg"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              Upload Document
            </CardTitle>
            <CardDescription>
              Select a PDF file to generate a shareable collaboration link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pdf-upload">PDF File</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative cursor-pointer rounded-lg border-2 border-dashed transition-colors
                    ${
                      selectedFile
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }
                    p-6 text-center
                  `}
                >
                  <input
                    ref={fileInputRef}
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FilePdf
                          size={20}
                          weight="fill"
                          className="text-primary"
                        />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={24} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Click to select a PDF
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF files only
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium text-foreground">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload size={18} />
                    <span>Start Collaboration</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Documents are uploaded to the cloud. Share the URL to collaborate.
        </p>
      </div>
    </div>
  );
}
