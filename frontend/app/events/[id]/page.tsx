'use client';

import {useParams, useRouter} from 'next/navigation';
import {useQuery, useMutation} from '@apollo/client/react';
import {GET_EVENT, ATTEND_EVENT, CANCEL_ATTENDANCE} from '../../../graphql/events';
import {format} from 'date-fns';
import {isAuthenticated, getUserId} from '../../../utils/auth';

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    // Check if user is authenticated
    const isLoggedIn = isAuthenticated();
    const userId = getUserId();

    // Fetch event details
    const {loading, error, data, refetch} = useQuery(GET_EVENT, {
        variables: {id: eventId},
        fetchPolicy: 'cache-and-network'
    });

    // Attend event mutation
    const [attendEvent, {loading: attendLoading}] = useMutation(ATTEND_EVENT, {
        onCompleted: () => {
            refetch();
        }
    });

    // Cancel attendance mutation
    const [cancelAttendance, {loading: cancelLoading}] = useMutation(CANCEL_ATTENDANCE, {
        onCompleted: () => {
            refetch();
        }
    });

    // Handle attend button click
    const handleAttend = async () => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }

        try {
            await attendEvent({
                variables: {eventId}
            });
        } catch (err) {
            console.error('Error attending event:', err);
        }
    };

    // Handle cancel attendance button click
    const handleCancelAttendance = async () => {
        try {
            await cancelAttendance({
                variables: {eventId}
            });
        } catch (err) {
            console.error('Error canceling attendance:', err);
        }
    };

    // Check if user is attending this event
    const isAttending = data?.event?.attendees.some((attendee: any) => attendee.id === userId);

    // Check if user is the creator of this event
    const isCreator = data?.event?.creator.id === userId;

    // Loading state
    if (loading && !data) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading event: {error.message}</div>
            </div>
        );
    }

    const event = data?.event;

    // If event not found
    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">Event not found</div>
            </div>
        );
    }

    // Format date
    const formattedDate = format(new Date(parseInt(event.date, 10)), 'MMMM d, yyyy');

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900 truncate">{event.title}</h1>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                            >
                                Back
                            </button>
                            {isLoggedIn && (
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                >
                                    Dashboard
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {event.imageUrl && (
                        <div className="h-64 w-full overflow-hidden">
                            <img
                                src={event.imageUrl}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
                                <p className="text-gray-600 mb-4">{event.description}</p>

                                <div className="flex items-center text-gray-500 mb-2">
                                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    <span>{formattedDate} at {event.time}</span>
                                </div>

                                <div className="flex items-center text-gray-500 mb-2">
                                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    <span>{event.location}</span>
                                </div>

                                <div className="flex items-center text-gray-500 mb-4">
                                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    <span>Created by {event.creator.name}</span>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0">
                                {isLoggedIn && !isCreator ? (
                                    isAttending ? (
                                        <button
                                            onClick={handleCancelAttendance}
                                            disabled={cancelLoading}
                                            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            {cancelLoading ? 'Canceling...' : 'Cancel Attendance'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleAttend}
                                            disabled={attendLoading}
                                            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            {attendLoading ? 'Joining...' : 'Attend Event'}
                                        </button>
                                    )
                                ) : isCreator ? (
                                    <button
                                        onClick={() => router.push(`/dashboard/edit-event/${eventId}`)}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        Edit Event
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        Login to Attend
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-semibold mb-4">Attendees ({event.attendees.length})</h3>
                            {event.attendees.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {event.attendees.map((attendee: any) => (
                                        <div key={attendee.id} className="flex items-center">
                                            <div
                                                className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold mr-2">
                                                {attendee.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-gray-700">{attendee.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500">No attendees yet. Be the first to attend!</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
