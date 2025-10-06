-- Create admins table for admin authentication
CREATE TABLE public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Admins can only see their own data
CREATE POLICY "Admins can view own data"
  ON public.admins FOR SELECT
  USING (auth.uid() = id);

-- Create forms table
CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on forms
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own forms
CREATE POLICY "Admins can view own forms"
  ON public.forms FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can create forms"
  ON public.forms FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update own forms"
  ON public.forms FOR UPDATE
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete own forms"
  ON public.forms FOR DELETE
  USING (auth.uid() = admin_id);

-- Anyone can view active forms (for public filling)
CREATE POLICY "Public can view active forms"
  ON public.forms FOR SELECT
  USING (is_active = true);

-- Create form_fields table
CREATE TABLE public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'email', 'textarea', 'number', 'date', 'radio', 'checkbox')),
  options jsonb,
  is_required boolean DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on form_fields
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

-- Admins can manage fields of their forms
CREATE POLICY "Admins can view own form fields"
  ON public.form_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_fields.form_id
    AND forms.admin_id = auth.uid()
  ));

CREATE POLICY "Admins can create form fields"
  ON public.form_fields FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_fields.form_id
    AND forms.admin_id = auth.uid()
  ));

CREATE POLICY "Admins can update form fields"
  ON public.form_fields FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_fields.form_id
    AND forms.admin_id = auth.uid()
  ));

CREATE POLICY "Admins can delete form fields"
  ON public.form_fields FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_fields.form_id
    AND forms.admin_id = auth.uid()
  ));

-- Public can view fields of active forms
CREATE POLICY "Public can view fields of active forms"
  ON public.form_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_fields.form_id
    AND forms.is_active = true
  ));

-- Create form_responses table
CREATE TABLE public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid REFERENCES public.forms(id) ON DELETE CASCADE NOT NULL,
  submitted_at timestamptz DEFAULT now()
);

-- Enable RLS on form_responses
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Admins can view responses to their forms
CREATE POLICY "Admins can view responses to own forms"
  ON public.form_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.forms
    WHERE forms.id = form_responses.form_id
    AND forms.admin_id = auth.uid()
  ));

-- Anyone can submit responses
CREATE POLICY "Public can create responses"
  ON public.form_responses FOR INSERT
  WITH CHECK (true);

-- Create response_answers table
CREATE TABLE public.response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES public.form_responses(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES public.form_fields(id) ON DELETE CASCADE NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on response_answers
ALTER TABLE public.response_answers ENABLE ROW LEVEL SECURITY;

-- Admins can view answers to their forms
CREATE POLICY "Admins can view answers to own forms"
  ON public.response_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.form_responses
    JOIN public.forms ON forms.id = form_responses.form_id
    WHERE form_responses.id = response_answers.response_id
    AND forms.admin_id = auth.uid()
  ));

-- Anyone can submit answers
CREATE POLICY "Public can create answers"
  ON public.response_answers FOR INSERT
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for forms table
CREATE TRIGGER set_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();