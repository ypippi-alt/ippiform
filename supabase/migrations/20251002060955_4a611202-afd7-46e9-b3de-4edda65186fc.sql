-- Create storage bucket for form uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true);

-- Allow public to upload files
CREATE POLICY "Anyone can upload form images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'form-uploads');

-- Allow public to view uploaded files
CREATE POLICY "Anyone can view form images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'form-uploads');

-- Allow form owners to delete files
CREATE POLICY "Form owners can delete uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'form-uploads' AND
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.admin_id = auth.uid()
  )
);