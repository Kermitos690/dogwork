-- Add chip_id (AMICUS microchip number) to dogs table
ALTER TABLE public.dogs ADD COLUMN chip_id text;

-- Unique constraint on chip_id (one chip per dog)
CREATE UNIQUE INDEX idx_dogs_chip_id ON public.dogs (chip_id) WHERE chip_id IS NOT NULL;

-- Index for fast lookups
CREATE INDEX idx_dogs_chip_id_lookup ON public.dogs (chip_id) WHERE chip_id IS NOT NULL;