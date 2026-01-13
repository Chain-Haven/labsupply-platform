'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Upload,
    FileText,
    Image,
    CheckCircle,
    XCircle,
    Clock,
    Trash2,
    Download,
    Eye
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// Mock uploads data
const uploads = [
    {
        id: '1',
        name: 'business-license.pdf',
        type: 'document',
        size: '245 KB',
        status: 'approved',
        uploaded_at: '2024-01-05T10:30:00Z',
        category: 'Business Documents',
    },
    {
        id: '2',
        name: 'tax-exemption.pdf',
        type: 'document',
        size: '180 KB',
        status: 'approved',
        uploaded_at: '2024-01-05T10:32:00Z',
        category: 'Business Documents',
    },
    {
        id: '3',
        name: 'research-credentials.pdf',
        type: 'document',
        size: '520 KB',
        status: 'pending',
        uploaded_at: '2024-01-10T14:00:00Z',
        category: 'Research Verification',
    },
];

const requiredDocuments = [
    { name: 'Business License', description: 'Valid business registration', uploaded: true },
    { name: 'Tax Exemption Certificate', description: 'If applicable', uploaded: true },
    { name: 'Research Institution Verification', description: 'Letter or credentials', uploaded: true },
];

export default function UploadsPage() {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Handle file upload
        alert('File upload would be processed here');
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
                <CardContent>
                    <div
                        className={cn(
                            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                            isDragging
                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-violet-300'
                        )}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                            Drop files here or{' '}
                            <button className="text-violet-600 hover:text-violet-700 font-medium">
                                browse
                            </button>
                        </p>
                        <p className="text-sm text-gray-400">
                            PDF, JPG, PNG up to 10MB
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Required documents */}
            <Card>
                <CardHeader>
                    <CardTitle>Required Documents</CardTitle>
                    <CardDescription>Documents needed for account verification</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {requiredDocuments.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div className="flex items-center gap-3">
                                    {doc.uploaded ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{doc.name}</p>
                                        <p className="text-sm text-gray-500">{doc.description}</p>
                                    </div>
                                </div>
                                {!doc.uploaded && (
                                    <Button size="sm" variant="outline">Upload</Button>
                                )}
                            </div>
                        ))}
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
                    <div className="space-y-2">
                        {uploads.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>{file.size}</span>
                                            <span>•</span>
                                            <span>{file.category}</span>
                                            <span>•</span>
                                            <span>{formatRelativeTime(file.uploaded_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        {getStatusIcon(file.status)}
                                        <span className={cn(
                                            'text-sm capitalize',
                                            file.status === 'approved' ? 'text-green-600' :
                                                file.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                                        )}>
                                            {file.status}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
