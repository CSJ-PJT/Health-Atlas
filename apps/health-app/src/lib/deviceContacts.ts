import { registerPlugin } from "@capacitor/core";

export interface DeviceContact {
  id: string;
  name: string;
  phone: string;
}

interface ContactsPermissionResponse {
  granted: boolean;
}

interface ContactsResponse {
  contacts: DeviceContact[];
}

interface DeviceContactsPlugin {
  getPermissionStatus(): Promise<ContactsPermissionResponse>;
  requestContactsPermission(): Promise<ContactsPermissionResponse>;
  getContacts(): Promise<ContactsResponse>;
}

export const DeviceContacts = registerPlugin<DeviceContactsPlugin>("DeviceContacts");
