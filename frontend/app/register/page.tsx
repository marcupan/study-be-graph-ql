import RegisterForm from '../../components/auth/RegisterForm';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">EventFlow</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Create an account to start managing events
                    </p>
                </div>
                <RegisterForm/>
            </div>
        </div>
    );
}
