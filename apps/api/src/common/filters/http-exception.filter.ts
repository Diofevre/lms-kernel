import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "crypto";

/**
 * Global HTTP exception filter.
 * - Never leaks stack traces or internal details to clients
 * - Returns a correlation ID for support tracing
 * - Logs full error internally for debugging
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const correlationId = randomUUID();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : "An unexpected error occurred";

    // Log full error internally (never sent to client)
    this.logger.error(
      `[${correlationId}] ${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Safe response — no stack traces, no internal details
    void response.status(status).send({
      statusCode: status,
      message: sanitizeMessage(message, status),
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

/** For 500 errors, never reveal internal messages to clients */
function sanitizeMessage(message: string, status: number): string {
  if (status >= 500) return "Internal server error";
  return message;
}
