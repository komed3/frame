import express from 'express';

// Initialize express app
const app = express();

// Middlewares
app.use( express.urlencoded( { extended: true } ) );
app.use( express.json() );

app.listen( process.env.PORT || 3000, () => console.log( 'Server is running!' ) );
