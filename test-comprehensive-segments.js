/**
 * test-comprehensive-segments.js - Comprehensive segment testing with 5+ users per segment
 * 
 * SEGMENTS COVERAGE:
 * - PARENTS: 5 users (Parents Free)
 * - EDUCATORS: 20 users (4 plans x 5 users each)
 * - THERAPISTS: 15 users (3 plans x 5 users each)
 * 
 * TOTAL: 40 users across 8 segments
 */

// Using built-in fetch (Node.js 18+)

// ===== CONFIGURATION =====
const API_ENDPOINT = 'https://little-microphones.vercel.app/api/test-registration';

// ===== PARENTS DATA (5 users - Parents Free) =====
const PARENTS_DATA = [
  {
    name: 'Anna Kowalska',
    email: 'anna.kowalska.parent@gmail.com',
    plan: 'pln_parents-y1ea03qk',
    city: 'Warsaw',
    country: 'Poland',
    phone: '+48 600 123 456',
    language: 'pl',
    children_ages: '5, 8',
    profession: 'Software Engineer'
  },
  {
    name: 'Michael Thompson',
    email: 'michael.thompson.parent@outlook.com',
    plan: 'pln_parents-y1ea03qk',
    city: 'London',
    country: 'United Kingdom',
    phone: '+44 20 7123 4567',
    language: 'en',
    children_ages: '6, 9, 12',
    profession: 'Marketing Manager'
  },
  {
    name: 'Sofia Rodriguez',
    email: 'sofia.rodriguez.parent@yahoo.es',
    plan: 'pln_parents-y1ea03qk',
    city: 'Madrid',
    country: 'Spain',
    phone: '+34 91 123 45 67',
    language: 'en',
    children_ages: '4, 7',
    profession: 'Doctor'
  },
  {
    name: 'Emma Mueller',
    email: 'emma.mueller.parent@web.de',
    plan: 'pln_parents-y1ea03qk',
    city: 'Berlin',
    country: 'Germany',
    phone: '+49 30 123 45 67',
    language: 'en',
    children_ages: '5, 10',
    profession: 'Teacher'
  },
  {
    name: 'Jean Dupont',
    email: 'jean.dupont.parent@orange.fr',
    plan: 'pln_parents-y1ea03qk',
    city: 'Paris',
    country: 'France',
    phone: '+33 1 42 12 34 56',
    language: 'en',
    children_ages: '6, 8, 11',
    profession: 'Architect'
  }
];

// ===== EDUCATORS FREE DATA (5 users) =====
const EDUCATORS_FREE_DATA = [
  {
    name: 'Maria Nowak',
    email: 'maria.nowak@sp01.edu.pl',
    plan: 'pln_free-plan-dhnb0ejd',
    role: 'Teacher',
    school: 'Primary School No. 1 Warsaw',
    city: 'Warsaw',
    country: 'Poland',
    phone: '+48 22 123 45 67',
    language: 'pl',
    no_classes: 2,
    no_kids: 45,
    school_address: 'ul. Szkolna 1, 00-001 Warsaw',
    school_type: 'Primary School',
    school_phone: '+48 22 111 22 33',
    school_website: 'https://sp01.warsaw.pl',
    school_latitude: '52.2297',
    school_longitude: '21.0122',
    school_rating: '4.1',
    school_state: 'Mazovia',
    school_street_address: 'ul. Szkolna 1',
    school_zip: '00-001',
    school_place_id: 'ChIJ_Warsaw_001',
    school_place_name: 'SP 01 Warsaw'
  },
  {
    name: 'John Smith',
    email: 'john.smith@hillview.edu.uk',
    plan: 'pln_free-plan-dhnb0ejd',
    role: 'Teacher',
    school: 'Hillview Primary School',
    city: 'Birmingham',
    country: 'United Kingdom',
    phone: '+44 121 123 4567',
    language: 'en',
    no_classes: 1,
    no_kids: 28,
    school_address: 'Hill Road 15, Birmingham B1 2AB',
    school_type: 'Primary School',
    school_phone: '+44 121 555 0101',
    school_website: 'https://hillview.bham.sch.uk',
    school_latitude: '52.4862',
    school_longitude: '-1.8904',
    school_rating: '4.3',
    school_state: 'West Midlands',
    school_street_address: 'Hill Road 15',
    school_zip: 'B1 2AB',
    school_place_id: 'ChIJ_Birmingham_001',
    school_place_name: 'Hillview Primary'
  },
  {
    name: 'Francesca Rossi',
    email: 'francesca.rossi@scuola-milano.it',
    plan: 'pln_free-plan-dhnb0ejd',
    role: 'Teacher',
    school: 'Scuola Elementare Milano Centro',
    city: 'Milan',
    country: 'Italy',
    phone: '+39 02 123 456 78',
    language: 'en',
    no_classes: 2,
    no_kids: 52,
    school_address: 'Via Roma 25, 20121 Milano',
    school_type: 'Elementary School',
    school_phone: '+39 02 555 0201',
    school_website: 'https://elemcentro.milano.it',
    school_latitude: '45.4642',
    school_longitude: '9.1900',
    school_rating: '4.5',
    school_state: 'Lombardy',
    school_street_address: 'Via Roma 25',
    school_zip: '20121',
    school_place_id: 'ChIJ_Milano_001',
    school_place_name: 'Elem Centro Milano'
  },
  {
    name: 'Hans Mueller',
    email: 'hans.mueller@grundschule.de',
    plan: 'pln_free-plan-dhnb0ejd',
    role: 'Teacher',
    school: 'Grundschule München Nord',
    city: 'Munich',
    country: 'Germany',
    phone: '+49 89 123 45 67',
    language: 'en',
    no_classes: 3,
    no_kids: 67,
    school_address: 'Schulstraße 12, 80331 München',
    school_type: 'Primary School',
    school_phone: '+49 89 555 0301',
    school_website: 'https://grundschule-nord.muenchen.de',
    school_latitude: '48.1351',
    school_longitude: '11.5820',
    school_rating: '4.2',
    school_state: 'Bavaria',
    school_street_address: 'Schulstraße 12',
    school_zip: '80331',
    school_place_id: 'ChIJ_Munich_001',
    school_place_name: 'GS München Nord'
  },
  {
    name: 'Claire Martin',
    email: 'claire.martin@ecole-lyon.fr',
    plan: 'pln_free-plan-dhnb0ejd',
    role: 'Teacher',
    school: 'École Primaire Lyon Centre',
    city: 'Lyon',
    country: 'France',
    phone: '+33 4 78 12 34 56',
    language: 'en',
    no_classes: 2,
    no_kids: 38,
    school_address: '15 Rue de l\'École, 69001 Lyon',
    school_type: 'Primary School',
    school_phone: '+33 4 78 55 01 01',
    school_website: 'https://ecole-centre.lyon.fr',
    school_latitude: '45.7640',
    school_longitude: '4.8357',
    school_rating: '4.4',
    school_state: 'Auvergne-Rhône-Alpes',
    school_street_address: '15 Rue de l\'École',
    school_zip: '69001',
    school_place_id: 'ChIJ_Lyon_001',
    school_place_name: 'EP Lyon Centre'
  }
];

// ===== EDUCATORS FREE PROMO DATA (5 users) =====
const EDUCATORS_FREE_PROMO_DATA = [
  {
    name: 'Katarzyna Wiśniewska',
    email: 'k.wisniewska@sp25.krakow.pl',
    plan: 'pln_educators-free-promo-ebfw0xzj',
    role: 'Vice Principal',
    school: 'Primary School No. 25 Krakow',
    city: 'Krakow',
    country: 'Poland',
    phone: '+48 12 987 65 43',
    language: 'pl',
    no_classes: 5,
    no_kids: 125,
    school_address: 'ul. Krakowska 25, 31-001 Kraków',
    school_type: 'Primary School',
    school_phone: '+48 12 333 44 55',
    school_website: 'https://sp25.krakow.pl',
    school_latitude: '50.0647',
    school_longitude: '19.9450',
    school_rating: '4.6',
    school_state: 'Lesser Poland',
    school_street_address: 'ul. Krakowska 25',
    school_zip: '31-001',
    school_place_id: 'ChIJ_Krakow_001',
    school_place_name: 'SP 25 Krakow'
  },
  {
    name: 'David Wilson',
    email: 'david.wilson@greenfield.edu.uk',
    plan: 'pln_educators-free-promo-ebfw0xzj',
    role: 'Head Teacher',
    school: 'Greenfield Academy',
    city: 'Liverpool',
    country: 'United Kingdom',
    phone: '+44 151 234 5678',
    language: 'en',
    no_classes: 8,
    no_kids: 185,
    school_address: 'Green Lane 42, Liverpool L1 5CD',
    school_type: 'Academy',
    school_phone: '+44 151 777 8888',
    school_website: 'https://greenfield.liverpool.sch.uk',
    school_latitude: '53.4084',
    school_longitude: '-2.9916',
    school_rating: '4.8',
    school_state: 'Merseyside',
    school_street_address: 'Green Lane 42',
    school_zip: 'L1 5CD',
    school_place_id: 'ChIJ_Liverpool_001',
    school_place_name: 'Greenfield Academy'
  },
  {
    name: 'Isabella Garcia',
    email: 'isabella.garcia@colegio-madrid.es',
    plan: 'pln_educators-free-promo-ebfw0xzj',
    role: 'Coordinator',
    school: 'Colegio San Francisco Madrid',
    city: 'Madrid',
    country: 'Spain',
    phone: '+34 91 567 89 01',
    language: 'en',
    no_classes: 4,
    no_kids: 95,
    school_address: 'Calle Mayor 78, 28013 Madrid',
    school_type: 'Private School',
    school_phone: '+34 91 999 0000',
    school_website: 'https://sanfrancisco.madrid.es',
    school_latitude: '40.4168',
    school_longitude: '-3.7038',
    school_rating: '4.7',
    school_state: 'Madrid',
    school_street_address: 'Calle Mayor 78',
    school_zip: '28013',
    school_place_id: 'ChIJ_Madrid_001',
    school_place_name: 'C. San Francisco'
  },
  {
    name: 'Lars Andersen',
    email: 'lars.andersen@skole.copenhagen.dk',
    plan: 'pln_educators-free-promo-ebfw0xzj',
    role: 'Teacher',
    school: 'Copenhagen International School',
    city: 'Copenhagen',
    country: 'Denmark',
    phone: '+45 33 12 34 56',
    language: 'en',
    no_classes: 3,
    no_kids: 72,
    school_address: 'Skolegade 10, 1000 Copenhagen',
    school_type: 'International School',
    school_phone: '+45 33 88 99 00',
    school_website: 'https://cis.copenhagen.dk',
    school_latitude: '55.6761',
    school_longitude: '12.5683',
    school_rating: '4.9',
    school_state: 'Capital Region',
    school_street_address: 'Skolegade 10',
    school_zip: '1000',
    school_place_id: 'ChIJ_Copenhagen_001',
    school_place_name: 'CIS Copenhagen'
  },
  {
    name: 'Elena Popov',
    email: 'elena.popov@school.amsterdam.nl',
    plan: 'pln_educators-free-promo-ebfw0xzj',
    role: 'Department Head',
    school: 'Amsterdam Elementary School',
    city: 'Amsterdam',
    country: 'Netherlands',
    phone: '+31 20 123 45 67',
    language: 'en',
    no_classes: 6,
    no_kids: 142,
    school_address: 'Schoolstraat 33, 1000 AB Amsterdam',
    school_type: 'Public School',
    school_phone: '+31 20 777 8888',
    school_website: 'https://elementary.amsterdam.nl',
    school_latitude: '52.3676',
    school_longitude: '4.9041',
    school_rating: '4.3',
    school_state: 'North Holland',
    school_street_address: 'Schoolstraat 33',
    school_zip: '1000 AB',
    school_place_id: 'ChIJ_Amsterdam_001',
    school_place_name: 'AES Amsterdam'
  }
];

// ===== EDUCATORS SCHOOL BUNDLE - PAID (5 users) =====
const EDUCATORS_PAID_BUNDLE_DATA = [
  {
    name: 'Robert Anderson',
    email: 'robert.anderson@oakwood.edu.uk',
    plan: 'pln_educators-school-bundle-monthly-jqo20xap',
    role: 'Principal',
    school: 'Oakwood Primary Academy',
    city: 'Manchester',
    country: 'United Kingdom',
    phone: '+44 161 789 01 23',
    language: 'en',
    no_classes: 15,
    no_kids: 425,
    school_address: 'Oak Avenue 89, Manchester M2 3EF',
    school_type: 'Academy',
    school_phone: '+44 161 555 7777',
    school_website: 'https://oakwood.manchester.sch.uk',
    school_latitude: '53.4808',
    school_longitude: '-2.2426',
    school_rating: '4.8',
    school_state: 'Greater Manchester',
    school_street_address: 'Oak Avenue 89',
    school_zip: 'M2 3EF',
    school_place_id: 'ChIJ_Manchester_002',
    school_place_name: 'Oakwood Academy'
  },
  {
    name: 'Dr. Margaret Foster',
    email: 'margaret.foster@stgeorge.edu.au',
    plan: 'pln_educators-school-bundle-monthly-jqo20xap',
    role: 'Principal',
    school: 'St. George Primary School',
    city: 'Sydney',
    country: 'Australia',
    phone: '+61 2 9876 5432',
    language: 'en',
    no_classes: 18,
    no_kids: 520,
    school_address: '45 George Street, Sydney NSW 2000',
    school_type: 'Primary School',
    school_phone: '+61 2 9999 8888',
    school_website: 'https://stgeorge.nsw.edu.au',
    school_latitude: '-33.8688',
    school_longitude: '151.2093',
    school_rating: '4.9',
    school_state: 'New South Wales',
    school_street_address: '45 George Street',
    school_zip: '2000',
    school_place_id: 'ChIJ_Sydney_001',
    school_place_name: 'St George Primary'
  },
  {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@internacional.mx',
    plan: 'pln_educators-school-bundle-monthly-jqo20xap',
    role: 'Director',
    school: 'Escuela Internacional Mexico',
    city: 'Mexico City',
    country: 'Mexico',
    phone: '+52 55 1234 5678',
    language: 'en',
    no_classes: 20,
    no_kids: 580,
    school_address: 'Av. Reforma 123, 06600 Mexico City',
    school_type: 'International School',
    school_phone: '+52 55 8888 9999',
    school_website: 'https://internacional.edu.mx',
    school_latitude: '19.4326',
    school_longitude: '-99.1332',
    school_rating: '4.7',
    school_state: 'Mexico City',
    school_street_address: 'Av. Reforma 123',
    school_zip: '06600',
    school_place_id: 'ChIJ_MexicoCity_001',
    school_place_name: 'Esc Internacional'
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@dps.delhi.in',
    plan: 'pln_educators-school-bundle-monthly-jqo20xap',
    role: 'Vice Principal',
    school: 'Delhi Public School',
    city: 'New Delhi',
    country: 'India',
    phone: '+91 11 2345 6789',
    language: 'en',
    no_classes: 12,
    no_kids: 350,
    school_address: 'Sector 45, New Delhi 110001',
    school_type: 'Public School',
    school_phone: '+91 11 7777 8888',
    school_website: 'https://dps.delhi.edu.in',
    school_latitude: '28.7041',
    school_longitude: '77.1025',
    school_rating: '4.6',
    school_state: 'Delhi',
    school_street_address: 'Sector 45',
    school_zip: '110001',
    school_place_id: 'ChIJ_Delhi_001',
    school_place_name: 'DPS Delhi'
  },
  {
    name: 'Thomas Eriksson',
    email: 'thomas.eriksson@skolan.stockholm.se',
    plan: 'pln_educators-school-bundle-monthly-jqo20xap',
    role: 'Headmaster',
    school: 'Stockholm International School',
    city: 'Stockholm',
    country: 'Sweden',
    phone: '+46 8 123 456 78',
    language: 'en',
    no_classes: 16,
    no_kids: 465,
    school_address: 'Skolvägen 25, 111 22 Stockholm',
    school_type: 'International School',
    school_phone: '+46 8 9999 0000',
    school_website: 'https://sis.stockholm.se',
    school_latitude: '59.3293',
    school_longitude: '18.0686',
    school_rating: '4.8',
    school_state: 'Stockholm County',
    school_street_address: 'Skolvägen 25',
    school_zip: '111 22',
    school_place_id: 'ChIJ_Stockholm_001',
    school_place_name: 'SIS Stockholm'
  }
];

// ===== EDUCATORS SINGLE CLASSROOM - PAID (5 users) =====
const EDUCATORS_PAID_CLASSROOM_DATA = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@riverside.ca',
    plan: 'pln_educators-single-classroom-monthly-lkhq021n',
    role: 'Teacher',
    school: 'Riverside Elementary School',
    city: 'Toronto',
    country: 'Canada',
    phone: '+1 416 123 4567',
    language: 'en',
    no_classes: 1,
    no_kids: 24,
    school_address: '789 River Road, Toronto ON M5V 3A8',
    school_type: 'Elementary School',
    school_phone: '+1 416 555 0123',
    school_website: 'https://riverside.tdsb.on.ca',
    school_latitude: '43.6532',
    school_longitude: '-79.3832',
    school_rating: '4.4',
    school_state: 'Ontario',
    school_street_address: '789 River Road',
    school_zip: 'M5V 3A8',
    school_place_id: 'ChIJ_Toronto_001',
    school_place_name: 'Riverside Elementary'
  },
  {
    name: 'Amanda Brown',
    email: 'amanda.brown@sunnydale.us',
    plan: 'pln_educators-single-classroom-monthly-lkhq021n',
    role: 'Teacher',
    school: 'Sunnydale Elementary',
    city: 'San Francisco',
    country: 'United States',
    phone: '+1 415 987 6543',
    language: 'en',
    no_classes: 1,
    no_kids: 26,
    school_address: '456 Sunny Street, San Francisco CA 94102',
    school_type: 'Elementary School',
    school_phone: '+1 415 555 7890',
    school_website: 'https://sunnydale.sfusd.edu',
    school_latitude: '37.7749',
    school_longitude: '-122.4194',
    school_rating: '4.2',
    school_state: 'California',
    school_street_address: '456 Sunny Street',
    school_zip: '94102',
    school_place_id: 'ChIJ_SanFrancisco_001',
    school_place_name: 'Sunnydale Elem'
  },
  {
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@tokyo-international.jp',
    plan: 'pln_educators-single-classroom-monthly-lkhq021n',
    role: 'Teacher',
    school: 'Tokyo International School',
    city: 'Tokyo',
    country: 'Japan',
    phone: '+81 3 1234 5678',
    language: 'en',
    no_classes: 1,
    no_kids: 22,
    school_address: '1-2-3 Shibuya, Tokyo 150-0002',
    school_type: 'International School',
    school_phone: '+81 3 5555 6666',
    school_website: 'https://tis.tokyo.jp',
    school_latitude: '35.6762',
    school_longitude: '139.6503',
    school_rating: '4.7',
    school_state: 'Tokyo',
    school_street_address: '1-2-3 Shibuya',
    school_zip: '150-0002',
    school_place_id: 'ChIJ_Tokyo_001',
    school_place_name: 'TIS Tokyo'
  },
  {
    name: 'Marie Dubois',
    email: 'marie.dubois@ecole-internationale.fr',
    plan: 'pln_educators-single-classroom-monthly-lkhq021n',
    role: 'Teacher',
    school: 'École Internationale de Paris',
    city: 'Paris',
    country: 'France',
    phone: '+33 1 45 67 89 01',
    language: 'en',
    no_classes: 1,
    no_kids: 25,
    school_address: '67 Avenue des Champs, 75008 Paris',
    school_type: 'International School',
    school_phone: '+33 1 4444 5555',
    school_website: 'https://eip.paris.fr',
    school_latitude: '48.8566',
    school_longitude: '2.3522',
    school_rating: '4.6',
    school_state: 'Île-de-France',
    school_street_address: '67 Avenue des Champs',
    school_zip: '75008',
    school_place_id: 'ChIJ_Paris_002',
    school_place_name: 'EIP Paris'
  },
  {
    name: 'Anna Petrov',
    email: 'anna.petrov@international.prague.cz',
    plan: 'pln_educators-single-classroom-monthly-lkhq021n',
    role: 'Teacher',
    school: 'Prague International School',
    city: 'Prague',
    country: 'Czech Republic',
    phone: '+420 224 123 456',
    language: 'en',
    no_classes: 1,
    no_kids: 23,
    school_address: 'Náměstí 15, 110 00 Prague',
    school_type: 'International School',
    school_phone: '+420 224 777 888',
    school_website: 'https://pis.prague.cz',
    school_latitude: '50.0755',
    school_longitude: '14.4378',
    school_rating: '4.5',
    school_state: 'Prague',
    school_street_address: 'Náměstí 15',
    school_zip: '110 00',
    school_place_id: 'ChIJ_Prague_001',
    school_place_name: 'PIS Prague'
  }
];

// ===== THERAPISTS FREE DATA (5 users) =====
const THERAPISTS_FREE_DATA = [
  {
    name: 'Dr. Alexandra Kowalski',
    email: 'dr.kowalski@terapia-warszawa.pl',
    plan: 'pln_therapists-free-t7k40ii1',
    specialty: 'Speech Therapy',
    practice: 'Centrum Terapii Warszawa',
    city: 'Warsaw',
    country: 'Poland',
    phone: '+48 22 345 67 89',
    language: 'pl',
    experience_years: 8,
    practice_address: 'ul. Terapeutyczna 12, 00-123 Warsaw'
  },
  {
    name: 'Dr. James Robertson',
    email: 'james.robertson@childtherapy.uk',
    plan: 'pln_therapists-free-t7k40ii1',
    specialty: 'Behavioral Therapy',
    practice: 'London Child Therapy Center',
    city: 'London',
    country: 'United Kingdom',
    phone: '+44 20 7890 1234',
    language: 'en',
    experience_years: 12,
    practice_address: '25 Therapy Lane, London SW1A 1AA'
  },
  {
    name: 'Dr. Sophie Dubois',
    email: 'sophie.dubois@therapie-paris.fr',
    plan: 'pln_therapists-free-t7k40ii1',
    specialty: 'Occupational Therapy',
    practice: 'Centre de Thérapie Paris',
    city: 'Paris',
    country: 'France',
    phone: '+33 1 56 78 90 12',
    language: 'en',
    experience_years: 6,
    practice_address: '45 Rue de la Thérapie, 75001 Paris'
  },
  {
    name: 'Dr. Marco Bianchi',
    email: 'marco.bianchi@terapia-roma.it',
    plan: 'pln_therapists-free-t7k40ii1',
    specialty: 'Play Therapy',
    practice: 'Centro Terapia Bambini Roma',
    city: 'Rome',
    country: 'Italy',
    phone: '+39 06 789 01 23',
    language: 'en',
    experience_years: 10,
    practice_address: 'Via della Terapia 88, 00100 Roma'
  },
  {
    name: 'Dr. Ana García',
    email: 'ana.garcia@terapia-madrid.es',
    plan: 'pln_therapists-free-t7k40ii1',
    specialty: 'Art Therapy',
    practice: 'Centro de Terapia Infantil Madrid',
    city: 'Madrid',
    country: 'Spain',
    phone: '+34 91 234 56 78',
    language: 'en',
    experience_years: 7,
    practice_address: 'Calle Terapia 34, 28001 Madrid'
  }
];

// ===== THERAPISTS FREE PROMO DATA (5 users) =====
const THERAPISTS_FREE_PROMO_DATA = [
  {
    name: 'Dr. Lisa Weber',
    email: 'lisa.weber@kindertherapie.de',
    plan: 'pln_therapists-free-promo-i2kz0huu',
    specialty: 'Autism Spectrum Therapy',
    practice: 'Kindertherapiezentrum München',
    city: 'Munich',
    country: 'Germany',
    phone: '+49 89 567 89 01',
    language: 'en',
    experience_years: 15,
    practice_address: 'Therapiestraße 67, 80331 München'
  },
  {
    name: 'Dr. Erik Larsson',
    email: 'erik.larsson@terapi.stockholm.se',
    plan: 'pln_therapists-free-promo-i2kz0huu',
    specialty: 'Cognitive Behavioral Therapy',
    practice: 'Stockholm Barn Terapi',
    city: 'Stockholm',
    country: 'Sweden',
    phone: '+46 8 789 01 23',
    language: 'en',
    experience_years: 11,
    practice_address: 'Terapigatan 45, 111 21 Stockholm'
  },
  {
    name: 'Dr. Marta Silva',
    email: 'marta.silva@terapia-lisboa.pt',
    plan: 'pln_therapists-free-promo-i2kz0huu',
    specialty: 'Family Therapy',
    practice: 'Centro Terapia Familiar Lisboa',
    city: 'Lisbon',
    country: 'Portugal',
    phone: '+351 21 345 67 89',
    language: 'en',
    experience_years: 9,
    practice_address: 'Rua da Terapia 23, 1000-001 Lisboa'
  },
  {
    name: 'Dr. Nikolai Petrov',
    email: 'nikolai.petrov@therapy.vienna.at',
    plan: 'pln_therapists-free-promo-i2kz0huu',
    specialty: 'Sensory Integration Therapy',
    practice: 'Vienna Child Development Center',
    city: 'Vienna',
    country: 'Austria',
    phone: '+43 1 234 56 78',
    language: 'en',
    experience_years: 13,
    practice_address: 'Therapiegasse 12, 1010 Wien'
  },
  {
    name: 'Dr. Hana Novák',
    email: 'hana.novak@terapie.prague.cz',
    plan: 'pln_therapists-free-promo-i2kz0huu',
    specialty: 'Developmental Therapy',
    practice: 'Centrum Dětské Terapie Praha',
    city: 'Prague',
    country: 'Czech Republic',
    phone: '+420 224 567 890',
    language: 'en',
    experience_years: 8,
    practice_address: 'Terapeutická 89, 110 00 Praha'
  }
];

// ===== THERAPISTS PAID DATA (5 users) =====
const THERAPISTS_PAID_DATA = [
  {
    name: 'Dr. Michael Thompson',
    email: 'michael.thompson@premiumtherapy.uk',
    plan: 'pln_therapists-single-practice-juk60iii',
    specialty: 'Advanced Speech Therapy',
    practice: 'Premium Child Therapy London',
    city: 'London',
    country: 'United Kingdom',
    phone: '+44 20 7123 9876',
    language: 'en',
    experience_years: 18,
    practice_address: '100 Harley Street, London W1G 7JA'
  },
  {
    name: 'Dr. Catherine Martinez',
    email: 'catherine.martinez@elite.therapy.us',
    plan: 'pln_therapists-single-practice-juk60iii',
    specialty: 'Neuropsychological Therapy',
    practice: 'Elite Pediatric Therapy NYC',
    city: 'New York',
    country: 'United States',
    phone: '+1 212 456 7890',
    language: 'en',
    experience_years: 20,
    practice_address: '580 Park Avenue, New York NY 10065'
  },
  {
    name: 'Dr. Hiroshi Yamamoto',
    email: 'hiroshi.yamamoto@advanced.therapy.jp',
    plan: 'pln_therapists-single-practice-juk60iii',
    specialty: 'Developmental Disorders',
    practice: 'Advanced Child Development Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    phone: '+81 3 9876 5432',
    language: 'en',
    experience_years: 16,
    practice_address: '3-4-5 Roppongi, Tokyo 106-0032'
  },
  {
    name: 'Dr. Isabelle Laurent',
    email: 'isabelle.laurent@therapie.elite.fr',
    plan: 'pln_therapists-single-practice-juk60iii',
    specialty: 'Psychotherapy',
    practice: 'Thérapie Elite Paris',
    city: 'Paris',
    country: 'France',
    phone: '+33 1 78 90 12 34',
    language: 'en',
    experience_years: 22,
    practice_address: '15 Avenue Montaigne, 75008 Paris'
  },
  {
    name: 'Dr. Alexander Mueller',
    email: 'alexander.mueller@premium.therapie.de',
    plan: 'pln_therapists-single-practice-juk60iii',
    specialty: 'Clinical Psychology',
    practice: 'Premium Kinder Therapie Berlin',
    city: 'Berlin',
    country: 'Germany',
    phone: '+49 30 567 890 12',
    language: 'en',
    experience_years: 19,
    practice_address: 'Kurfürstendamm 123, 10719 Berlin'
  }
];

// ===== HELPER FUNCTIONS =====

/**
 * Generate unique ID
 */
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Map user data to custom fields
 */
function mapCustomFields(userData, category) {
  let customFields = {
    'first-name': userData.name.split(' ')[0],
    'last-name': userData.name.split(' ').slice(1).join(' '),
    'phone': userData.phone
  };

  // Add category-specific fields
  if (category === 'educators') {
    customFields = {
      ...customFields,
      'role': userData.role,
      'school-place-name': userData.school,
      'school-city': userData.city,
      'school-country': userData.country,
      'school-address-result': userData.school_address,
      'school-facility-type': userData.school_type,
      'educator-no-classes': userData.no_classes?.toString(),
      'educator-no-kids': userData.no_kids?.toString(),
      'search-input': userData.school,
      // Extended school data
      'school-phone': userData.school_phone || '',
      'school-website': userData.school_website || '',
      'school-latitude': userData.school_latitude || '',
      'school-longitude': userData.school_longitude || '',
      'school-rating': userData.school_rating || '',
      'school-state': userData.school_state || '',
      'school-street-address': userData.school_street_address || '',
      'school-zip': userData.school_zip || '',
      'school-place-id': userData.school_place_id || '',
      'school-place-name-short': userData.school_place_name || ''
    };
  } else if (category === 'therapists') {
    customFields = {
      ...customFields,
      'specialty': userData.specialty,
      'practice-name': userData.practice,
      'practice-city': userData.city,
      'practice-country': userData.country,
      'practice-address': userData.practice_address,
      'experience-years': userData.experience_years?.toString()
    };
  } else if (category === 'parents') {
    customFields = {
      ...customFields,
      'city': userData.city,
      'country': userData.country,
      'profession': userData.profession,
      'children-ages': userData.children_ages
    };
  }

  return customFields;
}

/**
 * Create memberstack webhook payload
 */
function createWebhookPayload(userData, category) {
  const memberId = generateId('mem');
  const timestamp = new Date().toISOString();
  
  return {
    type: 'member.created',
    data: {
      member: {
        id: memberId,
        auth: {
          email: userData.email
        },
        planConnections: [{
          id: `conn_${Date.now()}`,
          planId: userData.plan,
          active: true,
          status: 'ACTIVE'
        }],
        customFields: mapCustomFields(userData, category),
        metaData: {
          language: userData.language,
          registrationDate: timestamp
        },
        createdAt: timestamp,
        updatedAt: timestamp
      }
    }
  };
}

/**
 * Send webhook to test endpoint
 */
async function sendWebhook(webhookData, testId, description) {
  const email = webhookData.data.member.auth.email;
  
  try {
    // Extract just the member data for the test endpoint
    const requestBody = {
      member: webhookData.data.member
    };
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Memberstack/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      const lmidInfo = result.data?.lmidResult?.lmid ? `, LMID: ${result.data.lmidResult.lmid}` : ', No LMID';
      console.log(`✅ [${testId}] ${email} → Brevo: ✅ SUCCESS${lmidInfo}`);
      return { success: true, lmid: result.data?.lmidResult?.lmid };
    } else {
      console.log(`❌ [${testId}] ${email} → Brevo: ❌ FAILED - ${result.error || 'Unknown error'}`);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.log(`❌ [${testId}] ${email} → Network error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ===== MAIN TESTING FUNCTION =====

async function runComprehensiveTest() {
  console.log('🚀 === COMPREHENSIVE BREVO SEGMENTS TESTING ===');
  console.log('📅 Test run:', new Date().toISOString());
  console.log('🔗 Testing endpoint:', API_ENDPOINT);
  console.log('👥 Total users to create: 40 across 8 segments\n');

  let totalSuccess = 0;
  let totalFailed = 0;

  // Test Parents (5 users)
  console.log('📝 === TESTING PARENTS - Free Plan (5 users) ===\n');
  for (let i = 0; i < PARENTS_DATA.length; i++) {
    const userData = PARENTS_DATA[i];
    const testId = `par${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'parents');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Test Educators Free (5 users)
  console.log('\n📝 === TESTING EDUCATORS - Free Plan (5 users) ===\n');
  for (let i = 0; i < EDUCATORS_FREE_DATA.length; i++) {
    const userData = EDUCATORS_FREE_DATA[i];
    const testId = `edu-free${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'educators');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Test Educators Free Promo (5 users)
  console.log('\n📝 === TESTING EDUCATORS - Free Promo Plan (5 users) ===\n');
  for (let i = 0; i < EDUCATORS_FREE_PROMO_DATA.length; i++) {
    const userData = EDUCATORS_FREE_PROMO_DATA[i];
    const testId = `edu-promo${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'educators');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Test Educators Paid Bundle (5 users)
  console.log('\n📝 === TESTING EDUCATORS - Paid School Bundle (5 users) ===\n');
  for (let i = 0; i < EDUCATORS_PAID_BUNDLE_DATA.length; i++) {
    const userData = EDUCATORS_PAID_BUNDLE_DATA[i];
    const testId = `edu-bundle${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'educators');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Test Educators Paid Classroom (5 users)
  console.log('\n📝 === TESTING EDUCATORS - Paid Single Classroom (5 users) ===\n');
  for (let i = 0; i < EDUCATORS_PAID_CLASSROOM_DATA.length; i++) {
    const userData = EDUCATORS_PAID_CLASSROOM_DATA[i];
    const testId = `edu-class${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'educators');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Test Therapists Free (5 users)
  console.log('\n📝 === TESTING THERAPISTS - Free Plan (5 users) ===\n');
  for (let i = 0; i < THERAPISTS_FREE_DATA.length; i++) {
    const userData = THERAPISTS_FREE_DATA[i];
    const testId = `ther-free${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'therapists');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Test Therapists Free Promo (5 users)
  console.log('\n📝 === TESTING THERAPISTS - Free Promo Plan (5 users) ===\n');
  for (let i = 0; i < THERAPISTS_FREE_PROMO_DATA.length; i++) {
    const userData = THERAPISTS_FREE_PROMO_DATA[i];
    const testId = `ther-promo${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'therapists');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Test Therapists Paid (5 users)
  console.log('\n📝 === TESTING THERAPISTS - Paid Single Practice (5 users) ===\n');
  for (let i = 0; i < THERAPISTS_PAID_DATA.length; i++) {
    const userData = THERAPISTS_PAID_DATA[i];
    const testId = `ther-paid${i + 1}`;
    console.log(`🔄 [${testId}] ${userData.name} (${userData.city}, ${userData.country})`);
    console.log(`📤 [${testId}] Sending: ${userData.email}`);
    
    const webhookData = createWebhookPayload(userData, 'therapists');
    const result = await sendWebhook(webhookData, testId, userData.name);
    
    if (result.success) totalSuccess++;
    else totalFailed++;
  }

  // Final Summary
  console.log('\n📊 === COMPREHENSIVE TEST SUMMARY ===');
  console.log(`✅ SUCCESSFUL: ${totalSuccess}/40`);
  console.log(`❌ FAILED: ${totalFailed}/40`);
  
  console.log('\n📋 SEGMENT BREAKDOWN:');
  console.log('📍 PARENTS (Free): 5 users');
  console.log('🏫 EDUCATORS (Free): 5 users');
  console.log('🏫 EDUCATORS (Free Promo): 5 users');
  console.log('🏫 EDUCATORS (Paid Bundle): 5 users');
  console.log('🏫 EDUCATORS (Paid Classroom): 5 users');
  console.log('🩺 THERAPISTS (Free): 5 users');
  console.log('🩺 THERAPISTS (Free Promo): 5 users');
  console.log('🩺 THERAPISTS (Paid Practice): 5 users');

  if (totalSuccess === 40) {
    console.log('\n🎉 ALL 40 USERS ACROSS 8 SEGMENTS CREATED SUCCESSFULLY!');
    console.log('\n🎯 ADVANCED SEGMENTATION EXAMPLES:');
    console.log('• Geographic: SCHOOL_CITY equals "Manchester" (Large schools)');
    console.log('• Quality: SCHOOL_RATING greater than 4.5 (Premium schools)');
    console.log('• Size: EDUCATOR_NO_KIDS greater than 300 (Major institutions)');
    console.log('• Plan Type: PLAN_TYPE equals "paid" (Premium customers)');
    console.log('• Role: EDUCATOR_ROLE equals "Principal" (Decision makers)');
    console.log('• International: SCHOOL_COUNTRY equals "United Kingdom"');
    console.log('• Therapy: USER_CATEGORY equals "therapists" AND specialty contains "Speech"');
  }
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error); 