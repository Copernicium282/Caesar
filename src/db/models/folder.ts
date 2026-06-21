import mongoose, { model } from "mongoose";
const { Schema } = mongoose;

export interface Ifolder {
  name: string;
  createdAt: string;
  updatedAt: string;
}

const folderSchema = new Schema<Ifolder>(
  {
    name: { type: String, required: true, unique: true, index: true },
  },
  {
    timestamps: true,
  },
);

export const folder = model<Ifolder>("folder", folderSchema);
