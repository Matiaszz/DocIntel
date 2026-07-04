/**
 * Direct AWS S3 client utility functions.
 * Handles single/multipart PUT uploads and progressive chunked GET downloads.
 * Excludes application authorization headers which AWS S3 rejects.
 */

/**
 * Uploads a file directly to a presigned S3 PUT URL.
 */
export async function uploadToS3(uploadUrl: string, file: File): Promise<Response> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
  });
  if (!response.ok) {
    throw new Error("Falha ao enviar arquivo para o storage S3.");
  }
  return response;
}

/**
 * Uploads a chunk/slice of a file directly to a presigned S3 upload part PUT URL.
 */
export async function uploadPartToS3(partUrl: string, slice: Blob): Promise<Response> {
  const response = await fetch(partUrl, {
    method: "PUT",
    body: slice,
  });
  if (!response.ok) {
    throw new Error("Falha ao enviar parte do arquivo para o storage S3.");
  }
  return response;
}

/**
 * Downloads a file directly from a presigned S3 GET URL with progress callback.
 */
export async function downloadFromS3(
  presignedUrl: string,
  onProgress: (receivedLength: number, totalLength: number) => void,
  shouldAbort?: () => boolean
): Promise<Blob> {
  const response = await fetch(presignedUrl);
  if (!response.ok) {
    throw new Error("Falha ao iniciar o download direto do storage S3.");
  }

  const contentLength = response.headers.get("content-length");
  const totalLength = contentLength ? parseInt(contentLength, 10) : 0;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Não foi possível inicializar o leitor de fluxo do S3.");
  }

  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  while (true) {
    if (shouldAbort && shouldAbort()) {
      throw new Error("Download cancelado pelo usuário.");
    }
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    receivedLength += value.length;

    onProgress(receivedLength, totalLength);
  }

  return new Blob(chunks as BlobPart[]);
}
