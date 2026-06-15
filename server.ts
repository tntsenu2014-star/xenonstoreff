import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
  initDatabase, 
  getList, 
  getDocById, 
  insertDoc, 
  updateDocById, 
  deleteDocById,
  makeId,
  isDbConnected
} from './server/mongodb.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_DEV';

export const app = express();
const PORT = 3000;

// Middleware setup
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '50mb' }));

// Request logger helper
app.use((req, res, next) => {
  next();
});

// Initialize database in background
initDatabase().catch(err => {
  console.error("Database connection initialization failed in background:", err);
});

// API routes go here FIRST
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    database: isDbConnected() ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV
  });
});

// === File Upload and Serving Routes ===
app.post('/api/upload', async (req, res) => {
  try {
    const { fileName, mimeType, data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No file data received' });
    }
    const id = 'img_' + makeId();
    await insertDoc('uploads', {
      id,
      fileName: fileName || 'upload.bin',
      mimeType: mimeType || 'application/octet-stream',
      data: data, // base64 representation
      createdAt: Date.now()
    });
    res.status(201).json({ url: `/api/uploads/${id}` });
  } catch (err: any) {
    console.error('File upload API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/uploads/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const record = await getDocById('uploads', id);
    if (!record || !record.data) {
      return res.status(404).send('Not Found');
    }
    
    let cleanData = record.data;
    if (cleanData.includes(';base64,')) {
      cleanData = cleanData.split(';base64,')[1];
    }
    
    const buffer = Buffer.from(cleanData, 'base64');
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (err) {
    console.error('File serving error:', err);
    res.status(500).send('Error');
  }
});

// === Authentication Routes ===
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, customerName, secretKey } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await getList('users');
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
      if (existingUser.passwordHash) {
        return res.status(400).json({ error: 'Email is already registered' });
      } else {
        const passwordHash = await bcrypt.hash(password, 10);
        await updateDocById('users', existingUser.id, {
          passwordHash,
          secretKey: secretKey || '',
          customerName: customerName || existingUser.customerName || 'Player'
        });
        const token = jwt.sign({ id: existingUser.id, email: existingUser.email }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({ token, user: { id: existingUser.id, email: existingUser.email, customerName: existingUser.customerName } });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUserId = `usr_${makeId()}`;
    
    const newUser = {
      id: newUserId,
      email,
      passwordHash,
      secretKey: secretKey || '',
      customerName: customerName || 'Player',
      createdAt: Date.now()
    };

    await insertDoc('users', newUser);
    
    const token = jwt.sign({ id: newUserId, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUserId, email, customerName: newUser.customerName } });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await getList('users');
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Legacy account detected. Please go to the Profile page and Register with the same email to set a new password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, customerName: user.customerName } });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = await getList('users');
    const user = users.find(u => u.email?.trim().toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'No registered account was found with that email address.' });
    }

    res.json({ 
      success: true, 
      message: 'Account verified. Please enter your Forgot Secret Key to reset your password.'
    });

  } catch (err: any) {
    console.error('Forgot-password route error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, secretKey, newPassword } = req.body;
    if (!email || !secretKey || !newPassword) {
      return res.status(400).json({ error: 'Email, Secret Key, and new password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = await getList('users');
    const user = users.find(u => u.email?.trim().toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const savedSecretKey = String(user.secretKey || '').trim().toLowerCase();
    const inputSecretKey = String(secretKey).trim().toLowerCase();

    if (!savedSecretKey || savedSecretKey !== inputSecretKey) {
      return res.status(450).json({ error: 'Invalid Forgot Secret Key. Please try again with the correct key.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await updateDocById('users', user.id, {
      passwordHash
    });

    res.json({ success: true, message: 'Your password has been successfully reset! You can now log in.' });

  } catch (err: any) {
    console.error('Reset-password route error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    const user = await getDocById('users', decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.json({ user: { id: user.id, email: user.email, customerName: user.customerName } });
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// === Express API Database Proxy Routes ===
app.get('/api/db/:table', async (req, res) => {
  try {
    const table = req.params.table;
    let list = await getList(table);
    
    for (const [key, val] of Object.entries(req.query)) {
      list = list.filter(item => {
        const itemVal = item[key as keyof typeof item];
        if (typeof itemVal === 'boolean') {
          return String(itemVal) === val;
        }
        return String(itemVal) === String(val);
      });
    }
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const doc = await getDocById(table, id);
    if (!doc) {
      return res.status(404).json({ error: `Document ${id} not found in ${table}` });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/:table', async (req, res) => {
  try {
    const table = req.params.table;
    const id = await insertDoc(table, req.body);
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    await updateDocById(table, id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/:table/:id/delete', async (req, res) => {
  try {
    const { table, id } = req.params;
    await deleteDocById(table, id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PayHere Routes
app.post('/api/payhere-hash', (req, res) => {
  const { orderId, amount, currency } = req.body;
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_SECRET;

  if (!merchantId || !merchantSecret) {
    return res.status(500).json({ error: 'PayHere credentials not configured on server' });
  }

  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const amountFormatted = Number(amount).toFixed(2);
  
  const hash = crypto.createHash('md5')
    .update(merchantId + orderId + amountFormatted + currency + hashedSecret)
    .digest('hex')
    .toUpperCase();

  res.json({ hash, merchantId });
});

app.post('/api/payhere-notify', async (req, res) => {
  const { 
    merchant_id, 
    order_id, 
    payhere_amount, 
    payhere_currency, 
    status_code, 
    md5sig,
    payment_id 
  } = req.body;

  const merchantSecret = process.env.PAYHERE_SECRET;
  if (!merchantSecret) return res.status(500).send("Error");

  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const localSig = crypto.createHash('md5')
    .update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret)
    .digest('hex')
    .toUpperCase();

  if (localSig !== md5sig) return res.status(400).send("Invalid signature");

  if (status_code === '2') {
    try {
      const isAccountOrder = order_id.startsWith('acc_') || order_id.includes('_acc_');
      const collectionName = isAccountOrder ? 'accountOrders' : 'orders';
      const cleanOrderId = isAccountOrder ? order_id.replace('acc_', '') : order_id;

      const orderDoc = await getDocById(collectionName, cleanOrderId);
      if (orderDoc) {
        await updateDocById(collectionName, cleanOrderId, {
          status: 'confirmed',
          payherePaymentId: payment_id,
          updatedAt: Date.now()
        });
        await insertDoc('notifications', {
          title: 'Payment Confirmed',
          message: `Order #${cleanOrderId} has been successfully paid via PayHere!`,
          type: 'success',
          target: 'admin',
          createdAt: Date.now()
        });
      }
    } catch (err) {
      console.error("PayHere IPN update error:", err);
    }
  }

  res.status(200).send("OK");
});

// --- Emails ---
async function sendOrderNotification(data: { orderId: string; customerName: string; packageName: string; amount: number; type: 'PACKAGE' | 'ACCOUNT' }) {
  const { orderId, customerName, packageName, amount, type } = data;
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!resendKey || !adminEmail) return { status: 'skipped' };

  try {
    const resend = new Resend(resendKey);
    const subject = type === 'ACCOUNT' ? `New Account Purchase: ${packageName}` : `New Order Received: ${packageName}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">${subject}</h2>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Package/Account:</strong> ${packageName}</p>
        <p><strong>Amount:</strong> LKR ${amount.toLocaleString()}</p>
      </div>
    `;
    await resend.emails.send({
      from: 'Diamond Store <onboarding@resend.dev>',
      to: adminEmail,
      subject: subject,
      html: html,
    });
    return { status: 'success' };
  } catch (error) {
    console.error('Email notify error:', error);
    return { status: 'error' };
  }
}

app.post('/api/notify-order', async (req, res) => {
  const result = await sendOrderNotification(req.body);
  res.json(result);
});

// API Catch-all
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
