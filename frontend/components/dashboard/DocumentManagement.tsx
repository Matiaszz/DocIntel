"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Folder,
  FolderPlus,
  File,
  ChevronDown,
  Upload,
  Loader2,
  Globe,
  Lock,
  AlertCircle,
  RefreshCw,
  Search,
  FileText,
  ArrowLeft,
  HardDrive,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Star,
  Tag,
  Play,
  Pause,
} from "lucide-react";
import { fetchClient, getAccessToken } from "../../lib/api";
import { uploadToS3, uploadPartToS3, downloadFromS3 } from "../../lib/s3";
import { useCategories } from "../../hooks/useCategories";
import FeedbackModal from "./FeedbackModal";
import Image from "next/image";

interface TreeNode {
  id: string;
  name: string;
  type: "FOLDER" | "FILE";
  s3Key?: string | null;
  visibility?: "PUBLIC" | "PRIVATE" | null;
  category?: string | null;
  analyzed?: boolean;
  children: TreeNode[];
  favorite?: boolean;
  tags?: string;
}

interface TransferItem {
  id: string;
  type: "upload" | "download";
  name: string;
  size: number;
  progress: number;
  status: "transferring" | "paused" | "error" | "completed" | "interrupted";
  errorMsg?: string;
  file?: File;
  isMultipart?: boolean;
  uploadUrl?: string;
  uploadId?: string;
  uploadUrls?: string[];
  partSize?: number;
  completedParts?: { partNumber: number; eTag: string }[];
  category?: string;
  folderId?: string;
}

const DB_NAME = "DocIntelTransfersDB";
const STORE_NAME = "files";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const storeFile = async (id: string, file: File): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(file, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB store error:", e);
  }
};

const getFile = async (id: string): Promise<File | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB get error:", e);
    return null;
  }
};

const deleteFile = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB delete error:", e);
  }
};

const LOADING_PHRASES = [
  "Buscando o arquivo no servidor...",
  "Lendo o cabeçalho do documento...",
  "Passando um cafézinho enquanto decodificamos os bytes...",
  "Organizando a mesa para ler as páginas...",
  "Descriptografando segredos binários...",
  "Polindo as letras para você ler melhor...",
  "Traduzindo os bits em pixels bonitos...",
  "Quase pronto! Preparando o visualizador...",
  "Só mais um segundo, estamos ajeitando tudo...",
];

export default function DocumentManagement() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setLoadingPhraseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  const [error, setError] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // View states
  const [viewMode, setViewMode] = useState<"tree" | "categories">("tree");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals / Inputs
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("GENERAL");
  const [showUploadCategoryDropdown, setShowUploadCategoryDropdown] =
    useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);

  // Background transfers state
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [showTransfersWidget, setShowTransfersWidget] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const transfersRef = useRef<TransferItem[]>([]);

  useEffect(() => {
    transfersRef.current = transfers;
  }, [transfers]);

  const saveTransfersToLocalStorage = (items: TransferItem[]) => {
    const serializable = items.map(({ file, ...rest }) => rest);
    localStorage.setItem(
      "docintel_pending_transfers",
      JSON.stringify(serializable),
    );
  };

  useEffect(() => {
    const restoreTransfers = async () => {
      const stored = localStorage.getItem("docintel_pending_transfers");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as TransferItem[];
          const restored = await Promise.all(
            parsed.map(async (t) => {
              if (
                t.status === "transferring" ||
                t.status === "paused" ||
                t.status === "interrupted"
              ) {
                const file = await getFile(t.id);
                if (file) {
                  return { ...t, status: "paused" as const, file };
                } else {
                  return { ...t, status: "interrupted" as const };
                }
              }
              return t;
            }),
          );
          setTransfers(restored);
          if (restored.length > 0) {
            setShowTransfersWidget(true);
          }
        } catch (e) {
          console.error("Error loading transfers from localStorage", e);
        }
      }
    };
    restoreTransfers();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setTransfers((prev) => {
        const failedUploads = prev.filter(
          (t) => t.type === "upload" && t.status === "error" && t.file,
        );
        failedUploads.forEach((t) => {
          if (t.file) {
            startOrResumeUpload(t.file, t);
          }
        });
        return prev;
      });
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [transfers]);

  const updateTransferProgress = (id: string, progress: number) => {
    transfersRef.current = transfersRef.current.map((t) =>
      t.id === id ? { ...t, progress } : t,
    );
    setTransfers((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, progress } : t));
      saveTransfersToLocalStorage(updated);
      return updated;
    });
  };

  const updateTransferProgressAndParts = (
    id: string,
    progress: number,
    completedParts: { partNumber: number; eTag: string }[],
  ) => {
    transfersRef.current = transfersRef.current.map((t) =>
      t.id === id ? { ...t, progress, completedParts } : t,
    );
    setTransfers((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, progress, completedParts } : t,
      );
      saveTransfersToLocalStorage(updated);
      return updated;
    });
  };

  const updateTransferStatus = (
    id: string,
    status: TransferItem["status"],
    progress?: number,
    errorMsg?: string,
  ) => {
    transfersRef.current = transfersRef.current.map((t) => {
      if (t.id === id) {
        const item = { ...t, status };
        if (progress !== undefined) item.progress = progress;
        if (errorMsg !== undefined) item.errorMsg = errorMsg;
        return item;
      }
      return t;
    });
    setTransfers((prev) => {
      const updated = prev.map((t) => {
        if (t.id === id) {
          const item = { ...t, status };
          if (progress !== undefined) item.progress = progress;
          if (errorMsg !== undefined) item.errorMsg = errorMsg;
          return item;
        }
        return t;
      });
      saveTransfersToLocalStorage(updated);
      return updated;
    });
  };

  const startOrResumeUpload = async (
    file: File,
    existingTransfer?: TransferItem,
  ) => {
    let transferId = existingTransfer?.id || "";
    let isMultipart = existingTransfer?.isMultipart ?? false;
    let uploadUrl = existingTransfer?.uploadUrl ?? "";
    let uploadId = existingTransfer?.uploadId ?? "";
    let uploadUrls = existingTransfer?.uploadUrls ?? [];
    let partSize = existingTransfer?.partSize ?? 5 * 1024 * 1024;
    let completedParts = existingTransfer?.completedParts
      ? [...existingTransfer.completedParts]
      : [];

    setShowTransfersWidget(true);

    try {
      if (!existingTransfer) {
        const initiateData = await fetchClient.internal.request<{
          document: { id: string; status: string };
          isMultipart: boolean;
          uploadUrl?: string;
          uploadId?: string;
          uploadUrls?: string[];
          partSize: number;
        }>("/api/documents/upload/initiate", {
          method: "POST",
          body: {
            name: file.name,
            size: file.size,
            parentFolderId: selectedFolderId || undefined,
            category: uploadCategory,
          },
        });

        const docMetadata = initiateData.document;
        transferId = docMetadata.id;
        isMultipart = initiateData.isMultipart;
        uploadUrl = initiateData.uploadUrl || "";
        uploadId = initiateData.uploadId || "";
        uploadUrls = initiateData.uploadUrls || [];
        partSize = initiateData.partSize;
        completedParts = [];

        const newItem: TransferItem = {
          id: transferId,
          type: "upload",
          name: file.name,
          size: file.size,
          progress: 0,
          status: "transferring",
          file,
          isMultipart,
          uploadUrl,
          uploadId,
          uploadUrls,
          partSize,
          completedParts,
          category: uploadCategory,
          folderId: selectedFolderId || undefined,
        };

        setTransfers((prev) => {
          const updated = [newItem, ...prev];
          saveTransfersToLocalStorage(updated);
          return updated;
        });
      } else {
        setTransfers((prev) => {
          const updated = prev.map((t) =>
            t.id === transferId
              ? { ...t, status: "transferring" as const, file }
              : t,
          );
          saveTransfersToLocalStorage(updated);
          return updated;
        });
      }

      await storeFile(transferId, file);
      performUpload(
        transferId,
        file,
        isMultipart,
        uploadUrl,
        uploadId,
        uploadUrls,
        partSize,
        completedParts,
      );
    } catch (err) {
      if (transferId) {
        updateTransferStatus(
          transferId,
          "error",
          undefined,
          err instanceof Error ? err.message : "Erro ao iniciar upload",
        );
      }
    }
  };

  const performUpload = async (
    id: string,
    file: File,
    isMultipart: boolean,
    uploadUrl: string,
    uploadId: string,
    uploadUrls: string[],
    partSize: number,
    completedParts: { partNumber: number; eTag: string }[],
  ) => {
    try {
      console.log(
        `[Upload] Iniciando upload de "${file.name}". Tamanho: ${file.size} bytes. Modo multipart: ${isMultipart}`,
      );
      if (!isMultipart) {
        await uploadToS3(uploadUrl, file);

        updateTransferProgress(id, 90);

        await fetchClient.internal.request(`/api/documents/${id}/complete`, {
          method: "POST",
          body: {},
        });

        await deleteFile(id);
        updateTransferStatus(id, "completed", 100);
      } else {
        const totalParts = uploadUrls.length;

        for (let i = 0; i < totalParts; i++) {
          const partNumber = i + 1;
          const isUploaded = completedParts.some(
            (p) => p.partNumber === partNumber,
          );
          if (isUploaded) continue;

          const currentItem = await getLatestTransferItem(id);
          if (currentItem && currentItem.status !== "transferring") return;

          const start = i * partSize;
          const end = Math.min(start + partSize, file.size);
          const slice = file.slice(start, end);
          const partUrl = uploadUrls[i];

          const response = await uploadPartToS3(partUrl, slice);

          const eTag = response.headers.get("ETag");
          if (!eTag) {
            throw new Error(`ETag não retornada para a parte ${partNumber}.`);
          }

          const cleanETag = eTag.replace(/"/g, "");
          const existingIndex = completedParts.findIndex(
            (p) => p.partNumber === partNumber,
          );
          if (existingIndex > -1) {
            completedParts[existingIndex].eTag = cleanETag;
          } else {
            completedParts.push({
              partNumber,
              eTag: cleanETag,
            });
          }

          const progressPercent = Math.round(
            (completedParts.length / totalParts) * 90,
          );
          updateTransferProgressAndParts(id, progressPercent, completedParts);
        }

        // Ordenação ascendente por número da parte (exigência estrita do S3)
        completedParts.sort((a, b) => a.partNumber - b.partNumber);

        await fetchClient.internal.request(`/api/documents/${id}/complete`, {
          method: "POST",
          body: {
            uploadId,
            completedParts,
          },
        });

        await deleteFile(id);
        updateTransferStatus(id, "completed", 100);
      }

      await fetchTree();
    } catch (err) {
      console.error("[Upload] Erro durante o upload:", err);
      updateTransferStatus(
        id,
        "error",
        undefined,
        err instanceof Error ? err.message : "Erro no envio",
      );
    }
  };

  const getLatestTransferItem = async (
    id: string,
  ): Promise<TransferItem | undefined> => {
    return transfersRef.current.find((t) => t.id === id);
  };

  const togglePauseResume = async (id: string) => {
    const item = await getLatestTransferItem(id);
    if (!item) return;

    if (item.status === "transferring") {
      updateTransferStatus(id, "paused");
    } else if (item.status === "paused") {
      let file = item.file;
      if (!file) {
        file = (await getFile(id)) || undefined;
      }

      if (file) {
        updateTransferStatus(id, "transferring");
        performUpload(
          id,
          file,
          item.isMultipart || false,
          item.uploadUrl || "",
          item.uploadId || "",
          item.uploadUrls || [],
          item.partSize || 5 * 1024 * 1024,
          item.completedParts || [],
        );
      } else {
        setResumingId(id);
        resumeInputRef.current?.click();
      }
    } else if (item.status === "interrupted") {
      const file = (await getFile(id)) || undefined;
      if (file) {
        updateTransferStatus(id, "transferring");
        performUpload(
          id,
          file,
          item.isMultipart || false,
          item.uploadUrl || "",
          item.uploadId || "",
          item.uploadUrls || [],
          item.partSize || 5 * 1024 * 1024,
          item.completedParts || [],
        );
      } else {
        setResumingId(id);
        resumeInputRef.current?.click();
      }
    }
  };

  const cancelTransfer = async (id: string) => {
    const item = transfers.find((t) => t.id === id);
    if (item && item.type === "upload") {
      try {
        await fetchClient.internal.request(`/api/documents/${id}`, {
          method: "DELETE",
        });
      } catch (e) {
        console.error("Error deleting pending doc", e);
      }
    }
    await deleteFile(id);
    setTransfers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveTransfersToLocalStorage(updated);
      return updated;
    });
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && resumingId) {
      const existing = transfers.find((t) => t.id === resumingId);
      if (existing) {
        startOrResumeUpload(file, existing);
      }
      setResumingId(null);
    }
  };

  const { categories, resolveCategory, getBadgeColor } = useCategories();

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (cat) =>
        cat.label.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
        (cat.description &&
          cat.description
            .toLowerCase()
            .includes(categorySearchQuery.toLowerCase())),
    );
  }, [categories, categorySearchQuery]);

  // Right-click and file preview / delete states
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode | null;
    type?: "node" | "empty";
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<TreeNode | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [zoomScale, setZoomScale] = useState(100);
  const [folderToDelete, setFolderToDelete] = useState<TreeNode | null>(null);
  const [fileToDelete, setFileToDelete] = useState<TreeNode | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  const [backendPaginatedFiles, setBackendPaginatedFiles] = useState<
    TreeNode[]
  >([]);
  const [backendTotalPages, setBackendTotalPages] = useState(1);
  const [backendTotalElements, setBackendTotalElements] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tempTags, setTempTags] = useState("");

  // Effect to load paginated search and category results from backend
  useEffect(() => {
    if (viewMode !== "categories") return;

    const fetchPaginated = async () => {
      setSearchLoading(true);
      try {
        const isFav = selectedCategoryFilter === "FAVORITES" ? "true" : "";
        const cat =
          selectedCategoryFilter !== "ALL" &&
          selectedCategoryFilter !== "FAVORITES"
            ? selectedCategoryFilter
            : "";

        const data = await fetchClient.internal.request<any>(
          "/api/documents/search",
          {
            method: "GET",
            params: {
              search: searchTerm,
              category: cat,
              favorite: isFav ? "true" : undefined,
              page: (currentPage - 1).toString(),
              size: "6",
            },
          },
        );

        if (data) {
          const mapped: TreeNode[] = (data.content || []).map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            type: "FILE",
            s3Key: doc.s3Key,
            category: doc.category,
            analyzed: doc.analyzed,
            favorite: doc.favorite,
            tags: doc.tags || "",
            children: [],
          }));
          setBackendPaginatedFiles(mapped);
          setBackendTotalPages(data.totalPages || 1);
          setBackendTotalElements(data.totalElements || 0);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchPaginated();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [
    viewMode,
    selectedCategoryFilter,
    searchTerm,
    currentPage,
    searchTrigger,
  ]);

  useEffect(() => {
    if (!uploadFile) {
      setUploadPreviewUrl(null);
      return;
    }

    if (uploadFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(uploadFile);
      setUploadPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setUploadPreviewUrl(null);
    }
  }, [uploadFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const closeUploadModal = () => {
    setUploadFile(null);
    setShowUploadModal(false);
    setCategorySearchQuery("");
  };

  // Close context menu on any document click
  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
      type: "node",
    });
  };

  const handleEmptyContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node: null,
      type: "empty",
    });
  };

  const handleDownloadFile = async (node: TreeNode) => {
    await downloadBlob("/api/documents/download/" + node.id, node.name);
  };

  const downloadBlob = async (url: string, filename: string) => {
    try {
      setLoading(true);
      if (url.includes("/api/documents/download/")) {
        const docId = url.split("/").pop();
        const presignedData = await fetchClient.internal.request<{
          url: string;
        }>(`/api/documents/${docId}/presigned-url`);

        const blob = await downloadFromS3(presignedData.url, () => {});
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${url}`;
        const headers: Record<string, string> = {};
        const token = getAccessToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await fetch(downloadUrl, { headers });
        if (!response.ok) {
          throw new Error("Falha ao baixar o arquivo.");
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error(err);
      setError("Falha ao baixar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFile = async (node: TreeNode) => {
    try {
      setLoading(true);
      const presignedData = await fetchClient.internal.request<{ url: string }>(
        `/api/documents/${node.id}/presigned-url`,
      );

      const blob = await downloadFromS3(presignedData.url, () => {});
      const objectUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setPreviewFileName(node.name);
      setPreviewFile(node);
    } catch (err) {
      console.error(err);
      setError("Falha ao abrir arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
    setZoomScale(100);
    setIsEditingTags(false);
  };

  const handleToggleFavorite = async (node: TreeNode) => {
    try {
      await fetchClient.internal.request(`/api/documents/${node.id}/favorite`, {
        method: "PUT",
      });
      await fetchTree();
      setSearchTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      setError("Falha ao atualizar favoritos.");
    }
  };

  const handleSaveTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewFile) return;

    try {
      const updatedNode = await fetchClient.internal.request<any>(
        `/api/documents/${previewFile.id}/tags`,
        {
          method: "PUT",
          body: JSON.stringify(tempTags), // pass raw tag string
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (updatedNode) {
        setPreviewFile((prev) =>
          prev ? { ...prev, tags: updatedNode.tags } : null,
        );
        setIsEditingTags(false);
        await fetchTree();
        setSearchTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
      setError("Falha ao salvar tags.");
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      setIsDeleting(true);
      await fetchClient.internal.request(`/api/documents/${id}`, {
        method: "DELETE",
      });
      await fetchTree();
      setFileToDelete(null);
      setFeedbackModal({
        isOpen: true,
        type: "success",
        title: "Documento Excluído",
        message: "O documento foi excluído com sucesso!",
      });
    } catch (err) {
      console.error(err);
      setError("Falha ao excluir o documento.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      setIsDeleting(true);
      await fetchClient.internal.request(`/api/documents/folders/${id}`, {
        method: "DELETE",
      });
      setSelectedFolderId(null);
      await fetchTree();
      setFolderToDelete(null);
      setFeedbackModal({
        isOpen: true,
        type: "success",
        title: "Pasta Excluída",
        message:
          "A pasta e todos os seus documentos foram excluídos com sucesso!",
      });
    } catch (err) {
      console.error(err);
      setError("Falha ao excluir a pasta.");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClient.internal.request<TreeNode[]>(
        "/api/documents/tree",
      );
      setTree(data || []);
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar a estrutura de arquivos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryFilter]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      await fetchClient.internal.request("/api/documents/resolve-path", {
        method: "POST",
        params: {
          relativePath: newFolderName.trim() + "/",
          parentFolderId: selectedFolderId || undefined,
        },
      });
      setNewFolderName("");
      setShowNewFolderModal(false);
      await fetchTree();
    } catch (err) {
      console.error(err);
      setError("Falha ao criar pasta.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const existing = transfers.find(
      (t) =>
        t.name === uploadFile.name &&
        t.size === uploadFile.size &&
        t.status === "interrupted",
    );

    closeUploadModal();

    if (existing) {
      startOrResumeUpload(uploadFile, existing);
    } else {
      startOrResumeUpload(uploadFile);
    }
  };

  // Helper to flatten files in the tree
  // Helper to flatten files in the tree
  const getFlatFiles = (nodes: TreeNode[]): TreeNode[] => {
    let files: TreeNode[] = [];
    nodes.forEach((node) => {
      if (node.type === "FILE") {
        files.push(node);
      } else if (node.type === "FOLDER" && node.children) {
        files = [...files, ...getFlatFiles(node.children)];
      }
    });
    return files;
  };

  const allFiles = useMemo(() => getFlatFiles(tree), [tree]);

  const filteredFiles = useMemo(() => {
    return allFiles.filter((file) => {
      const matchesSearch = file.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === "ALL" ||
        file.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allFiles, searchTerm, selectedCategoryFilter]);

  const itemsPerPage = 6;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredFiles.length / itemsPerPage),
  );

  const paginatedFiles = useMemo(() => {
    return filteredFiles.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredFiles, currentPage, itemsPerPage]);

  // Finder-like active folder navigation helper
  const activeChildren = useMemo(() => {
    if (!selectedFolderId) {
      return tree;
    }
    const findFolder = (nodes: TreeNode[]): TreeNode[] | null => {
      for (const n of nodes) {
        if (n.id === selectedFolderId) return n.children || [];
        const res = findFolder(n.children || []);
        if (res) return res;
      }
      return null;
    };
    return findFolder(tree) || [];
  }, [tree, selectedFolderId]);

  // Finder breadcrumbs path resolver
  const breadcrumbs = useMemo(() => {
    const path: { id: string | null; name: string }[] = [
      { id: null, name: "Meu Drive" },
    ];
    if (!selectedFolderId) return path;

    const findPath = (
      nodes: TreeNode[],
      targetId: string,
      currentPath: { id: string; name: string }[],
    ): boolean => {
      for (const n of nodes) {
        const newPath = [...currentPath, { id: n.id, name: n.name }];
        if (n.id === targetId) {
          path.push(...newPath);
          return true;
        }
        if (n.children && findPath(n.children, targetId, newPath)) {
          return true;
        }
      }
      return false;
    };
    findPath(tree, selectedFolderId, []);
    return path;
  }, [tree, selectedFolderId]);

  const handleGoUp = () => {
    if (!selectedFolderId) return;
    if (breadcrumbs.length <= 2) {
      setSelectedFolderId(null);
    } else {
      const parent = breadcrumbs[breadcrumbs.length - 2];
      setSelectedFolderId(parent.id);
    }
  };

  const contextNode = contextMenu?.node;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm flex flex-col md:flex-row overflow-hidden flex-1 min-h-0 w-full transition-all duration-300">
      {/* SIDEBAR (Mac Finder Style) */}
      <aside className="w-full md:w-52 bg-zinc-50/60 dark:bg-zinc-950/60 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800/80 p-4 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Shortcuts / Atalhos Section */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2.5">
              Atalhos
            </h4>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setViewMode("tree");
                  setSelectedFolderId(null);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-left cursor-pointer border transition-all ${
                  viewMode === "tree" && !selectedFolderId
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30"
                    : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                Meu Drive
              </button>
              <button
                onClick={() => {
                  setViewMode("categories");
                  setSelectedCategoryFilter("ALL");
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-left cursor-pointer border transition-all ${
                  viewMode === "categories" && selectedCategoryFilter === "ALL"
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30"
                    : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Todos os Arquivos
              </button>
              <button
                onClick={() => {
                  setViewMode("categories");
                  setSelectedCategoryFilter("FAVORITES");
                  setCurrentPage(1);
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-left cursor-pointer border transition-all ${
                  viewMode === "categories" &&
                  selectedCategoryFilter === "FAVORITES"
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30"
                    : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <Star className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-400" />
                Favoritos
              </button>
            </div>
          </div>

          {/* Categories Section */}
          <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2.5">
              Categorias
            </h4>
            <div className="space-y-0.5 overflow-y-auto max-h-[240px] pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setViewMode("categories");
                    setSelectedCategoryFilter(cat.id);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-lg text-left cursor-pointer border transition-all ${
                    viewMode === "categories" &&
                    selectedCategoryFilter === cat.id
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30"
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cat.color === "emerald"
                          ? "bg-emerald-500"
                          : cat.color === "blue"
                            ? "bg-blue-500"
                            : cat.color === "purple"
                              ? "bg-purple-500"
                              : cat.color === "rose"
                                ? "bg-rose-500"
                                : cat.color === "amber"
                                  ? "bg-amber-500"
                                  : "bg-zinc-400"
                      }`}
                    />
                    <span className="truncate">{cat.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="hidden md:block pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <button
            onClick={() => fetchTree()}
            className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3 animate-none hover:rotate-180 transition-transform duration-500" />
            Estrutura Sincronizada
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col justify-between p-6 min-h-0">
        <div className="space-y-5 flex-1 flex flex-col min-h-0">
          {/* Top Bar Navigation / Breadcrumbs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
            {/* Finder Path Bar / Breadcrumbs */}
            <div className="flex items-center gap-2.5 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-850 [&::-webkit-scrollbar-thumb]:rounded-full">
              {viewMode === "tree" && selectedFolderId && (
                <button
                  onClick={handleGoUp}
                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-400 transition-all cursor-pointer shrink-0 animate-in fade-in duration-200"
                  title="Voltar um nível"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 select-none font-medium whitespace-nowrap">
                {viewMode === "tree" ? (
                  breadcrumbs.map((b, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <span className="text-zinc-300 dark:text-zinc-700">
                          /
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedFolderId(b.id)}
                        className={`hover:text-zinc-800 dark:hover:text-zinc-250 transition-colors cursor-pointer ${
                          idx === breadcrumbs.length - 1
                            ? "text-zinc-800 dark:text-zinc-200 font-semibold"
                            : ""
                        }`}
                      >
                        {b.name}
                      </button>
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    <span>Meu Drive</span>
                    <span className="text-zinc-305 dark:text-zinc-700">/</span>
                    <span className="text-zinc-755 dark:text-zinc-200 font-semibold">
                      Categorizado:{" "}
                      {selectedCategoryFilter === "ALL"
                        ? "Todos"
                        : selectedCategoryFilter === "FAVORITES"
                          ? "Favoritos"
                          : categories.find(
                              (c) => c.id === selectedCategoryFilter,
                            )?.label || selectedCategoryFilter}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Folder Actions */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
                Nova Pasta
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
            </div>
          </div>

          {/* Categories Search Box (at the top of list explorer) */}
          {viewMode === "categories" && (
            <div className="relative w-full shrink-0 animate-in fade-in duration-200">
              {searchLoading ? (
                <Loader2 className="absolute left-3.5 top-3 h-4 w-4 text-indigo-500 animate-spin" />
              ) : (
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              )}
              <input
                type="text"
                placeholder="Pesquisar arquivos por nome ou tags..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-zinc-700 dark:text-zinc-300 shadow-sm transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              />
            </div>
          )}

          {/* Errors display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-650 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* FILE LIST VIEW (Finder List Layout) */}
          <div
            onContextMenu={handleEmptyContextMenu}
            className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/10 flex-1 min-h-[200px] overflow-hidden flex flex-col"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[280px] gap-2 px-6 text-center animate-pulse">
                <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
                <span className="text-xs text-zinc-500 font-medium transition-all duration-350">
                  {LOADING_PHRASES[loadingPhraseIndex]}
                </span>
              </div>
            ) : viewMode === "tree" ? (
              activeChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[280px] text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Pasta Vazia
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Adicione subpastas ou envie novos arquivos aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200/80 dark:divide-zinc-850/80 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300">
                  {/* Folders first, then files */}
                  {[...activeChildren]
                    .sort((a, b) =>
                      a.type === b.type
                        ? a.name.localeCompare(b.name)
                        : a.type === "FOLDER"
                          ? -1
                          : 1,
                    )
                    .map((node) => {
                      const isFolder = node.type === "FOLDER";
                      return (
                        <div
                          key={node.id}
                          onClick={() => {
                            if (isFolder) {
                              setSelectedFolderId(node.id);
                            }
                          }}
                          onDoubleClick={() => {
                            if (!isFolder) {
                              handlePreviewFile(node);
                            }
                          }}
                          onContextMenu={(e) => handleContextMenu(e, node)}
                          className={`flex items-center justify-between p-3.5 text-xs hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isFolder ? (
                              <Folder className="w-4.5 h-4.5 text-amber-500 dark:text-amber-600 shrink-0" />
                            ) : (
                              <File className="w-4.5 h-4.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            )}
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                {node.name}
                              </span>
                              {!isFolder && node.favorite && (
                                <Star className="w-3 h-3 text-amber-550 fill-amber-400 shrink-0" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {isFolder ? (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
                                {node.visibility === "PUBLIC" ? (
                                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                                {node.children?.length || 0} itens
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {node.tags &&
                                  node.tags
                                    .split(",")
                                    .slice(0, 2)
                                    .map((t, i) => {
                                      const trimmed = t.trim();
                                      if (!trimmed) return null;
                                      return (
                                        <span
                                          key={i}
                                          className="hidden sm:inline-block px-1.5 py-0.2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-[8px] font-medium border border-indigo-100/40 dark:border-indigo-900/20"
                                        >
                                          {trimmed}
                                        </span>
                                      );
                                    })}
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getBadgeColor(node.category)}`}
                                >
                                  {resolveCategory(node.category)?.label ||
                                    "Geral"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )
            ) : /* CATEGORIES FLAT EXPLORER LIST */
            backendPaginatedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[280px] text-center gap-3 animate-in fade-in duration-200">
                <FileText className="w-10 h-10 text-zinc-405 dark:text-zinc-650" />
                <p className="text-xs text-zinc-405">
                  Nenhum documento encontrado.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200/80 dark:divide-zinc-850/80 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300">
                {backendPaginatedFiles.map((file) => (
                  <div
                    key={file.id}
                    onDoubleClick={() => handlePreviewFile(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className="flex items-center justify-between p-3.5 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[280px]">
                            {file.name}
                          </p>
                          {file.favorite && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {file.tags &&
                            file.tags.split(",").map((t, i) => {
                              const trimmed = t.trim();
                              if (!trimmed) return null;
                              return (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.2 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-[8px] font-medium border border-indigo-100/40 dark:border-indigo-900/20"
                                >
                                  {trimmed}
                                </span>
                              );
                            })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${getBadgeColor(file.category)}`}
                      >
                        {resolveCategory(file.category)?.label || "Geral"}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          file.analyzed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-400 dark:border-emerald-900"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-500 dark:border-zinc-800"
                        }`}
                      >
                        {file.analyzed ? "Analisado" : "Aguardando"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories Pagination Controls (only in Category view) */}
          {viewMode === "categories" && backendTotalPages > 0 && (
            <div className="flex items-center justify-between pt-2 shrink-0 animate-in fade-in duration-200 border-t border-zinc-100 dark:border-zinc-850">
              <span className="text-[10px] text-zinc-400 font-medium">
                Mostrando {backendPaginatedFiles.length} de{" "}
                {backendTotalElements} arquivos
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1 || searchLoading}
                  className="px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-all"
                >
                  Anterior
                </button>
                <span className="text-[10px] text-zinc-500 font-medium px-2">
                  Página {currentPage} de {backendTotalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(backendTotalPages, prev + 1),
                    )
                  }
                  disabled={currentPage === backendTotalPages || searchLoading}
                  className="px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-all"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM METADATA PATH BAR (Finder Statusbar) */}
        <div className="text-[10px] text-zinc-400 dark:text-zinc-550 pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-850 select-none flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 truncate font-medium">
            <span className="font-bold text-zinc-500 dark:text-zinc-400">
              Finder:
            </span>
            {viewMode === "tree" ? (
              breadcrumbs.map((b, i) => (
                <span key={i} className="truncate">
                  {i > 0 && " > "}
                  {b.name}
                </span>
              ))
            ) : (
              <span>Todos os Arquivos &gt; Categorizados</span>
            )}
          </div>
          <div className="font-medium">
            {viewMode === "tree"
              ? `${activeChildren.length} itens`
              : `${filteredFiles.length} arquivos`}
          </div>
        </div>
      </main>

      {/* NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Criar Nova Pasta
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500">
                  Nome da pasta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Contratos, Relatórios"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-all font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Criar Pasta"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Fazer Upload de Documento
            </h3>
            <form onSubmit={handleFileUpload} className="space-y-4">
              {!uploadFile ? (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Arquivo
                  </label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() =>
                      document.getElementById("file-upload-input")?.click()
                    }
                    className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden group ${
                      dragActive
                        ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/30 bg-zinc-50/50 dark:bg-zinc-950/20"
                    }`}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      required
                      className="hidden"
                      onChange={(e) =>
                        setUploadFile(e.target.files?.[0] || null)
                      }
                    />
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Arraste e solte o arquivo aqui
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        ou clique para navegar no seu computador
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Arquivo Selecionado
                  </label>
                  <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20 flex items-center justify-between gap-3 relative">
                    <div className="flex items-center gap-3 min-w-0">
                      {uploadFile.type.startsWith("image/") &&
                      uploadPreviewUrl ? (
                        <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0 bg-white dark:bg-zinc-900 flex items-center justify-center">
                          <img
                            src={uploadPreviewUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-zinc-805 dark:text-zinc-200 truncate max-w-[200px]">
                          {uploadFile.name}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                      }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 dark:text-zinc-500 rounded-xl transition-all cursor-pointer"
                      title="Remover arquivo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Category Selection Dropdown */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Categoria
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowUploadCategoryDropdown(!showUploadCategoryDropdown)
                  }
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-xl focus:outline-none focus:border-indigo-500 text-left text-zinc-750 dark:text-zinc-300 cursor-pointer transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${(() => {
                        const col = resolveCategory(uploadCategory)?.color;
                        if (col === "emerald") return "bg-emerald-500";
                        if (col === "blue") return "bg-blue-500";
                        if (col === "purple") return "bg-purple-500";
                        if (col === "rose") return "bg-rose-500";
                        if (col === "amber") return "bg-amber-500";
                        return "bg-zinc-400";
                      })()}`}
                    />
                    <span className="font-semibold">
                      {resolveCategory(uploadCategory)?.label || "Geral"}
                    </span>
                    {resolveCategory(uploadCategory) && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                        ({resolveCategory(uploadCategory)?.type})
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${showUploadCategoryDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showUploadCategoryDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden max-h-[260px] flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Search Input Box */}
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-150 dark:border-zinc-800 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Pesquisar categoria..."
                          value={categorySearchQuery}
                          onChange={(e) =>
                            setCategorySearchQuery(e.target.value)
                          }
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-lg focus:outline-none focus:border-indigo-500 text-zinc-700 dark:text-zinc-300"
                          onClick={(e) => e.stopPropagation()} // prevent closing dropdown
                        />
                      </div>
                    </div>

                    {/* Scrollable list of filtered categories */}
                    <div className="overflow-y-auto max-h-[200px] divide-y divide-zinc-100 dark:divide-zinc-800 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300">
                      {filteredCategories.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-400">
                          Nenhuma categoria encontrada
                        </div>
                      ) : (
                        filteredCategories.map((cat) => (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setUploadCategory(cat.id);
                              setShowUploadCategoryDropdown(false);
                              setCategorySearchQuery("");
                            }}
                            className="flex flex-col gap-0.5 px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-zinc-700 dark:text-zinc-300 transition-colors"
                          >
                            <div className="flex items-center gap-2 font-semibold">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  cat.color === "emerald"
                                    ? "bg-emerald-500"
                                    : cat.color === "blue"
                                      ? "bg-blue-500"
                                      : cat.color === "purple"
                                        ? "bg-purple-500"
                                        : cat.color === "rose"
                                          ? "bg-rose-500"
                                          : cat.color === "amber"
                                            ? "bg-amber-500"
                                            : "bg-zinc-400"
                                }`}
                              />
                              <span>{cat.label}</span>
                              <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500 px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded">
                                {cat.type}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 pl-4">
                              {cat.description}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {uploadProgress && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Fazer Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 w-44 animate-in fade-in zoom-in-95 duration-100"
        >
          {contextMenu.type === "empty" ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUploadModal(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
              >
                Criar arquivo
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchTree();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
              >
                Atualizar (Sincronizar)
              </button>
            </>
          ) : contextNode && contextNode.type === "FILE" ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewFile(contextNode);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
              >
                Abrir
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadFile(contextNode);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
              >
                Fazer download
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleToggleFavorite(contextNode);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
              >
                {contextNode.favorite
                  ? "Remover dos favoritos"
                  : "Adicionar aos favoritos"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFileToDelete(contextNode);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 font-semibold cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
              >
                Excluir
              </button>
            </>
          ) : contextNode ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFolderId(contextNode.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
              >
                Abrir
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadBlob(
                    "/api/documents/folders/download-zip/" + contextNode.id,
                    contextNode.name + ".zip",
                  );
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold cursor-pointer"
              >
                Baixar zip
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFolderToDelete(contextNode);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 font-semibold cursor-pointer border-t border-zinc-100 dark:border-zinc-800"
              >
                Excluir
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* FILE DELETE MODAL */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Excluir Documento
            </h3>
            <p className="text-xs text-zinc-550 dark:text-zinc-400">
              Tem certeza que deseja excluir o documento{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {fileToDelete.name}
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteDocument(fileToDelete.id)}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-80"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Excluir"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLDER DELETE MODAL */}
      {folderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Excluir Pasta</h3>
            </div>
            <p className="text-xs text-zinc-550 dark:text-zinc-400">
              Tem certeza que deseja excluir a pasta{" "}
              <strong className="text-zinc-800 dark:text-zinc-250">
                {folderToDelete.name}
              </strong>
              ?
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl">
              <p className="text-[10px] text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Aviso Importante:
              </p>
              <p className="text-[9px] text-red-605 dark:text-red-450 mt-1 leading-relaxed">
                Esta ação excluirá permanentemente a pasta, suas subpastas e
                todos os documentos internos. Essa ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFolderToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteFolder(folderToDelete.id)}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-80"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEBVIEW PREVIEW MODAL */}
      {previewFile && previewUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl h-[90vh] rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 gap-3 shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  Visualizando: {previewFileName}
                </h3>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <p className="text-[10px] text-zinc-400 truncate">
                    Categoria:{" "}
                    {resolveCategory(previewFile.category)?.label || "Geral"}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-zinc-400" /> Tags:
                    </span>
                    {isEditingTags ? (
                      <form
                        onSubmit={handleSaveTags}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={tempTags}
                          onChange={(e) => setTempTags(e.target.value)}
                          placeholder="tag1, tag2..."
                          className="px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded text-[9px] focus:outline-none focus:border-indigo-500 w-32 text-zinc-800 dark:text-zinc-200 font-semibold"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-bold hover:bg-indigo-700 cursor-pointer"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingTags(false)}
                          className="px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-800 text-zinc-450 dark:text-zinc-400 rounded text-[8px] hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {previewFile.tags ? (
                          previewFile.tags.split(",").map((t, i) => {
                            const trimmed = t.trim();
                            if (!trimmed) return null;
                            return (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-medium border border-indigo-100/50 dark:border-indigo-900/30 animate-in fade-in duration-100"
                              >
                                {trimmed}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-zinc-400 italic">Sem tags</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setTempTags(previewFile.tags || "");
                            setIsEditingTags(true);
                          }}
                          className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 hover:underline cursor-pointer pl-1"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Favorite (Star) Button */}
                <button
                  type="button"
                  title={
                    previewFile.favorite
                      ? "Remover dos Favoritos"
                      : "Adicionar aos Favoritos"
                  }
                  onClick={async () => {
                    await handleToggleFavorite(previewFile);
                    setPreviewFile((prev) =>
                      prev ? { ...prev, favorite: !prev.favorite } : null,
                    );
                  }}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    previewFile.favorite
                      ? "bg-amber-50/50 dark:bg-amber-950/20 text-amber-500 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100/60"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650"
                  }`}
                >
                  <Star
                    className={`w-4 h-4 ${previewFile.favorite ? "fill-amber-400" : ""}`}
                  />
                </button>

                <div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

                {/* Zoom Controls */}
                {(previewFileName.toLowerCase().endsWith(".pdf") ||
                  /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(previewFileName)) && (
                  <>
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
                      <button
                        type="button"
                        title="Diminuir Zoom"
                        onClick={() =>
                          setZoomScale((prev) => Math.max(25, prev - 25))
                        }
                        className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-550 dark:text-zinc-350 transition-all cursor-pointer"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-bold text-zinc-650 dark:text-zinc-350 min-w-[36px] text-center">
                        {zoomScale}%
                      </span>
                      <button
                        type="button"
                        title="Aumentar Zoom"
                        onClick={() =>
                          setZoomScale((prev) => Math.min(300, prev + 25))
                        }
                        className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-550 dark:text-zinc-350 transition-all cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      {zoomScale !== 100 && (
                        <button
                          type="button"
                          title="Resetar Zoom"
                          onClick={() => setZoomScale(100)}
                          className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />
                  </>
                )}

                {/* Download Button */}
                <button
                  type="button"
                  title="Baixar arquivo"
                  onClick={() => handleDownloadFile(previewFile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden md:inline">Download</span>
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  title="Excluir arquivo"
                  onClick={() => {
                    setFileToDelete(previewFile);
                    closePreview();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span className="hidden md:inline">Excluir</span>
                </button>

                <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

                {/* Close Button */}
                <button
                  type="button"
                  onClick={closePreview}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex-1 bg-zinc-50 dark:bg-zinc-955 rounded-xl border border-zinc-100 dark:border-zinc-850 p-1.5 flex items-center justify-center overflow-auto">
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{
                  transform: `scale(${zoomScale / 100})`,
                  transformOrigin: "center center",
                }}
              >
                {previewFileName.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full rounded-lg border-0"
                    title="PDF Preview"
                  />
                ) : /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(previewFileName) ? (
                  <Image
                    src={previewUrl}
                    alt={previewFileName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 max-w-sm text-center space-y-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800 shadow-xl animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                      {/\.(mp4|webm|ogg|mov|avi)$/i.test(previewFileName) ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-6 h-6"
                        >
                          <path d="m22 8-6 4 6 4V8Z" />
                          <rect
                            width="14"
                            height="12"
                            x="2"
                            y="6"
                            rx="2"
                            ry="2"
                          />
                        </svg>
                      ) : (
                        <File className="w-6 h-6" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <h4
                        className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-[240px]"
                        title={previewFileName}
                      >
                        {previewFileName}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-semibold">
                        {/\.(mp4|webm|ogg|mov|avi)$/i.test(previewFileName)
                          ? "Arquivo de Vídeo"
                          : "Arquivo Binário / Outro"}
                      </p>
                    </div>
                    <p className="text-[10px] text-zinc-400 px-4 leading-relaxed font-medium">
                      Este formato de arquivo não pode ser visualizado
                      diretamente no navegador. Baixe o arquivo para abrir em
                      seu dispositivo.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(previewFile!)}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer shadow-md hover:shadow-indigo-500/20 active:scale-95"
                    >
                      {!loading ? (
                        <Download className="w-3.5 h-3.5" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      {!loading ? "Baixar Arquivo" : ""}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN RESUME FILE INPUT */}
      <input
        type="file"
        ref={resumeInputRef}
        style={{ display: "none" }}
        onChange={handleResumeFileChange}
      />

      {/* BACKGROUND TRANSFERS WIDGET */}
      {showTransfersWidget && transfers.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col transition-all duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-zinc-850 dark:bg-zinc-900/50 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-zinc-100">
                Transferências (
                {transfers.filter((t) => t.status === "transferring").length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransfers([])}
                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-200 pl-2 cursor-pointer transition-colors"
              >
                Limpar tudo
              </button>
              <button
                onClick={() => setShowTransfersWidget(false)}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-250 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto p-3 space-y-3 bg-zinc-900/50 dark:bg-zinc-950/20">
            {transfers.map((item) => (
              <div
                key={item.id}
                className="space-y-1.5 border-b border-zinc-800/40 pb-2.5 last:border-b-0 last:pb-0 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[11px] font-semibold text-zinc-200 truncate"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="text-[9px] text-zinc-450 font-medium">
                      {item.type === "upload" ? "Upload" : "Download"} •{" "}
                      {(item.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {/* Actions based on status */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === "transferring" && (
                      <button
                        title="Pausar"
                        onClick={() => togglePauseResume(item.id)}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 cursor-pointer"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                    )}
                    {(item.status === "paused" ||
                      item.status === "interrupted") && (
                      <button
                        title="Retomar"
                        onClick={() => togglePauseResume(item.id)}
                        className="p-1 hover:bg-zinc-800 rounded text-indigo-400 hover:text-indigo-300 cursor-pointer animate-pulse"
                      >
                        <Play className="w-3 h-3 fill-indigo-400" />
                      </button>
                    )}
                    {item.status === "error" && (
                      <button
                        title="Tentar Novamente"
                        onClick={() =>
                          item.file && startOrResumeUpload(item.file, item)
                        }
                        className="p-1 hover:bg-zinc-800 rounded text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                    {item.status !== "completed" && (
                      <button
                        title="Cancelar"
                        onClick={() => cancelTransfer(item.id)}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-450 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Status Text */}
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === "completed"
                          ? "bg-green-500"
                          : item.status === "error"
                            ? "bg-red-500"
                            : item.status === "paused" ||
                                item.status === "interrupted"
                              ? "bg-zinc-650"
                              : "bg-indigo-500"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-semibold">
                    <span
                      className={`${
                        item.status === "completed"
                          ? "text-green-400"
                          : item.status === "error"
                            ? "text-red-450"
                            : item.status === "paused"
                              ? "text-zinc-400"
                              : item.status === "interrupted"
                                ? "text-amber-400 font-bold"
                                : "text-zinc-400"
                      }`}
                    >
                      {item.status === "transferring" &&
                        `Transferindo... ${item.progress}%`}
                      {item.status === "paused" && "Pausado"}
                      {item.status === "interrupted" &&
                        "Desconectado - clique em retomar"}
                      {item.status === "completed" && "Concluído"}
                      {item.status === "error" &&
                        (item.errorMsg || "Erro na transferência")}
                    </span>
                    <span className="text-zinc-500">{item.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL (Success/Error) */}
      {feedbackModal && (
        <FeedbackModal
          isOpen={feedbackModal.isOpen}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmLabel="Ok, entendi"
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
}
