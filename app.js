const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();


const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');


const { createTables } = require('./config/setup');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        maxAge: 7 * 24 * 60 * 60 * 1000 
    }
}));


app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/roles', roleRoutes);


app.get('/', (req, res) => {
    res.redirect('/dashboard');
});


app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).render('error', {
        message: 'An internal server error occurred',
        user: req.user || null,
        // currentPath: req.path || '/'
    });
});


app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page not found',
        user: req.user || null,
        // currentPath: req.path || '/'
    });
});


const startServer = async () => {
    try {
        
        await createTables();
        
        
        app.listen(PORT, () => {
            console.log(` Server is running on http://localhost:${PORT}`);
            
       ;
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
