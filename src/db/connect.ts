import mongoose from "mongoose";

export async function connectDB(mongoDBUri: string) {
  await mongoose.connect(mongoDBUri);
  console.log("Connected to MongoDB");
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
