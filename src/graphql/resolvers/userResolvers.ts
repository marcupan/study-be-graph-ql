import {IUser, User} from '../../models/User';
import {Event} from '../../models/Event';
import {generateToken, hashPassword, verifyPassword, requireAuth} from '../../utils/auth';
import {UserInputError, AuthenticationError} from 'apollo-server-express';
import {paginateQuery} from '../../utils/pagination';
import {Loaders} from '../../utils/dataLoaders';

interface UserInput {
    name: string;
    email: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

interface PaginationInput {
    page?: number;
    limit?: number;
}

interface Context {
    user?: {
        id: string;
        email: string;
    };
    loaders: Loaders;
}

export const userResolvers = {
    Query: {
        users: async (_: any, { pagination }: { pagination?: PaginationInput }) => {
            try {
                const query = User.find();
                return await paginateQuery(query, User, {}, pagination);
            } catch (err) {
                throw new Error('Error fetching users');
            }
        },
        user: async (_: any, {id}: { id: string }, { loaders }: Context) => {
            try {
                const user = await loaders.userLoader.load(id);
                if (!user) {
                    throw new Error('User not found');
                }
                return user;
            } catch (err) {
                throw new Error('User not found');
            }
        },
        me: requireAuth(async (_: any, __: any, {user, loaders}: Context) => {
            try {
                const userData = await loaders.userLoader.load(user!.id);
                if (!userData) {
                    throw new Error('User not found');
                }
                return userData;
            } catch (err) {
                throw new Error('User not found');
            }
        }),
    },
    Mutation: {
        createUser: async (_: any, {userInput}: { userInput: UserInput }) => {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({email: userInput.email});
                if (existingUser) {
                    throw new UserInputError('User already exists');
                }

                // Hash password
                const hashedPassword = await hashPassword(userInput.password);

                // Create new user
                const user = new User({
                    name: userInput.name,
                    email: userInput.email,
                    password: hashedPassword,
                });

                // Save user to database
                const result = await user.save();

                // Generate token
                const token = generateToken({id: result.id, email: result.email});

                return {
                    userId: result.id,
                    token,
                    tokenExpiration: 1, // 1 day
                };
            } catch (err) {
                throw err;
            }
        },
        login: async (_: any, {email, password}: LoginInput) => {
            try {
                // Find user by email
                const user = await User.findOne({email});
                if (!user) {
                    throw new AuthenticationError('Invalid credentials');
                }

                // Verify password
                const isValid = await verifyPassword(password, user.password);
                if (!isValid) {
                    throw new AuthenticationError('Invalid credentials');
                }

                // Generate token
                const token = generateToken({id: user.id, email: user.email});

                return {
                    userId: user.id,
                    token,
                    tokenExpiration: 1, // 1 day
                };
            } catch (err) {
                throw err;
            }
        },
    },
    User: {
        events: async (parent: IUser, _: any, { loaders }: Context) => {
            try {
                return await loaders.userEventsLoader.load(parent.id);
            } catch (err) {
                throw new Error('Error fetching events');
            }
        },
        attendingEvents: async (parent: IUser, _: any, { loaders }: Context) => {
            try {
                return await loaders.userAttendingEventsLoader.load(parent.id);
            } catch (err) {
                throw new Error('Error fetching attending events');
            }
        },
    },
};
