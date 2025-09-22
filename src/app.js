require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const setupRoutes = require('./routes/setupRoutes');
const errorHandler = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 5004;

app.use(express.json()); 

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// CORS configuration for frontend
const corsOptions = {
    origin: [
        'http://localhost:3000',  // Next.js development server
        'http://127.0.0.1:3000',  // Alternative localhost
        'http://localhost:3001',  // Alternative port
        'http://localhost:3002',  // Alternative port
        'http://localhost:3003',  // Alternative port
        'https://casesnap-nvewn0k03-jui1234s-projects.vercel.app',  // Removed trailing slash
        'https://casesnap-nvewn0k03-jui1234s-projects.vercel.app/'  // With trailing slash
    ],
    credentials: true,  // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers'
    ],
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false
};

app.use(cors(corsOptions));

// CORS debugging middleware
app.use((req, res, next) => {
    console.log('🌐 CORS Debug:', {
        origin: req.headers.origin,
        method: req.method,
        headers: req.headers
    });
    next();
}); 

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // useNewUrlParser: true, // Deprecated in newer Mongoose versions
            // useUnifiedTopology: true, // Deprecated in newer Mongoose versions
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Exit process with failure
        process.exit(1);
    }
};

// Connect to the database
connectDB();

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});