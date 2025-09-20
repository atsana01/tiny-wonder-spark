-- Update RLS policies for better chat and quote management
-- Add ticket-scoped message policies and improve quote access

-- Update messages table RLS for ticket participants
DROP POLICY IF EXISTS "Ticket participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Ticket participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients can update read status" ON public.messages;

CREATE POLICY "Ticket participants can view messages" 
ON public.messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM quote_requests qr 
  WHERE qr.id = messages.quote_request_id 
  AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
));

CREATE POLICY "Ticket participants can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM quote_requests qr 
    WHERE qr.id = messages.quote_request_id 
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

CREATE POLICY "Recipients can update read status" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Enhanced quote access policies
DROP POLICY IF EXISTS "Users can view their quotes" ON public.quotes;
DROP POLICY IF EXISTS "Vendors can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Vendors can update their quotes" ON public.quotes;

CREATE POLICY "Quote participants can view quotes" 
ON public.quotes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM quote_requests qr 
  WHERE qr.id = quotes.quote_request_id 
  AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
));

CREATE POLICY "Vendors can manage their quotes" 
ON public.quotes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM quote_requests qr 
  WHERE qr.id = quotes.quote_request_id 
  AND qr.vendor_id = auth.uid()
));

-- Add realtime for messages and quotes
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.quote_requests REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;

-- Storage policies for chat attachments (already exist but enhance them)
CREATE POLICY "Chat participants can view attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'chat-attachments' 
  AND EXISTS (
    SELECT 1 FROM quote_requests qr 
    WHERE qr.id::text = (storage.foldername(name))[1]
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

CREATE POLICY "Chat participants can upload attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND EXISTS (
    SELECT 1 FROM quote_requests qr 
    WHERE qr.id::text = (storage.foldername(name))[1]
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

-- Add quote_updates table for tracking quote changes and client updates
CREATE TABLE IF NOT EXISTS public.quote_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  updated_by uuid NOT NULL,
  update_type text NOT NULL CHECK (update_type IN ('client_update', 'vendor_quote', 'status_change')),
  changes jsonb DEFAULT '{}',
  message text,
  attachments jsonb DEFAULT '[]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for quote_updates
ALTER TABLE public.quote_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote participants can view updates" 
ON public.quote_updates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM quote_requests qr 
  WHERE qr.id = quote_updates.quote_request_id 
  AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
));

CREATE POLICY "Quote participants can create updates" 
ON public.quote_updates 
FOR INSERT 
WITH CHECK (
  auth.uid() = updated_by 
  AND EXISTS (
    SELECT 1 FROM quote_requests qr 
    WHERE qr.id = quote_updates.quote_request_id 
    AND (qr.client_id = auth.uid() OR qr.vendor_id = auth.uid())
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_quote_updates_updated_at
  BEFORE UPDATE ON public.quote_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();