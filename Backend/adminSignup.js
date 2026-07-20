// Purpose: CLI helper for creating an administrator account.
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

const getAdminCredentials = async () => {
    const envCredentials = {
        name: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    };

    if (envCredentials.name && envCredentials.email && envCredentials.password) {
        return envCredentials;
    }

    return {
        name: await askQuestion("Enter admin name: "),
        email: await askQuestion("Enter admin email: "),
        password: await askQuestion("Enter admin password: "),
    };
};

const adminSignup = async () => {
    try {
        await mongoose.connect(mongodbUri);
        console.log("Connected to MongoDB");

        const { name, email, password } = await getAdminCredentials();
        const normalizedEmail = email.trim().toLowerCase();

        const existingAdmin = await AdminModel.findOne({ email: normalizedEmail });
        if (existingAdmin) {
            console.log(`Admin already exists for ${normalizedEmail}. Skipping.`);
            return;
        }

        const admin = new AdminModel({
            UserName: name.trim(),
            email: normalizedEmail,
            password,
        });

        await admin.save();
        console.log(`Admin registered successfully for ${normalizedEmail}.`);
    } catch (error) {
        console.error("Error registering admin:", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect();
    }
};

adminSignup();
