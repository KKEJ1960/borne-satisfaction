-- Migration : suppression de Restaurants, ajout des 3 nouvelles catégories
-- À exécuter UNE SEULE FOIS dans MySQL

USE hotel_satisfaction;

-- 1. Supprimer toutes les questions de l'ancienne catégorie Restaurants
DELETE FROM questions WHERE categorie = 'Restaurants';

-- 2. Modifier l'ENUM pour retirer Restaurants et ajouter les 3 nouvelles catégories
ALTER TABLE questions
  MODIFY categorie ENUM(
    'Accueil',
    'Chambres',
    'Le Bandama Petit Déjeuner',
    'Le Panoramique',
    'L''Alocodrome',
    'Loisirs',
    'Propreté'
  ) NOT NULL;

-- 3. Insérer les questions pour Le Bandama Petit Déjeuner
INSERT INTO questions (categorie, texte, ordre, actif) VALUES
('Le Bandama Petit Déjeuner', 'Avez-vous été bien accueilli(e) au petit déjeuner ?', 0, true),
('Le Bandama Petit Déjeuner', 'Le buffet était-il achalandé et attrayant ?', 1, true),
('Le Bandama Petit Déjeuner', 'Les choix de repas proposés a-t-il répondu à vos attentes ?', 2, true),
('Le Bandama Petit Déjeuner', 'Le service en salle était-il rapide et efficace ?', 3, true),
('Le Bandama Petit Déjeuner', 'Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?', 4, true);

-- 4. Insérer les questions pour Le Panoramique
INSERT INTO questions (categorie, texte, ordre, actif) VALUES
('Le Panoramique', 'Avez-vous été bien accueilli(e) au restaurant ?', 0, true),
('Le Panoramique', 'Notre menu disponible était-il attrayant ?', 1, true),
('Le Panoramique', 'Votre repas étaient-il à votre goût ?', 2, true),
('Le Panoramique', 'Le service en salle était-il rapide et efficace ?', 3, true),
('Le Panoramique', 'Les prix des menus étaient-ils satisfaisants ?', 4, true),
('Le Panoramique', 'Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?', 5, true);

-- 5. Insérer les questions pour L'Alocodrome
INSERT INTO questions (categorie, texte, ordre, actif) VALUES
('L''Alocodrome', 'Avez-vous été bien accueilli(e) au restaurant ?', 0, true),
('L''Alocodrome', 'Notre menu disponible était-il attrayant ?', 1, true),
('L''Alocodrome', 'Votre repas étaient-il à votre goût ?', 2, true),
('L''Alocodrome', 'Le service était-il rapide et efficace ?', 3, true),
('L''Alocodrome', 'Les prix des menus étaient-ils satisfaisants ?', 4, true),
('L''Alocodrome', 'Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?', 5, true);
