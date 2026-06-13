CREATE DATABASE IF NOT EXISTS hotel_satisfaction;
USE hotel_satisfaction;
CREATE TABLE IF NOT EXISTS avis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  departement VARCHAR(50),
  note INT,
  commentaire TEXT,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
