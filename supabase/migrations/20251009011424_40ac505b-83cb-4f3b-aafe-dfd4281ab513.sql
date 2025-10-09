-- Add UPDATE and DELETE policies for form_responses and response_answers

-- Allow admins to update responses to their own forms
CREATE POLICY "Admins can update responses to own forms"
ON public.form_responses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND forms.admin_id = auth.uid()
  )
);

-- Allow admins to delete responses to their own forms
CREATE POLICY "Admins can delete responses to own forms"
ON public.form_responses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM forms
    WHERE forms.id = form_responses.form_id
    AND forms.admin_id = auth.uid()
  )
);

-- Allow admins to update answers to responses on their own forms
CREATE POLICY "Admins can update answers to own forms"
ON public.response_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM form_responses
    JOIN forms ON forms.id = form_responses.form_id
    WHERE form_responses.id = response_answers.response_id
    AND forms.admin_id = auth.uid()
  )
);

-- Allow admins to delete answers to responses on their own forms
CREATE POLICY "Admins can delete answers to own forms"
ON public.response_answers
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM form_responses
    JOIN forms ON forms.id = form_responses.form_id
    WHERE form_responses.id = response_answers.response_id
    AND forms.admin_id = auth.uid()
  )
);