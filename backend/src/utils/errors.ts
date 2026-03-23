export class ValidationError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

export class AuthorizationError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

export class DatabaseError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = statusCode;
  }
}