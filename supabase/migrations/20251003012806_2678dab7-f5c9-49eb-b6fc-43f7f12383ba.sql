-- Drop the existing check constraint
ALTER TABLE public.form_fields DROP CONSTRAINT form_fields_field_type_check;

-- Add the updated check constraint with 'select' and 'image' types
ALTER TABLE public.form_fields ADD CONSTRAINT form_fields_field_type_check 
CHECK (field_type = ANY (ARRAY['text'::text, 'email'::text, 'textarea'::text, 'number'::text, 'date'::text, 'radio'::text, 'checkbox'::text, 'select'::text, 'image'::text]));