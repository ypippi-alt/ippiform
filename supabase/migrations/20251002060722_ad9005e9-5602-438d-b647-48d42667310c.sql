-- Allow public to view responses for active forms
CREATE POLICY "Public can view responses to active forms"
ON form_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM forms 
    WHERE forms.id = form_responses.form_id 
    AND forms.is_active = true
  )
);

-- Allow public to view answers for active forms
CREATE POLICY "Public can view answers to active forms"
ON response_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM form_responses
    JOIN forms ON forms.id = form_responses.form_id
    WHERE form_responses.id = response_answers.response_id
    AND forms.is_active = true
  )
);