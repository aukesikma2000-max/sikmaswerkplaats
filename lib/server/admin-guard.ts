import type { NextRequest } from 'next/server';

export type RequestActor = {
  name: string;
  role: string;
};

export function getRequestActor(request: NextRequest): RequestActor {
  const name = (request.headers.get('x-workshop-user-name') || 'Onbekend').trim();
  const role = (request.headers.get('x-workshop-user-role') || '').trim();
  return { name: name || 'Onbekend', role };
}

export function isAdminRequest(request: NextRequest) {
  const actor = getRequestActor(request);
  return actor.role === 'Administrator';
}

export function assertAdminRequest(request: NextRequest) {
  if (!isAdminRequest(request)) {
    throw new Error('Alleen administrators mogen deze actie uitvoeren.');
  }
}
