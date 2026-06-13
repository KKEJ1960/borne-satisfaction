-- Script pour ajouter la colonne numero_chambre à la table clients existante
USE hotel_satisfaction;

-- Ajouter la colonne numero_chambre si elle n'existe pas déjà
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS numero_chambre VARCHAR(10) NOT NULL DEFAULT '' AFTER email;

-- Vérification
DESCRIBE clients;
