import mongoose, {Document, Schema} from 'mongoose';
import {IUser} from './User.js';

// Define the interface for an Event document
export interface IEvent extends Document {
    title: string;
    description: string;
    date: Date;
    time: string;
    location: string;
    imageUrl?: string;
    creator: IUser['_id'];
    attendees: IUser['_id'][];
    createdAt: Date;
    updatedAt: Date;
}

// Create the Event schema
const eventSchema = new Schema<IEvent>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
        },
        time: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        imageUrl: {
            type: String,
            trim: true,
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        attendees: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Create and export the Event model
export const Event = mongoose.model<IEvent>('Event', eventSchema);
