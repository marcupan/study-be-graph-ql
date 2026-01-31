'use client';

import {useQuery} from '@apollo/client/react';
import {useState} from 'react';

import {GET_EVENTS, GET_MY_EVENTS, GET_MY_ATTENDING_EVENTS} from '../../graphql/events';
import Pagination from '../common/Pagination';

import EventCard from './EventCard';

type ListType = 'all' | 'my' | 'attending';

interface EventListProps {
    type?: ListType;
    initialPage?: number;
    pageSize?: number;
}

export default function EventList({
                                      type = 'all',
                                      initialPage = 1,
                                      pageSize = 6
                                  }: EventListProps) {
    const [page, setPage] = useState(initialPage);

    // Determine which query to use based on the type
    const queryMap = {
        all: GET_EVENTS,
        my: GET_MY_EVENTS,
        attending: GET_MY_ATTENDING_EVENTS
    };

    const query = queryMap[type];

    // Execute the query with pagination
    const {loading, error, data} = useQuery(query, {
        variables: {
            pagination: {
                page,
                limit: pageSize
            }
        },
        fetchPolicy: 'cache-and-network'
    });

    // Handle page change
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        // Scroll to top when changing pages
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    // Get the appropriate data based on the type
    const getEventsData = () => {
        if (!data) return null;

        switch (type) {
            case 'all':
                return data.events;
            case 'my':
                return data.myEvents;
            case 'attending':
                return data.myAttendingEvents;
            default:
                return null;
        }
    };

    const eventsData = getEventsData();

    // Loading state
    if (loading && !eventsData) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-red-50 p-4 rounded-md text-red-700 mb-4">
                <p>Error loading events: {error.message}</p>
            </div>
        );
    }

    // Empty state
    if (!eventsData || eventsData.edges.length === 0) {
        return (
            <div className="bg-gray-50 p-8 rounded-md text-center">
                <h3 className="text-lg font-medium text-gray-700 mb-2">No events found</h3>
                <p className="text-gray-500">
                    {type === 'all'
                        ? 'There are no events available at the moment.'
                        : type === 'my'
                            ? 'You haven\'t created any events yet.'
                            : 'You\'re not attending any events yet.'}
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventsData.edges.map((event: any) => (
                    <EventCard key={event.id} event={event}/>
                ))}
            </div>

            <Pagination
                currentPage={eventsData.pageInfo.currentPage}
                totalPages={eventsData.pageInfo.totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
}
