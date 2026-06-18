import mongoose, { model } from "mongoose";
const { Schema } = mongoose;

export interface Ipwd {
  name: string;
  username: string;
  encrypted_password: string;
  iv: string;
  auth_tag: string;
  url: string;
  uris?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const pwdSchema = new Schema<Ipwd>(
  {
    name: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    encrypted_password: { type: String, required: true },
    iv: { type: String, required: true },
    auth_tag: { type: String, required: true },
    url: { type: String, default: null },
    uris: { type: [String], default: [] },
    notes: String,
  },
  {
    timestamps: true,
  },
);

export const entry = model<Ipwd>("entry", pwdSchema);
