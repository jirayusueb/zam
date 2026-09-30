import type { ReporterId } from "../../domain/value-objects/reporter-id";

export interface UploadTicketRequest {
  reporterId: ReporterId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadTicket {
  uploadUrl: string;
}

export interface VideoStreamRequest {
  reporterId: ReporterId;
  fileId: string;
  range: string | null;
}

export interface VideoStream {
  status: 200 | 206;
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: string | null;
  contentRange: string | null;
}

export interface VideoStorage {
  createUploadTicket: (req: UploadTicketRequest) => Promise<UploadTicket>;
  shareWithAnyone: (input: {
    reporterId: ReporterId;
    fileId: string;
  }) => Promise<void>;
  openVideo: (req: VideoStreamRequest) => Promise<VideoStream>;
}
