import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";


// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 5000;
// console.log("🔐 JWT_SECRET in use:", process.env.JWT_SECRET);



connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongodb connection error", err);
  });
