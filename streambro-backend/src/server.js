// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// --- Init Middleware ---

// Enable Cross-Origin Resource Sharing for all routes
app.use(cors());

// Body parser middleware to handle JSON request bodies
app.use(express.json());


// --- Define API Routes ---
// A simple test route to check if the API is running
app.get('/api', (req, res) => res.json({ msg: 'StreamBro API is up and running!' }));

// TODO: Link route files here
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/streams', require('./routes/streams.routes'));
// app.use('/api/videos', require('./routes/videos.routes'));

// --- Serve Static Files ---
// Make the 'uploads' directory accessible to the frontend
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on http://localhost:${PORT}`));
