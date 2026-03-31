-- Create servicos table for editable barbershop services
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  duracao TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Everyone can read active services (for booking page)
CREATE POLICY "Anyone can view active services"
ON public.servicos FOR SELECT
USING (true);

-- Only authenticated users can insert/update/delete (admin)
CREATE POLICY "Authenticated users can insert services"
ON public.servicos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update services"
ON public.servicos FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete services"
ON public.servicos FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_servicos_updated_at
BEFORE UPDATE ON public.servicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial services
INSERT INTO public.servicos (nome, preco, duracao, ordem) VALUES
  ('Corte 0 até 6 anos', 40.00, '30min', 1),
  ('Corte', 35.00, '30min', 2),
  ('Barba', 30.00, '30min', 3),
  ('Corte e Barba', 65.00, '1hr', 4),
  ('Corte e Sobrancelha', 45.00, '30min', 5),
  ('Corte Barba e Sobrancelha', 75.00, '1hr', 6),
  ('Barba e Sobrancelha', 40.00, '30min', 7),
  ('Penteado', 15.00, '10min', 8),
  ('Bigode', 10.00, '5min', 9),
  ('Acabamento', 15.00, '5min', 10),
  ('Hidratação e Corte', 50.00, '40min', 11),
  ('Selagem e Corte', 120.00, '1hr 30min', 12),
  ('Botox e Corte', 120.00, '1hr 30min', 13),
  ('Luzes e Corte', 140.00, '2hr', 14),
  ('Platinado e Corte', 140.00, '2hr', 15);