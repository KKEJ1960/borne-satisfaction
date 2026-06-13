CREATE DATABASE IF NOT EXISTS hotel_satisfaction;
USE hotel_satisfaction;

-- Création de la table clients
CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  telephone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  numero_chambre VARCHAR(10) NOT NULL
);

-- Si la table avis existe déjà (de nos tests précédents), on la recrée avec le client_id
DROP TABLE IF EXISTS avis;

-- Création de la table avis liée aux clients
CREATE TABLE avis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  departement VARCHAR(100) NOT NULL,
  note INT NOT NULL,
  commentaire TEXT,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived BOOLEAN NOT NULL DEFAULT false,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Index de performance sur la table avis
CREATE INDEX idx_avis_date        ON avis(date);
CREATE INDEX idx_avis_archived    ON avis(archived);
CREATE INDEX idx_avis_departement ON avis(departement);
CREATE INDEX idx_avis_client_id   ON avis(client_id);

-- Questions dynamiques par catégorie
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categorie ENUM('Accueil','Chambres','Restaurants','Loisirs','Propreté') NOT NULL,
  texte VARCHAR(500) NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO questions (categorie, texte, ordre, actif) VALUES
('Accueil', 'Comment évaluez-vous la qualité de votre accueil ?', 0, true),
('Accueil', 'Le personnel était-il aimable et serviable ?', 1, true),
('Accueil', 'L''enregistrement s''est-il déroulé rapidement ?', 2, true),
('Chambres', 'Comment évaluez-vous la propreté de votre chambre ?', 0, true),
('Chambres', 'Le confort de la literie était-il satisfaisant ?', 1, true),
('Chambres', 'La température de la chambre était-elle agréable ?', 2, true),
('Restaurants', 'Comment évaluez-vous la qualité des plats ?', 0, true),
('Restaurants', 'Le service était-il rapide et efficace ?', 1, true),
('Restaurants', 'L''ambiance du restaurant était-elle agréable ?', 2, true),
('Loisirs', 'Comment évaluez-vous la variété des activités ?', 0, true),
('Loisirs', 'Les installations étaient-elles bien entretenues ?', 1, true),
('Loisirs', 'Le personnel d''animation était-il dynamique ?', 2, true),
('Propreté', 'Comment évaluez-vous la propreté générale de l''hôtel ?', 0, true),
('Propreté', 'Les espaces communs étaient-ils bien entretenus ?', 1, true),
('Propreté', 'Les sanitaires étaient-ils propres ?', 2, true);
