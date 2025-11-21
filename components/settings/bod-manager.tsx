'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Upload, Download, Split, AlertCircle, ArrowLeft, ArrowRight, Eye, Check, X, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthWithViewMode } from '@/app/hooks/useAuth';
import PDFViewer from '@/app/ui/components/pdf-viewer';

interface SplitResult {
  fileName: string;
  pdfBase64: string;
  pageCount: number;
  tabNumber: number;
  pageRange: { start: number; end: number };
}

interface TabDetectionResult {
  pageNumber: number;
  isTabPage: boolean;
  confidence: 'high' | 'medium' | 'low' | 'guess';
  tabNumber?: number;
  detectedText: string;
  reason: string;
}

interface TabReviewData {
  totalPages: number;
  detectedTabs: TabDetectionResult[];
  pdfBuffer: Buffer;
}

export function BoDManager() {
  // All hooks must be called at the top level, before any early returns
  const auth = useAuthWithViewMode();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'review' | 'results'>('upload');
  const [detectionResults, setDetectionResults] = useState<TabReviewData | null>(null);
  const [userTabPages, setUserTabPages] = useState<number[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentViewerPage, setCurrentViewerPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Cleanup effect for PDF URL
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);
  
  // Show loading state while session is loading
  if (!auth.session) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Book of Documents Manager</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Check super admin access
  if (!auth.actualIsSuperAdmin || auth.viewMode !== 'super_admin') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Book of Documents Manager</h2>
          <p className="text-muted-foreground">Super admin access required.</p>
        </div>
      </div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Clean up previous PDF URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setSplitResults([]);
      setDetectionResults(null);
      setUserTabPages([]);
      setCurrentStep('upload');
      
      // Create blob URL for PDF viewer
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const handleDetectTabs = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const response = await fetch('/api/pdf/detect-tabs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to detect tabs');
      }

      const results: TabReviewData = await response.json();
      setDetectionResults(results);
      
      // Pre-populate with detected tab pages
      const detectedTabPages = results.detectedTabs
        .filter(tab => tab.isTabPage)
        .map(tab => tab.pageNumber);
      setUserTabPages(detectedTabPages);
      
      setCurrentStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while detecting tabs');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSplit = async () => {
    if (!selectedFile || userTabPages.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('tabPages', JSON.stringify(userTabPages));

      const response = await fetch('/api/pdf/split-confirmed', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to split PDF');
      }

      const results: SplitResult[] = await response.json();
      setSplitResults(results);
      setCurrentStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while splitting the PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTabPage = (pageNumber: number) => {
    setUserTabPages(prev => 
      prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  const addTabPage = (pageNumber: number) => {
    if (!userTabPages.includes(pageNumber)) {
      setUserTabPages(prev => [...prev, pageNumber].sort((a, b) => a - b));
    }
  };

  const resetToUpload = () => {
    setCurrentStep('upload');
    setDetectionResults(null);
    setUserTabPages([]);
    setSplitResults([]);
    setError(null);
    setCurrentViewerPage(1);
    
    // Clean up PDF URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setSelectedFile(null);
  };

  const navigateToPage = (pageNumber: number) => {
    setCurrentViewerPage(pageNumber);
  };

  const downloadPDF = (result: SplitResult) => {
    const byteCharacters = atob(result.pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllPDFs = () => {
    splitResults.forEach((result, index) => {
      setTimeout(() => downloadPDF(result), index * 500);
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high': return <Badge variant="default" className="bg-green-500">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-yellow-500">Medium</Badge>;
      case 'low': return <Badge variant="outline" className="bg-orange-500">Low</Badge>;
      case 'guess': return <Badge variant="destructive">Guess</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Book of Documents Manager</h2>
        <p className="text-muted-foreground">
          Split large PDF documents into individual tabs. Upload a PDF with tab separators and review detected tab pages before splitting.
        </p>
      </div>

      <Separator />

      {/* Step 1: Upload */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Step 1: Upload PDF Document
            </CardTitle>
            <CardDescription>
              Select a PDF file that contains tab separators. We'll detect potential tab pages for your review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">PDF File</Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{selectedFile.name}</span>
                <Badge variant="secondary" className="ml-auto">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleDetectTabs}
              disabled={!selectedFile || isProcessing}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isProcessing ? 'Detecting tabs...' : 'Detect Tab Pages'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review detected tabs */}
      {currentStep === 'review' && detectionResults && (
        <div className="space-y-4">
          {/* Header with actions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Step 2: Review Detected Tab Pages
              </CardTitle>
              <CardDescription>
                Review the detected tab pages on the left and use the PDF viewer on the right to verify each page.
              </CardDescription>
              <div className="flex items-center justify-between pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Found {detectionResults.detectedTabs.filter(t => t.isTabPage).length} potential tab pages out of {detectionResults.totalPages} total pages
                </p>
                <div className="flex gap-2">
                  <Button onClick={resetToUpload} variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleConfirmSplit}
                    disabled={userTabPages.length === 0 || isProcessing}
                    size="sm"
                  >
                    <Split className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Splitting...' : `Split PDF (${userTabPages.length} tabs)`}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Two-column layout with equal heights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Tab Detection Results */}
            <Card className="flex flex-col h-[calc(100vh-350px)] min-h-[700px]">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-lg">Tab Detection Results</CardTitle>
                <CardDescription className="text-sm">
                  Click page numbers to navigate in PDF viewer
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {detectionResults.detectedTabs.map((tab, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors ${
                        userTabPages.includes(tab.pageNumber) ? 'bg-blue-50 border-blue-200' : ''
                      } ${
                        currentViewerPage === tab.pageNumber ? 'ring-2 ring-green-400 bg-green-50' : ''
                      }`}
                    >
                      <Checkbox
                        checked={userTabPages.includes(tab.pageNumber)}
                        onCheckedChange={() => toggleTabPage(tab.pageNumber)}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => navigateToPage(tab.pageNumber)}
                            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer shrink-0"
                          >
                            Page {tab.pageNumber}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          {getConfidenceBadge(tab.confidence)}
                          {tab.tabNumber && <Badge variant="outline" className="text-xs">Tab {tab.tabNumber}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{tab.reason}</p>
                        {tab.detectedText && (
                          <p className="text-xs font-mono bg-gray-100 p-1 rounded truncate">
                            {tab.detectedText}
                          </p>
                        )}
                      </div>
                      {!tab.isTabPage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addTabPage(tab.pageNumber)}
                          disabled={userTabPages.includes(tab.pageNumber)}
                          className="shrink-0 text-xs px-2 py-1"
                        >
                          Mark as Tab
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-md flex-shrink-0">
                  <p className="text-sm text-blue-700">
                    <strong>Selected:</strong> {userTabPages.length > 0 ? userTabPages.join(', ') : 'None'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right: PDF Viewer */}
            {pdfUrl && (
              <Card className="flex flex-col h-[calc(100vh-350px)] min-h-[700px]">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-lg">PDF Preview</CardTitle>
                  <CardDescription className="text-sm">
                    Navigate through pages to verify tab detection
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <div className="h-full">
                    <PDFViewer 
                      pdfUrl={pdfUrl}
                      initialPage={currentViewerPage}
                      onPageChange={setCurrentViewerPage}
                      onDownload={() => {
                        if (selectedFile) {
                          const link = document.createElement('a');
                          link.href = pdfUrl;
                          link.download = selectedFile.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {currentStep === 'results' && splitResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Step 3: Split Results
            </CardTitle>
            <CardDescription>
              PDF has been split into {splitResults.length} separate documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {splitResults.reduce((total, result) => total + result.pageCount, 0)} total pages split
              </p>
              <div className="flex gap-2">
                <Button onClick={resetToUpload} variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  New PDF
                </Button>
                <Button onClick={downloadAllPDFs} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {splitResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{result.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        Tab {result.tabNumber} • {result.pageCount} pages • Pages {result.pageRange.start}-{result.pageRange.end}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPDF(result)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}