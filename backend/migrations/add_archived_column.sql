USE hotel_satisfaction;

ALTER TABLE avis
  ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
