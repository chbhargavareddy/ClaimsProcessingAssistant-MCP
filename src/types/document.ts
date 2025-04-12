import { z } from 'zod';

export type DocumentStatus = 'pending' | 'processing' | 'verified' | 'rejected';

export interface Document {
    id: string;
    claim_id: string;
    category_id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    status: DocumentStatus;
    hash?: string;
    metadata: Record<string, unknown>;
    verified_by?: string;
    verified_at?: string;
    verification_result?: Record<string, unknown>;
    uploaded_at: string;
}

export interface DocumentCategory {
    id: string;
    name: string;
    description?: string;
    required_for_claims: boolean;
    allowed_mime_types: string[];
    max_file_size_bytes: number;
    created_at: string;
}

export interface DocumentVerification {
    id: string;
    document_id: string;
    verified_by: string;
    status: 'verified' | 'rejected';
    notes?: string;
    verification_data?: Record<string, unknown>;
    created_at: string;
}

// DTOs for document operations
export const UploadDocumentDtoSchema = z.object({
    claim_id: z.string().uuid(),
    category_id: z.string().uuid(),
    file: z.any(), // Will be handled by file upload middleware
    metadata: z.record(z.unknown()).optional(),
});

export type UploadDocumentDto = z.infer<typeof UploadDocumentDtoSchema>;

export const VerifyDocumentDtoSchema = z.object({
    document_id: z.string().uuid(),
    status: z.enum(['verified', 'rejected']),
    notes: z.string().optional(),
    verification_data: z.record(z.unknown()).optional(),
});

export type VerifyDocumentDto = z.infer<typeof VerifyDocumentDtoSchema>;

export const ListDocumentsDtoSchema = z.object({
    claim_id: z.string().uuid().optional(),
    category_id: z.string().uuid().optional(),
    status: z.enum(['pending', 'processing', 'verified', 'rejected']).optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
});

export type ListDocumentsDto = z.infer<typeof ListDocumentsDtoSchema>;