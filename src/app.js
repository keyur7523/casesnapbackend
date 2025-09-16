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

// CORS configuration for frontend
const corsOptions = {
    origin: [
        'http://localhost:3000',  // Next.js development server
        'http://127.0.0.1:3000',  // Alternative localhost
        'http://localhost:3001',  // Alternative port
        // Add your production frontend URL here when deployed
        // 'https://your-frontend-domain.com'
    ],
    credentials: true,  // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions)); 

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