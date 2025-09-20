import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Image, X, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UpdateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  projectTitle: string;
  onUpdateSubmitted: () => void;
}

interface FileUpload {
  file: File;
  progress: number;
  id: string;
  url?: string;
  error?: string;
}

const UpdateQuoteModal: React.FC<UpdateQuoteModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  projectTitle,
  onUpdateSubmitted
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Validate file types and sizes
    const validFiles = selectedFiles.filter(file => {
      const isValidType = file.type.includes('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type. Please upload images or PDFs only.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} is too large. Please keep files under 10MB.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    const newFiles: FileUpload[] = validFiles.map(file => ({
      file,
      progress: 0,
      id: Math.random().toString(36).substr(2, 9)
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Upload files immediately
    newFiles.forEach(fileUpload => {
      uploadFile(fileUpload);
    });
  };

  const uploadFile = async (fileUpload: FileUpload) => {
    try {
      const fileExt = fileUpload.file.name.split('.').pop();
      const fileName = `${quoteRequestId}/${user?.id}/${Date.now()}.${fileExt}`;

      // Update progress during upload
      setFiles(prev => 
        prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, progress: 50 }
            : f
        )
      );

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, fileUpload.file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      setFiles(prev => 
        prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, progress: 100, url: publicUrl }
            : f
        )
      );

    } catch (error: any) {
      console.error('Upload error:', error);
      setFiles(prev => 
        prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, error: error.message }
            : f
        )
      );
      
      toast({
        title: "Upload failed",
        description: `Failed to upload ${fileUpload.file.name}`,
        variant: "destructive",
      });
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message describing your update",
        variant: "destructive",
      });
      return;
    }

    // Check if any files are still uploading
    const uploadingFiles = files.filter(f => f.progress < 100 && !f.error);
    if (uploadingFiles.length > 0) {
      toast({
        title: "Please wait",
        description: "Files are still uploading. Please wait for uploads to complete.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get successful uploads
      const successfulUploads = files.filter(f => f.url && !f.error);
      const attachments = successfulUploads.map(f => ({
        filename: f.file.name,
        url: f.url,
        type: f.file.type,
        size: f.file.size
      }));

      // Create quote update entry
      const { error: updateError } = await supabase
        .from('quote_updates')
        .insert({
          quote_request_id: quoteRequestId,
          updated_by: user?.id,
          update_type: 'client_update',
          message: message.trim(),
          attachments: attachments,
          changes: { 
            files_added: attachments.length,
            update_timestamp: new Date().toISOString()
          }
        });

      if (updateError) throw updateError;

      // Update the quote request timestamp
      await supabase
        .from('quote_requests')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteRequestId);

      toast({
        title: "Update Sent",
        description: "Your update has been sent to the vendor successfully.",
      });

      // Reset form
      setMessage('');
      setFiles([]);
      onUpdateSubmitted();
      onClose();
    } catch (error: any) {
      console.error('Error submitting update:', error);
      toast({
        title: "Error",
        description: "Failed to send update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const handleClose = () => {
    setMessage('');
    setFiles([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Update Quote Request - "{projectTitle}"
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-auto">
          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Additional Information *
            </Label>
            <Textarea
              id="message"
              placeholder="Describe any changes, additional requirements, or clarifications for your project..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
              required
            />
            <p className="text-sm text-muted-foreground">
              Provide any additional details that might help the vendor refine their quote.
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Attach Files (Optional)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Add Files
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-sm text-muted-foreground">
              Upload images, drawings, or PDF documents to help clarify your requirements. Max 10MB per file.
            </p>

            {/* File Preview */}
            {files.length > 0 && (
              <div className="space-y-3">
                {files.map((fileUpload) => (
                  <Card key={fileUpload.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {isImageFile(fileUpload.file.name) ? (
                          <Image className="w-5 h-5 text-primary" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {fileUpload.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {fileUpload.error ? (
                          <span className="text-xs text-destructive">Failed</span>
                        ) : fileUpload.progress < 100 ? (
                          <div className="w-20">
                            <Progress value={fileUpload.progress} className="h-2" />
                          </div>
                        ) : (
                          <span className="text-xs text-accent">Uploaded</span>
                        )}
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileUpload.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !message.trim()}
              className="bg-gradient-primary"
            >
              {loading ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Update
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateQuoteModal;