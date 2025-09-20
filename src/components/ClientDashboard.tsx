import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building, Star, Clock, MessageSquare, Euro, User, Home, Trash2, Search, Filter, Upload, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatClientName } from '@/utils/nameFormat';
import EnhancedChatModal from '@/components/EnhancedChatModal';
import ViewQuoteModal from '@/components/ViewQuoteModal';
import UpdateQuoteModal from '@/components/UpdateQuoteModal';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

interface QuoteRequest {
  id: string;
  project: {
    title: string;
    description: string;
    budget_range: string;
    location: string;
    created_at: string;
  };
  vendor: {
    full_name: string;
    user_id: string;
    business_name: string;
    rating: number;
    total_reviews: number;
    verification_status: string;
  };
  status: string;
  created_at: string;
  quoted_amount?: number;
  vendor_notes?: string;
}

const ClientDashboard = () => {
  const { user } = useAuth();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal states
  const [chatModal, setChatModal] = useState<{
    isOpen: boolean;
    quoteRequestId: string;
    projectTitle: string;
    clientId: string;
    vendorId: string;
  }>({
    isOpen: false,
    quoteRequestId: '',
    projectTitle: '',
    clientId: '',
    vendorId: ''
  });

  const [viewQuoteModal, setViewQuoteModal] = useState<{
    isOpen: boolean;
    quoteRequestId: string;
  }>({
    isOpen: false,
    quoteRequestId: ''
  });

  const [updateQuoteModal, setUpdateQuoteModal] = useState<{
    isOpen: boolean;
    quoteRequestId: string;
    projectTitle: string;
  }>({
    isOpen: false,
    quoteRequestId: '',
    projectTitle: ''
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    quoteIds: string[];
  }>({
    isOpen: false,
    quoteIds: []
  });

  const fetchQuoteRequests = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          projects (
            title,
            description,
            budget_range,
            location,
            created_at
          )
        `)
        .eq('client_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get vendor profiles for each quote request
      const vendorIds = data?.map(item => item.vendor_id) || [];
      let vendorProfiles: any[] = [];
      
      if (vendorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('vendor_profiles')
          .select('user_id, business_name, rating, total_reviews, verification_status');
        
        if (!profilesError) {
          vendorProfiles = profiles || [];
        }
      }

      const formattedData = data?.map(item => {
        const vendorProfile = vendorProfiles.find(p => p.user_id === item.vendor_id);
        return {
          id: item.id,
          status: item.status,
          created_at: item.created_at,
          quoted_amount: item.quoted_amount,
          vendor_notes: item.vendor_notes,
          project: {
            title: item.projects?.title || 'Untitled Project',
            description: item.projects?.description || '',
            budget_range: item.projects?.budget_range || 'Budget not specified',
            location: item.projects?.location || 'Location not specified',
            created_at: item.projects?.created_at || item.created_at
          },
          vendor: {
            full_name: vendorProfile?.business_name || 'Vendor',
            user_id: item.vendor_id,
            business_name: vendorProfile?.business_name || 'Vendor',
            rating: vendorProfile?.rating || 0,
            total_reviews: vendorProfile?.total_reviews || 0,
            verification_status: vendorProfile?.verification_status || 'pending'
          }
        };
      }) || [];
      
      setQuoteRequests(formattedData);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load quotes",
        variant: "destructive",
      });
      setQuoteRequests([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchQuoteRequests();
  }, [fetchQuoteRequests]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'quoted': return 'default';
      case 'accepted': return 'default';
      case 'declined': return 'destructive';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleChat = (quoteRequestId: string, projectTitle: string, vendorId: string) => {
    setChatModal({
      isOpen: true,
      quoteRequestId,
      projectTitle,
      clientId: user?.id || '',
      vendorId
    });
  };

  const handleViewQuote = (quoteRequestId: string) => {
    setViewQuoteModal({
      isOpen: true,
      quoteRequestId
    });
  };

  const handleUpdateQuote = (quoteRequestId: string, projectTitle: string) => {
    setUpdateQuoteModal({
      isOpen: true,
      quoteRequestId,
      projectTitle
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedQuotes.length === 0) return;
    
    setDeleteDialog({
      isOpen: true,
      quoteIds: selectedQuotes
    });
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', deleteDialog.quoteIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${deleteDialog.quoteIds.length} quote request(s) deleted successfully`,
      });

      setSelectedQuotes([]);
      setIsSelecting(false);
      fetchQuoteRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete quote requests",
        variant: "destructive",
      });
    }
    setDeleteDialog({ isOpen: false, quoteIds: [] });
  };

  const filteredQuotes = quoteRequests.filter(quote => {
    const matchesSearch = quote.project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Client Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {formatClientName(user?.email || '')}</p>
            </div>
          </div>
          <Button asChild className="bg-gradient-primary">
            <Link to="/">
              <Building className="w-4 h-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quote Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-primary">
                  {quoteRequests.filter(q => q.status === 'pending').length}
                </div>
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {quoteRequests.filter(q => q.status === 'accepted').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple">
                {quoteRequests.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {quoteRequests.filter(q => q.status === 'accepted').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search projects or vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input rounded-md bg-background"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="quoted">Quoted</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        {/* Quote Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                My Quotes
              </CardTitle>
              <div className="flex items-center gap-3">
                {isSelecting && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allIds = filteredQuotes.map(q => q.id);
                      setSelectedQuotes(selectedQuotes.length === allIds.length ? [] : allIds);
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    {selectedQuotes.length === filteredQuotes.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
                {isSelecting && selectedQuotes.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="text-white bg-destructive border-destructive hover:bg-destructive/90"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Selected ({selectedQuotes.length})
                  </Button>
                )}
                <Button
                  variant={isSelecting ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    setIsSelecting(!isSelecting);
                    setSelectedQuotes([]);
                  }}
                  className={isSelecting ? "text-white bg-red-600 border-red-600 hover:bg-red-700" : ""}
                >
                  {isSelecting ? "Cancel" : "Select Multiple"}
                </Button>
              </div>
            </div>
            <CardDescription>
              Manage your quotes and project communications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quotes found. Start a new project to receive quotes!
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuotes.map((quote) => (
                  <Card key={quote.id} className={`hover:shadow-lg transition-shadow ${isSelecting && selectedQuotes.includes(quote.id) ? 'ring-2 ring-destructive' : ''}`}>
                    <CardContent className="p-6">
                      {isSelecting && (
                        <div className="flex items-center mb-4">
                          <input
                            type="checkbox"
                            checked={selectedQuotes.includes(quote.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuotes([...selectedQuotes, quote.id]);
                              } else {
                                setSelectedQuotes(selectedQuotes.filter(id => id !== quote.id));
                              }
                            }}
                            className="h-5 w-5 text-primary border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-primary cursor-pointer"
                            id={`client-select-${quote.id}`}
                          />
                          <label 
                            htmlFor={`client-select-${quote.id}`}
                            className="ml-3 text-sm font-medium text-gray-700 cursor-pointer select-none min-h-[44px] flex items-center"
                          >
                            Select for deletion
                          </label>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{quote.vendor.business_name}</h3>
                            <Badge variant={getStatusBadgeVariant(quote.status)}>
                              {quote.status}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">
                            {quote.project.title}
                          </p>
                          <p className="text-muted-foreground text-xs mb-3">
                            {quote.project.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {quote.quoted_amount && (
                              <span className="flex items-center gap-1 text-accent font-medium">
                                <Euro className="w-4 h-4" />
                                €{quote.quoted_amount.toLocaleString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(quote.created_at)}
                            </span>
                            {quote.project.location && (
                              <span>{quote.project.location}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button 
                            variant="modern" 
                            size="sm"
                            onClick={() => handleChat(quote.id, quote.project.title, quote.vendor.user_id)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          {quote.status === 'quoted' && (
                            <Button 
                              size="sm" 
                              variant="modern"
                              onClick={() => handleViewQuote(quote.id)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              View Quote
                            </Button>
                          )}
                          <Button 
                            variant="modern" 
                            size="sm"
                            onClick={() => handleUpdateQuote(quote.id, quote.project.title)}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Update Quote
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <EnhancedChatModal
          isOpen={chatModal.isOpen}
          onClose={() => setChatModal({ isOpen: false, quoteRequestId: '', projectTitle: '', clientId: '', vendorId: '' })}
          quoteRequestId={chatModal.quoteRequestId}
          projectTitle={chatModal.projectTitle}
          clientId={chatModal.clientId}
          vendorId={chatModal.vendorId}
        />

        <ViewQuoteModal
          isOpen={viewQuoteModal.isOpen}
          onClose={() => setViewQuoteModal({ isOpen: false, quoteRequestId: '' })}
          quoteRequestId={viewQuoteModal.quoteRequestId}
          onQuoteAction={fetchQuoteRequests}
        />

        <UpdateQuoteModal
          isOpen={updateQuoteModal.isOpen}
          onClose={() => setUpdateQuoteModal({ isOpen: false, quoteRequestId: '', projectTitle: '' })}
          quoteRequestId={updateQuoteModal.quoteRequestId}
          projectTitle={updateQuoteModal.projectTitle}
          onUpdateSubmitted={fetchQuoteRequests}
        />

        <ConfirmDeleteDialog
          open={deleteDialog.isOpen}
          onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, quoteIds: [] })}
          onConfirm={confirmDelete}
          title="Delete Quote Requests"
          description={`Are you sure you want to delete ${deleteDialog.quoteIds.length} quote request(s)? This action cannot be undone.`}
        />
      </div>
    </div>
  );
};

export default ClientDashboard;