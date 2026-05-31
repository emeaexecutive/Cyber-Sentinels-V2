"use client";

import { DragEvent, FormEvent, useRef, useState } from "react";

const allowedTypes = new Map([
  ["application/pdf", "PDF"],
  ["image/png", "PNG"],
  ["image/jpeg", "JPG"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "DOCX",
  ],
]);
const maxFileSize = 10 * 1024 * 1024;

function fileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  return extension === "jpeg" ? "jpg" : extension;
}

function isAllowedFile(file: File) {
  const extension = fileExtension(file);

  return (
    allowedTypes.has(file.type) ||
    ["pdf", "png", "jpg", "jpeg", "docx"].includes(extension)
  );
}

export function EvidenceUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [verificationCaseId, setVerificationCaseId] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function selectFile(nextFile: File | null) {
    setError(null);
    setMessage(null);

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!isAllowedFile(nextFile)) {
      setFile(null);
      setError("Supported files: PDF, PNG, JPG, JPEG, DOCX.");
      return;
    }

    if (nextFile.size > maxFileSize) {
      setFile(null);
      setError("Evidence file must be 10MB or smaller.");
      return;
    }

    setFile(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files.item(0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!verificationCaseId.trim() || !file) {
      setError("Verification case ID and file are required.");
      return;
    }

    setIsUploading(true);
    setProgress(10);

    const body = new FormData();
    body.set("verification_case_id", verificationCaseId.trim());
    body.set("file", file);
    body.set("evidence_url", evidenceUrl.trim());
    body.set("notes", notes.trim());

    setProgress(40);

    const response = await fetch("/api/evidence/upload", {
      method: "POST",
      credentials: "include",
      body,
    });

    setProgress(85);

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    if (!response.ok || !payload?.ok) {
      setIsUploading(false);
      setProgress(0);
      setError(payload?.error ?? "Could not register uploaded evidence.");
      return;
    }

    setProgress(100);
    setIsUploading(false);
    setMessage("Evidence uploaded.");
    setFile(null);
    setEvidenceUrl("");
    setNotes("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
      {message ? (
        <p className="rounded-lg border border-emerald-800 bg-black p-3 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-900 bg-black p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <label className="grid gap-2 text-sm text-zinc-400">
        Verification case ID
        <input
          value={verificationCaseId}
          onChange={(event) => setVerificationCaseId(event.target.value)}
          required
          className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
        />
      </label>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-lg border border-dashed p-5 text-center ${
          isDragging
            ? "border-cyan-400 bg-cyan-950/20"
            : "border-zinc-700 bg-black"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(event) => selectFile(event.target.files?.item(0) ?? null)}
        />
        <p className="text-sm text-zinc-300">
          {file ? file.name : "Drag and drop evidence here"}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          PDF, PNG, JPG, JPEG, DOCX
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:text-white"
        >
          Choose File
        </button>
      </div>

      <label className="grid gap-2 text-sm text-zinc-400">
        Optional evidence URL
        <input
          value={evidenceUrl}
          onChange={(event) => setEvidenceUrl(event.target.value)}
          type="url"
          className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
        />
      </label>

      <label className="grid gap-2 text-sm text-zinc-400">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="rounded-lg border border-zinc-800 bg-black p-3 text-white"
        />
      </label>

      {isUploading || progress > 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-black p-3">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full rounded-full bg-cyan-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">{progress}% uploaded</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isUploading}
        className="rounded-lg bg-white p-3 font-semibold text-black disabled:cursor-not-allowed disabled:bg-zinc-600"
      >
        Upload Evidence
      </button>
    </form>
  );
}
