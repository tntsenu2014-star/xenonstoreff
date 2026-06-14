import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://miyula:12miyula.@cluster0.imevbm5.mongodb.net/gamingr4d?retryWrites=true&w=majority&appName=Cluster0";

let client: MongoClient | null = null;
let db: Db | null = null;

// JSON File database fallback in case MongoDB fails or is offline
const LOCAL_DB_PATH = path.join(process.cwd(), 'db-fallback.json');

function readLocalDb(): Record<string, any[]> {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw) || {};
  } catch (err) {
    console.error("Failed to read local fallback DB, using empty state:", err);
    return {};
  }
}

function writeLocalDb(data: Record<string, any[]>) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to write local fallback DB:", err);
  }
}

export async function initDatabase() {
  console.log("Connecting to MongoDB database...");
  try {
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
    });
    await client.connect();
    db = client.db(); // uses database from connection string (gamingr4d)
    
    // Verify that the database is genuinely responsive (not firewalled/IP blocked)
    const pingPromise = db.command({ ping: 1 });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Database connection ping timed out after 3 seconds")), 3000)
    );
    await Promise.race([pingPromise, timeoutPromise]);
    console.log("MongoDB connection verified with ping success!");
    
    try {
      // Quietly attempt to drop deprecated unique indexes to avoid legacy index clashes (e.g. orderNumber_1)
      await db.collection('orders').dropIndex('orderNumber_1');
      console.log("Deprecated unique index 'orderNumber_1' dropped successfully.");
    } catch (indexDropErr) {
      // Ignore if index doesn't exist
    }

    try {
      // Drop username unique index since it causes issues with null usernames
      await db.collection('users').dropIndex('username_1');
      console.log("Deprecated unique index 'username_1' dropped successfully.");
    } catch (indexDropErr) {
      // Ignore if index doesn't exist
    }

    try {
      await db.collection('users').dropIndex('email_1');
      console.log("Deprecated unique index 'email_1' dropped successfully.");
    } catch (indexDropErr) {
      // Ignore if index doesn't exist
    }
    
    await seedMongodbIfEmpty();
  } catch (err) {
    console.error("Failed to connect to MongoDB, using local file DB fallback. Error:", err);
    db = null;
    initLocalDb();
  }
}

function initLocalDb() {
  const data = readLocalDb();
  let updated = false;

  const defaultTables = [
    'settings', 'packages', 'banners', 'services', 
    'events', 'serviceTemplates', 'accounts', 
    'orders', 'accountOrders', 'notifications',
    'shell_stock', 'whatsapp_stock', 'coupons', 'customers', 'admins',
    'users', 'uploads'
  ];

  for (const table of defaultTables) {
    if (!data[table]) {
      data[table] = [];
      updated = true;
    }
  }

  // Seed settings if empty
  if (data['settings'].length === 0) {
    data['settings'] = [
      { id: 'config', siteName: 'GAMING R4D Store', contactEmail: 'support@gamingr4d.com', bankName: 'BOC (Bank of Ceylon)', bankAccountNumber: '9876543210', bankAccountHolder: 'GAMING R4D Admin', whatsappNumber: '+94771234567', ezCashNumber: '0771234567', isPayhereEnabled: false, payhereMerchantId: '', payhereAppId: '', payhereAppSecret: '' }
    ];
    updated = true;
  }

  // Seed sample packages if empty
  if (data['packages'].length === 0) {
    data['packages'] = [
      { id: 'p1', name: '100 Diamonds', gameId: 'freefire-sg', diamonds: 100, price: 250, isActive: true, createdAt: Date.now() },
      { id: 'p2', name: '210 Diamonds', gameId: 'freefire-sg', diamonds: 210, price: 500, isActive: true, createdAt: Date.now() + 10 },
      { id: 'p3', name: '530 Diamonds', gameId: 'freefire-sg', diamonds: 530, price: 1200, isActive: true, createdAt: Date.now() + 20 },
      { id: 'p4', name: '1080 Diamonds', gameId: 'freefire-sg', diamonds: 1080, price: 2400, isActive: true, createdAt: Date.now() + 30 },
      { id: 'p5', name: '60 UC', gameId: 'pubg-mobile', diamonds: 60, price: 350, isActive: true, createdAt: Date.now() + 45 },
      { id: 'p6', name: '325 UC', gameId: 'pubg-mobile', diamonds: 325, price: 1650, isActive: true, createdAt: Date.now() + 50 },
      { id: 'p7', name: '100 Gold', gameId: 'blood-strike', diamonds: 100, price: 240, isActive: true, createdAt: Date.now() + 55 },
      { id: 'p8', name: '500 Gold', gameId: 'blood-strike', diamonds: 500, price: 1150, isActive: true, createdAt: Date.now() + 60 },
      { id: 'p9', name: '475 VP', gameId: 'valorant-sg', diamonds: 475, price: 950, isActive: true, createdAt: Date.now() + 65 },
      { id: 'p10', name: '1000 VP', gameId: 'valorant-sg', diamonds: 1000, price: 1900, isActive: true, createdAt: Date.now() + 70 }
    ];
    updated = true;
  }

  // Seed sample banners if empty
  if (data['banners'].length === 0) {
    data['banners'] = [
      {
        id: 'b1',
        title: 'Diamond Top-Up Promo',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200',
        linkUrl: '/',
        isActive: true,
        order: 1,
        createdAt: Date.now()
      },
      {
        id: 'b2',
        title: 'FF Profile DP Generator',
        imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200',
        linkUrl: '/service/profile-dp',
        isActive: true,
        order: 2,
        createdAt: Date.now() + 10
      }
    ];
    updated = true;
  }

  // Seed sample services if empty
  if (data['services'].length === 0) {
    data['services'] = [
      {
        id: 's1',
        title: 'FF Profile DP Generator',
        description: 'Generate high-quality customized Free Fire profile DP with your player ID, name, avatar, and style.',
        imageUrl: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&q=80&w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200',
        isActive: true,
        createdAt: Date.now()
      }
    ];
    updated = true;
  }

  // Seed sample service templates if empty
  if (data['serviceTemplates'].length === 0) {
    data['serviceTemplates'] = [
      {
        id: 'st1',
        serviceId: 's1',
        name: 'Basic Custom DP',
        imageUrl: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&q=80&w=400',
        price: 350,
        isActive: true,
        createdAt: Date.now()
      },
      {
        id: 'st2',
        serviceId: 's1',
        name: 'Premium Guild DP Package',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400',
        price: 750,
        isActive: true,
        createdAt: Date.now() + 10
      }
    ];
    updated = true;
  }

  // Seed default shell stock if empty
  if (data['shell_stock'].length === 0) {
    data['shell_stock'] = [
      { id: 'sh_default_1', shellId: 'SHELL-SG-500K', providerName: 'Garena Singapore', availableBalance: 15200, usedBalance: 8400, isActive: true, createdAt: Date.now() - 500000 },
      { id: 'sh_default_2', shellId: 'SHELL-MY-200K', providerName: 'Garena Malaysia', availableBalance: 450, usedBalance: 12000, isActive: true, createdAt: Date.now() - 300000 },
      { id: 'sh_default_3', shellId: 'SHELL-ID-100K', providerName: 'Garena Indonesia', availableBalance: 5100, usedBalance: 1900, isActive: false, createdAt: Date.now() - 100000 }
    ];
    updated = true;
  }

  // Seed default whatsapp stock if empty
  if (data['whatsapp_stock'].length === 0) {
    data['whatsapp_stock'] = [
      { id: 'wa_seed_1', phoneNumber: '+94 77 123 4567', providerName: 'Xenon Store Main Support', isActive: true, assignedOrders: 14, createdAt: Date.now() - 400000 },
      { id: 'wa_seed_2', phoneNumber: '+94 76 987 6543', providerName: 'Instant Top Up Desk #2', isActive: true, assignedOrders: 25, createdAt: Date.now() - 250000 },
      { id: 'wa_seed_3', phoneNumber: '+94 71 555 4444', providerName: 'Night Shift Agent', isActive: false, assignedOrders: 0, createdAt: Date.now() - 100000 }
    ];
    updated = true;
  }

  // Seed default coupons if empty
  if (data['coupons'].length === 0) {
    data['coupons'] = [
      { id: 'cp_seed_1', code: 'FREEFIRE10', discountType: 'percentage', discountValue: 10, expiryDate: '2026-12-31', usageLimit: 500, usageCount: 142, isActive: true, createdAt: Date.now() },
      { id: 'cp_seed_2', code: 'LKR200OFF', discountType: 'fixed', discountValue: 200, expiryDate: '2026-09-30', usageLimit: 100, usageCount: 45, isActive: true, createdAt: Date.now() - 10000 },
      { id: 'cp_seed_3', code: 'EVOWEEKLY', discountType: 'percentage', discountValue: 15, expiryDate: '2026-06-30', usageLimit: 50, usageCount: 50, isActive: false, createdAt: Date.now() - 20000 }
    ];
    updated = true;
  }

  // Seed default customers if empty
  if (data['customers'].length === 0) {
    data['customers'] = [
      { id: 'cust_seed_1', customerName: 'Miyula Senu', email: 'tntsenu2014@gmail.com', whatsappNumber: '+94 77 888 9999', playerId: '21345678', isBanned: false, totalSpent: 24500, ordersCount: 8, createdAt: Date.now() - 600000 },
      { id: 'cust_seed_2', customerName: 'Surangi Silva', email: 'surangi@gmail.com', whatsappNumber: '+94 76 111 2222', playerId: '99128374', isBanned: false, totalSpent: 12450, ordersCount: 4, createdAt: Date.now() - 350000 },
      { id: 'cust_seed_3', customerName: 'Toxic Gamer LKR', email: 'toxicfreefire@gmail.com', whatsappNumber: '+94 71 444 8888', playerId: '44221199', isBanned: true, totalSpent: 0, ordersCount: 0, createdAt: Date.now() - 250000 },
      { id: 'cust_seed_4', customerName: 'Chamod Perera', email: 'chamod.demo@gmail.com', whatsappNumber: '+94 72 000 7777', playerId: '83726154', isBanned: false, totalSpent: 4800, ordersCount: 2, createdAt: Date.now() - 50000 }
    ];
    updated = true;
  }

  // Seed default admins (staff list) if empty
  if (data['admins'].length === 0) {
    data['admins'] = [
      { id: 'staff_1', email: 'gamingremo2010@gmail.com', name: 'Xenon Store Primary', role: 'Admin', permissions: { products: true, orders: true, payments: true, shells: true, coupons: true, settings: true, reports: true, administration: true }, isActive: true, createdAt: Date.now() - 50000 },
      { id: 'staff_2', email: 'manager.demo@gmail.com', name: 'Sahan Perera', role: 'Manager', permissions: { products: true, orders: true, payments: true, shells: true, coupons: true, settings: false, reports: true, administration: false }, isActive: true, createdAt: Date.now() - 30000 },
      { id: 'staff_3', email: 'bloovalk@gmail.com', name: 'Sanju Support', role: 'Support Staff', permissions: { products: false, orders: true, payments: false, shells: true, coupons: false, settings: false, reports: false, administration: false }, isActive: true, createdAt: Date.now() - 10000 }
    ];
    updated = true;
  }

  if (updated) {
    writeLocalDb(data);
  }
}

async function seedMongodbIfEmpty() {
  if (!db) return;
  try {
    // 1. Settings
    const settingsCount = await db.collection('settings').countDocuments();
    if (settingsCount === 0) {
      await db.collection('settings').insertOne({
        id: 'config',
        siteName: 'GAMING R4D Store',
        contactEmail: 'support@gamingr4d.com',
        bankName: 'BOC (Bank of Ceylon)',
        bankAccountNumber: '9876543210',
        bankAccountHolder: 'GAMING R4D Admin',
        whatsappNumber: '+94771234567',
        ezCashNumber: '0771234567',
        isPayhereEnabled: false,
        payhereMerchantId: '',
        payhereAppId: '',
        payhereAppSecret: ''
      });
      console.log("MongoDB settings seeded.");
    }

    // 2. Packages
    const packagesCount = await db.collection('packages').countDocuments();
    if (packagesCount === 0) {
      const pList = [
        { id: 'p1', name: '100 Diamonds', gameId: 'freefire-sg', diamonds: 100, price: 250, isActive: true, createdAt: Date.now() },
        { id: 'p2', name: '210 Diamonds', gameId: 'freefire-sg', diamonds: 210, price: 500, isActive: true, createdAt: Date.now() + 10 },
        { id: 'p3', name: '530 Diamonds', gameId: 'freefire-sg', diamonds: 530, price: 1200, isActive: true, createdAt: Date.now() + 20 },
        { id: 'p4', name: '1080 Diamonds', gameId: 'freefire-sg', diamonds: 1080, price: 2400, isActive: true, createdAt: Date.now() + 30 },
        { id: 'p5', name: '60 UC', gameId: 'pubg-mobile', diamonds: 60, price: 350, isActive: true, createdAt: Date.now() + 45 },
        { id: 'p6', name: '325 UC', gameId: 'pubg-mobile', diamonds: 325, price: 1650, isActive: true, createdAt: Date.now() + 50 },
        { id: 'p7', name: '100 Gold', gameId: 'blood-strike', diamonds: 100, price: 240, isActive: true, createdAt: Date.now() + 55 },
        { id: 'p8', name: '500 Gold', gameId: 'blood-strike', diamonds: 500, price: 1150, isActive: true, createdAt: Date.now() + 60 },
        { id: 'p9', name: '475 VP', gameId: 'valorant-sg', diamonds: 475, price: 950, isActive: true, createdAt: Date.now() + 65 },
        { id: 'p10', name: '1000 VP', gameId: 'valorant-sg', diamonds: 1000, price: 1900, isActive: true, createdAt: Date.now() + 70 }
      ];
      await db.collection('packages').insertMany(pList);
      console.log("MongoDB packages seeded.");
    }

    // 3. Banners
    const bannersCount = await db.collection('banners').countDocuments();
    if (bannersCount === 0) {
      const bList = [
        {
          id: 'b1',
          title: 'Diamond Top-Up Promo',
          imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200',
          linkUrl: '/',
          isActive: true,
          order: 1,
          createdAt: Date.now()
        },
        {
          id: 'b2',
          title: 'FF Profile DP Generator',
          imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200',
          linkUrl: '/service/profile-dp',
          isActive: true,
          order: 2,
          createdAt: Date.now() + 10
        }
      ];
      await db.collection('banners').insertMany(bList);
      console.log("MongoDB banners seeded.");
    }

    // 4. Services
    const servicesCount = await db.collection('services').countDocuments();
    if (servicesCount === 0) {
      const sList = [
        {
          id: 's1',
          title: 'FF Profile DP Generator',
          description: 'Generate high-quality customized Free Fire profile DP with your player ID, name, avatar, and style.',
          imageUrl: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&q=80&w=400',
          bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1200',
          isActive: true,
          createdAt: Date.now()
        }
      ];
      await db.collection('services').insertMany(sList);
      console.log("MongoDB services seeded.");
    }

    // 5. Service Templates
    const serviceTemplatesCount = await db.collection('serviceTemplates').countDocuments();
    if (serviceTemplatesCount === 0) {
      const stList = [
        {
          id: 'st1',
          serviceId: 's1',
          name: 'Basic Custom DP',
          imageUrl: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&q=80&w=400',
          price: 350,
          isActive: true,
          createdAt: Date.now()
        },
        {
          id: 'st2',
          serviceId: 's1',
          name: 'Premium Guild DP Package',
          imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400',
          price: 750,
          isActive: true,
          createdAt: Date.now() + 10
        }
      ];
      await db.collection('serviceTemplates').insertMany(stList);
      console.log("MongoDB service templates seeded.");
    }

    // 6. Shell Stock
    const shellStockCount = await db.collection('shell_stock').countDocuments();
    if (shellStockCount === 0) {
      const shList = [
        { id: 'sh_default_1', shellId: 'SHELL-SG-500K', providerName: 'Garena Singapore', availableBalance: 15200, usedBalance: 8400, isActive: true, createdAt: Date.now() - 500000 },
        { id: 'sh_default_2', shellId: 'SHELL-MY-200K', providerName: 'Garena Malaysia', availableBalance: 450, usedBalance: 12000, isActive: true, createdAt: Date.now() - 300000 },
        { id: 'sh_default_3', shellId: 'SHELL-ID-100K', providerName: 'Garena Indonesia', availableBalance: 5100, usedBalance: 1900, isActive: false, createdAt: Date.now() - 100000 }
      ];
      await db.collection('shell_stock').insertMany(shList);
      console.log("MongoDB shell stock seeded.");
    }

    // 7. WhatsApp Stock Routing
    const whatsappStockCount = await db.collection('whatsapp_stock').countDocuments();
    if (whatsappStockCount === 0) {
      const waList = [
        { id: 'wa_seed_1', phoneNumber: '+94 77 123 4567', providerName: 'Xenon Store Main Support', isActive: true, assignedOrders: 14, createdAt: Date.now() - 400000 },
        { id: 'wa_seed_2', phoneNumber: '+94 76 987 6543', providerName: 'Instant Top Up Desk #2', isActive: true, assignedOrders: 25, createdAt: Date.now() - 250000 },
        { id: 'wa_seed_3', phoneNumber: '+94 71 555 4444', providerName: 'Night Shift Agent', isActive: false, assignedOrders: 0, createdAt: Date.now() - 100000 }
      ];
      await db.collection('whatsapp_stock').insertMany(waList);
      console.log("MongoDB WhatsApp stock seeded.");
    }

    // 8. Coupons
    const couponsCount = await db.collection('coupons').countDocuments();
    if (couponsCount === 0) {
      const cpList = [
        { id: 'cp_seed_1', code: 'FREEFIRE10', discountType: 'percentage', discountValue: 10, expiryDate: '2026-12-31', usageLimit: 500, usageCount: 142, isActive: true, createdAt: Date.now() },
        { id: 'cp_seed_2', code: 'LKR200OFF', discountType: 'fixed', discountValue: 200, expiryDate: '2026-09-30', usageLimit: 100, usageCount: 45, isActive: true, createdAt: Date.now() - 10000 },
        { id: 'cp_seed_3', code: 'EVOWEEKLY', discountType: 'percentage', discountValue: 15, expiryDate: '2026-06-30', usageLimit: 50, usageCount: 50, isActive: false, createdAt: Date.now() - 20000 }
      ];
      await db.collection('coupons').insertMany(cpList);
      console.log("MongoDB coupons seeded.");
    }

    // 9. Customers
    const customersCount = await db.collection('customers').countDocuments();
    if (customersCount === 0) {
      const custList = [
        { id: 'cust_seed_1', customerName: 'Miyula Senu', email: 'tntsenu2014@gmail.com', whatsappNumber: '+94 77 888 9999', playerId: '21345678', isBanned: false, totalSpent: 24500, ordersCount: 8, createdAt: Date.now() - 600000 },
        { id: 'cust_seed_2', customerName: 'Surangi Silva', email: 'surangi@gmail.com', whatsappNumber: '+94 76 111 2222', playerId: '99128374', isBanned: false, totalSpent: 12450, ordersCount: 4, createdAt: Date.now() - 350000 },
        { id: 'cust_seed_3', customerName: 'Toxic Gamer LKR', email: 'toxicfreefire@gmail.com', whatsappNumber: '+94 71 444 8888', playerId: '44221199', isBanned: true, totalSpent: 0, ordersCount: 0, createdAt: Date.now() - 250000 },
        { id: 'cust_seed_4', customerName: 'Chamod Perera', email: 'chamod.demo@gmail.com', whatsappNumber: '+94 72 000 7777', playerId: '83726154', isBanned: false, totalSpent: 4800, ordersCount: 2, createdAt: Date.now() - 50000 }
      ];
      await db.collection('customers').insertMany(custList);
      console.log("MongoDB customers seeded.");
    }

    // 10. Staff list (admins)
    const adminsCount = await db.collection('admins').countDocuments();
    if (adminsCount === 0) {
      const adminsList = [
        { id: 'staff_1', email: 'gamingremo2010@gmail.com', name: 'Xenon Store Primary', role: 'Admin', permissions: { products: true, orders: true, payments: true, shells: true, coupons: true, settings: true, reports: true, administration: true }, isActive: true, createdAt: Date.now() - 50000 },
        { id: 'staff_2', email: 'manager.demo@gmail.com', name: 'Sahan Perera', role: 'Manager', permissions: { products: true, orders: true, payments: true, shells: true, coupons: true, settings: false, reports: true, administration: false }, isActive: true, createdAt: Date.now() - 30000 },
        { id: 'staff_3', email: 'bloovalk@gmail.com', name: 'Sanju Support', role: 'Support Staff', permissions: { products: false, orders: true, payments: false, shells: true, coupons: false, settings: false, reports: false, administration: false }, isActive: true, createdAt: Date.now() - 10000 }
      ];
      await db.collection('admins').insertMany(adminsList);
      console.log("MongoDB staff list (admins) seeded.");
    }
  } catch (err) {
    console.error("Failed to seed MongoDB:", err);
  }
}

export function makeId(prefix = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let length = 20;
  let str = prefix;
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

export async function getList(table: string): Promise<any[]> {
  if (db) {
    try {
      const results = await db.collection(table).find({}).toArray();
      return results.map(r => {
        const { _id, ...rest } = r;
        return { id: rest.id || _id.toString(), ...rest };
      });
    } catch (err) {
      console.error(`MongoDB error in getList for table "${table}":`, err);
      throw err;
    }
  } else {
    const data = readLocalDb();
    return data[table] || [];
  }
}

export async function getDocById(table: string, id: string): Promise<any | null> {
  if (db) {
    try {
      const doc = await db.collection(table).findOne({ id: id });
      if (!doc) return null;
      const { _id, ...rest } = doc;
      return { id: rest.id || _id.toString(), ...rest };
    } catch (err) {
      console.error(`MongoDB error in getDocById for table "${table}" id "${id}":`, err);
      throw err;
    }
  } else {
    const data = readLocalDb();
    const list = data[table] || [];
    return list.find(item => item.id === id) || null;
  }
}

export async function insertDoc(table: string, docData: any): Promise<string> {
  const idToSend = docData.id || makeId();
  const docToInsert = { ...docData, id: idToSend };

  // Generate unique orderNumber if any custom unique indices remain on MongoDB (e.g. orderNumber_1)
  if (table === 'orders' && !docToInsert.orderNumber) {
    docToInsert.orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
  }
  if (table === 'accountOrders' && !docToInsert.orderNumber) {
    docToInsert.orderNumber = 'ACCOLD-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
  }

  if (db) {
    try {
      // 1. If it's the 'users' collection and has an email, check for pre-existing email to prevent index crashes
      if (table === 'users' && docData.email) {
        const existingByEmail = await db.collection('users').findOne({ email: docData.email });
        if (existingByEmail) {
          const targetId = existingByEmail.id || idToSend;
          const merged = { ...existingByEmail, ...docData, id: targetId };
          delete (merged as any)._id; // prevent _id modification
          await db.collection('users').replaceOne({ email: docData.email }, merged);
          return targetId;
        }
      }

      // 2. Also check if a document with this 'id' already exists in the target table
      if (docData.id) {
        const existingById = await db.collection(table).findOne({ id: docData.id });
        if (existingById) {
          const merged = { ...existingById, ...docData, id: docData.id };
          delete (merged as any)._id;
          await db.collection(table).replaceOne({ id: docData.id }, merged);
          return docData.id;
        }
      }

      await db.collection(table).insertOne(docToInsert);
      return idToSend;
    } catch (err: any) {
      // Graceful fallback for 11000 index collision if we missed it
      if (err.code === 11000 || err.message?.includes('E11000')) {
        console.warn(`Duplicate key (E11000) caught in insertDoc on table "${table}", reverting to upsert/merge...`);
        try {
          if (table === 'users' && docData.email) {
            const merged = { ...docData };
            delete (merged as any)._id;
            await db.collection('users').updateOne(
              { email: docData.email },
              { $set: merged },
              { upsert: true }
            );
            const foundObj = await db.collection('users').findOne({ email: docData.email });
            return foundObj?.id || idToSend;
          } else if (docData.id) {
            const merged = { ...docData };
            delete (merged as any)._id;
            await db.collection(table).updateOne(
              { id: docData.id },
              { $set: merged },
              { upsert: true }
            );
            return docData.id;
          }
        } catch (recoveryErr) {
          console.error("Failed to recover from duplicate key error using upsert:", recoveryErr);
        }
      }
      console.error(`MongoDB error in insertDoc on table "${table}":`, err);
      throw err;
    }
  } else {
    // Local fallback database
    const data = readLocalDb();
    if (!data[table]) data[table] = [];
    
    // For local fallback, avoid custom unique index errors too
    const existingIdx = data[table].findIndex(item => 
      item.id === docData.id || (table === 'users' && docData.email && item.email === docData.email)
    );
    
    if (existingIdx !== -1) {
      data[table][existingIdx] = { ...data[table][existingIdx], ...docData };
      writeLocalDb(data);
      return data[table][existingIdx].id || idToSend;
    } else {
      data[table].push(docToInsert);
      writeLocalDb(data);
      return idToSend;
    }
  }
}

export async function updateDocById(table: string, id: string, patch: any): Promise<void> {
  if (db) {
    try {
      await db.collection(table).updateOne({ id: id }, { $set: patch });
    } catch (err) {
      console.error(`MongoDB error in updateDocById on table "${table}" id "${id}":`, err);
      throw err;
    }
  } else {
    const data = readLocalDb();
    if (!data[table]) data[table] = [];
    const idx = data[table].findIndex(item => item.id === id);
    if (idx !== -1) {
      data[table][idx] = { ...data[table][idx], ...patch, id };
      writeLocalDb(data);
    }
  }
}

export async function deleteDocById(table: string, id: string): Promise<void> {
  if (db) {
    try {
      await db.collection(table).deleteOne({ id: id });
    } catch (err) {
      console.error(`MongoDB error in deleteDocById on table "${table}" id "${id}":`, err);
      throw err;
    }
  } else {
    const data = readLocalDb();
    if (data[table]) {
      data[table] = data[table].filter(item => item.id !== id);
      writeLocalDb(data);
    }
  }
}
