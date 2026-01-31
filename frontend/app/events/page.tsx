import ProtectedRoute from '../../components/auth/ProtectedRoute';
import EventList from '../../components/events/EventList';

export default function EventsPage() {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Discover and join events from the community
                        </p>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">All Events</h2>
                            <a
                                href="/dashboard"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                                Dashboard
                            </a>
                        </div>

                        <EventList type="all" pageSize={9}/>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
