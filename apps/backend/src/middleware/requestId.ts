import { Elysia } from 'elysia';

export const requestIdPlugin = new Elysia()
  .onRequest(({ request, set }) => {
    const incoming = request.headers.get('x-request-id');
    const id = incoming || crypto.randomUUID();
    set.headers['x-request-id'] = id;
  });
