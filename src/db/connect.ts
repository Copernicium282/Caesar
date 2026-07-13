import mongoose from "mongoose";

export async function connectDB(mongoDBUri: string, retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(mongoDBUri);
      console.log("Connected to MongoDB");
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed:`, (err as Error).message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
