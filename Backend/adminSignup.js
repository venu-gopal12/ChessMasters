import readline from 'readline';
import AdminModel from './models/adminModel.js';
import mongoose from 'mongoose';
import { mongodbUri } from './config.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};
await mongoose.connect(mongodbUri).then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("Error connecting to MongoDB:", error);
});

const adminSignup = async () => {
    try {
        const name = await askQuestion("Enter admin name: ");
        const email = await askQuestion("Enter admin email: ");
        const password = await askQuestion("Enter admin password: ");

        const admin = new AdminModel({
            UserName: name,
            email,
            password
        });

        await admin.save();
        console.log('Admin registered successfully!');
    } catch (error) {
        console.error("Error registering admin:", error);
    } finally {
        rl.close();
    }
};

adminSignup();
