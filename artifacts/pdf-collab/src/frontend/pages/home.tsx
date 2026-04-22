import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ulid } from "ulid";
import { toast } from "sonner";
import { FilePdf, Upload, Sun, Moon } from "@phosphor-icons/react";
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
import { useTheme } from "@/lib/theme";
import "./home.styles.scss";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

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
  const { isDark, toggleTheme } = useTheme();

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
    <div className="home-page">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="home-page__theme-toggle"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
      </Button>
      <div className="home-page__container">
        <div className="home-page__hero">
          <div className="home-page__hero-icon-wrap">
            <FilePdf
              size={32}
              weight="fill"
              className="home-page__hero-icon"
            />
          </div>
          <h1 className="home-page__title">
            DocCollab
          </h1>
          <p className="home-page__subtitle">
            Upload a PDF to start a real-time collaboration session
          </p>
        </div>

        <Card className="home-page__card">
          <CardHeader className="home-page__card-header">
            <CardTitle className="home-page__card-title">
              Upload Document
            </CardTitle>
            <CardDescription>
              Select a PDF file to generate a shareable collaboration link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="home-page__form">
              <div className="home-page__field">
                <Label htmlFor="pdf-upload">PDF File</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`home-page__dropzone ${
                    selectedFile
                      ? "home-page__dropzone--selected"
                      : "home-page__dropzone--idle"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="home-page__hidden-input"
                  />
                  {selectedFile ? (
                    <div className="home-page__selected-file">
                      <div className="home-page__selected-file-icon-wrap">
                        <FilePdf
                          size={20}
                          weight="fill"
                          className="home-page__selected-file-icon"
                        />
                      </div>
                      <div className="home-page__selected-file-meta">
                        <p className="home-page__selected-file-name">
                          {selectedFile.name}
                        </p>
                        <p className="home-page__selected-file-size">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="home-page__dropzone-empty">
                      <Upload size={24} className="home-page__dropzone-empty-icon" />
                      <div>
                        <p className="home-page__dropzone-empty-title">
                          Click to select a PDF
                        </p>
                        <p className="home-page__dropzone-empty-help">
                          PDF files only
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="home-page__progress">
                  <div className="home-page__progress-header">
                    <span className="home-page__progress-label">Uploading...</span>
                    <span className="home-page__progress-value">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="home-page__progress-track">
                    <div
                      className="home-page__progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="home-page__submit"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <div className="home-page__submit-content">
                    <div className="home-page__submit-spinner" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="home-page__submit-content">
                    <Upload size={18} />
                    <span>Start Collaboration</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="home-page__footnote">
          Documents are uploaded to the cloud. Share the URL to collaborate.
        </p>
      </div>
    </div>
  );
}
