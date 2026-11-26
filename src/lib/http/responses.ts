import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthorizationError } from '@/lib/security/session';

export class BadRequestError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new BadRequestError('Malformed JSON request body.');
  }
}

export async function parseFormData(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new BadRequestError('Malformed multipart form data.');
  }
}

export function jsonOk<T>(data: T, status = 200, headers?: Record<string, string>) {
  return NextResponse.json({ data }, { status, headers });
}

export function jsonError(
  message: string,
  status = 400,
  headers?: Record<string, string>,
  fieldErrors?: Record<string, string[] | undefined>
) {
  return NextResponse.json(
    {
      error: message,
      ...(fieldErrors ? { fieldErrors } : {}),
    },
    { status, headers }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof BadRequestError) {
    return jsonError(error.message, error.statusCode);
  }
  if (error instanceof ZodError) {
    return jsonError(
      'Validation failed. Please review your input fields.',
      400,
      undefined,
      error.flatten().fieldErrors
    );
  }
  // Never leak stack traces or internal database messages to clients
  return jsonError('An unexpected server error occurred. Please try again.', 500);
}
