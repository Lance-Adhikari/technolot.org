const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Dummy credentials (you can change this in .env)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallbacksecret',
  resave: false,
  saveUninitialized: true
}));

// === Routes ===

// Root redirect
app.get('/', (req, res) => {
  res.redirect(req.session.loggedIn ? '/dashboard.html' : '/login.html');
});

// Login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard page
app.get('/dashboard.html', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Login handler
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    return res.redirect('/dashboard.html');
  }
  res.send('<p style="color:red; text-align:center;">Invalid credentials. <a href="/login.html">Try again</a></p>');
});

// Logout handler
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Auth check for frontend
app.get('/auth-check', (req, res) => {
  res.json({ authenticated: !!req.session.loggedIn });
});

// === API ROUTE: Save link locker ===
app.post('/api/link-lockers', async (req, res) => {
  const { title, target_url } = req.body;

  if (!title || !target_url) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO link_lockers (title, target_url, created_at, views) VALUES ($1, $2, NOW(), 0) RETURNING *',
      [title, target_url]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Database insert error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});