import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Euro, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Edit3,
  Shield,
  Image,
  Download,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ViewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteRequestId: string;
  onQuoteAction: () => void;
}

interface QuoteData {
  id: string;
  quote_request_id: string;
  total_amount: number;
  cost_breakdown: any;
  estimated_timeline: string;
  milestones: any;
  inclusions: string[];
  exclusions: string[];
  validity_date: string;
  payment_schedule: any;
  insurance_will_be_used: boolean;
  insurance_provider_used: string;
  site_visit_required: boolean;
  proposed_visit_dates: any;
  notes_to_client: string;
  assumptions_dependencies: string;
  portfolio_references: any;
  created_at: string;
  version: number;
  is_current_version: boolean;
}

interface QuoteRequest {
  id: string;
  status: string;
  vendor_id: string;
  client_id: string;
  projects?: {
    title: string;
    description: string;
  };
}

const ViewQuoteModal: React.FC<ViewQuoteModalProps> = ({
  isOpen,
  onClose,
  quoteRequestId,
  onQuoteAction
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (isOpen && quoteRequestId) {
      fetchQuoteData();
    }
  }, [isOpen, quoteRequestId]);

  const fetchQuoteData = async () => {
    setLoading(true);
    try {
      // Fetch quote request
      const { data: quoteRequestData, error: qrError } = await supabase
        .from('quote_requests')
        .select(`
          *,
          projects (
            title,
            description
          )
        `)
        .eq('id', quoteRequestId)
        .single();

      if (qrError) throw qrError;
      setQuoteRequest(quoteRequestData);

      // Fetch current quote version
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('quote_request_id', quoteRequestId)
        .eq('is_current_version', true)
        .single();

      if (quoteError && quoteError.code !== 'PGRST116') {
        throw quoteError;
      }

      setQuote(quoteData);
    } catch (error: any) {
      console.error('Error fetching quote:', error);
      toast({
        title: "Error",
        description: "Failed to load quote details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!quoteRequest) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteRequestId);

      if (error) throw error;

      // Log the acceptance
      await supabase
        .from('quote_updates')
        .insert({
          quote_request_id: quoteRequestId,
          updated_by: user?.id,
          update_type: 'status_change',
          changes: { status: 'accepted' },
          message: 'Quote accepted by client'
        });

      toast({
        title: "Quote Accepted",
        description: "You have successfully accepted this quote. The vendor will be notified.",
      });

      onQuoteAction();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to accept quote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineQuote = async () => {
    if (!quoteRequest) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteRequestId);

      if (error) throw error;

      await supabase
        .from('quote_updates')
        .insert({
          quote_request_id: quoteRequestId,
          updated_by: user?.id,
          update_type: 'status_change',
          changes: { status: 'declined' },
          message: 'Quote declined by client'
        });

      toast({
        title: "Quote Declined",
        description: "You have declined this quote. The vendor will be notified.",
      });

      onQuoteAction();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to decline quote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a review message",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update quote request status to pending review
      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteRequestId);

      if (updateError) throw updateError;

      // Create quote update entry
      await supabase
        .from('quote_updates')
        .insert({
          quote_request_id: quoteRequestId,
          updated_by: user?.id,
          update_type: 'client_update',
          message: reviewMessage.trim(),
          changes: { status: 'pending_revision' }
        });

      toast({
        title: "Review Submitted",
        description: "Your review has been sent to the vendor for revision.",
      });

      setShowReviewForm(false);
      setReviewMessage('');
      onQuoteAction();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!quoteRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Quote Details - {quoteRequest.projects?.title}
            {quote && (
              <Badge variant="outline" className="ml-2">
                Version {quote.version}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          {loading ? (
            <div className="text-center py-8">Loading quote details...</div>
          ) : !quote ? (
            <div className="text-center py-8 text-muted-foreground">
              No quote details available yet.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quote Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-accent" />
                    Quote Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-accent/10 rounded-lg">
                      <div className="text-2xl font-bold text-accent">
                        {formatCurrency(quote.total_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-lg font-semibold text-primary">
                        {quote.estimated_timeline}
                      </div>
                      <div className="text-sm text-muted-foreground">Timeline</div>
                    </div>
                    <div className="text-center p-4 bg-purple/10 rounded-lg">
                      <div className="text-sm font-semibold text-purple">
                        Valid until {formatDate(quote.validity_date)}
                      </div>
                      <div className="text-sm text-muted-foreground">Quote Validity</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              {quote.cost_breakdown && Array.isArray(quote.cost_breakdown) && quote.cost_breakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {quote.cost_breakdown.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <span>{item.description || item.item}</span>
                          <span className="font-medium">{formatCurrency(item.amount || item.cost)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quote.inclusions && quote.inclusions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-accent">
                        <CheckCircle2 className="w-5 h-5" />
                        What's Included
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {quote.inclusions.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {quote.exclusions && quote.exclusions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <XCircle className="w-5 h-5" />
                        What's NOT Included
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {quote.exclusions.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Milestones */}
              {quote.milestones && Array.isArray(quote.milestones) && quote.milestones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Project Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {quote.milestones.map((milestone: any, index: number) => (
                        <div key={index} className="border-l-4 border-primary pl-4">
                          <div className="font-medium">{milestone.name || milestone.title}</div>
                          <div className="text-sm text-muted-foreground">{milestone.description}</div>
                          {milestone.duration && (
                            <div className="text-sm text-accent">{milestone.duration}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Insurance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Insurance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Insurance Coverage</span>
                        <Badge variant={quote.insurance_will_be_used ? "default" : "secondary"}>
                          {quote.insurance_will_be_used ? "Included" : "Not Required"}
                        </Badge>
                      </div>
                      {quote.insurance_provider_used && (
                        <div>
                          <span className="text-sm text-muted-foreground">Provider:</span>
                          <p className="font-medium">{quote.insurance_provider_used}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Site Visit */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Site Visit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Site Visit Required</span>
                        <Badge variant={quote.site_visit_required ? "default" : "secondary"}>
                          {quote.site_visit_required ? "Yes" : "No"}
                        </Badge>
                      </div>
                      {quote.proposed_visit_dates && Array.isArray(quote.proposed_visit_dates) && quote.proposed_visit_dates.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Proposed Dates:</span>
                          <div className="space-y-1">
                            {quote.proposed_visit_dates.map((date: any, index: number) => (
                              <div key={index} className="text-sm">{formatDate(date.date || date)}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes and Assumptions */}
              {(quote.notes_to_client || quote.assumptions_dependencies) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {quote.notes_to_client && (
                      <div>
                        <h4 className="font-medium mb-2">Notes to Client</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                          {quote.notes_to_client}
                        </p>
                      </div>
                    )}
                    {quote.assumptions_dependencies && (
                      <div>
                        <h4 className="font-medium mb-2">Assumptions & Dependencies</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                          {quote.assumptions_dependencies}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Review Form */}
              {showReviewForm && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5" />
                      Request Quote Revision
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Please describe the changes you'd like to see in this quote..."
                        value={reviewMessage}
                        onChange={(e) => setReviewMessage(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSubmitReview}
                          disabled={loading || !reviewMessage.trim()}
                          className="bg-gradient-primary"
                        >
                          Submit Review
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowReviewForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        {quote && quoteRequest.status === 'quoted' && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Close
            </Button>
            {!showReviewForm && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setShowReviewForm(true)}
                  className="text-primary border-primary hover:bg-primary/10"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Request Revision
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeclineQuote}
                  disabled={loading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline Quote
                </Button>
                <Button 
                  onClick={handleAcceptQuote}
                  disabled={loading}
                  className="bg-gradient-primary"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Quote
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewQuoteModal;