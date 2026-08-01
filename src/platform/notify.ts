export async function requestPermission(): Promise<NotificationPermission> {
  if (
    typeof window === 'undefined' ||
    typeof Notification === 'undefined' ||
    typeof Notification.requestPermission !== 'function'
  ) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function canNotify(): boolean {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }
  try {
    return Notification.permission === 'granted';
  } catch {
    return false;
  }
}

export function notify(title: string, body: string): 'shown' | 'denied' | 'unsupported' | 'failed' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  let permission: NotificationPermission;
  try {
    permission = Notification.permission;
  } catch {
    return 'unsupported';
  }

  if (permission !== 'granted') {
    return 'denied';
  }

  try {
    new Notification(title, { body });
    return 'shown';
  } catch {
    return 'failed';
  }
}
