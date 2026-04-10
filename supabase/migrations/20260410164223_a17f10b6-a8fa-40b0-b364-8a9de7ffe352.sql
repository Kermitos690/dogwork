-- Fix cover image URLs: replace old instance with current Test instance
UPDATE exercises 
SET cover_image = REPLACE(
  cover_image, 
  'https://hdmmqwpypvhwohhhaqnf.supabase.co/',
  'https://wpczgwxsriezaubncuom.supabase.co/'
)
WHERE cover_image LIKE '%hdmmqwpypvhwohhhaqnf%';