import type {
  UploadTicket,
  UploadTicketRequest,
  VideoStorage,
  VideoStream,
  VideoStreamRequest,
} from "../../application/ports/video-storage";
import { VideoStorageError } from "../../application/ports/video-storage-error";
import { VIDEO_MIME_TYPE } from "../../domain/value-objects/video-recording";
import { DRIVE_ACCESS_NOT_GRANTED_MESSAGE } from "./better-auth-google-access-tokens";
import type { GoogleAccessTokens } from "./better-auth-google-access-tokens";

const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
const permissionsUrl = (fileId: string) =>
  `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`;
const mediaUrl = (fileId: string) =>
  `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

export const createGoogleDriveVideoStorage = (
  tokens: GoogleAccessTokens,
  fetchImpl: typeof fetch = fetch
): VideoStorage => ({
  createUploadTicket: async (
    req: UploadTicketRequest
  ): Promise<UploadTicket> => {
    const accessToken = await tokens.forUser(req.reporterId);
    const response = await fetchImpl(UPLOAD_URL, {
      body: JSON.stringify({ mimeType: req.mimeType, name: req.fileName }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(req.sizeBytes),
        "X-Upload-Content-Type": req.mimeType,
      },
      method: "POST",
    });
    if (response.status === 401 || response.status === 403) {
      throw new VideoStorageError(
        "ACCESS_NOT_GRANTED",
        DRIVE_ACCESS_NOT_GRANTED_MESSAGE
      );
    }
    const uploadUrl = response.headers.get("Location");
    if (!response.ok || !uploadUrl) {
      throw new VideoStorageError(
        "UNAVAILABLE",
        `Google Drive request failed (${response.status})`
      );
    }
    return { uploadUrl };
  },

  openVideo: async (req: VideoStreamRequest): Promise<VideoStream> => {
    const accessToken = await tokens.forUser(req.reporterId);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (req.range !== null) {
      headers.Range = req.range;
    }
    const response = await fetchImpl(mediaUrl(req.fileId), { headers });
    if (response.status === 401 || response.status === 403) {
      throw new VideoStorageError(
        "ACCESS_NOT_GRANTED",
        DRIVE_ACCESS_NOT_GRANTED_MESSAGE
      );
    }
    if (response.status === 404) {
      throw new VideoStorageError(
        "VIDEO_NOT_FOUND",
        "The video was deleted from the reporter's Google Drive."
      );
    }
    const isMedia = response.status === 200 || response.status === 206;
    if (!isMedia || response.body === null) {
      throw new VideoStorageError(
        "UNAVAILABLE",
        `Google Drive request failed (${response.status})`
      );
    }
    return {
      body: response.body,
      contentLength: response.headers.get("Content-Length"),
      contentRange: response.headers.get("Content-Range"),
      contentType: response.headers.get("Content-Type") ?? VIDEO_MIME_TYPE,
      status: response.status === 206 ? 206 : 200,
    };
  },

  shareWithAnyone: async (input: {
    reporterId: string;
    fileId: string;
  }): Promise<void> => {
    const accessToken = await tokens.forUser(input.reporterId);
    const response = await fetchImpl(permissionsUrl(input.fileId), {
      body: JSON.stringify({ role: "reader", type: "anyone" }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      method: "POST",
    });
    if (response.status === 401) {
      throw new VideoStorageError(
        "ACCESS_NOT_GRANTED",
        DRIVE_ACCESS_NOT_GRANTED_MESSAGE
      );
    }
    if (response.status === 403) {
      throw new VideoStorageError(
        "SHARING_REJECTED",
        "Video uploaded, but Google Drive refused link sharing. Check your Google Workspace sharing policy."
      );
    }
    if (!response.ok) {
      throw new VideoStorageError(
        "UNAVAILABLE",
        `Google Drive request failed (${response.status})`
      );
    }
  },
});
