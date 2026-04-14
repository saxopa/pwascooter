-- Insert 8 realistic Toulouse hosts with real GPS coords, varied prices 0.50€–1.50€/h
INSERT INTO public.hosts (name, latitude, longitude, price_per_hour, capacity, has_charging, is_active, owner_id)
VALUES
  ('Tabac Capitole — Place du Capitole',          43.6044, 1.4440,  0.80, 3, false, true, NULL),
  ('Café des Carmes — Rue des Carmes',            43.5988, 1.4427,  0.60, 2, false, true, NULL),
  ('Épicerie Saint-Cyprien — Pl. Roguet',         43.5970, 1.4316,  0.50, 4, false, true, NULL),
  ('Boulangerie Minimes — Av. des Minimes',       43.6175, 1.4368,  0.70, 2, false, true, NULL),
  ('Bar Arnaud-Bernard — Pl. Arnaud-Bernard',     43.6116, 1.4396,  0.60, 3, false, true, NULL),
  ('Hôtel Wilson — Pl. du Président Wilson',      43.6006, 1.4516,  1.20, 2, true,  true, NULL),
  ('Librairie Esquirol — Rue d''Alsace-Lorraine', 43.5993, 1.4468,  0.90, 3, false, true, NULL),
  ('Co-working Compans-Caffarelli',               43.6099, 1.4316,  1.50, 5, true,  true, NULL)
ON CONFLICT DO NOTHING;
