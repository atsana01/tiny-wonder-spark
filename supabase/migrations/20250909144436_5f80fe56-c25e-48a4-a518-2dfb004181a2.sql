-- Fix security issue: Set search_path for functions
CREATE OR REPLACE FUNCTION public.log_quote_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a soft delete (setting deleted_at)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      'soft_delete',
      'quote_requests',
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;