const CUISINES = [
  { id: 'francaise', label: 'Française',  icon: '🥖' },
  { id: 'italienne', label: 'Italienne',  icon: '🍝' },
  { id: 'japonaise', label: 'Japonaise',  icon: '🍣' },
  { id: 'chinoise',  label: 'Chinoise',   icon: '🥡' },
  { id: 'indienne',  label: 'Indienne',   icon: '🍛' },
  { id: 'libanaise', label: 'Libanaise',  icon: '🥙' },
  { id: 'mexicaine', label: 'Mexicaine',  icon: '🌮' },
  { id: 'americaine',label: 'Américaine', icon: '🍔' },
  { id: 'thai',      label: 'Thaïlandaise', icon: '🍜' },
  { id: 'vegan',     label: 'Végétarien',  icon: '🥗' },
  { id: 'autre',     label: 'Autre',       icon: '🍽️' }
];

const SEED_RESTAURANTS = [
  { id: 'r-001', name: "Le Petit Bistro",      cuisine: 'francaise',  address: "12 Rue Cler, 75007 Paris",            lat: 48.8566, lng: 2.3076, price: 2, phone: '+33 1 45 55 12 34', description: "Bistro parisien typique, cuisine de saison." },
  { id: 'r-002', name: "Pasta e Basta",        cuisine: 'italienne',  address: "8 Rue Mouffetard, 75005 Paris",       lat: 48.8421, lng: 2.3499, price: 2, phone: '+33 1 43 31 25 11', description: "Pâtes fraîches faites maison." },
  { id: 'r-003', name: "Sushi Sakura",         cuisine: 'japonaise',  address: "33 Avenue de l'Opéra, 75002 Paris",   lat: 48.8688, lng: 2.3322, price: 3, phone: '+33 1 42 60 88 22', description: "Sushis et sashimis traditionnels." },
  { id: 'r-004', name: "Le Wok d'Or",          cuisine: 'chinoise',   address: "5 Rue de Belleville, 75019 Paris",    lat: 48.8722, lng: 2.3760, price: 1, phone: '+33 1 42 38 99 10', description: "Cuisine cantonaise authentique." },
  { id: 'r-005', name: "Maharaja Palace",      cuisine: 'indienne',   address: "20 Rue du Faubourg Saint-Denis, 75010 Paris", lat: 48.8716, lng: 2.3548, price: 2, phone: '+33 1 47 70 28 02', description: "Tandoori et currys épicés." },
  { id: 'r-006', name: "Beyrouth Café",        cuisine: 'libanaise',  address: "14 Rue de la Roquette, 75011 Paris",  lat: 48.8536, lng: 2.3719, price: 2, phone: '+33 1 48 06 12 88', description: "Mezzés et grillades libanaises." },
  { id: 'r-007', name: "Taco Loco",            cuisine: 'mexicaine',  address: "9 Rue Oberkampf, 75011 Paris",        lat: 48.8650, lng: 2.3704, price: 1, phone: '+33 1 43 57 22 14', description: "Tacos et burritos festifs." },
  { id: 'r-008', name: "Burger Republic",      cuisine: 'americaine', address: "47 Rue de Rivoli, 75001 Paris",       lat: 48.8579, lng: 2.3498, price: 2, phone: '+33 1 42 60 33 41', description: "Burgers premium 100% bœuf." },
  { id: 'r-009', name: "Bangkok Street",       cuisine: 'thai',       address: "11 Rue Saint-Anne, 75001 Paris",      lat: 48.8665, lng: 2.3360, price: 2, phone: '+33 1 42 96 12 03', description: "Street-food de Bangkok." },
  { id: 'r-010', name: "Green & Seeds",        cuisine: 'vegan',      address: "3 Rue des Petits Carreaux, 75002 Paris", lat: 48.8674, lng: 2.3470, price: 2, phone: '+33 1 40 28 02 33', description: "100% végétal, bio et local." },
  { id: 'r-011', name: "Bouchon des Halles",   cuisine: 'francaise',  address: "12 Rue des Marronniers, 69002 Lyon", lat: 45.7589, lng: 4.8333, price: 2, phone: '+33 4 78 37 22 11', description: "Bouchon lyonnais traditionnel." },
  { id: 'r-012', name: "Trattoria Bella",      cuisine: 'italienne',  address: "5 Rue Mercière, 69002 Lyon",          lat: 45.7611, lng: 4.8328, price: 2, phone: '+33 4 78 42 19 82', description: "Pizza au feu de bois." },
  { id: 'r-013', name: "Ramen Tora",           cuisine: 'japonaise',  address: "44 Rue Auguste Comte, 69002 Lyon",   lat: 45.7548, lng: 4.8322, price: 2, phone: '+33 4 78 37 88 14', description: "Ramen tonkotsu maison." },
  { id: 'r-014', name: "Chez Fonfon",          cuisine: 'francaise',  address: "140 Vallon des Auffes, 13007 Marseille", lat: 43.2864, lng: 5.3536, price: 3, phone: '+33 4 91 52 14 38', description: "Bouillabaisse et fruits de mer." },
  { id: 'r-015', name: "Pizzeria Etoile",      cuisine: 'italienne',  address: "62 Rue Sainte, 13001 Marseille",      lat: 43.2932, lng: 5.3737, price: 1, phone: '+33 4 91 33 22 47', description: "La meilleure pizza du Vieux-Port." },
  { id: 'r-016', name: "Ichiran Shibuya",      cuisine: 'japonaise',  address: "Shibuya, Tokyo, Japon",               lat: 35.6595, lng: 139.7004, price: 2, phone: '+81 3 3463 3667', description: "Ramen tonkotsu individuel." },
  { id: 'r-017', name: "Sushi Dai",            cuisine: 'japonaise',  address: "Toyosu Market, Tokyo, Japon",         lat: 35.6464, lng: 139.7700, price: 4, phone: '+81 3 3547 6797', description: "Sushis du marché aux poissons." },
  { id: 'r-018', name: "Pizzeria Bakka M'unica", cuisine: 'italienne', address: "Akasaka, Tokyo, Japon",            lat: 35.6720, lng: 139.7370, price: 3, phone: '+81 3 6230 9555', description: "Vraie pizza napolitaine à Tokyo." },
  { id: 'r-019', name: "Joe's Pizza",          cuisine: 'italienne',  address: "7 Carmine St, New York, NY 10014",    lat: 40.7305, lng: -74.0027, price: 1, phone: '+1 212-366-1182', description: "Slice à l'américaine depuis 1975." },
  { id: 'r-020', name: "Katz's Delicatessen",  cuisine: 'americaine', address: "205 E Houston St, New York, NY 10002", lat: 40.7223, lng: -73.9874, price: 2, phone: '+1 212-254-2246', description: "Pastrami sandwiches légendaires." },
  { id: 'r-021', name: "Sushi Nakazawa",       cuisine: 'japonaise',  address: "23 Commerce St, New York, NY 10014",  lat: 40.7316, lng: -74.0050, price: 4, phone: '+1 212-924-2212', description: "Omakase d'exception." },
  { id: 'r-022', name: "Dishoom Covent Garden",cuisine: 'indienne',   address: "12 Upper St Martin's Ln, London",     lat: 51.5121, lng: -0.1276, price: 2, phone: '+44 20 7420 9320', description: "Cuisine bombayenne moderne." },
  { id: 'r-023', name: "Padella",              cuisine: 'italienne',  address: "6 Southwark St, London",              lat: 51.5055, lng: -0.0908, price: 2, phone: '+44 20 7250 0001', description: "Pâtes fraîches du jour." },
  { id: 'r-024', name: "Chez Léon",            cuisine: 'francaise',  address: "18 Rue des Bouchers, 1000 Bruxelles", lat: 50.8484, lng: 4.3536, price: 2, phone: '+32 2 511 14 15', description: "Moules-frites depuis 1893." },
  { id: 'r-025', name: "Café du Centre",       cuisine: 'francaise',  address: "5 Place du Molard, 1204 Genève",      lat: 46.2034, lng: 6.1466, price: 3, phone: '+41 22 311 85 86', description: "Brasserie historique genevoise." },
  { id: 'r-026', name: "Schwartz's Deli",      cuisine: 'americaine', address: "3895 Boul. Saint-Laurent, Montréal",  lat: 45.5163, lng: -73.5736, price: 2, phone: '+1 514-842-4813', description: "Smoked meat québécois mythique." }
];

const SEED_REVIEWS = [
  { id: 'rv-1', restaurantId: 'r-001', author: 'Marie',  rating: 5, comment: "Le meilleur bœuf bourguignon de Paris !", date: '2026-03-12' },
  { id: 'rv-2', restaurantId: 'r-001', author: 'Julien', rating: 4, comment: "Ambiance chaleureuse, prix raisonnables.", date: '2026-02-28' },
  { id: 'rv-3', restaurantId: 'r-003', author: 'Hugo',   rating: 5, comment: "Sushis ultra frais, je recommande.",      date: '2026-04-01' },
  { id: 'rv-4', restaurantId: 'r-016', author: 'Léa',    rating: 5, comment: "Concept génial, ramen incroyable.",       date: '2026-01-22' },
  { id: 'rv-5', restaurantId: 'r-019', author: 'Tom',    rating: 4, comment: "Vraie slice new-yorkaise.",                date: '2026-03-05' }
];

window.RESTO_DATA = { CUISINES, SEED_RESTAURANTS, SEED_REVIEWS };
