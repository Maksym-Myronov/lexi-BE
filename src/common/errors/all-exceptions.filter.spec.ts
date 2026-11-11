import {
  ForbiddenException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { toErrorBody } from './all-exceptions.filter.js';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';

describe('toErrorBody', () => {
  it('keeps the code, message and details of an AppException', () => {
    const body = toErrorBody(
      new AppException(ErrorCode.CONFLICT, HttpStatus.CONFLICT, 'Taken', { field: 'email' }),
    );
    expect(body).toEqual({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Taken',
      details: { field: 'email' },
    });
  });

  it('leaves out details when there are none', () => {
    const body = toErrorBody(
      new AppException(ErrorCode.CONFLICT, HttpStatus.CONFLICT, 'Taken'),
    );
    expect(body).not.toHaveProperty('details');
  });

  it.each([
    [new NotFoundException('No such card'), 404, 'NOT_FOUND', 'No such card'],
    [new ForbiddenException(), 403, 'FORBIDDEN', 'Forbidden'],
  ])('maps Nest HTTP exceptions to a stable code', (error, statusCode, code, message) => {
    expect(toErrorBody(error)).toEqual({ statusCode, code, message });
  });

  it('hides the message of a 5xx HttpException', () => {
    const body = toErrorBody(new InternalServerErrorException('db password is wrong'));
    expect(body.message).toBe('Something went wrong');
  });

  it('turns an unknown error into INTERNAL_ERROR without leaking it', () => {
    expect(toErrorBody(new Error('secret stack info'))).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    });
  });

  it('handles a malformed JSON body from Express', () => {
    const parseError = Object.assign(new SyntaxError('Unexpected token'), { status: 400 });
    expect(toErrorBody(parseError)).toEqual({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Malformed request body',
    });
  });
});
