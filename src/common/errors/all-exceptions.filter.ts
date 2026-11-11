import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from './app.exception.js';
import { codeForStatus, ErrorCode } from './error-codes.js';

export interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = toErrorBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception);
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }
}

export function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof AppException) {
    return {
      statusCode: exception.getStatus(),
      code: exception.code,
      message: exception.message,
      ...(exception.details !== undefined && { details: exception.details }),
    };
  }

  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    return {
      statusCode,
      code: codeForStatus[statusCode] ?? defaultCode(statusCode),
      message: statusCode >= 500 ? 'Something went wrong' : exception.message,
    };
  }

  // Errors thrown by Express middleware (e.g. malformed JSON) carry a 4xx `status`.
  const status = (exception as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return {
      statusCode: status,
      code: codeForStatus[status] ?? ErrorCode.BAD_REQUEST,
      message: status === 400 ? 'Malformed request body' : 'Bad request',
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode.INTERNAL_ERROR,
    message: 'Something went wrong',
  };
}

function defaultCode(status: number): ErrorCode {
  return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
}
