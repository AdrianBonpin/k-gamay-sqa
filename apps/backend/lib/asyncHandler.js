'use strict';

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

class HttpError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} code - Machine-readable error code (e.g. 'PROMO_INVALID')
   * @param {string} [message] - Human-readable message. Falls back to code if omitted.
   */
  constructor(status, code, message) {
    // Backward-compat: allow old (status, message) callers; treat code as message if no third arg.
    if (message === undefined) {
      super(code);
      this.status = status;
      this.code = httpStatusToCode(status);
    } else {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
}

function httpStatusToCode(status) {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL' : 'ERROR';
  }
}

module.exports = { asyncHandler, HttpError, httpStatusToCode };
