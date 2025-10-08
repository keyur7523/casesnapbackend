require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const setupRoutes = require('./routes/setupRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const errorHandler = require('./middleware/error');
const { initializeEmailService } = require('./utils/emailService');

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
const allowedOrigins = [
    'http://localhost:3000',  // Next.js development server
    'http://127.0.0.1:3000',  // Alternative localhost
    'http://localhost:3001',  // Alternative port
    'http://localhost:3002',  // Alternative port
    'http://localhost:3003',  // Alternative port
    'https://casesnap-nvewn0k03-jui1234s-projects.vercel.app',  // Old Vercel URL
    'https://casesnap-nvewn0k03-jui1234s-projects.vercel.app/',  // Old Vercel URL with slash
    'https://casesnap-lake.vercel.app',  // New Vercel URL
    'https://casesnap-lake.vercel.app/'  // New Vercel URL with slash
];

// Add environment variable origins if they exist
if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',');
    allowedOrigins.push(...envOrigins);
}

const corsOptions = {
    origin: allowedOrigins,
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
        allowedOrigins: allowedOrigins,
        isOriginAllowed: allowedOrigins.includes(req.headers.origin)
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

// Initialize email service
initializeEmailService();

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/employees', employeeRoutes);
app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});