-- Migration pour bases existantes (exécuter une fois)
USE hotel_satisfaction;

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categorie ENUM('Accueil','Chambres','Restaurants','Loisirs','Propreté') NOT NULL,
  texte VARCHAR(500) NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO questions (id, categorie, texte, ordre, actif) VALUES
(1, 'Accueil', 'Comment évaluez-vous la qualité de votre accueil ?', 0, true),
(2, 'Accueil', 'Le personnel était-il aimable et serviable ?', 1, true),
(3, 'Accueil', 'L''enregistrement s''est-il déroulé rapidement ?', 2, true),
(4, 'Chambres', 'Comment évaluez-vous la propreté de votre chambre ?', 0, true),
(5, 'Chambres', 'Le confort de la literie était-il satisfaisant ?', 1, true),
(6, 'Chambres', 'La température de la chambre était-elle agréable ?', 2, true),
(7, 'Restaurants', 'Comment évaluez-vous la qualité des plats ?', 0, true),
(8, 'Restaurants', 'Le service était-il rapide et efficace ?', 1, true),
(9, 'Restaurants', 'L''ambiance du restaurant était-elle agréable ?', 2, true),
(10, 'Loisirs', 'Comment évaluez-vous la variété des activités ?', 0, true),
(11, 'Loisirs', 'Les installations étaient-elles bien entretenues ?', 1, true),
(12, 'Loisirs', 'Le personnel d''animation était-il dynamique ?', 2, true),
(13, 'Propreté', 'Comment évaluez-vous la propreté générale de l''hôtel ?', 0, true),
(14, 'Propreté', 'Les espaces communs étaient-ils bien entretenus ?', 1, true),
(15, 'Propreté', 'Les sanitaires étaient-ils propres ?', 2, true);
