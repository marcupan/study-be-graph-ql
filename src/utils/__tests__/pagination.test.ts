import mongoose from 'mongoose';

import {paginateQuery} from '../pagination.js';

// Mock mongoose Query
const mockExec = jest.fn();
const mockSkip = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockQuery = {
    skip: mockSkip,
    limit: mockLimit,
    exec: mockExec
};

// Mock mongoose Model
const mockCountDocuments = jest.fn();
const mockModel = {
    countDocuments: mockCountDocuments
};

describe('Pagination Utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should apply pagination with default values when no pagination input is provided', async () => {
        // Arrange
        const mockResults = [{id: '1'}, {id: '2'}];
        mockExec.mockResolvedValue(mockResults);
        mockCountDocuments.mockResolvedValue(20);

        // Act
        const result = await paginateQuery(
            mockQuery as unknown as mongoose.Query<any[], any>,
            mockModel as unknown as mongoose.Model<any>,
            {}
        );

        // Assert
        expect(mockSkip).toHaveBeenCalledWith(0); // (page 1 - 1) * limit 10 = 0
        expect(mockLimit).toHaveBeenCalledWith(10);
        expect(mockCountDocuments).toHaveBeenCalledWith({});
        expect(result).toEqual({
            edges: mockResults,
            pageInfo: {
                hasNextPage: true,
                hasPreviousPage: false,
                currentPage: 1,
                totalPages: 2
            },
            totalCount: 20
        });
    });

    it('should apply pagination with provided values', async () => {
        // Arrange
        const mockResults = [{id: '3'}, {id: '4'}];
        mockExec.mockResolvedValue(mockResults);
        mockCountDocuments.mockResolvedValue(30);
        const pagination = {page: 2, limit: 5};

        // Act
        const result = await paginateQuery(
            mockQuery as unknown as mongoose.Query<any[], any>,
            mockModel as unknown as mongoose.Model<any>,
            {},
            pagination
        );

        // Assert
        expect(mockSkip).toHaveBeenCalledWith(5); // (page 2 - 1) * limit 5 = 5
        expect(mockLimit).toHaveBeenCalledWith(5);
        expect(mockCountDocuments).toHaveBeenCalledWith({});
        expect(result).toEqual({
            edges: mockResults,
            pageInfo: {
                hasNextPage: true,
                hasPreviousPage: true,
                currentPage: 2,
                totalPages: 6
            },
            totalCount: 30
        });
    });

    it('should handle invalid pagination values', async () => {
        // Arrange
        const mockResults = [{id: '1'}];
        mockExec.mockResolvedValue(mockResults);
        mockCountDocuments.mockResolvedValue(10);
        const pagination = {page: -1, limit: 0};

        // Act
        const result = await paginateQuery(
            mockQuery as unknown as mongoose.Query<any[], any>,
            mockModel as unknown as mongoose.Model<any>,
            {},
            pagination
        );

        // Assert
        expect(mockSkip).toHaveBeenCalledWith(0); // (page 1 - 1) * limit 10 = 0
        expect(mockLimit).toHaveBeenCalledWith(10);
        expect(result.pageInfo.currentPage).toBe(1);
    });

    it('should handle last page correctly', async () => {
        // Arrange
        const mockResults = [{id: '9'}, {id: '10'}];
        mockExec.mockResolvedValue(mockResults);
        mockCountDocuments.mockResolvedValue(10);
        const pagination = {page: 5, limit: 2};

        // Act
        const result = await paginateQuery(
            mockQuery as unknown as mongoose.Query<any[], any>,
            mockModel as unknown as mongoose.Model<any>,
            {},
            pagination
        );

        // Assert
        expect(result.pageInfo.hasNextPage).toBe(false);
        expect(result.pageInfo.hasPreviousPage).toBe(true);
        expect(result.pageInfo.currentPage).toBe(5);
        expect(result.pageInfo.totalPages).toBe(5);
    });

    it('should apply filter to countDocuments', async () => {
        // Arrange
        const mockResults = [{id: '1'}];
        mockExec.mockResolvedValue(mockResults);
        mockCountDocuments.mockResolvedValue(5);
        const filter = {category: 'test'};

        // Act
        await paginateQuery(
            mockQuery as unknown as mongoose.Query<any[], any>,
            mockModel as unknown as mongoose.Model<any>,
            filter
        );

        // Assert
        expect(mockCountDocuments).toHaveBeenCalledWith(filter);
    });
});
