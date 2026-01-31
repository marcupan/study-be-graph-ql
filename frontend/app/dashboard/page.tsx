'use client';

import {useQuery} from '@apollo/client';
import {useRouter} from 'next/navigation';

import {GET_CURRENT_USER} from '../../graphql/auth';
import {logout} from '../../utils/auth';

export default function DashboardPage() {
    const router = useRouter();
    const {loading, error, data} = useQuery(GET_CURRENT_USER);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading user data. Please try again.</div>
            </div>
        );
    }

    const user = data?.me;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">EventFlow</h1>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        Logout
                    </button>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Welcome, {user?.name}!</h2>
                    <p className="text-gray-600">
                        This is your dashboard where you can manage your events. You can create new events, view your
                        existing events, and see events you're attending.
                    </p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="font-medium text-blue-800 mb-2">My Events</h3>
                            <p className="text-sm text-blue-600">Events you've created</p>
                            <button
                                onClick={() => router.push('/dashboard/my-events')}
                                className="mt-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                                View Events
                            </button>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <h3 className="font-medium text-green-800 mb-2">Attending</h3>
                            <p className="text-sm text-green-600">Events you're attending</p>
                            <button
                                onClick={() => router.push('/dashboard/attending')}
                                className="mt-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                                View Events
                            </button>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <h3 className="font-medium text-purple-800 mb-2">Discover Events</h3>
                            <p className="text-sm text-purple-600">Find events to attend</p>
                            <button
                                onClick={() => router.push('/events')}
                                className="mt-4 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                            >
                                Browse Events
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
