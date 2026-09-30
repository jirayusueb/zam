export type VideoStorageErrorCode =
  | "ACCESS_NOT_GRANTED"
  | "SHARING_REJECTED"
  | "UNAVAILABLE"
  | "VIDEO_NOT_FOUND";

export class VideoStorageError extends Error {
  readonly code: VideoStorageErrorCode;

  constructor(code: VideoStorageErrorCode, message: string) {
    super(message);
    this.name = "VideoStorageError";
    this.code = code;
  }
}
