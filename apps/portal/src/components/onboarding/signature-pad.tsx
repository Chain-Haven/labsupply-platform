'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

export function SignaturePad({
  onSignatureChange,
  disabled = false,
  height = 200,
}: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(500);

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.offsetWidth);
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleEnd = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setIsEmpty(false);
      onSignatureChange(sigRef.current.toDataURL('image/png'));
    }
  }, [onSignatureChange]);

  const handleClear = useCallback(() => {
    if (sigRef.current) {
      sigRef.current.clear();
      setIsEmpty(true);
      onSignatureChange('');
    }
  }, [onSignatureChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <PenTool className="w-4 h-4" />
          Draw Your Signature Below
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={disabled || isEmpty}
        >
          <Eraser className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      <div
        ref={containerRef}
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          disabled
            ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
        }`}
      >
        {disabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
              Please scroll through the entire agreement above before signing.
            </p>
          </div>
        )}
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{
            width: canvasWidth,
            height,
            className: 'rounded-lg',
            style: { touchAction: 'none' },
          }}
          penColor="#1e293b"
          backgroundColor="rgba(0,0,0,0)"
          onEnd={handleEnd}
        />
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Sign here
            </p>
          </div>
        )}
        <div className="absolute bottom-4 left-8 right-8 border-b border-gray-300 dark:border-gray-600 pointer-events-none" />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        By drawing your signature above, you acknowledge that this constitutes your
        legally binding electronic signature under the E-SIGN Act (15 U.S.C. &sect; 7001)
        and the Uniform Electronic Transactions Act.
      </p>
    </div>
  );
}
