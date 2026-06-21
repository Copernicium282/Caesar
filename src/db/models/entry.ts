import mongoose, { model } from "mongoose";
const { Schema } = mongoose;

export interface CustomField {
  name: string;
  value: string;
  type: "text" | "password" | "boolean" | "number";
}

export interface PasswordHistoryEntry {
  password: string;
  iv: string;
  auth_tag: string;
  changedAt: string;
}

export interface Ipwd {
  name: string;
  username: string;
  encrypted_password: string;
  iv: string;
  auth_tag: string;
  url: string;
  uris?: string[];
  notes?: string;
  folder?: string;
  favorite: boolean;
  type: "login" | "note";
  customFields: CustomField[];
  totp?: string;
  totp_iv?: string;
  totp_auth_tag?: string;
  passwordHistory: PasswordHistoryEntry[];
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const customFieldSchema = new Schema<CustomField>(
  {
    name: { type: String, required: true },
    value: { type: String, default: "" },
    type: {
      type: String,
      enum: ["text", "password", "boolean", "number"],
      default: "text",
    },
  },
  { _id: false },
);

const passwordHistorySchema = new Schema<PasswordHistoryEntry>(
  {
    password: { type: String, required: true },
    iv: { type: String, required: true },
    auth_tag: { type: String, required: true },
    changedAt: { type: String, required: true },
  },
  { _id: false },
);

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
    folder: { type: String, default: null },
    favorite: { type: Boolean, default: false },
    type: { type: String, enum: ["login", "note"], default: "login" },
    customFields: { type: [customFieldSchema], default: [] },
    totp: { type: String, default: null },
    totp_iv: { type: String, default: null },
    totp_auth_tag: { type: String, default: null },
    passwordHistory: { type: [passwordHistorySchema], default: [] },
    deletedAt: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

export const entry = model<Ipwd>("entry", pwdSchema);
