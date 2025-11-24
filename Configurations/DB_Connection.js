import mongoose from "mongoose"; // Import Mongoose for MongoDB interactions
import { Logger } from "../Utilities/Logger.js"; // Import a Logger utility for logging messages
import "dotenv/config"; // Import dotenv for environment variable management

let MONGO_URL = process.env.MONGO_URL; // Get the MongoDB connection URL from environment variables

let instance = null; // Initialize a variable to hold the connection instance

// Function to establish a MongoDB connection
const MongoConnect = () => {
    // Check if the instance already exists
    if (!instance) {
        // If not, create a new connection using Mongoose
        instance = mongoose.connect(MONGO_URL)
        .then(() => {
            Logger.info("DB connected Successfully"); // Log success message upon successful connection
            return instance; // Return the connection instance
        })
        .catch((err) => {
            Logger.error(err.message); // Log any error that occurs during connection
            throw err; // Re-throw the error to allow handling it further up if needed
        });
    }
    // Return the existing instance if it was already created
    return instance; 
};

// Export the MongoConnect function as the default export
export default MongoConnect;
