-- Fixed source data for reverse syncs (warehouse → destination), until choreo has a real seed mechanism.
-- Re-runnable: always leaves exactly these rows.
-- Run against d-l's postgres-warehouse (the "Local Postgres" warehouse, database pgs_warehouse, schema public):
--   docker exec -i <d-l>-postgres-warehouse-1 psql -U root -d pgs_warehouse < seeds/postgres-warehouse.sql
CREATE TABLE IF NOT EXISTS public.choreo_reverse_source (
  id         integer PRIMARY KEY,
  name       text    NOT NULL,
  amount     numeric(10, 2),
  active     boolean,
  created_on date
);
TRUNCATE public.choreo_reverse_source;
INSERT INTO public.choreo_reverse_source (id, name, amount, active, created_on) VALUES
  (1, 'alpha',   10.50, true,  '2026-01-01'),
  (2, 'bravo',   20.00, false, '2026-01-02'),
  (3, 'charlie', 30.25, true,  '2026-01-03'),
  (4, 'delta',   40.00, true,  '2026-01-04'),
  (5, 'echo',    50.75, false, '2026-01-05');
