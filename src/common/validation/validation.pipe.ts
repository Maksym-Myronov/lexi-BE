import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      result[path] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      Object.assign(result, flattenValidationErrors(error.children, path));
    }
  }
  return result;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.BAD_REQUEST,
        'Request validation failed',
        flattenValidationErrors(errors),
      ),
  });
}
