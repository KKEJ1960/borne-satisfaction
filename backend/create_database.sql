-- Création de la base de données pour l'application d'hôtel
CREATE DATABASE IF NOT EXISTS hotel_satisfaction;

USE hotel_satisfaction;

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    email VARCHAR(255),
    numero_chambre VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des avis
CREATE TABLE IF NOT EXISTS avis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    departement VARCHAR(50) NOT NULL,
    note INT NOT NULL,
    commentaire TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Insertion d'un client de test
INSERT INTO clients (nom, prenom, telephone, email, numero_chambre) 
VALUES ('Test', 'Client', '0102030405', 'test@example.com', '101');
