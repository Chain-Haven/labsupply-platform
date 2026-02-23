'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Upload,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Trash2,
    Download,
    Eye,
    Loader2,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

interface MerchantDocument {
    id: string;
    merchant_id: string;
    document_type: string;
    file_name: string;
    storage_path: string;
    file_size_bytes: number;
    mime_type: string;
    status: string;
    created_at: string;
}

const DOC_TYPE_OPTIONS = [
    { value: 'coa', label: 'Certificate of Analysis' },
    { value: 'businessLicense', label: 'Business License' },
    { value: 'taxExemptCertificate', label: 'Tax Exempt Certificate' },
    { value: 'researchCredentials', label: 'Research Credentials' },
    { value: 'complianceDoc', label: 'Compliance Document' },
    { value: 'other', label: 'Other' },
] as const;

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDocType(type: string): string {
    const labels: Record<string, string> = {
        coa: 'Certificate of Analysis',
        businessLicense: 'Business License',
        taxExemptCertificate: 'Tax Exempt Certificate',
        researchCredentials: 'Research Credentials',
        complianceDoc: 'Compliance Document',
        other: 'Other',
    };
    return labels[type] || type;
}

export default function UploadsPage() {
    const [documents, setDocuments] = useState<MerchantDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('other');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/v1/merchant/documents');
            if (res.ok) {
                const json = await res.json();
                setDocuments(json.data || []);
            }
        } catch {
            // Silent fail on fetch
        }
    };

    useEffect(() => {
        fetchDocuments().finally(() => setIsLoading(false));
    }, []);

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_type', selectedCategory);
            const res = await fetch('/api/v1/merchant/documents', {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Upload failed');
                return;
            }
            await fetchDocuments();
        } catch {
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        await uploadFile(files[0]);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        await uploadFile(files[0]);
        e.target.value = '';
    };

    const handleDownload = async (docId: string) => {
        try {
            const res = await fetch(`/api/v1/merchant/documents/${docId}`);
            if (!res.ok) {
                alert('Failed to get download link');
                return;
            }
            const json = await res.json();
            window.open(json.data.url, '_blank');
        } catch {
            alert('Failed to download file');
        }
    };

    const handleDelete = async (docId: string, fileName: string) => {
        if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
        try {
            const res = await fetch('/api/v1/merchant/documents', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_id: docId }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Delete failed');
                return;
            }
            await fetchDocuments();
        } catch {
            alert('Failed to delete document');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'rejected':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-yellow-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Uploads</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your compliance documents and verification files</p>
            </div>

            {/* Upload area */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload Documents</CardTitle>
                    <CardDescription>
                        Drag and drop files or click to browse
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label htmlFor="doc-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Document Category
                        </label>
                        <select
                            id="doc-category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full max-w-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            {DOC_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div
                        className={cn(
                            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                            isDragging
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-violet-300',
                            isUploading && 'pointer-events-none opacity-60'
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-12 h-12 mx-auto text-violet-500 mb-4 animate-spin" />
                                <p className="text-gray-600 dark:text-gray-300 mb-2">Uploading...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-600 dark:text-gray-300 mb-2">
                                    Drop files here or{' '}
                                    <button
                                        className="text-violet-600 hover:text-violet-700 font-medium"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        browse
                                    </button>
                                </p>
                                <p className="text-sm text-gray-400">
                                    PDF, JPG, PNG up to 10MB
                                </p>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={handleFileSelect}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Uploaded files */}
            <Card>
                <CardHeader>
                    <CardTitle>Uploaded Files</CardTitle>
                    <CardDescription>Your submitted documents</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                            <span className="ml-2 text-gray-500">Loading documents...</span>
                        </div>
                    ) : documents.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">No documents uploaded yet</p>
                    ) : (
                        <div className="space-y-2">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{doc.file_name}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span>{formatFileSize(doc.file_size_bytes)}</span>
                                                <span>&bull;</span>
                                                <span>{formatDocType(doc.document_type)}</span>
                                                <span>&bull;</span>
                                                <span>{formatRelativeTime(doc.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            {getStatusIcon(doc.status)}
                                            <span className={cn(
                                                'text-sm capitalize',
                                                doc.status === 'approved' ? 'text-green-600' :
                                                    doc.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                                            )}>
                                                {doc.status}
                                            </span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => handleDownload(doc.id)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => handleDownload(doc.id)}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                                onClick={() => handleDelete(doc.id, doc.file_name)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
