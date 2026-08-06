import { getActiveWorkshopUserRecord } from '@/lib/active-user';

export function getActorHeaders() {
  if (typeof window === 'undefined') {
    return {
      'x-workshop-user-name': 'Systeem',
      'x-workshop-user-role': 'Administrator',
    };
  }

  const user = getActiveWorkshopUserRecord();
  return {
    'x-workshop-user-name': user.name,
    'x-workshop-user-role': user.role,
  };
}
