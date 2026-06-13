const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function testDatabaseConnection() {
  console.log('🔍 Test de connexion à la base de données...');
  console.log('🔑 Configuration:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ? '***' : '(vide)',
    database: process.env.DB_NAME
  });
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connexion à la base de données réussie');

    // Vérifier si les tables existent
    console.log('\n📋 Vérification des tables...');
    
    const [tables] = await connection.execute("SHOW TABLES");
    console.log('Tables trouvées:', tables.map(t => Object.values(t)[0]));

    // Compter les avis
    console.log('\n📊 Comptage des avis...');
    const [avisCount] = await connection.execute("SELECT COUNT(*) as count FROM avis");
    console.log(`Nombre total d'avis: ${avisCount[0].count}`);

    // Compter les clients
    console.log('\n👥 Comptage des clients...');
    const [clientsCount] = await connection.execute("SELECT COUNT(*) as count FROM clients");
    console.log(`Nombre total de clients: ${clientsCount[0].count}`);

    // Afficher les 5 derniers avis
    console.log('\n📝 5 derniers avis:');
    const [lastAvis] = await connection.execute(`
      SELECT a.*, c.nom, c.prenom, c.numero_chambre 
      FROM avis a 
      JOIN clients c ON a.client_id = c.id 
      ORDER BY a.date DESC 
      LIMIT 5
    `);
    
    if (lastAvis.length === 0) {
      console.log('❌ Aucun avis trouvé dans la base de données');
    } else {
      lastAvis.forEach((avis, index) => {
        console.log(`${index + 1}. ${avis.prenom} ${avis.nom} - ${avis.departement} - ${avis.note}/3 - ${avis.date}`);
      });
    }

    await connection.end();
    console.log('\n✅ Test terminé avec succès');

  } catch (error) {
    console.error('❌ Erreur lors du test de la base de données:', error);
    process.exit(1);
  }
}

testDatabaseConnection();
