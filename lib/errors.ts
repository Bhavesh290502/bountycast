// Standardized error response utilities

export interface ApiError {
    error: string;
    code?: string;
    details?: string;
    statusCode: number;
}

export class AppError extends Error {
    statusCode: number;
    code?: string;
    details?: string;

    constructor(message: string, statusCode: number = 500, code?: string, details?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}

// Standard error responses
export const ErrorResponses = {
    // 400 Bad Request
    MISSING_FIELDS: (fields: string[]) => new AppError(
        `Missing required fields: ${fields.join(', ')}`,
        400,
        'MISSING_FIELDS'
    ),
    INVALID_INPUT: (message: string) => new AppError(
        message,
        400,
        'INVALID_INPUT'
    ),
    VALIDATION_ERROR: (message: string, details?: string) => new AppError(
        message,
        400,
        'VALIDATION_ERROR',
        details
    ),

    // 403 Forbidden
    NOT_ELIGIBLE: (reason: string) => new AppError(
        reason,
        403,
        'NOT_ELIGIBLE'
    ),
    UNAUTHORIZED: (message: string = 'Unauthorized') => new AppError(
        message,
        403,
        'UNAUTHORIZED'
    ),

    // 404 Not Found
    NOT_FOUND: (resource: string) => new AppError(
        `${resource} not found`,
        404,
        'NOT_FOUND'
    ),

    // 429 Too Many Requests
    RATE_LIMIT_EXCEEDED: (message: string = 'Rate limit exceeded') => new AppError(
        message,
        429,
        'RATE_LIMIT_EXCEEDED'
    ),

    // 500 Internal Server Error
    DATABASE_ERROR: (details?: string) => new AppError(
        'Database operation failed',
        500,
        'DATABASE_ERROR',
        details
    ),
    INTERNAL_ERROR: (message: string = 'Internal server error') => new AppError(
        message,
        500,
        'INTERNAL_ERROR'
    ),
};

// Helper to format error response
export function formatErrorResponse(error: AppError | Error): ApiError {
    if (error instanceof AppError) {
        return {
            error: error.message,
            code: error.code,
            details: error.details,
            statusCode: error.statusCode,
        };
    }

    // Generic error fallback
    return {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        statusCode: 500,
    };
}
