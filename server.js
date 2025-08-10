const express = require('express');
const { dbConnect } = require('./utiles/db');
const cors = require('cors');
const http = require('http');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const socket = require('socket.io');

const app = express();
const server = http.createServer(app);
const mode = process.env.mode || 'dev';

// Define allowed origins
const allowedOrigins = mode === 'pro'
  ? [
      'http://localhost:3000',
      process.env.user_panel_production_url,  // Example: https://my-shop-lb5oplfpn-sifats-projects-26d2e85a.vercel.app
      process.env.admin_panel_production_url // Example: https://bazario-admin.vercel.app
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001'
    ];

// CORS for Express routes
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser clients
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Socket.IO with same CORS settings
const io = socket(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// ===== Socket user tracking =====
let allCustomer = [];
let allSeller = [];
let admin = {};

const addUser = (customerId, socketId, userInfo) => {
  if (!allCustomer.some(u => u.customerId === customerId)) {
    allCustomer.push({ customerId, socketId, userInfo });
  }
};

const addSeller = (sellerId, socketId, userInfo) => {
  if (!allSeller.some(u => u.sellerId === sellerId)) {
    allSeller.push({ sellerId, socketId, userInfo });
  }
};

const findCustomer = (customerId) => allCustomer.find(c => c.customerId === customerId);
const findSeller = (sellerId) => allSeller.find(s => s.sellerId === sellerId);

const remove = (socketId) => {
  allCustomer = allCustomer.filter(c => c.socketId !== socketId);
  allSeller = allSeller.filter(s => s.socketId !== socketId);
};

const removeAdmin = (socketId) => {
  if (admin.socketId === socketId) {
    admin = {};
  }
};

// ===== Socket.IO events =====
io.on('connection', (soc) => {
  console.log('Socket connected:', soc.id);

  soc.on('add_user', (customerId, userInfo) => {
    addUser(customerId, soc.id, userInfo);
    io.emit('activeSeller', allSeller);
    io.emit('activeCustomer', allCustomer);
  });

  soc.on('add_seller', (sellerId, userInfo) => {
    addSeller(sellerId, soc.id, userInfo);
    io.emit('activeSeller', allSeller);
    io.emit('activeCustomer', allCustomer);
    io.emit('activeAdmin', { status: true });
  });

  soc.on('add_admin', (adminInfo) => {
    delete adminInfo.email;
    admin = { ...adminInfo, socketId: soc.id };
    io.emit('activeSeller', allSeller);
    io.emit('activeAdmin', { status: true });
  });

  soc.on('send_seller_message', (msg) => {
    const customer = findCustomer(msg.receverId);
    if (customer) {
      soc.to(customer.socketId).emit('seller_message', msg);
    }
  });

  soc.on('send_customer_message', (msg) => {
    const seller = findSeller(msg.receverId);
    if (seller) {
      soc.to(seller.socketId).emit('customer_message', msg);
    }
  });

  soc.on('send_message_admin_to_seller', (msg) => {
    const seller = findSeller(msg.receverId);
    if (seller) {
      soc.to(seller.socketId).emit('receved_admin_message', msg);
    }
  });

  soc.on('send_message_seller_to_admin', (msg) => {
    if (admin.socketId) {
      soc.to(admin.socketId).emit('receved_seller_message', msg);
    }
  });

  soc.on('disconnect', () => {
    console.log('Socket disconnected:', soc.id);
    remove(soc.id);
    removeAdmin(soc.id);
    io.emit('activeAdmin', { status: false });
    io.emit('activeSeller', allSeller);
    io.emit('activeCustomer', allCustomer);
  });
});

// ===== Middleware =====
app.use(bodyParser.json());
app.use(cookieParser());

// ===== Routes =====
app.use('/api', require('./routes/chatRoutes'));
app.use('/api', require('./routes/paymentRoutes'));
app.use('/api', require('./routes/bannerRoutes'));
app.use('/api', require('./routes/dashboard/dashboardIndexRoutes'));
app.use('/api/home', require('./routes/home/homeRoutes'));
app.use('/api', require('./routes/order/orderRoutes'));
app.use('/api', require('./routes/home/cardRoutes'));
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/home/customerAuthRoutes'));
app.use('/api', require('./routes/dashboard/sellerRoutes'));
app.use('/api', require('./routes/dashboard/categoryRoutes'));
app.use('/api', require('./routes/dashboard/productRoutes'));

app.get('/', (req, res) => res.send('Hello World!'));

// ===== Start server =====
const port = process.env.PORT || 5000;
dbConnect();
server.listen(port, () => console.log(`Server is running on port ${port}!`));
