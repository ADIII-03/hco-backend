import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 8000;
// console.log("🔐 JWT_SECRET in use:", process.env.JWT_SECRET);

// Connect to database and start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log("✅ MongoDB connected successfully");

        // Start the server
        const server = app.listen(PORT, () => {
            console.log(`⚙️  Server is running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔒 CORS Origin: ${process.env.NODE_ENV === 'production' ? 'https://hc-opage.vercel.app' : process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
        });

        // Handle server errors
        server.on('error', (error) => {
            console.error('Server error:', error);
            process.exit(1);
        });

    } catch (error) {
        console.error("❌ Error starting server:", error);
        process.exit(1);
    }
};

startServer();
