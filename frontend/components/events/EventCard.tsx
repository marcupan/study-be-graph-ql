'use client';

import { format } from 'date-fns';
import Link from 'next/link';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    imageUrl?: string;
    creator: {
      id: string;
      name: string;
    };
    attendees: {
      id: string;
      name: string;
    }[];
  };
}

export default function EventCard({ event }: EventCardProps) {
  // Format the date to be more readable
  const formattedDate = format(new Date(event.date), 'MMMM d, yyyy');

  // Truncate description if it's too long
  const truncatedDescription =
    event.description.length > 100
      ? `${event.description.substring(0, 100)}...`
      : event.description;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {event.imageUrl && (
        <div className="h-48 w-full overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
        <p className="text-gray-600 text-sm mb-3">{truncatedDescription}</p>

        <div className="flex items-center text-gray-500 text-sm mb-2">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedDate} at {event.time}</span>
        </div>

        <div className="flex items-center text-gray-500 text-sm mb-3">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{event.location}</span>
        </div>

        <div className="flex items-center text-gray-500 text-sm mb-4">
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Created by {event.creator.name}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {event.attendees.length} {event.attendees.length === 1 ? 'attendee' : 'attendees'}
          </div>
          <Link href={`/events/${event.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
