import type { Document, Model, Query } from 'mongoose';

interface PaginationInput {
  page?: number;
  limit?: number;
}

interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
}

interface Connection<T> {
  edges: T[];
  pageInfo: PageInfo;
  totalCount: number;
}

/**
 * Apply pagination to a Mongoose query and return a Connection object
 * @param query The Mongoose query to paginate
 * @param model The Mongoose model to count documents
 * @param filter The filter to apply when counting documents
 * @param pagination The pagination input (page and limit)
 * @returns A Connection object with edges, pageInfo, and totalCount
 */
export async function paginateQuery<T extends Document>(
  query: Query<T[], T>,
  model: Model<T>,
  filter: Record<string, unknown> = {},
  pagination?: PaginationInput,
): Promise<Connection<T>> {
  // Default pagination values
  const page = pagination?.page ?? 1;
  const limit = pagination?.limit ?? 10;

  // Ensure page and limit are valid
  const validPage = page > 0 ? page : 1;
  const validLimit = limit > 0 ? limit : 10;

  // Calculate skip value
  const skip = (validPage - 1) * validLimit;

  // Apply pagination to query
  const paginatedQuery = query.skip(skip).limit(validLimit);

  // Execute query to get edges
  const edges = await paginatedQuery.exec();

  // Get total count
  const totalCount = await model.countDocuments(filter);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / validLimit);

  // Create page info
  const pageInfo: PageInfo = {
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
    currentPage: validPage,
    totalPages,
  };

  // Return connection
  return {
    edges,
    pageInfo,
    totalCount,
  };
}
