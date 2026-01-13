'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Image, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentUploaderProps {
    label: string;
    description: string;
    accept?: string;
    required?: boolean;
    status: 'pending' | 'uploaded' | 'approved' | 'rejected';
    onUpload: (file: File) => void;
    onRemove: () => void;
    fileName?: string;
}

export function DocumentUploader({
    label,
    description,
    accept = '.pdf,.jpg,.jpeg,.png',
    required = false,
    status,
    onUpload,
    onRemove,
    fileName,
}: DocumentUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files[0];
            if (file) {
                handleFile(file);
            }
        },
        [onUpload]
    );

    const handleFile = async (file: File) => {
        setIsUploading(true);
        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        onUpload(file);
        setIsUploading(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'uploaded':
                return 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20';
            case 'approved':
                return 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20';
            case 'rejected':
                return 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20';
            default:
                return 'border-gray-200 dark:border-gray-700';
        }
    };

    return (
        <div className={cn(
            'border-2 border-dashed rounded-lg p-4 transition-colors',
            isDragging && 'border-violet-500 bg-violet-50 dark:bg-violet-900/10',
            !isDragging && getStatusColor()
        )}>
            <div className="flex items-start gap-4">
                <div className={cn(
                    'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                    status === 'uploaded' || status === 'approved'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gray-100 dark:bg-gray-800'
                )}>
                    {status === 'uploaded' || status === 'approved' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                        <FileText className="w-6 h-6 text-gray-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{label}</h4>
                        {required && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Required</span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{description}</p>

                    {fileName && status !== 'pending' && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {fileName}
                            </span>
                            <button
                                onClick={onRemove}
                                className="text-red-500 hover:text-red-600 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    {isUploading ? (
                        <Button disabled variant="outline" size="sm">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                        </Button>
                    ) : status === 'pending' ? (
                        <label>
                            <input
                                type="file"
                                accept={accept}
                                onChange={handleInputChange}
                                className="hidden"
                            />
                            <Button asChild variant="outline" size="sm">
                                <span>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                                </span>
                            </Button>
                        </label>
                    ) : (
                        <label>
                            <input
                                type="file"
                                accept={accept}
                                onChange={handleInputChange}
                                className="hidden"
                            />
                            <Button asChild variant="ghost" size="sm">
                                <span>Replace</span>
                            </Button>
                        </label>
                    )}
                </div>
            </div>
        </div>
    );
}
